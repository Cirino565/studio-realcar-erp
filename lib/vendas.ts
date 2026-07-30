import { randomUUID } from "node:crypto";
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

export type VendaKitInput = {
  kitId: number;
  quantidade: number;
  componentes?: Array<{
    produtoId: number;
    quantidade: number;
  }>;
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
  kits?: VendaKitInput[];
  permitirEstoqueNegativo?: boolean;
  estoqueNegativoAutorizadoPor?: string | null;
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

function agruparProdutosEntrada(produtos: VendaProdutoInput[]) {
  const mapa = new Map<number, VendaProdutoInput>();

  for (const item of produtos) {
    const produtoId = Math.trunc(numeroSeguro(item.produtoId));
    const quantidade = quantidadeSegura(item.quantidade);
    if (produtoId <= 0 || quantidade <= 0) continue;

    const atual = mapa.get(produtoId);
    mapa.set(produtoId, {
      produtoId,
      quantidade: (atual?.quantidade || 0) + quantidade,
      valorUnitario:
        item.valorUnitario === undefined
          ? atual?.valorUnitario
          : dinheiroSeguro(item.valorUnitario),
    });
  }

  return Array.from(mapa.values());
}

export async function criarVendaNoTx(
  tx: Prisma.TransactionClient,
  dados: CriarVendaNoTxInput,
) {
  const statusPagamento = normalizarStatusPagamento(dados.statusPagamento);
  const formaPagamento = dados.formaPagamento?.trim() || "Não informado";
  const produtosEntrada = agruparProdutosEntrada(dados.produtos || []);
  const kitsEntrada = (dados.kits || []).filter(
    (item) => item.kitId > 0 && quantidadeSegura(item.quantidade) > 0,
  );

  const idsKits = Array.from(new Set(kitsEntrada.map((item) => item.kitId)));
  const kitsBanco = idsKits.length
    ? await tx.kitProduto.findMany({
        where: { id: { in: idsKits } },
        include: {
          itens: {
            orderBy: [{ ordem: "asc" }, { id: "asc" }],
            select: {
              produtoId: true,
              quantidade: true,
              acrescimo: true,
            },
          },
        },
      })
    : [];
  const kitPorId = new Map(kitsBanco.map((kit) => [kit.id, kit]));

  const kitsNormalizados = kitsEntrada.map((entrada) => {
    const kit = kitPorId.get(entrada.kitId);
    if (!kit) throw new Error(`Kit #${entrada.kitId} não encontrado.`);
    if (kit.status.toLowerCase() !== "ativo") {
      throw new Error(`O kit ${kit.nome} não está ativo para venda.`);
    }

    const quantidadeKits = quantidadeSegura(entrada.quantidade);
    const itensPermitidos = new Map(
      kit.itens.map((item) => [item.produtoId, item]),
    );

    let componentesPorKit: Array<{
      produtoId: number;
      quantidade: number;
      acrescimo: number;
    }>;

    if (kit.tipo === "FIXO") {
      componentesPorKit = kit.itens.map((item) => ({
        produtoId: item.produtoId,
        quantidade: quantidadeSegura(item.quantidade),
        acrescimo: dinheiroSeguro(item.acrescimo),
      }));
    } else {
      const selecao = new Map<number, number>();
      for (const componente of entrada.componentes || []) {
        const produtoId = Math.trunc(numeroSeguro(componente.produtoId));
        const quantidade = quantidadeSegura(componente.quantidade);
        if (produtoId <= 0 || quantidade <= 0) continue;
        if (!itensPermitidos.has(produtoId)) {
          throw new Error(`Um produto selecionado não pertence ao kit ${kit.nome}.`);
        }
        selecao.set(produtoId, (selecao.get(produtoId) || 0) + quantidade);
      }

      const totalEscolhido = Array.from(selecao.values()).reduce(
        (total, quantidade) => total + quantidade,
        0,
      );
      if (totalEscolhido !== kit.quantidadeEscolha) {
        throw new Error(
          `O kit ${kit.nome} exige exatamente ${kit.quantidadeEscolha} item(ns).`,
        );
      }
      if (!kit.permitirRepeticao && Array.from(selecao.values()).some((q) => q > 1)) {
        throw new Error(`O kit ${kit.nome} não permite repetir produtos.`);
      }

      componentesPorKit = Array.from(selecao.entries()).map(
        ([produtoId, quantidade]) => ({
          produtoId,
          quantidade,
          acrescimo: dinheiroSeguro(itensPermitidos.get(produtoId)?.acrescimo),
        }),
      );
    }

    if (componentesPorKit.length === 0) {
      throw new Error(`O kit ${kit.nome} não possui composição válida.`);
    }

    const acrescimoUnitario = componentesPorKit.reduce(
      (total, componente) =>
        total + componente.acrescimo * componente.quantidade,
      0,
    );

    return {
      kit,
      quantidadeKits,
      componentesPorKit,
      valorUnitario: dinheiroSeguro(kit.precoVenda) + acrescimoUnitario,
    };
  });

  const idsProdutos = Array.from(
    new Set([
      ...produtosEntrada.map((item) => item.produtoId),
      ...kitsNormalizados.flatMap((kit) =>
        kit.componentesPorKit.map((item) => item.produtoId),
      ),
    ]),
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
    if (!produto) throw new Error(`Produto #${item.produtoId} não encontrado.`);
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

  const kitsComProdutos = kitsNormalizados.map((kitNormalizado) => {
    const componentes = kitNormalizado.componentesPorKit.map((componente) => {
      const produto = produtoPorId.get(componente.produtoId);
      if (!produto) throw new Error(`Produto #${componente.produtoId} não encontrado.`);
      if (produto.status.toLowerCase() !== "ativo") {
        throw new Error(`O produto ${produto.nome} não está ativo para venda.`);
      }

      const quantidadeTotal =
        componente.quantidade * kitNormalizado.quantidadeKits;
      const custoUnitario = dinheiroSeguro(produto.valorCompra);
      return {
        produto,
        quantidadePorKit: componente.quantidade,
        quantidadeTotal,
        acrescimoUnitario: componente.acrescimo,
        custoUnitario,
        custoTotal: custoUnitario * quantidadeTotal,
      };
    });

    return {
      ...kitNormalizado,
      componentes,
      valorTotal: kitNormalizado.valorUnitario * kitNormalizado.quantidadeKits,
      custoTotal: componentes.reduce((total, item) => total + item.custoTotal, 0),
    };
  });

  const necessidades = new Map<
    number,
    { produto: (typeof produtosBanco)[number]; quantidade: number }
  >();
  for (const item of produtosNormalizados) {
    necessidades.set(item.produto.id, {
      produto: item.produto,
      quantidade: (necessidades.get(item.produto.id)?.quantidade || 0) + item.quantidade,
    });
  }
  for (const kit of kitsComProdutos) {
    for (const componente of kit.componentes) {
      necessidades.set(componente.produto.id, {
        produto: componente.produto,
        quantidade:
          (necessidades.get(componente.produto.id)?.quantidade || 0) +
          componente.quantidadeTotal,
      });
    }
  }

  const insuficientes = Array.from(necessidades.values()).filter(
    (item) => item.quantidade > item.produto.quantidade,
  );
  if (insuficientes.length > 0 && !dados.permitirEstoqueNegativo) {
    const detalhe = insuficientes
      .map(
        (item) =>
          `${item.produto.nome}: precisa ${item.quantidade}, disponível ${item.produto.quantidade} ${item.produto.unidade}`,
      )
      .join("; ");
    throw new Error(`Estoque insuficiente. ${detalhe}.`);
  }

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
  const totalProdutosAvulsos = produtosNormalizados.reduce(
    (total, item) => total + item.valorTotal,
    0,
  );
  const totalKits = kitsComProdutos.reduce(
    (total, item) => total + item.valorTotal,
    0,
  );
  const custoProdutosAvulsos = produtosNormalizados.reduce(
    (total, item) => total + item.custoTotal,
    0,
  );
  const custoKits = kitsComProdutos.reduce(
    (total, item) => total + item.custoTotal,
    0,
  );
  const totalProdutos = totalProdutosAvulsos + totalKits;
  const custoProdutos = custoProdutosAvulsos + custoKits;
  const valorTotal = totalServicos + totalProdutos;
  const custoTotal = custoServicos + custoProdutos;

  const observacaoEstoqueNegativo =
    insuficientes.length > 0 && dados.permitirEstoqueNegativo
      ? `Estoque insuficiente autorizado por ${dados.estoqueNegativoAutorizadoPor || "administrador"}. Itens: ${insuficientes
          .map((item) => item.produto.nome)
          .join(", ")}.`
      : null;

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
      observacoes: [dados.observacoes?.trim() || null, observacaoEstoqueNegativo]
        .filter(Boolean)
        .join("\n") || null,
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

  for (const necessidade of necessidades.values()) {
    if (dados.permitirEstoqueNegativo) {
      await tx.produto.update({
        where: { id: necessidade.produto.id },
        data: { quantidade: { decrement: necessidade.quantidade } },
      });
    } else {
      const atualizacao = await tx.produto.updateMany({
        where: {
          id: necessidade.produto.id,
          quantidade: { gte: necessidade.quantidade },
        },
        data: { quantidade: { decrement: necessidade.quantidade } },
      });
      if (atualizacao.count !== 1) {
        throw new Error(
          `O estoque de ${necessidade.produto.nome} mudou durante a venda. Atualize a página e tente novamente.`,
        );
      }
    }
  }

  for (const item of produtosNormalizados) {
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

  for (const kit of kitsComProdutos) {
    const grupoKitId = randomUUID();
    await tx.vendaItem.create({
      data: {
        vendaId: venda.id,
        tipo: "KIT",
        kitProdutoId: kit.kit.id,
        grupoKitId,
        kitNomeHistorico: kit.kit.nome,
        kitTipoHistorico: kit.kit.tipo,
        descricao: kit.kit.nome,
        quantidade: kit.quantidadeKits,
        valorUnitario: kit.valorUnitario,
        custoUnitario:
          kit.quantidadeKits > 0 ? kit.custoTotal / kit.quantidadeKits : 0,
        valorTotal: kit.valorTotal,
        custoTotal: kit.custoTotal,
      },
    });

    for (const componente of kit.componentes) {
      const vendaItem = await tx.vendaItem.create({
        data: {
          vendaId: venda.id,
          tipo: "KIT_COMPONENTE",
          produtoId: componente.produto.id,
          kitProdutoId: kit.kit.id,
          grupoKitId,
          kitNomeHistorico: kit.kit.nome,
          kitTipoHistorico: kit.kit.tipo,
          acrescimoUnitario: componente.acrescimoUnitario,
          descricao: componente.produto.nome,
          quantidade: componente.quantidadeTotal,
          valorUnitario: 0,
          custoUnitario: componente.custoUnitario,
          valorTotal: 0,
          custoTotal: 0,
        },
      });

      await tx.movimentacaoEstoque.create({
        data: {
          produtoId: componente.produto.id,
          vendaItemId: vendaItem.id,
          tipo: "SAIDA",
          quantidade: componente.quantidadeTotal,
          motivo: `Kit ${kit.kit.nome} · venda #${venda.id}`,
          observacoes: dados.agendamentoId
            ? `Componente de kit baixado na finalização do agendamento #${dados.agendamentoId}.`
            : "Componente de kit baixado automaticamente na venda.",
        },
      });
    }
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
    const temProdutos = produtosNormalizados.length > 0 || kitsComProdutos.length > 0;
    const quantidadeProdutos = produtosNormalizados.reduce(
      (total, item) => total + item.quantidade,
      0,
    );
    const quantidadeKits = kitsComProdutos.reduce(
      (total, item) => total + item.quantidadeKits,
      0,
    );
    const partesDescricao = [
      temServico ? servico?.descricao : null,
      quantidadeProdutos ? `${quantidadeProdutos} item(ns) de produto` : null,
      quantidadeKits ? `${quantidadeKits} kit(s)` : null,
    ].filter(Boolean);

    const lancamento = await tx.lancamento.create({
      data: {
        descricao: `Venda ${partesDescricao.join(" + ")}${cliente?.nome ? ` - ${cliente.nome}` : ""}`,
        valor: valorTotal,
        tipo: "ENTRADA",
        categoria: categoriaLancamento({ temServico, temProdutos, statusPagamento }),
        observacoes: [
          `Venda #${venda.id} gerada automaticamente.`,
          dados.agendamentoId ? `Agendamento #${dados.agendamentoId}.` : null,
          `Serviços: R$ ${totalServicos.toFixed(2)}.`,
          `Produtos e kits: R$ ${totalProdutos.toFixed(2)}.`,
          `Forma de pagamento: ${formaPagamento}.`,
          `Status do pagamento: ${statusPagamento}.`,
          dados.observacoes?.trim() || null,
          observacaoEstoqueNegativo,
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
    await tx.venda.update({ where: { id: venda.id }, data: { lancamentoId } });
  }

  if (dados.clienteId && valorTotal > 0) {
    await tx.cliente.update({
      where: { id: dados.clienteId },
      data: { valorGasto: { increment: valorTotal } },
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
    estoqueNegativoAutorizado: insuficientes.length > 0 && Boolean(dados.permitirEstoqueNegativo),
  };
}
