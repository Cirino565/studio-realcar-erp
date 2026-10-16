"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dataHoraCurta, horasAteOHorario } from "@/lib/remarcacao";

export type DecisaoSinal = "GUARDAR" | "RETER" | "DEVOLVER";

function revalidar() {
  revalidatePath("/agenda");
  revalidatePath("/financeiro");
  revalidatePath("/clientes");
  revalidatePath("/marketing");
  revalidatePath("/");
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function textoAntecedencia(horas: number) {
  if (horas <= 0) return "depois do horário";
  if (horas < 1) return "menos de 1h antes";
  return `${Math.floor(horas)}h antes`;
}

/**
 * "Cliente desmarcou": cancela (ou marca falta) em um passo, libera o horario,
 * decide o que fazer com o sinal e, se ela vai remarcar, coloca na lista
 * "Para remarcar" da Agenda.
 */
export async function desmarcarAgendamento(dados: {
  agendamentoId: number;
  tipo: "CANCELOU" | "FALTOU";
  vaiRemarcar: boolean;
  sinal?: DecisaoSinal | null;
  observacao?: string;
}) {
  const usuario = await requirePermission("agenda.gerenciar");
  const id = Number(dados.agendamentoId);

  const resultado = await prisma.$transaction(async (tx) => {
    const agendamento = await tx.agendamento.findUnique({
      where: { id },
      select: {
        id: true,
        data: true,
        status: true,
        clienteId: true,
        procedimento: true,
        observacoes: true,
        valorSinal: true,
        sinalLancamentoId: true,
        lead: { select: { id: true, etapa: true } },
      },
    });

    if (!agendamento) throw new Error("Agendamento não encontrado.");
    if (["Atendido", "Em atendimento"].includes(agendamento.status)) {
      throw new Error("Este atendimento já começou ou foi finalizado; não dá para desmarcar.");
    }
    if (["Cancelado", "Faltou"].includes(agendamento.status)) {
      throw new Error("Este agendamento já está desmarcado.");
    }

    const horas = horasAteOHorario(agendamento.data);
    const agora = new Date();

    const lancamentoSinal = agendamento.sinalLancamentoId
      ? await tx.lancamento.findFirst({
          where: { id: agendamento.sinalLancamentoId, statusPagamento: { not: "Cancelado" } },
          select: { id: true, valor: true, observacoes: true },
        })
      : null;
    const temSinal = Boolean(lancamentoSinal) && agendamento.valorSinal > 0;

    let decisao: DecisaoSinal | null = null;
    if (temSinal) {
      decisao = dados.sinal ?? null;
      if (!decisao) throw new Error("Escolha o que fazer com o sinal.");
      // Guardar so faz sentido se ela vai remarcar.
      if (decisao === "GUARDAR" && !dados.vaiRemarcar) decisao = "RETER";
    }

    const quandoDesmarcou = dataHoraCurta(agora);
    let textoSinal = "";

    if (temSinal && lancamentoSinal) {
      const valor = moeda(agendamento.valorSinal);
      if (decisao === "DEVOLVER") {
        await tx.lancamento.update({
          where: { id: lancamentoSinal.id },
          data: {
            statusPagamento: "Cancelado",
            observacoes: [lancamentoSinal.observacoes?.trim(), `Sinal devolvido: a cliente desmarcou em ${quandoDesmarcou}.`]
              .filter(Boolean)
              .join(" "),
          },
        });
        textoSinal = ` Sinal de ${valor} devolvido.`;
      } else if (decisao === "GUARDAR") {
        await tx.lancamento.update({
          where: { id: lancamentoSinal.id },
          data: {
            observacoes: [lancamentoSinal.observacoes?.trim(), `Sinal guardado para a nova data (desmarcou em ${quandoDesmarcou}).`]
              .filter(Boolean)
              .join(" "),
          },
        });
        textoSinal = ` Sinal de ${valor} guardado para a nova data.`;
      } else {
        await tx.lancamento.update({
          where: { id: lancamentoSinal.id },
          data: {
            observacoes: [
              lancamentoSinal.observacoes?.trim(),
              `Sinal retido: a cliente ${dados.tipo === "FALTOU" ? "faltou" : "desmarcou"} ${textoAntecedencia(horas)} (${quandoDesmarcou}).`,
            ]
              .filter(Boolean)
              .join(" "),
          },
        });
        textoSinal = ` Sinal de ${valor} retido.`;
      }
    }

    const novoStatus = dados.tipo === "FALTOU" ? "Faltou" : "Cancelado";
    const observacaoLivre = dados.observacao?.trim();
    const linha = `[${dados.tipo === "FALTOU" ? "Faltou" : "Cancelou"} em ${quandoDesmarcou}, ${textoAntecedencia(horas)}.${dados.vaiRemarcar ? " Vai remarcar." : ""}${textoSinal}${observacaoLivre ? ` ${observacaoLivre}` : ""}]`;

    await tx.agendamento.update({
      where: { id },
      data: {
        status: novoStatus,
        statusAntesAtendimento: null,
        aguardandoRemarcacao: Boolean(dados.vaiRemarcar),
        sinalGuardado: decisao === "GUARDAR",
        desmarcadoEm: agora,
        ...(decisao === "DEVOLVER" ? { valorSinal: 0, sinalLancamentoId: null, sinalPago: false } : {}),
        observacoes: [agendamento.observacoes?.trim(), linha].filter(Boolean).join("\n"),
      },
    });

    // Contato do Marketing ligado a este horario volta para "Aguardando resposta".
    if (agendamento.lead && !["Convertido", "Perdido"].includes(agendamento.lead.etapa)) {
      await tx.lead.update({
        where: { id: agendamento.lead.id },
        data: { etapa: "Aguardando resposta", proximoContatoEm: agora },
      });
      await tx.leadInteracao.create({
        data: {
          leadId: agendamento.lead.id,
          tipo: dados.tipo === "FALTOU" ? "Falta" : "Cancelamento",
          descricao: `Agendamento de ${dataHoraCurta(agendamento.data)} ${dados.tipo === "FALTOU" ? "com falta" : "desmarcado"}.${dados.vaiRemarcar ? " Vai remarcar." : ""}`,
        },
      });
    }

    await tx.auditoria.create({
      data: {
        modulo: "Agenda",
        acao: dados.tipo === "FALTOU" ? "Marcou falta" : "Desmarcou agendamento",
        entidade: "Agendamento",
        entidadeId: String(id),
        usuario: usuario.email,
        detalhes: `${agendamento.procedimento} de ${dataHoraCurta(agendamento.data)}. ${linha}`,
      },
    });

    return { status: novoStatus, decisao };
  });

  revalidar();
  return { ok: true as const, ...resultado };
}

/** Tira da lista "Para remarcar" (a cliente desistiu). Decide o sinal guardado, se houver. */
export async function encerrarRemarcacao(dados: { agendamentoId: number; sinal?: "RETER" | "DEVOLVER" }) {
  const usuario = await requirePermission("agenda.gerenciar");
  const id = Number(dados.agendamentoId);

  await prisma.$transaction(async (tx) => {
    const agendamento = await tx.agendamento.findUnique({
      where: { id },
      select: { id: true, aguardandoRemarcacao: true, sinalGuardado: true, sinalLancamentoId: true, valorSinal: true, observacoes: true },
    });
    if (!agendamento || !agendamento.aguardandoRemarcacao) throw new Error("Este agendamento não está na lista para remarcar.");

    const quando = dataHoraCurta(new Date());
    let texto = `[Cliente desistiu de remarcar (${quando}).`;

    if (agendamento.sinalGuardado && agendamento.sinalLancamentoId) {
      const decisao = dados.sinal ?? "RETER";
      const lancamento = await tx.lancamento.findFirst({
        where: { id: agendamento.sinalLancamentoId, statusPagamento: { not: "Cancelado" } },
        select: { id: true, observacoes: true },
      });
      if (lancamento) {
        await tx.lancamento.update({
          where: { id: lancamento.id },
          data: {
            ...(decisao === "DEVOLVER" ? { statusPagamento: "Cancelado" } : {}),
            observacoes: [
              lancamento.observacoes?.trim(),
              decisao === "DEVOLVER"
                ? `Sinal devolvido: a cliente desistiu de remarcar (${quando}).`
                : `Sinal retido: a cliente desistiu de remarcar (${quando}).`,
            ]
              .filter(Boolean)
              .join(" "),
          },
        });
      }
      texto += decisao === "DEVOLVER" ? ` Sinal de ${moeda(agendamento.valorSinal)} devolvido.` : ` Sinal de ${moeda(agendamento.valorSinal)} retido.`;
    }
    texto += "]";

    await tx.agendamento.update({
      where: { id },
      data: {
        aguardandoRemarcacao: false,
        sinalGuardado: false,
        ...(dados.sinal === "DEVOLVER" ? { valorSinal: 0, sinalLancamentoId: null, sinalPago: false } : {}),
        observacoes: [agendamento.observacoes?.trim(), texto].filter(Boolean).join("\n"),
      },
    });

    await tx.auditoria.create({
      data: {
        modulo: "Agenda",
        acao: "Cliente desistiu de remarcar",
        entidade: "Agendamento",
        entidadeId: String(id),
        usuario: usuario.email,
        detalhes: texto,
      },
    });
  });

  revalidar();
  return { ok: true as const };
}
