"use server";

import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { LeadEtapa } from "@/app/(app)/marketing/types";

export type CriarLeadInput = {
  nome: string;
  telefone?: string;
  origem?: string;
  interesse?: string;
  etapa: string;
  valorPrevisto: number;
  observacoes?: string;
};

export type CriarCampanhaInput = {
  nome: string;
  canal: string;
  investimento: number;
  leads: number;
  status: string;
  inicio?: string;
  fim?: string;
};

function limparTexto(value?: string | null) {
  const texto = value?.trim();
  return texto ? texto : null;
}

function limparNumero(value: number) {
  return Number.isFinite(value) ? value : 0;
}

export async function criarLead(dados: CriarLeadInput) {
  await requirePermission("marketing.gerenciar");
  const nome = dados.nome.trim();

  if (!nome) {
    throw new Error("Nome do lead é obrigatório.");
  }

  const lead = await prisma.lead.create({
    data: {
      nome,
      telefone: limparTexto(dados.telefone),
      origem: limparTexto(dados.origem),
      interesse: limparTexto(dados.interesse),
      etapa: dados.etapa || "Novo",
      valorPrevisto: limparNumero(dados.valorPrevisto),
      observacoes: limparTexto(dados.observacoes),
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Marketing",
      acao: "Criou lead",
      entidade: "Lead",
      entidadeId: String(lead.id),
      usuario: "Sistema",
      detalhes: lead.nome,
    },
  });

  revalidatePath("/marketing");
}

export async function atualizarEtapaLead(id: number, etapa: LeadEtapa) {
  await requirePermission("marketing.gerenciar");
  const lead = await prisma.lead.update({
    where: { id },
    data: { etapa },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Marketing",
      acao: "Atualizou etapa do lead",
      entidade: "Lead",
      entidadeId: String(id),
      usuario: "Sistema",
      detalhes: `${lead.nome} · ${etapa}`,
    },
  });

  revalidatePath("/marketing");
}

export async function converterLeadEmCliente(id: number) {
  await requirePermission("marketing.gerenciar");
  const lead = await prisma.lead.findUnique({ where: { id } });

  if (!lead) {
    throw new Error("Lead não encontrado.");
  }

  const cliente = await prisma.cliente.create({
    data: {
      nome: lead.nome,
      telefone: lead.telefone || "",
      whatsapp: lead.telefone || null,
      procedimento: lead.interesse || null,
      valorGasto: 0,
      status: "Ativa",
      observacoes: lead.observacoes
        ? `Convertido do Marketing. Origem: ${lead.origem || "não informada"}. Observações: ${lead.observacoes}`
        : `Convertido do Marketing. Origem: ${lead.origem || "não informada"}.`,
    },
  });

  await prisma.lead.update({
    where: { id },
    data: { etapa: "Convertido" },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Marketing",
      acao: "Converteu lead em cliente",
      entidade: "Cliente",
      entidadeId: String(cliente.id),
      usuario: "Sistema",
      detalhes: lead.nome,
    },
  });

  revalidatePath("/marketing");
  revalidatePath("/clientes");
}

export async function excluirLead(id: number) {
  await requirePermission("marketing.gerenciar");
  const lead = await prisma.lead.delete({ where: { id } });

  await prisma.auditoria.create({
    data: {
      modulo: "Marketing",
      acao: "Excluiu lead",
      entidade: "Lead",
      entidadeId: String(id),
      usuario: "Sistema",
      detalhes: lead.nome,
    },
  });

  revalidatePath("/marketing");
}

export async function criarCampanha(dados: CriarCampanhaInput) {
  await requirePermission("marketing.gerenciar");
  const nome = dados.nome.trim();
  const canal = dados.canal.trim();

  if (!nome || !canal) {
    throw new Error("Nome e canal da campanha são obrigatórios.");
  }

  const campanha = await prisma.campanhaMarketing.create({
    data: {
      nome,
      canal,
      investimento: limparNumero(dados.investimento),
      leads: Math.max(0, Math.trunc(limparNumero(dados.leads))),
      status: dados.status || "Ativa",
      inicio: dados.inicio ? new Date(dados.inicio) : null,
      fim: dados.fim ? new Date(dados.fim) : null,
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Marketing",
      acao: "Criou campanha",
      entidade: "CampanhaMarketing",
      entidadeId: String(campanha.id),
      usuario: "Sistema",
      detalhes: campanha.nome,
    },
  });

  revalidatePath("/marketing");
}

export async function excluirCampanha(id: number) {
  await requirePermission("marketing.gerenciar");
  const campanha = await prisma.campanhaMarketing.delete({ where: { id } });

  await prisma.auditoria.create({
    data: {
      modulo: "Marketing",
      acao: "Excluiu campanha",
      entidade: "CampanhaMarketing",
      entidadeId: String(id),
      usuario: "Sistema",
      detalhes: campanha.nome,
    },
  });

  revalidatePath("/marketing");
}
