"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ProdutoInput = {
  nome?: string;
  categoria?: string;
  unidade?: string;
  quantidade?: number;
  estoqueMinimo?: number;
  valorCompra?: number;
  valorVenda?: number;
  fornecedorId?: number | null;
  observacoes?: string;
};

type FornecedorInput = {
  nome: string;
  telefone?: string;
  email?: string;
  cnpj?: string;
  endereco?: string;
  observacoes?: string;
};

function limparTexto(value?: string) {
  const texto = value?.trim();
  return texto ? texto : null;
}

function revalidarEstoque() {
  revalidatePath("/estoque");
  revalidatePath("/relatorios");
  revalidatePath("/");
}

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

export async function createProduto(data: ProdutoInput) {
  await requirePermission("estoque.gerenciar");

  const nome = data.nome?.trim();

  if (!nome) {
    throw new Error("Informe o nome do produto.");
  }

  await prisma.produto.create({
    data: {
      nome,
      categoria: limparTexto(data.categoria),
      unidade: data.unidade?.trim() || "un",
      quantidade: data.quantidade ?? 0,
      estoqueMinimo: data.estoqueMinimo ?? 0,
      valorCompra: data.valorCompra ?? 0,
      valorVenda: data.valorVenda ?? 0,
      fornecedorId: data.fornecedorId || null,
      observacoes: limparTexto(data.observacoes),
    },
  });

  revalidarEstoque();

  return {
    ok: true,
  };
}

export async function updateProduto(id: number, data: ProdutoInput) {
  await requirePermission("estoque.gerenciar");

  const nome = data.nome?.trim();

  if (data.nome !== undefined && !nome) {
    throw new Error("Informe o nome do produto.");
  }

  await prisma.produto.update({
    where: { id },
    data: {
      nome,
      categoria:
        data.categoria === undefined ? undefined : limparTexto(data.categoria),
      unidade: data.unidade?.trim() || undefined,
      quantidade: data.quantidade,
      estoqueMinimo: data.estoqueMinimo,
      valorCompra: data.valorCompra,
      valorVenda: data.valorVenda,
      fornecedorId:
        data.fornecedorId === undefined ? undefined : data.fornecedorId,
      observacoes:
        data.observacoes === undefined
          ? undefined
          : limparTexto(data.observacoes),
    },
  });

  revalidarEstoque();

  return {
    ok: true,
  };
}

export async function deleteProduto(id: number) {
  await requirePermission("estoque.gerenciar");

  await prisma.produto.delete({
    where: {
      id,
    },
  });

  revalidarEstoque();

  return {
    ok: true,
  };
}

export async function registrarMovimentacao(data: {
  produtoId: number;
  tipo: "ENTRADA" | "SAIDA";
  quantidade: number;
  motivo: string;
  observacoes?: string;
}) {
  await requirePermission("estoque.gerenciar");

  if (!data.produtoId) {
    throw new Error("Selecione um produto.");
  }

  if (!data.quantidade || data.quantidade <= 0) {
    throw new Error("Informe uma quantidade maior que zero.");
  }

  if (!data.motivo?.trim()) {
    throw new Error("Informe o motivo da movimentação.");
  }

  await prisma.$transaction(async (tx) => {
    const produto = await tx.produto.findUnique({
      where: {
        id: data.produtoId,
      },
    });

    if (!produto) {
      throw new Error("Produto não encontrado.");
    }

    const novaQuantidade =
      data.tipo === "ENTRADA"
        ? produto.quantidade + data.quantidade
        : produto.quantidade - data.quantidade;

    if (novaQuantidade < 0) {
      throw new Error("Estoque insuficiente.");
    }

    await tx.produto.update({
      where: {
        id: data.produtoId,
      },
      data: {
        quantidade: novaQuantidade,
      },
    });

    await tx.movimentacaoEstoque.create({
      data: {
        produtoId: data.produtoId,
        tipo: data.tipo,
        quantidade: data.quantidade,
        motivo: data.motivo.trim(),
        observacoes: limparTexto(data.observacoes),
      },
    });
  });

  revalidarEstoque();

  return {
    ok: true,
  };
}

export async function getFornecedores() {
  await requirePermission("estoque.visualizar");

  return prisma.fornecedor.findMany({
    orderBy: {
      nome: "asc",
    },
  });
}

export async function createFornecedor(data: FornecedorInput) {
  await requirePermission("estoque.gerenciar");

  const nome = data.nome?.trim();

  if (!nome) {
    throw new Error("Informe o nome do fornecedor.");
  }

  await prisma.fornecedor.create({
    data: {
      nome,
      telefone: limparTexto(data.telefone),
      email: limparTexto(data.email),
      cnpj: limparTexto(data.cnpj),
      endereco: limparTexto(data.endereco),
      observacoes: limparTexto(data.observacoes),
      status: "Ativo",
    },
  });

  revalidarEstoque();

  return {
    ok: true,
  };
}