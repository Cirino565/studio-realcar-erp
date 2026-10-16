import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Remarcacao de agendamentos desmarcados.
 *
 * Quando a cliente desmarca e diz que vai remarcar, o agendamento fica
 * "Cancelado" (o horario fica livre) e marcado como aguardando remarcacao.
 * Se o sinal ficou guardado, ele continua no Financeiro e vai junto para o
 * proximo agendamento da cliente: assim, na finalizacao, a Vivian ve o aviso
 * de "cobrar so a diferenca" e o sinal e descontado normalmente.
 */

export type RemarcacaoPendente = {
  id: number;
  clienteId: number;
  clienteNome: string;
  telefone: string | null;
  procedimento: string;
  naturezaAtendimento: "PROCEDIMENTO" | "RETORNO";
  agendamentoOrigemId: number | null;
  duracao: number;
  profissionalId: number | null;
  status: string;
  data: string;
  desmarcadoEm: string | null;
  sinalGuardado: boolean;
  valorSinal: number;
};

export function horasAteOHorario(data: Date, agora: Date = new Date()) {
  return (data.getTime() - agora.getTime()) / 3_600_000;
}

export function dataHoraCurta(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

/** Lista para a Agenda: clientes que desmarcaram e ainda nao ganharam nova data. */
export async function listarRemarcacoesPendentes(): Promise<RemarcacaoPendente[]> {
  const itens = await prisma.agendamento.findMany({
    where: { aguardandoRemarcacao: true },
    orderBy: [{ desmarcadoEm: "desc" }, { id: "desc" }],
    take: 200,
    select: {
      id: true,
      clienteId: true,
      procedimento: true,
      naturezaAtendimento: true,
      agendamentoOrigemId: true,
      duracao: true,
      profissionalId: true,
      status: true,
      data: true,
      desmarcadoEm: true,
      sinalGuardado: true,
      valorSinal: true,
      sinalLancamentoId: true,
      cliente: { select: { nome: true, telefone: true, whatsapp: true } },
    },
  });

  return itens.map((item) => ({
    id: item.id,
    clienteId: item.clienteId,
    clienteNome: item.cliente.nome,
    telefone: item.cliente.whatsapp || item.cliente.telefone || null,
    procedimento: item.procedimento,
    naturezaAtendimento: item.naturezaAtendimento === "RETORNO" ? "RETORNO" : "PROCEDIMENTO",
    agendamentoOrigemId: item.agendamentoOrigemId,
    duracao: item.duracao,
    profissionalId: item.profissionalId,
    status: item.status,
    data: item.data.toISOString(),
    desmarcadoEm: item.desmarcadoEm?.toISOString() ?? null,
    sinalGuardado: item.sinalGuardado && Boolean(item.sinalLancamentoId) && item.valorSinal > 0,
    valorSinal: item.sinalGuardado ? item.valorSinal : 0,
  }));
}

/**
 * Chamado quando a cliente ganha um novo agendamento a partir da lista "Para
 * remarcar": tira o antigo da lista e, se pedido, leva o sinal guardado junto.
 */
export async function concluirRemarcacaoNoTx(
  tx: Prisma.TransactionClient,
  dados: {
    clienteId: number;
    remarcacaoDeId: number;
    novoAgendamentoId: number;
    usarSinalGuardado: boolean;
  },
) {
  const antigo = await tx.agendamento.findUnique({
    where: { id: dados.remarcacaoDeId },
    select: {
      id: true,
      clienteId: true,
      aguardandoRemarcacao: true,
      sinalGuardado: true,
      valorSinal: true,
      sinalLancamentoId: true,
      observacoes: true,
    },
  });

  if (!antigo || antigo.clienteId !== dados.clienteId || !antigo.aguardandoRemarcacao) return;

  const novo = await tx.agendamento.findUnique({
    where: { id: dados.novoAgendamentoId },
    select: { id: true, data: true, naturezaAtendimento: true, sinalLancamentoId: true },
  });
  if (!novo) return;

  const quando = dataHoraCurta(novo.data);
  let levouSinal = false;

  const podeLevarSinal =
    dados.usarSinalGuardado &&
    antigo.sinalGuardado &&
    antigo.sinalLancamentoId &&
    antigo.valorSinal > 0 &&
    novo.naturezaAtendimento !== "RETORNO" &&
    !novo.sinalLancamentoId;

  if (podeLevarSinal) {
    const lancamento = await tx.lancamento.findFirst({
      where: { id: antigo.sinalLancamentoId!, statusPagamento: "Pago" },
      select: { id: true, observacoes: true },
    });

    if (lancamento) {
      await tx.lancamento.update({
        where: { id: lancamento.id },
        data: {
          agendamentoId: novo.id,
          observacoes: [
            lancamento.observacoes?.trim(),
            `Levado para o agendamento #${novo.id} (remarcado para ${quando}).`,
          ]
            .filter(Boolean)
            .join(" "),
        },
      });
      await tx.agendamento.update({
        where: { id: novo.id },
        data: { sinalPago: true, valorSinal: antigo.valorSinal, sinalLancamentoId: lancamento.id },
      });
      levouSinal = true;
    }
  }

  // Sinal guardado que NAO foi usado continua na lista, para ninguem esquecer dele.
  const continuaPendente = antigo.sinalGuardado && !levouSinal;

  await tx.agendamento.update({
    where: { id: antigo.id },
    data: {
      aguardandoRemarcacao: continuaPendente,
      ...(levouSinal ? { sinalGuardado: false, valorSinal: 0, sinalLancamentoId: null } : {}),
      observacoes: [
        antigo.observacoes?.trim(),
        `[Remarcado para ${quando}${levouSinal ? ", com o sinal" : ""}.]`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  });
}
