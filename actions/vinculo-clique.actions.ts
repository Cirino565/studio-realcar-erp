"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { juntarCodigos } from "@/lib/vinculo-clique";

const ORDEM_ETAPA: Record<string, number> = {
  Novo: 0,
  "Aguardando resposta": 1,
  Agendado: 2,
  Convertido: 3,
};

function revalidar(clienteId?: number | null) {
  revalidatePath("/marketing");
  revalidatePath("/marketing/google-ads");
  revalidatePath("/gestao");
  revalidatePath("/clientes");
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/");
}

function horaCurta(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

function nomeGenerico(nome?: string | null) {
  return !nome?.trim() || /^contato via an[uú]ncio/i.test(nome.trim());
}

/**
 * Passa tudo do lead "outro" para o "principal" (historico, mensagens e o que
 * faltar no principal) e apaga o "outro". Os codigos do outro ficam guardados
 * no principal, para a busca continuar achando.
 */
async function absorverLeadNoTx(
  tx: Prisma.TransactionClient,
  principalId: number,
  outroId: number,
  extras: Prisma.LeadUncheckedUpdateInput = {},
) {
  const [principal, outro] = await Promise.all([
    tx.lead.findUnique({ where: { id: principalId } }),
    tx.lead.findUnique({ where: { id: outroId } }),
  ]);
  if (!principal || !outro) throw new Error("Lead não encontrado. Atualize a tela e tente de novo.");

  // O agendamento e unico por lead: solta do outro antes de passar.
  const levarAgendamento = !principal.agendamentoId && outro.agendamentoId;
  if (levarAgendamento) {
    await tx.lead.update({ where: { id: outro.id }, data: { agendamentoId: null } });
  }

  await tx.leadInteracao.updateMany({ where: { leadId: outro.id }, data: { leadId: principal.id } });
  await tx.comunicacaoRegistro.updateMany({ where: { leadId: outro.id }, data: { leadId: principal.id } });

  const codigoPrincipal = (extras.codigoAtendimento as string | undefined) ?? principal.codigoAtendimento;
  const todosExtras = juntarCodigos(principal.codigosExtras, outro.codigoAtendimento, outro.codigosExtras);
  const codigosExtras = todosExtras
    ? juntarCodigos(
        todosExtras
          .split(",")
          .map((codigo) => codigo.trim())
          .filter((codigo) => codigo && codigo !== (codigoPrincipal || "").toUpperCase())
          .join(","),
      )
    : null;

  const etapaPrincipal = ORDEM_ETAPA[principal.etapa] ?? -1;
  const etapaOutro = ORDEM_ETAPA[outro.etapa] ?? -1;

  await tx.lead.update({
    where: { id: principal.id },
    data: {
      nome: nomeGenerico(principal.nome) && !nomeGenerico(outro.nome) ? outro.nome : principal.nome,
      telefone: principal.telefone?.trim() ? principal.telefone : outro.telefone,
      clienteId: principal.clienteId ?? outro.clienteId,
      interesse: principal.interesse ?? outro.interesse,
      campanhaId: principal.campanhaId ?? outro.campanhaId,
      origem: principal.origem ?? outro.origem,
      gclid: principal.gclid ?? outro.gclid,
      codigoAtendimento: principal.codigoAtendimento ?? outro.codigoAtendimento,
      observacoes: [principal.observacoes?.trim(), outro.observacoes?.trim()].filter(Boolean).join("\n\n") || null,
      ...(levarAgendamento ? { agendamentoId: outro.agendamentoId } : {}),
      ...(principal.etapa !== "Perdido" && etapaOutro > etapaPrincipal ? { etapa: outro.etapa } : {}),
      ...(outro.chamouWhatsapp === "Chamou" ? { chamouWhatsapp: "Chamou" } : {}),
      ...extras,
      codigosExtras,
    },
  });

  await tx.lead.delete({ where: { id: outro.id } });
  return { principal, outro };
}

/**
 * Confirma que o contato sem codigo veio daquele clique do anuncio: o contato
 * herda origem, campanha, codigo e codigo do Google do clique, e os dois viram
 * um lead so.
 */
export async function confirmarVinculoClique(dados: { contatoId: number; cliqueId: number }) {
  const usuario = await requirePermission("marketing.gerenciar");
  const contatoId = Number(dados.contatoId);
  const cliqueId = Number(dados.cliqueId);
  if (!contatoId || !cliqueId || contatoId === cliqueId) throw new Error("Vínculo inválido.");

  const resultado = await prisma.$transaction(async (tx) => {
    const [contato, clique] = await Promise.all([
      tx.lead.findUnique({ where: { id: contatoId } }),
      tx.lead.findUnique({ where: { id: cliqueId } }),
    ]);
    if (!contato || !clique) throw new Error("O contato ou o clique não existe mais. Atualize a tela.");
    if (contato.gclid || contato.codigoAtendimento) {
      throw new Error("Este contato já está ligado a um clique.");
    }
    if (!clique.codigoAtendimento || clique.telefone?.trim() || clique.clienteId) {
      throw new Error("Esse clique já foi ligado a outro contato. Atualize a tela.");
    }

    const origem = clique.gclid || /google\s*ads/i.test(clique.origem || "") ? "Google Ads" : clique.origem || contato.origem;

    await absorverLeadNoTx(tx, contato.id, clique.id, {
      origem,
      campanhaId: clique.campanhaId ?? contato.campanhaId,
      codigoAtendimento: clique.codigoAtendimento,
      gclid: clique.gclid,
      chamouWhatsapp: "Chamou",
    });

    // Se o contato ja virou cliente, a cliente passa a contar no anuncio.
    if (contato.clienteId) {
      const cliente = await tx.cliente.findUnique({
        where: { id: contato.clienteId },
        select: { origem: true, campanhaAquisicaoId: true },
      });
      if (cliente) {
        await tx.cliente.update({
          where: { id: contato.clienteId },
          data: {
            origem: "Google Ads",
            campanhaAquisicaoId: cliente.campanhaAquisicaoId ?? clique.campanhaId,
          },
        });
      }
    }

    const texto = `Vínculo com o clique do anúncio confirmado: código ${clique.codigoAtendimento}, clique em ${horaCurta(clique.createdAt)}. A pessoa tinha apagado o código da mensagem.`;
    await tx.leadInteracao.create({ data: { leadId: contato.id, tipo: "Vínculo", descricao: texto } });
    await tx.auditoria.create({
      data: {
        modulo: "Marketing",
        acao: "Confirmou vínculo com clique do anúncio",
        entidade: "Lead",
        entidadeId: String(contato.id),
        usuario: usuario.email,
        detalhes: `${contato.nome} ← lead do clique #${clique.id} (${clique.codigoAtendimento}). Origem antes: ${contato.origem || "-"}.`,
      },
    });

    return { clienteId: contato.clienteId };
  });

  revalidar(resultado.clienteId);
  return { ok: true as const };
}

/** "Não é esse clique": para de sugerir clique para este contato. */
export async function recusarSugestaoClique(contatoId: number) {
  const usuario = await requirePermission("marketing.gerenciar");
  const id = Number(contatoId);
  await prisma.$transaction([
    prisma.lead.update({ where: { id }, data: { sugestaoCliqueRecusada: true } }),
    prisma.leadInteracao.create({
      data: { leadId: id, tipo: "Vínculo", descricao: "Sugestão de clique do anúncio descartada (não era esta pessoa)." },
    }),
    prisma.auditoria.create({
      data: { modulo: "Marketing", acao: "Descartou sugestão de clique", entidade: "Lead", entidadeId: String(id), usuario: usuario.email },
    }),
  ]);
  revalidar();
  return { ok: true as const };
}

/**
 * Horario em que chegou a 1a mensagem (quando o contato foi cadastrado bem
 * depois). Recebe "2026-10-20T12:25" (horario de Brasilia).
 */
export async function definirPrimeiraMensagem(dados: { contatoId: number; quando: string }) {
  await requirePermission("marketing.gerenciar");
  const texto = (dados.quando || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(texto)) throw new Error("Informe o dia e a hora da 1ª mensagem.");
  const quando = new Date(`${texto}:00-03:00`);
  if (Number.isNaN(quando.getTime())) throw new Error("Data inválida.");
  if (quando.getTime() > Date.now() + 5 * 60_000) throw new Error("A 1ª mensagem não pode estar no futuro.");

  await prisma.lead.update({
    where: { id: Number(dados.contatoId) },
    data: { primeiraMensagemEm: quando, sugestaoCliqueRecusada: false },
  });
  revalidar();
  return { ok: true as const };
}

/**
 * Dois leads com o MESMO codigo do Google (a pessoa clicou em dois botoes):
 * junta num lead so. Fica o que tem mais informacao (telefone, cliente...).
 */
export async function juntarLeadsDoMesmoClique(dados: { leadId: number; outroId: number }) {
  const usuario = await requirePermission("marketing.gerenciar");
  const [a, b] = await Promise.all([
    prisma.lead.findUnique({ where: { id: Number(dados.leadId) } }),
    prisma.lead.findUnique({ where: { id: Number(dados.outroId) } }),
  ]);
  if (!a || !b || a.id === b.id) throw new Error("Lead não encontrado. Atualize a tela.");
  if (!a.gclid || a.gclid !== b.gclid) throw new Error("Esses dois leads não são do mesmo clique do Google.");

  const pontos = (lead: typeof a) =>
    (lead.clienteId ? 8 : 0) +
    (lead.telefone?.trim() ? 4 : 0) +
    (lead.agendamentoId ? 2 : 0) +
    (nomeGenerico(lead.nome) ? 0 : 1);
  const [principal, outro] =
    pontos(a) > pontos(b) || (pontos(a) === pontos(b) && a.createdAt <= b.createdAt) ? [a, b] : [b, a];

  await prisma.$transaction(async (tx) => {
    await absorverLeadNoTx(tx, principal.id, outro.id);
    await tx.leadInteracao.create({
      data: {
        leadId: principal.id,
        tipo: "Vínculo",
        descricao: `Juntado com o lead do mesmo clique do Google (código ${outro.codigoAtendimento || "-"}).`,
      },
    });
    await tx.auditoria.create({
      data: {
        modulo: "Marketing",
        acao: "Juntou leads do mesmo clique",
        entidade: "Lead",
        entidadeId: String(principal.id),
        usuario: usuario.email,
        detalhes: `Lead #${outro.id} (${outro.codigoAtendimento || "-"}) juntado no #${principal.id} (${principal.codigoAtendimento || "-"}).`,
      },
    });
  });

  revalidar(principal.clienteId);
  return { ok: true as const, ficouId: principal.id };
}
