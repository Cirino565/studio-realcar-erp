import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import FinanceiroClient from "./components/FinanceiroClient";

function lancamentoCancelado(item: { statusPagamento: string; venda: { situacao: string } | null }) {
  return item.statusPagamento.toLowerCase() === "cancelado" || item.venda?.situacao === "CANCELADA";
}

export default async function FinanceiroPage() {
  await requirePagePermission("financeiro.visualizar");
  const [lancamentos, contasBase, formasPagamento, campanhas, clientes] = await Promise.all([
    prisma.lancamento.findMany({
      include: {
        contaFinanceira: { select: { id: true, nome: true } },
        campanha: { select: { id: true, nome: true } },
        venda: {
          select: {
            id: true,
            situacao: true,
          },
        },
      },
      orderBy: [
        { data: "desc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.contaFinanceira.findMany({
      where: { status: "Ativa" },
      orderBy: [{ principal: "desc" }, { nome: "asc" }],
    }),
    prisma.formaPagamentoConfig.findMany({
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
    prisma.campanhaMarketing.findMany({
      orderBy: [{ status: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, canal: true, status: true },
    }),
    // Lista leve para vincular um lançamento manual a uma cliente (ex.:
    // adiantamento de pacote fechado na avaliação). Mesmo padrão já usado
    // no seletor de cliente da Agenda - so os campos necessarios para a
    // busca, sem o historico de agendamentos.
    prisma.cliente.findMany({
      where: { status: { not: "Inativa" } },
      select: { id: true, nome: true, telefone: true, whatsapp: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const contas = contasBase.map((conta) => {
    const movimentos = lancamentos.filter(
      (item) =>
        item.contaFinanceiraId === conta.id &&
        item.statusPagamento.toLowerCase() === "pago" &&
        !lancamentoCancelado(item),
    );
    const entradasLiquidas = movimentos
      .filter((item) => item.tipo === "ENTRADA")
      .reduce(
        (total, item) => total + (item.valorLiquido ?? item.valor - item.taxaPagamento),
        0,
      );
    const saidas = movimentos
      .filter((item) => item.tipo === "SAIDA")
      .reduce((total, item) => total + item.valor, 0);

    const saldoCalculado = conta.saldoInicial + entradasLiquidas - saidas;
    return {
      ...conta,
      entradasLiquidas,
      saidas,
      saldoCalculado,
      diferencaConciliacao:
        conta.saldoBancoInformado === null
          ? null
          : conta.saldoBancoInformado - saldoCalculado,
    };
  });

  return (
    <FinanceiroClient
      lancamentos={lancamentos}
      contas={contas}
      formasPagamento={formasPagamento}
      campanhas={campanhas}
      clientes={clientes}
    />
  );
}
