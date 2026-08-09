import type { Prisma } from "@prisma/client";

export function numeroFinanceiro(value: unknown) {
  const numero = Number(value);
  return Number.isFinite(numero) ? numero : 0;
}

export function arredondarMoeda(value: unknown) {
  return Math.round((numeroFinanceiro(value) + Number.EPSILON) * 100) / 100;
}

export function calcularTaxaRecebimento(
  valorBruto: unknown,
  taxaPercentual: unknown,
  taxaFixa: unknown,
) {
  const bruto = Math.max(0, arredondarMoeda(valorBruto));
  const percentual = Math.max(0, numeroFinanceiro(taxaPercentual));
  const fixa = Math.max(0, arredondarMoeda(taxaFixa));
  const taxa = Math.min(
    bruto,
    arredondarMoeda(bruto * (percentual / 100) + fixa),
  );

  return {
    valorBruto: bruto,
    taxaPercentual: percentual,
    taxaFixa: fixa,
    taxaPagamento: taxa,
    valorLiquido: arredondarMoeda(bruto - taxa),
  };
}

export async function resolverContextoFinanceiroVenda(
  tx: Prisma.TransactionClient,
  dados: {
    clienteId?: number | null;
    formaPagamento?: string | null;
    formaPagamentoConfigId?: number | null;
    contaFinanceiraId?: number | null;
    campanhaId?: number | null;
    valorBruto: number;
  },
) {
  const cliente = dados.clienteId
    ? await tx.cliente.findUnique({
        where: { id: dados.clienteId },
        select: { campanhaAquisicaoId: true },
      })
    : null;

  const formaPagamentoInformada = dados.formaPagamento?.trim() || null;
  const formaConfig = dados.formaPagamentoConfigId
    ? await tx.formaPagamentoConfig.findFirst({
        where: { id: dados.formaPagamentoConfigId, status: "Ativa" },
      })
    : formaPagamentoInformada
      ? await tx.formaPagamentoConfig.findFirst({
          where: { nome: formaPagamentoInformada, status: "Ativa" },
        })
      : null;

  if (dados.formaPagamentoConfigId && !formaConfig) {
    throw new Error(
      "A forma de pagamento selecionada não existe mais ou está inativa. Atualize a página e escolha outra opção.",
    );
  }

  const formaPagamento =
    formaConfig?.nome || formaPagamentoInformada || "Não informado";

  const conta = dados.contaFinanceiraId
    ? await tx.contaFinanceira.findFirst({
        where: { id: dados.contaFinanceiraId, status: "Ativa" },
        select: { id: true },
      })
    : await tx.contaFinanceira.findFirst({
        where: { principal: true, status: "Ativa" },
        orderBy: { id: "asc" },
        select: { id: true },
      });

  const calculo = calcularTaxaRecebimento(
    dados.valorBruto,
    formaConfig?.taxaPercentual || 0,
    formaConfig?.taxaFixa || 0,
  );

  return {
    formaPagamento,
    formaPagamentoConfigId: formaConfig?.id || null,
    contaFinanceiraId: conta?.id || null,
    campanhaId: dados.campanhaId || cliente?.campanhaAquisicaoId || null,
    prazoRecebimentoDias: Math.max(0, Math.trunc(formaConfig?.prazoDias || 0)),
    ...calculo,
  };
}
