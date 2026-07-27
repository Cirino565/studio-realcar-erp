"use server";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function textoOpcional(valor?: string) {
  return valor?.trim() || null;
}

function normalizarCep(valor?: string) {
  const original = valor?.trim() || "";
  const digitos = original.replace(/\D/g, "");
  if (!original) return null;
  if (digitos.length === 8) return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
  return original;
}

function normalizarEstado(valor?: string) {
  return valor?.trim().toUpperCase().slice(0, 2) || null;
}

export type ClienteForm = {
  id?: number;

  nome: string;
  telefone: string;
  whatsapp?: string;
  cpf?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  enderecoOriginal?: string;
  origem?: string;
  procedimentoInteresse?: string;
  nascimento?: string;
  observacoes?: string;
  areaEstetica?: boolean;
  areaCilios?: boolean;
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
      whatsapp: textoOpcional(dados.whatsapp),
      cpf: textoOpcional(dados.cpf),
      cep: normalizarCep(dados.cep),
      logradouro: textoOpcional(dados.logradouro),
      numero: textoOpcional(dados.numero),
      complemento: textoOpcional(dados.complemento),
      bairro: textoOpcional(dados.bairro),
      cidade: textoOpcional(dados.cidade),
      estado: normalizarEstado(dados.estado),
      enderecoOriginal: textoOpcional(dados.enderecoOriginal),
      origem: textoOpcional(dados.origem),
      procedimentoInteresse: textoOpcional(dados.procedimentoInteresse),
      nascimento: dados.nascimento
        ? new Date(dados.nascimento)
        : null,
      observacoes: textoOpcional(dados.observacoes),
      areaEstetica: Boolean(dados.areaEstetica),
      areaCilios: Boolean(dados.areaCilios),
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
      whatsapp: textoOpcional(dados.whatsapp),
      cpf: textoOpcional(dados.cpf),
      cep: normalizarCep(dados.cep),
      logradouro: textoOpcional(dados.logradouro),
      numero: textoOpcional(dados.numero),
      complemento: textoOpcional(dados.complemento),
      bairro: textoOpcional(dados.bairro),
      cidade: textoOpcional(dados.cidade),
      estado: normalizarEstado(dados.estado),
      enderecoOriginal: textoOpcional(dados.enderecoOriginal),
      origem: textoOpcional(dados.origem),
      procedimentoInteresse: textoOpcional(dados.procedimentoInteresse),
      nascimento: dados.nascimento
        ? new Date(dados.nascimento)
        : null,
      observacoes: textoOpcional(dados.observacoes),
      areaEstetica: Boolean(dados.areaEstetica),
      areaCilios: Boolean(dados.areaCilios),
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