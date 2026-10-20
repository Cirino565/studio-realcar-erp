"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CATEGORIA_REATIVACAO_PERDIDOS,
  LIMITE_MAXIMO,
  LIMITE_MINIMO,
  ROTULO_RESULTADO,
  chaveModeloDoServico,
  inicioDoDiaSaoPaulo,
  type ResultadoReativacao,
} from "@/lib/reativacao-perdidos";

function revalidar() {
  revalidatePath("/marketing/reativacao");
  revalidatePath("/marketing");
  revalidatePath("/comunicacoes");
}

async function limiteDiario() {
  const config = await prisma.configuracaoClinica.findFirst({ select: { reativacaoLimiteDiario: true } });
  return config?.reativacaoLimiteDiario ?? 15;
}

async function enviadasHoje() {
  return prisma.comunicacaoRegistro.count({
    where: { categoria: CATEGORIA_REATIVACAO_PERDIDOS, enviadoEm: { gte: inicioDoDiaSaoPaulo() } },
  });
}

/**
 * Registra que a mensagem de reativacao foi aberta no WhatsApp para enviar.
 * A pessoa sai da lista e nunca mais recebe essa mensagem. Respeita o limite
 * do dia.
 */
export async function registrarEnvioReativacao(dados: { leadId: number; mensagem: string }) {
  const usuario = await requirePermission("marketing.gerenciar");
  const leadId = Number(dados.leadId);

  const [limite, jaHoje] = await Promise.all([limiteDiario(), enviadasHoje()]);
  if (jaHoje >= limite) {
    throw new Error(`Limite de hoje atingido (${jaHoje} de ${limite}). Continue amanhã para proteger o seu WhatsApp.`);
  }

  const agora = new Date();
  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({
      where: { id: leadId },
      select: { id: true, nome: true, telefone: true, etapa: true, reativacaoEnviadaEm: true },
    });
    if (!lead) throw new Error("Lead não encontrado.");
    if (lead.reativacaoEnviadaEm) throw new Error("Esta pessoa já recebeu a mensagem de reativação.");

    // So marca se ainda nao foi marcado (evita contar duas vezes num clique duplo).
    const marcado = await tx.lead.updateMany({
      where: { id: leadId, reativacaoEnviadaEm: null },
      data: { reativacaoEnviadaEm: agora, reativacaoResultado: null, reativacaoResultadoEm: null },
    });
    if (marcado.count === 0) throw new Error("Esta pessoa já recebeu a mensagem de reativação.");

    await tx.comunicacaoRegistro.create({
      data: {
        leadId,
        destinatarioNome: lead.nome,
        telefone: lead.telefone,
        categoria: CATEGORIA_REATIVACAO_PERDIDOS,
        canal: "WhatsApp",
        mensagem: (dados.mensagem || "").trim().slice(0, 2000) || "(mensagem de reativação)",
        status: "Enviada",
        usuario: usuario.email,
        abertoEm: agora,
        enviadoEm: agora,
      },
    });

    await tx.leadInteracao.create({
      data: { leadId, tipo: "Reativação", descricao: "Mensagem de reativação enviada pelo WhatsApp." },
    });
  });

  revalidar();
  return { ok: true as const, enviadasHoje: jaHoje + 1, limite };
}

/** "Não consegui enviar": desfaz o envio de HOJE (a pessoa volta para a lista). */
export async function desfazerEnvioReativacao(leadId: number) {
  await requirePermission("marketing.gerenciar");
  const id = Number(leadId);
  const inicio = inicioDoDiaSaoPaulo();

  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id }, select: { reativacaoEnviadaEm: true } });
    if (!lead?.reativacaoEnviadaEm || lead.reativacaoEnviadaEm < inicio) {
      throw new Error("Só dá para desfazer um envio feito hoje.");
    }
    await tx.lead.update({
      where: { id },
      data: { reativacaoEnviadaEm: null, reativacaoResultado: null, reativacaoResultadoEm: null },
    });
    await tx.comunicacaoRegistro.deleteMany({
      where: { leadId: id, categoria: CATEGORIA_REATIVACAO_PERDIDOS, enviadoEm: { gte: inicio } },
    });
    await tx.leadInteracao.create({
      data: { leadId: id, tipo: "Reativação", descricao: "Envio de reativação desfeito (a mensagem não foi enviada)." },
    });
  });

  revalidar();
  return { ok: true as const };
}

/** Marca o que aconteceu depois da mensagem. "Respondeu" reabre o lead no funil. */
export async function registrarResultadoReativacao(dados: { leadId: number; resultado: ResultadoReativacao | null }) {
  await requirePermission("marketing.gerenciar");
  const id = Number(dados.leadId);
  const resultado = dados.resultado;
  if (resultado && !(resultado in ROTULO_RESULTADO)) throw new Error("Resultado inválido.");

  const lead = await prisma.lead.findUnique({ where: { id }, select: { etapa: true, reativacaoEnviadaEm: true } });
  if (!lead?.reativacaoEnviadaEm) throw new Error("Esta pessoa ainda não recebeu a reativação.");

  const reabrir = resultado === "RESPONDEU" && lead.etapa === "Perdido";
  await prisma.$transaction([
    prisma.lead.update({
      where: { id },
      data: {
        reativacaoResultado: resultado,
        reativacaoResultadoEm: resultado ? new Date() : null,
        ...(reabrir ? { etapa: "Aguardando resposta", motivoPerda: null, proximoContatoEm: new Date() } : {}),
      },
    }),
    prisma.leadInteracao.create({
      data: {
        leadId: id,
        tipo: "Reativação",
        descricao: resultado
          ? `Resultado da reativação: ${ROTULO_RESULTADO[resultado]}.${reabrir ? " Lead reaberto (Aguardando resposta)." : ""}`
          : "Resultado da reativação apagado.",
      },
    }),
  ]);

  revalidar();
  return { ok: true as const };
}

export async function definirLimiteDiarioReativacao(limite: number) {
  await requirePermission("marketing.gerenciar");
  const valor = Math.min(LIMITE_MAXIMO, Math.max(LIMITE_MINIMO, Math.round(Number(limite) || 15)));
  const atual = await prisma.configuracaoClinica.findFirst({ select: { id: true } });
  if (atual) {
    await prisma.configuracaoClinica.update({ where: { id: atual.id }, data: { reativacaoLimiteDiario: valor } });
  } else {
    await prisma.configuracaoClinica.create({ data: { reativacaoLimiteDiario: valor } });
  }
  revalidar();
  return { ok: true as const, limite: valor };
}

/** Salva o texto-base de um servico (ou o padrao, com servico null). */
export async function salvarModeloReativacao(dados: { servico: string | null; texto: string }) {
  await requirePermission("marketing.gerenciar");
  const texto = (dados.texto || "").trim();
  if (texto.length < 10) throw new Error("Escreva a mensagem (pelo menos algumas palavras).");
  if (texto.length > 2000) throw new Error("A mensagem está muito longa.");

  const chave = chaveModeloDoServico(dados.servico);
  const nome = dados.servico ? `Reativação · ${dados.servico}` : "Reativação · padrão";
  await prisma.mensagemModelo.upsert({
    where: { chave },
    create: { chave, nome, categoria: CATEGORIA_REATIVACAO_PERDIDOS, corpo: texto, ativo: true },
    update: { corpo: texto, nome },
  });

  revalidar();
  return { ok: true as const };
}
