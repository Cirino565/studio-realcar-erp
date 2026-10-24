"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AcaoReativacao =
  | "CONTATADA"
  | "VAI_MARCAR"
  | "MAIS_TARDE"
  | "NAO_QUER"
  | "VOLTAR";

const DIA_MS = 24 * 60 * 60 * 1000;

// Depois que a mensagem e enviada, a cliente some da lista e so volta se
// continuar sem agendar depois deste prazo.
const DIAS_APOS_MENSAGEM = 30;
// "Vai marcar um dia": da um prazo curto e, se nao marcou, ela volta.
const DIAS_VAI_MARCAR = 21;
// 2a mensagem sem resposta: descansa 3 meses antes de chamar de novo.
const DIAS_APOS_SEGUNDA_MENSAGEM = 90;
// Mensagens mais antigas que isso nao contam como tentativa (o ciclo recomeca).
const JANELA_TENTATIVAS_DIAS = 75;

export async function registrarReativacao(
  clienteId: number,
  acao: AcaoReativacao,
  meses?: number,
  mensagem?: string,
) {
  const usuario = await requirePermission("dashboard.visualizar");

  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    throw new Error("Cliente inválido.");
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: {
      id: true,
      nome: true,
      telefone: true,
      whatsapp: true,
      reativacaoSituacao: true,
      reativacaoAtualizadaEm: true,
    },
  });

  if (!cliente) {
    throw new Error("Cliente não encontrada.");
  }

  const agora = new Date();
  let situacao: string | null = null;
  let voltaEm: Date | null = null;

  let segundaTentativa = false;

  if (acao === "CONTATADA") {
    // Ja recebeu mensagem de retorno neste ciclo (depois do ultimo atendimento
    // e nos ultimos 75 dias)? Entao esta e a 2a: depois dela, so em 3 meses.
    const ultimoAtendimento = await prisma.agendamento.findFirst({
      where: { clienteId, status: "Atendido" },
      orderBy: { data: "desc" },
      select: { data: true },
    });
    const desde = new Date(
      Math.max(
        agora.getTime() - JANELA_TENTATIVAS_DIAS * DIA_MS,
        ultimoAtendimento?.data.getTime() ?? 0,
      ),
    );
    const anteriores = await prisma.comunicacaoRegistro.count({
      where: {
        clienteId,
        categoria: "Reativação",
        OR: [{ status: "Enviada" }, { enviadoEm: { not: null } }],
        createdAt: { gte: desde },
      },
    });
    // Marcada como "ja recebeu"/"vai marcar" neste ciclo tambem conta, mesmo
    // se a 1a mensagem saiu fora do sistema.
    const marcadaNesteCiclo =
      (cliente.reativacaoSituacao === "Contatada" || cliente.reativacaoSituacao === "Vai marcar") &&
      cliente.reativacaoAtualizadaEm !== null &&
      cliente.reativacaoAtualizadaEm >= desde;
    segundaTentativa = anteriores >= 1 || marcadaNesteCiclo;

    situacao = segundaTentativa ? "Mais tarde" : "Contatada";
    voltaEm = new Date(
      agora.getTime() + (segundaTentativa ? DIAS_APOS_SEGUNDA_MENSAGEM : DIAS_APOS_MENSAGEM) * DIA_MS,
    );
  } else if (acao === "VAI_MARCAR") {
    situacao = "Vai marcar";
    voltaEm = new Date(agora.getTime() + DIAS_VAI_MARCAR * DIA_MS);
  } else if (acao === "MAIS_TARDE") {
    const quantidade = Math.min(12, Math.max(1, Math.round(meses || 2)));
    situacao = "Mais tarde";
    voltaEm = new Date(agora.getTime() + quantidade * 30 * DIA_MS);
  } else if (acao === "NAO_QUER") {
    situacao = "Não quer mais";
    voltaEm = null;
  } else if (acao !== "VOLTAR") {
    throw new Error("Ação inválida.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.cliente.update({
      where: { id: clienteId },
      data: {
        reativacaoSituacao: situacao,
        reativacaoVoltaEm: voltaEm,
        reativacaoAtualizadaEm: agora,
      },
    });

    const texto = (mensagem || "").trim().slice(0, 2000);

    if (acao === "CONTATADA" && texto) {
      await tx.comunicacaoRegistro.create({
        data: {
          clienteId,
          destinatarioNome: cliente.nome,
          telefone: cliente.whatsapp || cliente.telefone || null,
          categoria: "Reativação",
          canal: "WhatsApp",
          mensagem: texto,
          status: "Enviada",
          usuario: usuario.email,
          abertoEm: agora,
          enviadoEm: agora,
        },
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/comunicacoes");
  revalidatePath("/retornos");

  return { ok: true, segundaTentativa };
}
