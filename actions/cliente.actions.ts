"use server";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ClienteForm = {
  id?: number;

  nome: string;
  telefone: string;
  whatsapp?: string;
  cpf?: string;
  instagram?: string;
  origem?: string;
  procedimentoInteresse?: string;
  nascimento?: string;
  observacoes?: string;
};

export async function listarClientes() {
  await requirePermission("clientes.visualizar");
  return await prisma.cliente.findMany({
    orderBy: {
      nome: "asc",
    },
  });
}

export async function criarCliente(dados: ClienteForm) {
  await requirePermission("clientes.gerenciar");
  await prisma.cliente.create({
    data: {
      nome: dados.nome,
      telefone: dados.telefone,
      whatsapp: dados.whatsapp || null,
      cpf: dados.cpf || null,
      instagram: dados.instagram || null,
      origem: dados.origem || null,
      procedimentoInteresse: dados.procedimentoInteresse || null,
      nascimento: dados.nascimento
        ? new Date(dados.nascimento)
        : null,
      observacoes: dados.observacoes || null,
    },
  });

  revalidatePath("/clientes");
}

export async function atualizarCliente(dados: ClienteForm) {
  await requirePermission("clientes.gerenciar");
  if (!dados.id) return;

  await prisma.cliente.update({
    where: {
      id: dados.id,
    },
    data: {
      nome: dados.nome,
      telefone: dados.telefone,
      whatsapp: dados.whatsapp || null,
      cpf: dados.cpf || null,
      instagram: dados.instagram || null,
      origem: dados.origem || null,
      procedimentoInteresse: dados.procedimentoInteresse || null,
      nascimento: dados.nascimento
        ? new Date(dados.nascimento)
        : null,
      observacoes: dados.observacoes || null,
    },
  });

  revalidatePath("/clientes");
}

export async function excluirCliente(id: number) {
  await requirePermission("clientes.gerenciar");
  await prisma.cliente.delete({
    where: {
      id,
    },
  });

  revalidatePath("/clientes");
}

export async function buscarCliente(id: number) {
  await requirePermission("clientes.visualizar");
  return await prisma.cliente.findUnique({
    where: {
      id,
    },
  });
}