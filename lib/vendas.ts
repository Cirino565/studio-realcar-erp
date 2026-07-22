import type { Prisma } from "@prisma/client";

export type VendaServicoInput = {
  procedimentoServicoId?: number | null;
  descricao: string;
  valorUnitario: number;
  custoUnitario: number;
};

export type VendaProdutoInput = {
  produtoId: number;
  quantidade: number;
  valorUnitario?: number;
};

export type CriarVendaNoTxInput = {
  clienteId?: number | null;
  agendamentoId?: number | null;
  data: Date;
  formaPagamento?: string | null;
  statusPagamento?: string | null;
  origem: string;
  observacoes?: string | null;
  servico?: VendaServicoInput | null;
  produtos?: VendaProdutoInput[];
};

function numeroSeguro(value: unknown) {
  const numero = Number(value);
  return Number.isFinite(numero) ? numero : 0;
}

function dinheiroSeguro(value: unknown) {
  return Math.max(0, numeroSeguro(value));
}

function quantidadeSegura(value: unknown) {
  const numero = Math.trunc(numeroSeguro(value));
  return Math.max(0, numero);
}

function normalizarStatusPagamento(value?: string | null) {
  return value?.trim() || "Pago";
}

function categoriaLancamento(params: {
  temServico: boolean;
  temProdutos: boolean;
  statusPagamento: string;
}) {
  if (params.statusPagamento.toLowerCase() !== "pago") {
    return "A receber";
  }

  if (params.temServico && params.temProdutos) return "Vendas mistas";
  if (params.temProdutos) return "Produtos";
  return "Procedimentos";
}

export async function criarVendaNoTx(
  tx: Prisma.TransactionClient,
  dados: CriarVendaNoTxInput,
) {
  const statusPagamento = normalizarStatusPagamento(dados.statusPagamento);
  const formaPagamento = dados.formaPagamento?.trim() || "Não informado";
  const produtosEntrada = (dados.produtos || []).filter(
    (item) => item.produtoId > 0 && quantidadeSegura(item.quantidade) > 0,
  );

  const idsProdutos = Array.from(
    new Set(produtosEntrada.map((item) => item.produtoId)),
  );

  const produtosBanco = idsProdutos.length
    ? await tx.produto.findMany({
        where: { id: { in: idsProdutos } },
        select: {
          id: true,
          nome: true,
          unidade: true,
          quantidade: true,
          valorCompra: true,
          valorVenda: true,
          status: true,
        },
      })
    : [];

  const produtoPorId = new Map(produtosBanco.map((item) => [item.id, item]));

  const produtosNormalizados = produtosEntrada.map((item) => {
    const produto = produtoPorId.get(item.produtoId);

    if (!produto) {
      throw new Error(`Produto #${item.produtoId} não encontrado.`);
    }

    if (produto.status.toLowerCase() !== "ativo") {
      throw new Error(`O produto ${produto.nome} não está ativo para venda.`);
    }

    const quantidade = quantidadeSegura(item.quantidade);
    const valorUnitario =
      item.valorUnitario === undefined
        ? dinheiroSeguro(produto.valorVenda)
        : dinheiroSeguro(item.valorUnitario);
    const custoUnitario = dinheiroSeguro(produto.valorCompra);

    return {
      produto,
      quantidade,
      valorUnitario,
      custoUnitario,
      valorTotal: valorUnitario * quantidade,
      custoTotal: custoUnitario * quantidade,
    };
  });

  const servico = dados.servico?.descricao.trim()
    ? {
        procedimentoServicoId: dados.servico.procedimentoServicoId || null,
        descricao: dados.servico.descricao.trim(),
        valorUnitario: dinheiroSeguro(dados.servico.valorUnitario),
        custoUnitario: dinheiroSeguro(dados.servico.custoUnitario),
      }
    : null;

  const totalServicos = servico?.valorUnitario || 0;
  const custoServicos = servico?.custoUnitario || 0;
  const totalProdutos = produtosNormalizados.reduce(
    (total, item) => total + item.valorTotal,
    0,
  );
  const custoProdutos = produtosNormalizados.reduce(
    (total, item) => total + item.custoTotal,
    0,
  );
  const valorTotal = totalServicos + totalProdutos;
  const custoTotal = custoServicos + custoProdutos;

  const venda = await tx.venda.create({
    data: {
      clienteId: dados.clienteId || null,
      agendamentoId: dados.agendamentoId || null,
      totalServicos,
      totalProdutos,
      custoServicos,
      custoProdutos,
      valorTotal,
      custoTotal,
      formaPagamento,
      statusPagamento,
      origem: dados.origem,
      observacoes: dados.observacoes?.trim() || null,
      data: dados.data,
    },
  });

  if (servico) {
    await tx.vendaItem.create({
      data: {
        vendaId: venda.id,
        tipo: "SERVICO",
        procedimentoServicoId: servico.procedimentoServicoId,
        descricao: servico.descricao,
        quantidade: 1,
        valorUnitario: servico.valorUnitario,
        custoUnitario: servico.custoUnitario,
        valorTotal: servico.valorUnitario,
        custoTotal: servico.custoUnitario,
      },
    });
  }

  for (const item of produtosNormalizados) {
    const atualizacao = await tx.produto.updateMany({
      where: {
        id: item.produto.id,
        quantidade: { gte: item.quantidade },
      },
      data: {
        quantidade: { decrement: item.quantidade },
      },
    });

    if (atualizacao.count !== 1) {
      throw new Error(
        `Estoque insuficiente para ${item.produto.nome}. Disponível: ${item.produto.quantidade} ${item.produto.unidade}.`,
      );
    }

    const vendaItem = await tx.vendaItem.create({
      data: {
        vendaId: venda.id,
        tipo: "PRODUTO",
        produtoId: item.produto.id,
        descricao: item.produto.nome,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        custoUnitario: item.custoUnitario,
        valorTotal: item.valorTotal,
        custoTotal: item.custoTotal,
      },
    });

    await tx.movimentacaoEstoque.create({
      data: {
        produtoId: item.produto.id,
        vendaItemId: vendaItem.id,
        tipo: "SAIDA",
        quantidade: item.quantidade,
        motivo: `Venda #${venda.id}`,
        observacoes: dados.agendamentoId
          ? `Baixa automática na finalização do agendamento #${dados.agendamentoId}.`
          : "Baixa automática por venda de produto.",
      },
    });
  }

  let lancamentoId: number | null = null;

  if (valorTotal > 0) {
    const cliente = dados.clienteId
      ? await tx.cliente.findUnique({
          where: { id: dados.clienteId },
          select: { nome: true },
        })
      : null;

    const temServico = Boolean(servico);
    const temProdutos = produtosNormalizados.length > 0;
    const partesDescricao = [
      temServico ? servico?.descricao : null,
      temProdutos
        ? `${produtosNormalizados.reduce((total, item) => total + item.quantidade, 0)} item(ns) de produto`
        : null,
    ].filter(Boolean);

    const lancamento = await tx.lancamento.create({
      data: {
        descricao: `Venda ${partesDescricao.join(" + ")}${cliente?.nome ? ` - ${cliente.nome}` : ""}`,
        valor: valorTotal,
        tipo: "ENTRADA",
        categoria: categoriaLancamento({
          temServico,
          temProdutos,
          statusPagamento,
        }),
        observacoes: [
          `Venda #${venda.id} gerada automaticamente.`,
          dados.agendamentoId ? `Agendamento #${dados.agendamentoId}.` : null,
          `Serviços: R$ ${totalServicos.toFixed(2)}.`,
          `Produtos: R$ ${totalProdutos.toFixed(2)}.`,
          `Forma de pagamento: ${formaPagamento}.`,
          `Status do pagamento: ${statusPagamento}.`,
          dados.observacoes?.trim() || null,
        ]
          .filter(Boolean)
          .join("\n"),
        data: dados.data,
        formaPagamento,
        statusPagamento,
        origem: dados.origem,
        agendamentoId: dados.agendamentoId || null,
        clienteId: dados.clienteId || null,
      },
    });

    lancamentoId = lancamento.id;

    await tx.venda.update({
      where: { id: venda.id },
      data: { lancamentoId },
    });
  }

  if (dados.clienteId && valorTotal > 0) {
    await tx.cliente.update({
      where: { id: dados.clienteId },
      data: {
        valorGasto: { increment: valorTotal },
      },
    });
  }

  return {
    vendaId: venda.id,
    lancamentoId,
    totalServicos,
    totalProdutos,
    custoServicos,
    custoProdutos,
    valorTotal,
    custoTotal,
    margem: valorTotal - custoTotal,
  };
}
