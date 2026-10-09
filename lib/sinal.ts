import type { Prisma } from "@prisma/client";

import { resolverContextoFinanceiroVenda } from "@/lib/financeiro";

// Valor padrao do sinal de reserva. A recepcao pode trocar na hora de marcar.
export const SINAL_PADRAO = 30;

export const CATEGORIA_SINAL = "Sinal";

function arredondar(valor: number) {
  return Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;
}

export function normalizarValorSinal(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.max(0, arredondar(numero)) : 0;
}

type SincronizarSinalInput = {
  agendamentoId: number;
  sinalPago: boolean;
  valorSinal?: number | null;
  formaPagamentoConfigId?: number | null;
  formaPagamento?: string | null;
};

/**
 * Deixa o Financeiro de acordo com o sinal marcado no agendamento.
 *
 * - Sinal marcado com valor: cria o lancamento "Sinal" (entrada paga) no
 *   Financeiro, vinculado ao agendamento. Se o valor mudar depois, ajusta.
 * - Sinal desmarcado: cancela o lancamento (some do caixa, fica no historico).
 * - Sinal marcado SEM valor (agendamentos antigos): nao mexe no Financeiro -
 *   o dinheiro pode ja ter sido lancado a mao.
 *
 * Depois que o atendimento e finalizado o sinal vira parte da venda e nao
 * pode mais ser alterado por aqui.
 */
export async function sincronizarSinalNoTx(
  tx: Prisma.TransactionClient,
  dados: SincronizarSinalInput,
) {
  const agendamento = await tx.agendamento.findUnique({
    where: { id: dados.agendamentoId },
    select: {
      id: true,
      clienteId: true,
      procedimento: true,
      status: true,
      naturezaAtendimento: true,
      valorSinal: true,
      sinalLancamentoId: true,
      cliente: { select: { nome: true } },
    },
  });

  if (!agendamento) return;
  if (agendamento.status === "Atendido") return;

  const valor =
    agendamento.naturezaAtendimento === "RETORNO"
      ? 0
      : normalizarValorSinal(dados.valorSinal);
  const querSinal = dados.sinalPago && valor > 0;
  const lancamentoAtual = agendamento.sinalLancamentoId
    ? await tx.lancamento.findFirst({
        where: {
          id: agendamento.sinalLancamentoId,
          statusPagamento: { not: "Cancelado" },
        },
        select: { id: true, valor: true, formaPagamentoConfigId: true },
      })
    : null;

  if (!querSinal) {
    if (lancamentoAtual) {
      await tx.lancamento.update({
        where: { id: lancamentoAtual.id },
        data: {
          statusPagamento: "Cancelado",
          observacoes: "Sinal desmarcado na agenda.",
        },
      });
    }

    if (agendamento.valorSinal !== 0 || agendamento.sinalLancamentoId) {
      await tx.agendamento.update({
        where: { id: agendamento.id },
        data: { valorSinal: 0, sinalLancamentoId: null },
      });
    }
    return;
  }

  // Com o lancamento ja criado, so o valor pode mudar por aqui (para trocar
  // a forma de pagamento, desmarque e marque o sinal de novo).
  if (lancamentoAtual && lancamentoAtual.valor === valor) return;

  const contexto = await resolverContextoFinanceiroVenda(tx, {
    clienteId: agendamento.clienteId,
    formaPagamento: dados.formaPagamento || "Pix",
    formaPagamentoConfigId: lancamentoAtual
      ? lancamentoAtual.formaPagamentoConfigId
      : dados.formaPagamentoConfigId || null,
    valorBruto: valor,
  });

  const campos = {
    valor,
    valorLiquido: contexto.valorLiquido,
    taxaPagamento: contexto.taxaPagamento,
    taxaPercentualAplicada: contexto.taxaPercentual,
    taxaFixaAplicada: contexto.taxaFixa,
    formaPagamento: contexto.formaPagamento,
    formaPagamentoConfigId: contexto.formaPagamentoConfigId,
    contaFinanceiraId: contexto.contaFinanceiraId,
    prazoRecebimentoDias: contexto.prazoRecebimentoDias,
    recebimentoPrevistoEm: new Date(
      Date.now() + contexto.prazoRecebimentoDias * 86_400_000,
    ),
  };

  if (lancamentoAtual) {
    await tx.lancamento.update({
      where: { id: lancamentoAtual.id },
      data: campos,
    });
  } else {
    const lancamento = await tx.lancamento.create({
      data: {
        ...campos,
        descricao: `Sinal - ${agendamento.procedimento} - ${agendamento.cliente.nome}`,
        tipo: "ENTRADA",
        categoria: CATEGORIA_SINAL,
        data: new Date(),
        statusPagamento: "Pago",
        origem: "Agenda - Sinal",
        observacoes: `Sinal de reserva do agendamento #${agendamento.id}.`,
        agendamentoId: agendamento.id,
        clienteId: agendamento.clienteId,
      },
    });

    await tx.agendamento.update({
      where: { id: agendamento.id },
      data: { valorSinal: valor, sinalLancamentoId: lancamento.id },
    });
    return;
  }

  await tx.agendamento.update({
    where: { id: agendamento.id },
    data: { valorSinal: valor },
  });
}
