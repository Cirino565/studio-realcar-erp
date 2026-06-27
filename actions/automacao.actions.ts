"use server";

import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { AutomacaoFormData, AutomacaoStatus } from "@/app/(app)/automacoes/types";

function normalizarTexto(valor: string) {
  return valor.trim();
}

function parseOptionalDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type CriarAutomacaoInput = AutomacaoFormData;

export async function criarAutomacao(dados: CriarAutomacaoInput) {
  await requirePermission("automacoes.gerenciar");
  const nome = normalizarTexto(dados.nome);
  const gatilho = normalizarTexto(dados.gatilho);
  const acao = normalizarTexto(dados.acao);

  if (!nome || !gatilho || !acao) {
    throw new Error("Nome, gatilho e ação são obrigatórios.");
  }

  const automacao = await prisma.automacao.create({
    data: {
      nome,
      tipo: dados.tipo,
      gatilho,
      acao,
      canal: normalizarTexto(dados.canal) || null,
      frequencia: dados.frequencia,
      prioridade: dados.prioridade,
      status: dados.status,
      proximaExecucao: parseOptionalDate(dados.proximaExecucao),
      observacoes: normalizarTexto(dados.observacoes) || null,
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Automações",
      acao: "Criou automação",
      entidade: "Automacao",
      entidadeId: String(automacao.id),
      usuario: "Sistema",
      detalhes: automacao.nome,
    },
  });

  revalidatePath("/automacoes");
}

export async function atualizarStatusAutomacao(id: number, status: AutomacaoStatus) {
  await requirePermission("automacoes.gerenciar");
  const automacao = await prisma.automacao.update({
    where: { id },
    data: { status },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Automações",
      acao: "Alterou status da automação",
      entidade: "Automacao",
      entidadeId: String(id),
      usuario: "Sistema",
      detalhes: `${automacao.nome}: ${status}`,
    },
  });

  revalidatePath("/automacoes");
}

export async function registrarExecucaoAutomacao(id: number, sucesso: boolean) {
  await requirePermission("automacoes.gerenciar");
  const automacaoAtual = await prisma.automacao.findUnique({ where: { id } });

  if (!automacaoAtual) {
    throw new Error("Automação não encontrada.");
  }

  const automacao = await prisma.automacao.update({
    where: { id },
    data: {
      ultimaExecucao: new Date(),
      execucoes: { increment: 1 },
      falhas: sucesso ? undefined : { increment: 1 },
      status: sucesso ? automacaoAtual.status : "Erro",
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Automações",
      acao: sucesso ? "Registrou execução da automação" : "Registrou falha da automação",
      entidade: "Automacao",
      entidadeId: String(id),
      usuario: "Sistema",
      detalhes: automacao.nome,
    },
  });

  revalidatePath("/automacoes");
}

export async function criarAutomacoesPadrao() {
  await requirePermission("automacoes.gerenciar");
  const padroes = [
    {
      nome: "Lembrete manual de agendamento",
      tipo: "Agenda",
      gatilho: "Agendamento marcado para as próximas 24 horas",
      acao: "Gerar mensagem pronta para copiar ou abrir no WhatsApp",
      canal: "WhatsApp manual",
      frequencia: "Diária",
      prioridade: "Alta",
      status: "Ativa",
      observacoes: "Fluxo sem cobrança de API. A equipe revisa e envia manualmente.",
    },
    {
      nome: "Retorno de cliente inativo",
      tipo: "Clientes",
      gatilho: "Cliente sem visita registrada há mais de 60 dias",
      acao: "Sugerir contato de reativação com mensagem pronta",
      canal: "WhatsApp manual",
      frequencia: "Semanal",
      prioridade: "Média",
      status: "Ativa",
      observacoes: "Ajuda a recuperar clientes sem criar automação paga.",
    },
    {
      nome: "Alerta de estoque baixo",
      tipo: "Estoque",
      gatilho: "Produto abaixo do estoque mínimo",
      acao: "Exibir prioridade de compra e revisão de fornecedores",
      canal: "Interno",
      frequencia: "Diária",
      prioridade: "Alta",
      status: "Ativa",
      observacoes: "Evita falta de produtos para procedimentos.",
    },
    {
      nome: "Revisão financeira semanal",
      tipo: "Financeiro",
      gatilho: "Fechamento semanal da operação",
      acao: "Conferir entradas, saídas, saldo e categorias críticas",
      canal: "Interno",
      frequencia: "Semanal",
      prioridade: "Média",
      status: "Ativa",
      observacoes: "Rotina operacional para melhorar controle de caixa.",
    },
  ] as const;

  for (const item of padroes) {
    const existe = await prisma.automacao.findFirst({ where: { nome: item.nome } });

    if (!existe) {
      await prisma.automacao.create({ data: item });
    }
  }

  await prisma.auditoria.create({
    data: {
      modulo: "Automações",
      acao: "Criou automações padrão",
      entidade: "Automacao",
      usuario: "Sistema",
      detalhes: "Regras operacionais iniciais",
    },
  });

  revalidatePath("/automacoes");
}

export async function excluirAutomacao(id: number) {
  await requirePermission("automacoes.gerenciar");
  const automacao = await prisma.automacao.delete({ where: { id } });

  await prisma.auditoria.create({
    data: {
      modulo: "Automações",
      acao: "Excluiu automação",
      entidade: "Automacao",
      entidadeId: String(id),
      usuario: "Sistema",
      detalhes: automacao.nome,
    },
  });

  revalidatePath("/automacoes");
}
