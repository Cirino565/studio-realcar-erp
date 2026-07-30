"use server";

import { revalidatePath } from "next/cache";

import { isAdminUser, requirePermission } from "@/lib/auth";
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
  statusPagamento?: string;
  observacoes?: string;
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
  });

  revalidarVenda(cliente.id);

  return {
    ok: true,
    ...resultado,
  };
}
