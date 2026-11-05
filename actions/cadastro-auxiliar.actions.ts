"use server";

import type { Prisma } from "@prisma/client";

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


function ordenarPorNome<T extends { nome: string }>(items: T[]) {
  return [...items].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", {
      sensitivity: "base",
      numeric: true,
    }),
  );
}

async function reordenarProcedimentosInteresse(tx: Prisma.TransactionClient) {
  const itens = ordenarPorNome(
    await tx.procedimentoInteresse.findMany({
      select: { id: true, nome: true, ordem: true },
    }),
  );

  await Promise.all(
    itens.map((item, index) =>
      item.ordem === index
        ? Promise.resolve(item)
        : tx.procedimentoInteresse.update({
            where: { id: item.id },
            data: { ordem: index },
          }),
    ),
  );
}

async function reordenarProcedimentosServico(tx: Prisma.TransactionClient) {
  const itens = ordenarPorNome(
    await tx.procedimentoServico.findMany({
      select: { id: true, nome: true, ordem: true },
    }),
  );

  await Promise.all(
    itens.map((item, index) =>
      item.ordem === index
        ? Promise.resolve(item)
        : tx.procedimentoServico.update({
            where: { id: item.id },
            data: { ordem: index },
          }),
    ),
  );
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
    prisma.procedimentoInteresse.findMany({ orderBy: [{ nome: "asc" }, { id: "asc" }] }),
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

// ---- Motivos de perda de oportunidade ----
//
// Configuraveis para que a equipe cadastre os motivos que realmente
// aparecem no dia a dia, em vez de depender de uma lista fixa no codigo.

export type MotivoPerdaInput = CadastroAuxiliarInput & {
  naoChamou?: boolean;
};

export async function criarMotivoPerda(dados: MotivoPerdaInput) {
  await requirePermission("configuracoes.gerenciar");
  const nome = normalizarNome(dados.nome);
  if (!nome) return;

  await prisma.motivoPerdaLead.create({
    data: {
      nome,
      descricao: toNullableText(dados.descricao),
      naoChamou: Boolean(dados.naoChamou),
      status: dados.status || "Ativo",
      ordem: toSafeOrder(dados.ordem),
    },
  });

  await registrarAuditoria("Criou motivo de perda", "MotivoPerdaLead", nome);
  revalidatePath("/configuracoes");
  revalidatePath("/marketing");
}

export async function atualizarMotivoPerda(dados: MotivoPerdaInput) {
  await requirePermission("configuracoes.gerenciar");
  if (!dados.id) return;
  const nome = normalizarNome(dados.nome);
  if (!nome) return;

  await prisma.motivoPerdaLead.update({
    where: { id: dados.id },
    data: {
      nome,
      descricao: toNullableText(dados.descricao),
      naoChamou: Boolean(dados.naoChamou),
      status: dados.status || "Ativo",
      ordem: toSafeOrder(dados.ordem),
    },
  });

  await registrarAuditoria("Atualizou motivo de perda", "MotivoPerdaLead", nome);
  revalidatePath("/configuracoes");
  revalidatePath("/marketing");
}

export async function excluirMotivoPerda(id: number) {
  await requirePermission("configuracoes.gerenciar");
  const motivo = await prisma.motivoPerdaLead.findUnique({ where: { id } });
  if (!motivo) return;

  // Nao apaga de verdade: leads antigos guardam o motivo como texto, e
  // apagar o cadastro nao os afeta - mas desativar mantem a lista limpa
  // sem perder a opcao de reativar depois.
  await prisma.motivoPerdaLead.update({
    where: { id },
    data: { status: "Inativo" },
  });

  await registrarAuditoria("Desativou motivo de perda", "MotivoPerdaLead", motivo.nome);
  revalidatePath("/configuracoes");
  revalidatePath("/marketing");
}

export async function criarProcedimentoInteresse(dados: CadastroAuxiliarInput) {
  await requirePermission("configuracoes.gerenciar");
  const nome = normalizarNome(dados.nome);
  if (!nome) return;

  await prisma.$transaction(async (tx) => {
    await tx.procedimentoInteresse.create({
      data: {
        nome,
        descricao: toNullableText(dados.descricao),
        status: dados.status || "Ativo",
        ordem: 0,
      },
    });

    await reordenarProcedimentosInteresse(tx);
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

  await prisma.$transaction(async (tx) => {
    await tx.procedimentoInteresse.update({
      where: { id: dados.id },
      data: {
        nome,
        descricao: toNullableText(dados.descricao),
        status: dados.status || "Ativo",
      },
    });

    await reordenarProcedimentosInteresse(tx);
  });

  await registrarAuditoria("Atualizou procedimento de interesse", "ProcedimentoInteresse", nome);
  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
}

export async function excluirProcedimentoInteresse(id: number) {
  await requirePermission("configuracoes.gerenciar");
  const procedimento = await prisma.procedimentoInteresse.findUnique({ where: { id } });
  if (!procedimento) return;

  await prisma.$transaction(async (tx) => {
    await tx.procedimentoInteresse.delete({ where: { id } });
    await reordenarProcedimentosInteresse(tx);
  });
  await registrarAuditoria("Excluiu procedimento de interesse", "ProcedimentoInteresse", procedimento.nome);
  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
}

export async function criarCadastrosAuxiliaresPadrao() {
  await requirePermission("configuracoes.gerenciar");
  const origens = [
    "Indicação",
    "Google Ads",
    "Instagram Ads",
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

  await prisma.$transaction(async (tx) => {
    for (const [index, nome] of origens.entries()) {
      await tx.origemCliente.upsert({
        where: { nome },
        create: { nome, ordem: index + 1, status: "Ativa" },
        update: { ordem: index + 1 },
      });
    }

    for (const nome of procedimentos) {
      await tx.procedimentoInteresse.upsert({
        where: { nome },
        create: { nome, ordem: 0, status: "Ativo" },
        update: {},
      });
    }

    await reordenarProcedimentosInteresse(tx);
  });

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
  // De quantos em quantos dias este procedimento deve ser repetido.
  // Vazio = nao gera lembrete de retorno.
  intervaloRetornoDias?: number | null;
  valorPadrao?: number;
  custoPadrao?: number;
  status?: string;
  ordem?: number;
};

function toIntervaloRetorno(value: unknown) {
  const numero = Number(value);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return Math.min(3650, Math.trunc(numero));
}

export async function criarProcedimentoServico(dados: ProcedimentoServicoInput) {
  await requirePermission("configuracoes.gerenciar");
  const nome = normalizarNome(dados.nome);
  if (!nome) return;

  await prisma.$transaction(async (tx) => {
    await tx.procedimentoServico.create({
      data: {
        nome,
        categoria: toNullableText(dados.categoria),
        descricao: toNullableText(dados.descricao),
        duracaoPadrao: toSafeOrder(dados.duracaoPadrao) || 60,
        intervaloRetornoDias: toIntervaloRetorno(dados.intervaloRetornoDias),
        valorPadrao: Number.isFinite(dados.valorPadrao) ? Number(dados.valorPadrao) : 0,
        custoPadrao: Number.isFinite(dados.custoPadrao) ? Math.max(0, Number(dados.custoPadrao)) : 0,
        status: dados.status || "Ativo",
        ordem: 0,
      },
    });

    await reordenarProcedimentosServico(tx);
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

  await prisma.$transaction(async (tx) => {
    await tx.procedimentoServico.update({
      where: { id: dados.id },
      data: {
        nome,
        categoria: toNullableText(dados.categoria),
        descricao: toNullableText(dados.descricao),
        duracaoPadrao: toSafeOrder(dados.duracaoPadrao) || 60,
        intervaloRetornoDias: toIntervaloRetorno(dados.intervaloRetornoDias),
        valorPadrao: Number.isFinite(dados.valorPadrao) ? Number(dados.valorPadrao) : 0,
        custoPadrao: Number.isFinite(dados.custoPadrao) ? Math.max(0, Number(dados.custoPadrao)) : 0,
        status: dados.status || "Ativo",
      },
    });

    await reordenarProcedimentosServico(tx);
  });

  await registrarAuditoria("Atualizou serviço/procedimento", "ProcedimentoServico", nome);
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
}

function chaveNome(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Quantos atendimentos e itens de venda ja usaram este procedimento. */
async function contarUsosProcedimento(servico: { id: number; nome: string }) {
  const [agendamentos, itensVenda] = await Promise.all([
    prisma.agendamento.count({
      where: { procedimento: { equals: servico.nome, mode: "insensitive" } },
    }),
    prisma.vendaItem.count({ where: { procedimentoServicoId: servico.id } }),
  ]);
  return agendamentos + itensVenda;
}

/**
 * Ocultar / mostrar de novo. Oculto (Inativo) some das listas de agendar,
 * finalizar e vender, mas continua valendo para historico, relatorios e
 * lembrete de retorno de quem ja fez.
 */
export async function alterarVisibilidadeProcedimentoServico(id: number, visivel: boolean) {
  await requirePermission("configuracoes.gerenciar");
  const servico = await prisma.procedimentoServico.findUnique({ where: { id } });
  if (!servico) return { ok: false as const, erro: "Procedimento não encontrado." };

  await prisma.procedimentoServico.update({
    where: { id },
    data: { status: visivel ? "Ativo" : "Inativo" },
  });
  await registrarAuditoria(
    visivel ? "Mostrou serviço/procedimento" : "Ocultou serviço/procedimento",
    "ProcedimentoServico",
    servico.nome,
  );
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
  revalidatePath("/marketing");
  return { ok: true as const };
}

/** Corrige o nome (ex.: erro de digitacao). Atendimentos antigos ficam com o nome antigo. */
export async function renomearProcedimentoServico(id: number, novoNome: string) {
  await requirePermission("configuracoes.gerenciar");
  const nome = normalizarNome(novoNome);
  if (!nome) return { ok: false as const, erro: "Escreva o novo nome." };

  const servico = await prisma.procedimentoServico.findUnique({ where: { id } });
  if (!servico) return { ok: false as const, erro: "Procedimento não encontrado." };
  if (servico.nome === nome) return { ok: true as const };

  const todos = await prisma.procedimentoServico.findMany({ select: { id: true, nome: true } });
  const repetido = todos.find((item) => item.id !== id && chaveNome(item.nome) === chaveNome(nome));
  if (repetido) {
    return { ok: false as const, erro: `Já existe um procedimento chamado "${repetido.nome}".` };
  }

  await prisma.procedimentoServico.update({ where: { id }, data: { nome } });
  await registrarAuditoria("Renomeou serviço/procedimento", "ProcedimentoServico", `${servico.nome} → ${nome}`);
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
  revalidatePath("/marketing");
  return { ok: true as const };
}

export async function excluirProcedimentoServico(id: number) {
  await requirePermission("configuracoes.gerenciar");
  const servico = await prisma.procedimentoServico.findUnique({ where: { id } });
  if (!servico) return { ok: false as const, erro: "Procedimento não encontrado." };

  // Ja foi usado: nao apaga (perderia lembrete de retorno, anamnese e o
  // cadastro no relatorio). O certo e ocultar.
  const usos = await contarUsosProcedimento(servico);
  if (usos > 0) {
    return {
      ok: false as const,
      erro: `"${servico.nome}" já foi usado em ${usos} atendimento(s) ou venda(s). Para não perder histórico e lembretes de retorno, use "Ocultar".`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.procedimentoServico.delete({ where: { id } });
    await reordenarProcedimentosServico(tx);
  });
  await registrarAuditoria("Excluiu serviço/procedimento", "ProcedimentoServico", servico.nome);
  revalidatePath("/configuracoes");
  revalidatePath("/agenda");
  return { ok: true as const };
}
