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
  responsavelNome?: string;
  responsavelTelefone?: string;
  responsavelParentesco?: string;
  observacoes?: string;
  areaEstetica?: boolean;
  areaCilios?: boolean;
  campanhaAquisicaoId?: number | null;
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
      responsavelNome: textoOpcional(dados.responsavelNome),
      responsavelTelefone: textoOpcional(dados.responsavelTelefone),
      responsavelParentesco: textoOpcional(dados.responsavelParentesco),
      observacoes: textoOpcional(dados.observacoes),
      areaEstetica: Boolean(dados.areaEstetica),
      areaCilios: Boolean(dados.areaCilios),
      campanhaAquisicaoId:
        dados.campanhaAquisicaoId && dados.campanhaAquisicaoId > 0
          ? Math.trunc(dados.campanhaAquisicaoId)
          : null,
    },
  });

  revalidatePath("/clientes");
  revalidatePath("/marketing");
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
      responsavelNome: textoOpcional(dados.responsavelNome),
      responsavelTelefone: textoOpcional(dados.responsavelTelefone),
      responsavelParentesco: textoOpcional(dados.responsavelParentesco),
      observacoes: textoOpcional(dados.observacoes),
      areaEstetica: Boolean(dados.areaEstetica),
      areaCilios: Boolean(dados.areaCilios),
      campanhaAquisicaoId:
        dados.campanhaAquisicaoId && dados.campanhaAquisicaoId > 0
          ? Math.trunc(dados.campanhaAquisicaoId)
          : null,
    },
  });

  revalidatePath("/clientes");
  revalidatePath("/marketing");
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

export type ClienteAtendimentoForm = {
  id: number;
  nome?: string;
  telefone: string;
  whatsapp?: string;
  cpf?: string;
  nascimento?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  enderecoOriginal?: string;
  responsavelNome?: string;
  responsavelTelefone?: string;
  responsavelParentesco?: string;
  observacoes?: string;
};

export async function atualizarClienteNoAtendimento(
  dados: ClienteAtendimentoForm,
) {
  await requirePermission("clientes.gerenciar");

  if (!dados.id || dados.id <= 0) {
    throw new Error("Cliente inválida.");
  }

  const telefone = dados.telefone?.trim();
  const whatsapp = textoOpcional(dados.whatsapp);

  if (!telefone && !whatsapp) {
    throw new Error("Informe pelo menos o telefone ou o WhatsApp da cliente.");
  }

  // O nome so e alterado quando vier preenchido. Assim, se a tela nao mandar
  // esse campo, o cadastro continua com o nome que ja tinha.
  const nome = dados.nome?.trim();

  if (dados.nome !== undefined && !nome) {
    throw new Error("O nome da cliente nao pode ficar em branco.");
  }

  const nascimento = dados.nascimento
    ? new Date(`${dados.nascimento}T12:00:00.000Z`)
    : null;

  if (nascimento && Number.isNaN(nascimento.getTime())) {
    throw new Error("Data de nascimento inválida.");
  }

  const cliente = await prisma.cliente.update({
    where: { id: dados.id },
    data: {
      ...(nome ? { nome } : {}),
      responsavelNome: textoOpcional(dados.responsavelNome),
      responsavelTelefone: textoOpcional(dados.responsavelTelefone),
      responsavelParentesco: textoOpcional(dados.responsavelParentesco),
      telefone: telefone || whatsapp || "",
      whatsapp,
      cpf: textoOpcional(dados.cpf),
      nascimento,
      cep: normalizarCep(dados.cep),
      logradouro: textoOpcional(dados.logradouro),
      numero: textoOpcional(dados.numero),
      complemento: textoOpcional(dados.complemento),
      bairro: textoOpcional(dados.bairro),
      cidade: textoOpcional(dados.cidade),
      estado: normalizarEstado(dados.estado),
      enderecoOriginal: textoOpcional(dados.enderecoOriginal),
      observacoes: textoOpcional(dados.observacoes),
    },
    select: {
      id: true,
      nome: true,
      telefone: true,
      whatsapp: true,
      cpf: true,
      nascimento: true,
      cep: true,
      logradouro: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      estado: true,
      enderecoOriginal: true,
      observacoes: true,
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${dados.id}`);

  return {
    ...cliente,
    nascimento: cliente.nascimento?.toISOString() || null,
  };
}