"use server";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getProdutos() {
  await requirePermission("estoque.visualizar");
  return prisma.produto.findMany({
    include: {
      fornecedor: true,
      movimentacoes: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getProdutoById(id: number) {
  await requirePermission("estoque.visualizar");
  return prisma.produto.findUnique({
    where: { id },
    include: {
      fornecedor: true,
      movimentacoes: true,
      itensCompra: true,
    },
  });
}

export async function createProduto(data: {
  nome: string;
  categoria?: string;
  unidade?: string;
  quantidade?: number;
  estoqueMinimo?: number;
  valorCompra?: number;
  valorVenda?: number;
  fornecedorId?: number;
  observacoes?: string;
}) {
  await requirePermission("estoque.gerenciar");

  return prisma.produto.create({
    data: {
      nome: data.nome,
      categoria: data.categoria,
      unidade: data.unidade ?? "un",
      quantidade: data.quantidade ?? 0,
      estoqueMinimo: data.estoqueMinimo ?? 0,
      valorCompra: data.valorCompra ?? 0,
      valorVenda: data.valorVenda ?? 0,
      fornecedorId: data.fornecedorId,
      observacoes: data.observacoes,
    },
  });
}

export async function updateProduto(
  id: number,
  data: {
    nome?: string;
    categoria?: string;
    unidade?: string;
    quantidade?: number;
    estoqueMinimo?: number;
    valorCompra?: number;
    valorVenda?: number;
    fornecedorId?: number | null;
    observacoes?: string;
  }
) {
  await requirePermission("estoque.gerenciar");

  return prisma.produto.update({
    where: { id },
    data,
  });
}

export async function deleteProduto(id: number) {
  await requirePermission("estoque.gerenciar");
  return prisma.produto.delete({
    where: { id },
  });
}

export async function registrarMovimentacao(data: {
  produtoId: number;
  tipo: "ENTRADA" | "SAIDA";
  quantidade: number;
  motivo: string;
  observacoes?: string;
}) {
  await requirePermission("estoque.gerenciar");

  return prisma.$transaction(async (tx) => {
    const produto = await tx.produto.findUnique({
      where: { id: data.produtoId },
    });

    if (!produto) {
      throw new Error("Produto não encontrado");
    }

    const novaQuantidade =
      data.tipo === "ENTRADA"
        ? produto.quantidade + data.quantidade
        : produto.quantidade - data.quantidade;

    if (novaQuantidade < 0) {
      throw new Error("Estoque insuficiente");
    }

    await tx.produto.update({
      where: { id: data.produtoId },
      data: {
        quantidade: novaQuantidade,
      },
    });

    return tx.movimentacaoEstoque.create({
      data: {
        produtoId: data.produtoId,
        tipo: data.tipo,
        quantidade: data.quantidade,
        motivo: data.motivo,
        observacoes: data.observacoes,
      },
    });
  });
}

export async function getFornecedores() {
  await requirePermission("estoque.visualizar");
  return prisma.fornecedor.findMany({
    orderBy: {
      nome: "asc",
    },
  });
}
