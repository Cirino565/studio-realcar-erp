"use server";

import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type CadastroAuxiliarInput = {
  id?: number;
  nome: string;
  descricao?: string;
  status?: string;
  ordem?: number;
};

function normalizarNome(nome: string) {
  return nome.trim().replace(/\s+/g, " ");
}

function toNullableText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toSafeOrder(value?: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value ?? 0));
}

async function registrarAuditoria(acao: string, entidade: string, detalhes: string) {
  await prisma.auditoria.create({
    data: {
      modulo: "Configurações",
      acao,
      entidade,
      usuario: "Sistema",
      detalhes,
    },
  });
}

export async function listarCadastrosAuxiliares() {
  await requirePermission("configuracoes.gerenciar");
  const [origens, procedimentos] = await Promise.all([
    prisma.origemCliente.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
    prisma.procedimentoInteresse.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
  ]);

  return { origens, procedimentos };
}

export async function criarOrigemCliente(dados: CadastroAuxiliarInput) {
  await requirePermission("configuracoes.gerenciar");
  const nome = normalizarNome(dados.nome);
  if (!nome) return;

  await prisma.origemCliente.create({
    data: {
      nome,
      descricao: toNullableText(dados.descricao),
      status: dados.status || "Ativa",
      ordem: toSafeOrder(dados.ordem),
    },
  });

  await registrarAuditoria("Criou origem de cliente", "OrigemCliente", nome);
  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
}

export async function atualizarOrigemCliente(dados: CadastroAuxiliarInput) {
  await requirePermission("configuracoes.gerenciar");
  if (!dados.id) return;
  const nome = normalizarNome(dados.nome);
  if (!nome) return;

  await prisma.origemCliente.update({
    where: { id: dados.id },
    data: {
      nome,
      descricao: toNullableText(dados.descricao),
      status: dados.status || "Ativa",
      ordem: toSafeOrder(dados.ordem),
    },
  });

  await registrarAuditoria("Atualizou origem de cliente", "OrigemCliente", nome);
  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
}

export async function excluirOrigemCliente(id: number) {
  await requirePermission("configuracoes.gerenciar");
  const origem = await prisma.origemCliente.findUnique({ where: { id } });
  if (!origem) return;

  await prisma.origemCliente.delete({ where: { id } });
  await registrarAuditoria("Excluiu origem de cliente", "OrigemCliente", origem.nome);
  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
}

export async function criarProcedimentoInteresse(dados: CadastroAuxiliarInput) {
  await requirePermission("configuracoes.gerenciar");
  const nome = normalizarNome(dados.nome);
  if (!nome) return;

  await prisma.procedimentoInteresse.create({
    data: {
      nome,
      descricao: toNullableText(dados.descricao),
      status: dados.status || "Ativo",
      ordem: toSafeOrder(dados.ordem),
    },
  });

  await registrarAuditoria("Criou procedimento de interesse", "ProcedimentoInteresse", nome);
  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
}

export async function atualizarProcedimentoInteresse(dados: CadastroAuxiliarInput) {
  await requirePermission("configuracoes.gerenciar");
  if (!dados.id) return;
  const nome = normalizarNome(dados.nome);
  if (!nome) return;

  await prisma.procedimentoInteresse.update({
    where: { id: dados.id },
    data: {
      nome,
      descricao: toNullableText(dados.descricao),
      status: dados.status || "Ativo",
      ordem: toSafeOrder(dados.ordem),
    },
  });

  await registrarAuditoria("Atualizou procedimento de interesse", "ProcedimentoInteresse", nome);
  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
}

export async function excluirProcedimentoInteresse(id: number) {
  await requirePermission("configuracoes.gerenciar");
  const procedimento = await prisma.procedimentoInteresse.findUnique({ where: { id } });
  if (!procedimento) return;

  await prisma.procedimentoInteresse.delete({ where: { id } });
  await registrarAuditoria("Excluiu procedimento de interesse", "ProcedimentoInteresse", procedimento.nome);
  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
}

export async function criarCadastrosAuxiliaresPadrao() {
  await requirePermission("configuracoes.gerenciar");
  const origens = [
    "Indicação",
    "Google Ads",
    "Facebook Ads",
    "Instagram",
    "WhatsApp",
    "Busca orgânica",
    "Cliente antigo",
    "Passou na frente",
    "Outro",
  ];

  const procedimentos = [
    "Avaliação",
    "Limpeza de pele",
    "Botox",
    "Preenchimento",
    "Bioestimulador",
    "Depilação",
    "Massagem",
    "Drenagem",
    "Peeling",
    "Outro",
  ];

  await prisma.$transaction([
    ...origens.map((nome, index) =>
      prisma.origemCliente.upsert({
        where: { nome },
        create: { nome, ordem: index + 1, status: "Ativa" },
        update: { ordem: index + 1 },
      })
    ),
    ...procedimentos.map((nome, index) =>
      prisma.procedimentoInteresse.upsert({
        where: { nome },
        create: { nome, ordem: index + 1, status: "Ativo" },
        update: { ordem: index + 1 },
      })
    ),
  ]);

  await registrarAuditoria("Criou cadastros auxiliares padrão", "CadastrosAuxiliares", "Origens e procedimentos de interesse");
  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
}

export type ProcedimentoServicoInput = {
  id?: number;
  nome: string;
  categoria?: string;
  descricao?: string;
  duracaoPadrao?: number;
  valorPadrao?: number;
  status?: string;
  ordem?: number;
};

export async function criarProcedimentoServico(dados: ProcedimentoServicoInput) {
  await requirePermission("configuracoes.gerenciar");
  const nome = normalizarNome(dados.nome);
  if (!nome) return;

  await prisma.procedimentoServico.create({
    data: {
      nome,
      categoria: toNullableText(dados.categoria),
      descricao: toNullableText(dados.descricao),
      duracaoPadrao: toSafeOrder(dados.duracaoPadrao) || 60,
      valorPadrao: Number.isFinite(dados.valorPadrao) ? Number(dados.valorPadrao) : 0,
      status: dados.status || "Ativo",
      ordem: toSafeOrder(dados.ordem),
    },
  });

  await registrarAuditoria("Criou serviço/procedimento", "ProcedimentoServico", nome);
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
}

export async function atualizarProcedimentoServico(dados: ProcedimentoServicoInput) {
  await requirePermission("configuracoes.gerenciar");
  if (!dados.id) return;
  const nome = normalizarNome(dados.nome);
  if (!nome) return;

  await prisma.procedimentoServico.update({
    where: { id: dados.id },
    data: {
      nome,
      categoria: toNullableText(dados.categoria),
      descricao: toNullableText(dados.descricao),
      duracaoPadrao: toSafeOrder(dados.duracaoPadrao) || 60,
      valorPadrao: Number.isFinite(dados.valorPadrao) ? Number(dados.valorPadrao) : 0,
      status: dados.status || "Ativo",
      ordem: toSafeOrder(dados.ordem),
    },
  });

  await registrarAuditoria("Atualizou serviço/procedimento", "ProcedimentoServico", nome);
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
}

export async function excluirProcedimentoServico(id: number) {
  await requirePermission("configuracoes.gerenciar");
  const servico = await prisma.procedimentoServico.findUnique({ where: { id } });
  if (!servico) return;

  await prisma.procedimentoServico.delete({ where: { id } });
  await registrarAuditoria("Excluiu serviço/procedimento", "ProcedimentoServico", servico.nome);
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
}
