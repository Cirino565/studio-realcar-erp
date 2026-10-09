"use server";

import { revalidatePath } from "next/cache";

import { isAdminUser, requirePermission } from "@/lib/auth";
import { calcularTaxaRecebimento } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import {
  criarVendaNoTx,
  type VendaKitInput,
  type VendaProdutoInput,
} from "@/lib/vendas";

export type CriarVendaProdutosInput = {
  clienteId: number;
  produtos: VendaProdutoInput[];
  kits?: VendaKitInput[];
  permitirEstoqueNegativo?: boolean;
  formaPagamento?: string;
  formaPagamentoConfigId?: number | null;
  contaFinanceiraId?: number | null;
  campanhaId?: number | null;
  statusPagamento?: string;
  observacoes?: string;
};

export type EditarVendaAdministrativaInput = {
  vendaId: number;
  formaPagamento?: string;
  statusPagamento: "Pago" | "Pendente";
  observacoes?: string;
  data: string;
  /** Valor cobrado de cada linha (serviço ou produto) que foi corrigida. */
  itens?: Array<{ id: number; valorTotal: number }>;
};

export type CancelarVendaAdministrativaInput = {
  vendaId: number;
  motivo: string;
};

function revalidarVenda(clienteId?: number | null) {
  revalidatePath("/vendas");
  revalidatePath("/estoque");
  revalidatePath("/financeiro");
  revalidatePath("/gestao");
  revalidatePath("/relatorios");
  revalidatePath("/");

  if (clienteId) {
    revalidatePath(`/clientes/${clienteId}`);
    revalidatePath("/clientes");
  }
}

export async function criarVendaProdutos(dados: CriarVendaProdutosInput) {
  const usuarioAtual = await requirePermission("financeiro.gerenciar");

  if (!dados.clienteId || dados.clienteId <= 0) {
    throw new Error("Selecione a cliente da venda.");
  }

  const produtos = (dados.produtos || []).filter(
    (item) => item.produtoId > 0 && item.quantidade > 0,
  );
  const kits = (dados.kits || []).filter(
    (item) => item.kitId > 0 && item.quantidade > 0,
  );

  if (produtos.length === 0 && kits.length === 0) {
    throw new Error("Adicione pelo menos um produto ou kit à venda.");
  }

  const permitirEstoqueNegativo =
    Boolean(dados.permitirEstoqueNegativo) && isAdminUser(usuarioAtual);

  if (dados.permitirEstoqueNegativo && !permitirEstoqueNegativo) {
    throw new Error("Somente administradores podem autorizar estoque negativo.");
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: dados.clienteId },
    select: { id: true, nome: true },
  });

  if (!cliente) {
    throw new Error("Cliente não encontrada.");
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const venda = await criarVendaNoTx(tx, {
      clienteId: cliente.id,
      data: new Date(),
      formaPagamento: dados.formaPagamento,
      formaPagamentoConfigId: dados.formaPagamentoConfigId,
      contaFinanceiraId: dados.contaFinanceiraId,
      campanhaId: dados.campanhaId,
      statusPagamento: dados.statusPagamento,
      origem: "Vendas",
      observacoes: dados.observacoes,
      produtos,
      kits,
      permitirEstoqueNegativo,
      estoqueNegativoAutorizadoPor: permitirEstoqueNegativo
        ? usuarioAtual.email
        : null,
    });

    await tx.auditoria.create({
      data: {
        modulo: "Vendas",
        acao: "Registrou venda de produtos",
        entidade: "Venda",
        entidadeId: String(venda.vendaId),
        usuario: usuarioAtual.email,
        detalhes: `Cliente: ${cliente.nome}. Total: R$ ${venda.valorTotal.toFixed(2)}. Custo: R$ ${venda.custoTotal.toFixed(2)}.${venda.estoqueNegativoAutorizado ? ` Estoque negativo autorizado por ${usuarioAtual.email}.` : ""}`,
      },
    });

    return venda;
  }, { maxWait: 15000, timeout: 30000 });

  revalidarVenda(cliente.id);

  return {
    ok: true,
    ...resultado,
  };
}

async function requireAdministradorVendas() {
  const usuario = await requirePermission("financeiro.gerenciar");
  if (!isAdminUser(usuario)) {
    throw new Error("Somente administradores podem corrigir ou cancelar vendas concluídas.");
  }
  return usuario;
}

function textoOpcional(valor?: string | null) {
  const texto = valor?.trim();
  return texto || null;
}

function statusPagamentoAdministrativo(valor: string) {
  return valor === "Pendente" ? "Pendente" : "Pago";
}

export async function editarVendaAdministrativa(
  dados: EditarVendaAdministrativaInput,
) {
  const usuario = await requireAdministradorVendas();
  const vendaId = Math.trunc(Number(dados.vendaId));
  if (!vendaId || vendaId <= 0) throw new Error("Venda inválida.");

  const data = new Date(dados.data);
  if (Number.isNaN(data.getTime())) throw new Error("Informe uma data válida.");

  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    select: {
      id: true,
      clienteId: true,
      lancamentoId: true,
      lancamento: { select: { id: true, observacoes: true } },
      situacao: true,
      totalServicos: true,
      totalProdutos: true,
      valorTotal: true,
      sinalAbatido: true,
      formaPagamentoConfigId: true,
      contaFinanceiraId: true,
      campanhaId: true,
      formaPagamento: true,
      statusPagamento: true,
      observacoes: true,
      data: true,
      conversaoAdsEnviadaEm: true,
      agendamentoId: true,
      itens: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          tipo: true,
          descricao: true,
          quantidade: true,
          valorTotal: true,
        },
      },
    },
  });

  if (!venda) throw new Error("Venda não encontrada.");
  if (venda.situacao === "CANCELADA") {
    throw new Error("Uma venda cancelada não pode ser editada. Use Refazer venda para criar um novo registro.");
  }
  if (venda.conversaoAdsEnviadaEm && venda.data.getTime() !== data.getTime()) {
    throw new Error(
      "Esta venda já teve a conversão enviada ao Google Ads e não pode ter a data alterada, pois isso pode gerar uma conversão duplicada. Se precisar corrigir, registre um ajuste financeiro em vez de editar esta venda.",
    );
  }

  // Correção de valor: só linhas de serviço e de produto avulso podem ser
  // corrigidas (kits e baixa de estoque não mudam).
  const arredondar = (numero: number) => Math.round(numero * 100) / 100;
  const novosValores = new Map<number, number>();
  for (const pedido of dados.itens || []) {
    const itemId = Math.trunc(Number(pedido?.id));
    const item = venda.itens.find((linha) => linha.id === itemId);
    if (!item) throw new Error("Um dos itens informados não pertence a esta venda.");
    if (item.tipo !== "SERVICO" && item.tipo !== "PRODUTO") {
      throw new Error(`O valor de "${item.descricao}" não pode ser corrigido por aqui.`);
    }
    const valor = arredondar(Number(pedido.valorTotal));
    if (!Number.isFinite(valor) || valor < 0 || valor > 1_000_000) {
      throw new Error(`Valor inválido em "${item.descricao}".`);
    }
    if (Math.abs(valor - item.valorTotal) >= 0.005) novosValores.set(item.id, valor);
  }

  const valorMudou = novosValores.size > 0;
  const linhasNovas = venda.itens.map((linha) => ({
    ...linha,
    valorTotal: novosValores.get(linha.id) ?? linha.valorTotal,
  }));
  const totalServicosNovo = valorMudou
    ? arredondar(
        linhasNovas
          .filter((linha) => linha.tipo === "SERVICO")
          .reduce((total, linha) => total + linha.valorTotal, 0),
      )
    : venda.totalServicos;
  const totalProdutosNovo = valorMudou
    ? arredondar(
        linhasNovas
          .filter((linha) => linha.tipo === "PRODUTO" || linha.tipo === "KIT")
          .reduce((total, linha) => total + linha.valorTotal, 0),
      )
    : venda.totalProdutos;
  const valorTotalNovo = valorMudou
    ? arredondar(totalServicosNovo + totalProdutosNovo)
    : venda.valorTotal;

  if (valorMudou && valorTotalNovo <= 0) {
    throw new Error(
      "O valor total da venda não pode ficar zerado. Para anular a venda, use Cancelar e estornar.",
    );
  }
  if (valorMudou && !venda.lancamento) {
    throw new Error(
      "Esta venda não tem lançamento financeiro para corrigir. Use Refazer venda para criar um novo registro.",
    );
  }

  const detalheValores = valorMudou
    ? ` Valor da venda: R$ ${venda.valorTotal.toFixed(2)} -> R$ ${valorTotalNovo.toFixed(2)}. Linhas corrigidas: ${Array.from(
        novosValores,
      )
        .map(([itemId, valor]) => {
          const item = venda.itens.find((linha) => linha.id === itemId);
          return `${item?.descricao || "item"} R$ ${(item?.valorTotal ?? 0).toFixed(2)} -> R$ ${valor.toFixed(2)}`;
        })
        .join("; ")}.`
    : "";

  const formaPagamento = textoOpcional(dados.formaPagamento) || "Não informado";
  const statusPagamento = statusPagamentoAdministrativo(dados.statusPagamento);
  const observacoes = textoOpcional(dados.observacoes);
  const categoriaLancamento =
    statusPagamento === "Pendente"
      ? "A receber"
      : totalServicosNovo > 0 && totalProdutosNovo > 0
        ? "Vendas mistas"
        : totalProdutosNovo > 0
          ? "Produtos"
          : "Procedimentos";

  await prisma.$transaction(async (tx) => {
    const formaConfig = await tx.formaPagamentoConfig.findFirst({
      where: { nome: formaPagamento, status: "Ativa" },
    });
    // Se parte do valor ja entrou como sinal, o lancamento da venda e so o
    // restante (o sinal continua no Financeiro como lancamento proprio).
    const valorDoLancamento = Math.max(
      0,
      arredondar(valorTotalNovo - (venda.sinalAbatido || 0)),
    );
    const calculoTaxa = calcularTaxaRecebimento(
      valorDoLancamento,
      formaConfig?.taxaPercentual || 0,
      formaConfig?.taxaFixa || 0,
    );
    const prazoRecebimentoDias = Math.max(0, Math.trunc(formaConfig?.prazoDias || 0));
    const recebimentoPrevistoEm = new Date(
      data.getTime() + prazoRecebimentoDias * 86_400_000,
    );
    const contaFinanceiraId =
      venda.contaFinanceiraId ||
      (
        await tx.contaFinanceira.findFirst({
          where: { principal: true, status: "Ativa" },
          select: { id: true },
        })
      )?.id ||
      null;

    const vendaAtualizada = await tx.venda.updateMany({
      where: {
        id: venda.id,
        situacao: { not: "CANCELADA" },
      },
      data: {
        formaPagamento,
        formaPagamentoConfigId: formaConfig?.id || null,
        contaFinanceiraId,
        taxaPagamento: calculoTaxa.taxaPagamento,
        taxaPercentualAplicada: calculoTaxa.taxaPercentual,
        taxaFixaAplicada: calculoTaxa.taxaFixa,
        valorLiquido: calculoTaxa.valorLiquido,
        prazoRecebimentoDias,
        recebimentoPrevistoEm,
        statusPagamento,
        observacoes,
        data,
        ...(valorMudou
          ? {
              totalServicos: totalServicosNovo,
              totalProdutos: totalProdutosNovo,
              valorTotal: valorTotalNovo,
            }
          : {}),
      },
    });

    if (vendaAtualizada.count !== 1) {
      throw new Error(
        "A venda foi cancelada ou alterada por outro usuário. Atualize a página antes de continuar.",
      );
    }

    if (valorMudou) {
      for (const [itemId, valor] of novosValores) {
        const item = venda.itens.find((linha) => linha.id === itemId);
        if (!item) continue;
        await tx.vendaItem.update({
          where: { id: itemId },
          data: {
            valorTotal: valor,
            valorUnitario:
              item.tipo === "PRODUTO" && item.quantidade > 0
                ? valor / item.quantidade
                : valor,
          },
        });
      }

      // O total que a cliente já gastou acompanha a correção.
      const diferenca = arredondar(valorTotalNovo - venda.valorTotal);
      if (venda.clienteId && diferenca > 0) {
        await tx.cliente.update({
          where: { id: venda.clienteId },
          data: { valorGasto: { increment: diferenca } },
        });
      } else if (venda.clienteId && diferenca < 0) {
        const descontado = await tx.cliente.updateMany({
          where: { id: venda.clienteId, valorGasto: { gte: -diferenca } },
          data: { valorGasto: { decrement: -diferenca } },
        });
        if (descontado.count !== 1) {
          await tx.cliente.update({
            where: { id: venda.clienteId },
            data: { valorGasto: 0 },
          });
        }
      }

      // Procedimento principal: o valor que aparece na agenda e no histórico
      // da cliente também é corrigido.
      const principal = venda.itens.find((linha) => linha.tipo === "SERVICO");
      const valorPrincipal = principal ? novosValores.get(principal.id) : undefined;
      if (principal && valorPrincipal !== undefined) {
        if (venda.agendamentoId) {
          await tx.agendamento.updateMany({
            where: { id: venda.agendamentoId },
            data: { valor: valorPrincipal },
          });
        }
        if (venda.clienteId) {
          await tx.clienteProcedimento.updateMany({
            where: {
              clienteId: venda.clienteId,
              nome: principal.descricao,
              valor: principal.valorTotal,
              dataProcedimento: venda.data,
            },
            data: { valor: valorPrincipal },
          });
        }
      }
    }

    if (venda.lancamento) {
      const lancamentoAtualizado = await tx.lancamento.updateMany({
        where: {
          id: venda.lancamento.id,
          statusPagamento: { not: "Cancelado" },
        },
        data: {
          formaPagamento,
          formaPagamentoConfigId: formaConfig?.id || null,
          contaFinanceiraId,
          taxaPagamento: calculoTaxa.taxaPagamento,
          taxaPercentualAplicada: calculoTaxa.taxaPercentual,
          taxaFixaAplicada: calculoTaxa.taxaFixa,
          valorLiquido: calculoTaxa.valorLiquido,
          prazoRecebimentoDias,
          recebimentoPrevistoEm,
          statusPagamento,
          ...(valorMudou ? { valor: valorDoLancamento } : {}),
          categoria: categoriaLancamento,
          data,
          observacoes: [
            venda.lancamento.observacoes,
            `Venda #${venda.id} atualizada administrativamente por ${usuario.email}.`,
            valorMudou
              ? `Valor corrigido de R$ ${venda.valorTotal.toFixed(2)} para R$ ${valorTotalNovo.toFixed(2)}.`
              : null,
            observacoes,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      });

      if (lancamentoAtualizado.count !== 1) {
        throw new Error(
          "O lançamento financeiro já foi cancelado ou alterado. Atualize a página antes de continuar.",
        );
      }
    }

    await tx.auditoria.create({
      data: {
        modulo: "Vendas",
        acao: "Editou dados administrativos da venda",
        entidade: "Venda",
        entidadeId: String(venda.id),
        usuario: usuario.email,
        detalhes: `Pagamento: ${venda.statusPagamento} -> ${statusPagamento}. Forma: ${venda.formaPagamento || "não informada"} -> ${formaPagamento}. Taxa atual: R$ ${calculoTaxa.taxaPagamento.toFixed(2)}. Data anterior: ${venda.data.toISOString()}.${detalheValores}`,
      },
    });
  });

  revalidarVenda(venda.clienteId);
  return {
    ok: true,
    mensagem: valorMudou
      ? `Venda #${venda.id} atualizada. Novo valor: R$ ${valorTotalNovo.toFixed(2).replace(".", ",")}.`
      : `Venda #${venda.id} atualizada.`,
  };
}

export async function cancelarVendaAdministrativa(
  dados: CancelarVendaAdministrativaInput,
) {
  const usuario = await requireAdministradorVendas();
  const vendaId = Math.trunc(Number(dados.vendaId));
  const motivo = dados.motivo?.trim();

  if (!vendaId || vendaId <= 0) throw new Error("Venda inválida.");
  if (!motivo || motivo.length < 5) {
    throw new Error("Informe um motivo com pelo menos 5 caracteres.");
  }
  if (motivo.length > 500) {
    throw new Error("O motivo deve ter no máximo 500 caracteres.");
  }

  const venda = await prisma.venda.findUnique({
    where: { id: vendaId },
    include: {
      cliente: { select: { id: true, nome: true } },
      lancamento: { select: { id: true, observacoes: true, statusPagamento: true } },
      itens: {
        select: {
          id: true,
          tipo: true,
          produtoId: true,
          descricao: true,
          quantidade: true,
        },
      },
    },
  });

  if (!venda) throw new Error("Venda não encontrada.");
  if (venda.situacao === "CANCELADA") {
    throw new Error("Esta venda já foi cancelada e estornada.");
  }

  const itensQueMovimentamEstoque = venda.itens.filter(
    (item) =>
      (item.tipo === "PRODUTO" || item.tipo === "KIT_COMPONENTE") &&
      item.quantidade > 0,
  );
  const itensSemProduto = itensQueMovimentamEstoque.filter(
    (item) => !item.produtoId,
  );
  if (itensSemProduto.length > 0) {
    throw new Error(
      "Não foi possível estornar esta venda com segurança porque um produto histórico não está mais vinculado ao cadastro. Não altere a venda e solicite uma revisão técnica.",
    );
  }

  const itensEstoque = itensQueMovimentamEstoque.map((item) => ({
    ...item,
    produtoId: item.produtoId as number,
  }));
  const agora = new Date();

  await prisma.$transaction(async (tx) => {
    const vendaMarcada = await tx.venda.updateMany({
      where: {
        id: venda.id,
        situacao: { not: "CANCELADA" },
      },
      data: {
        situacao: "CANCELADA",
        statusPagamento: "Cancelado",
        canceladaEm: agora,
        canceladaPor: usuario.email,
        motivoCancelamento: motivo,
      },
    });

    if (vendaMarcada.count !== 1) {
      throw new Error(
        "Esta venda já foi cancelada ou está sendo processada por outro usuário.",
      );
    }

    for (const item of itensEstoque) {
      await tx.produto.update({
        where: { id: item.produtoId },
        data: { quantidade: { increment: item.quantidade } },
      });

      await tx.movimentacaoEstoque.create({
        data: {
          produtoId: item.produtoId,
          tipo: "ENTRADA",
          quantidade: item.quantidade,
          motivo: `Estorno da venda #${venda.id}`,
          observacoes: `Cancelamento administrativo. Item original #${item.id}: ${item.descricao}. Motivo: ${motivo}`,
        },
      });
    }

    if (venda.lancamento) {
      await tx.lancamento.update({
        where: { id: venda.lancamento.id },
        data: {
          statusPagamento: "Cancelado",
          observacoes: [
            venda.lancamento.observacoes,
            `Venda #${venda.id} cancelada e estornada por ${usuario.email} em ${agora.toISOString()}.`,
            `Motivo: ${motivo}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      });
    }

    if (venda.cliente) {
      const valorDescontado = await tx.cliente.updateMany({
        where: {
          id: venda.cliente.id,
          valorGasto: { gte: venda.valorTotal },
        },
        data: {
          valorGasto: { decrement: venda.valorTotal },
        },
      });

      if (valorDescontado.count !== 1) {
        await tx.cliente.update({
          where: { id: venda.cliente.id },
          data: { valorGasto: 0 },
        });
      }
    }

    await tx.auditoria.create({
      data: {
        modulo: "Vendas",
        acao: "Cancelou e estornou venda",
        entidade: "Venda",
        entidadeId: String(venda.id),
        usuario: usuario.email,
        detalhes: `Cliente: ${venda.cliente?.nome || "não vinculada"}. Valor: R$ ${venda.valorTotal.toFixed(2)}. Itens devolvidos ao estoque: ${itensEstoque.length}. Motivo: ${motivo}`,
      },
    });
  });

  revalidarVenda(venda.clienteId);
  return {
    ok: true,
    mensagem: `Venda #${venda.id} cancelada. Estoque e financeiro foram estornados.`,
  };
}
