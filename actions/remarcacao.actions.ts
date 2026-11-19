"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { decodificarMensagemModelo } from "@/lib/mensagem-modelo.server";
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
 * Mensagem pronta para a cliente que faltou, a partir do modelo editavel em
 * Comunicacoes > Modelos. Sinal retido usa a versao que explica o sinal.
 */
async function montarMensagemFalta(dados: {
  nome: string;
  procedimento: string;
  data: Date;
  sinalRetido: boolean;
}) {
  const [modelos, configuracao] = await Promise.all([
    prisma.mensagemModelo.findMany({
      where: { chave: { in: ["cliente_faltou", "cliente_faltou_sem_sinal"] }, ativo: true },
      select: { chave: true, corpo: true },
    }),
    prisma.configuracaoClinica.findFirst({ select: { nome: true } }),
  ]);
  const porChave = new Map(modelos.map((item) => [item.chave, decodificarMensagemModelo(item.corpo)]));
  const corpo = dados.sinalRetido
    ? porChave.get("cliente_faltou")
    : porChave.get("cliente_faltou_sem_sinal") ?? porChave.get("cliente_faltou");
  if (!corpo) return null;

  const nome = dados.nome.trim();
  const variaveis: Record<string, string> = {
    primeiro_nome: nome.split(/\s+/)[0] || nome,
    nome,
    clinica: configuracao?.nome || "Studio Realçar",
    procedimento: dados.procedimento,
    data: dados.data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    horario: dados.data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }),
    profissional: "",
    interesse_texto: "",
  };
  // Modelos antigos podem ter "\n" escrito como texto.
  return corpo
    .replace(/\\n/g, "\n")
    .replace(/\{([a-zA-Z0-9_]+)\}/g, (_, chave: string) => variaveis[chave] ?? "");
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
        cliente: { select: { nome: true, telefone: true, whatsapp: true } },
        preReserva: true,
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
        // Pre-reserva que nao foi confirmada: fica registrada como liberada.
        ...(agendamento.preReserva === "PENDENTE" ? { preReserva: "LIBERADA" } : {}),
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

    return {
      status: novoStatus,
      decisao,
      cliente: agendamento.cliente,
      procedimento: agendamento.procedimento,
      data: agendamento.data,
    };
  });

  revalidar();

  // Faltou: devolve a mensagem pronta para abrir no WhatsApp da cliente.
  const mensagem =
    dados.tipo === "FALTOU" && resultado.cliente
      ? await montarMensagemFalta({
          nome: resultado.cliente.nome,
          procedimento: resultado.procedimento,
          data: resultado.data,
          sinalRetido: resultado.decisao === "RETER",
        })
      : null;

  return {
    ok: true as const,
    status: resultado.status,
    decisao: resultado.decisao,
    mensagem,
    telefone: resultado.cliente ? resultado.cliente.whatsapp || resultado.cliente.telefone || null : null,
  };
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
