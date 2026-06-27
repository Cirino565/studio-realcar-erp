"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CriarPerfilInput = {
  nome: string;
  descricao?: string;
  nivel?: number;
  status?: string;
};

export type AtualizarPerfilInput = CriarPerfilInput & {
  id: number;
};

export type CriarPermissaoInput = {
  chave: string;
  nome: string;
  modulo: string;
};

const permissoesPadrao = [
  { modulo: "Dashboard", nome: "Visualizar dashboard", chave: "dashboard.visualizar" },
  { modulo: "Clientes", nome: "Visualizar clientes", chave: "clientes.visualizar" },
  { modulo: "Clientes", nome: "Gerenciar clientes", chave: "clientes.gerenciar" },
  { modulo: "Clientes", nome: "Gerenciar ficha clínica", chave: "clientes.clinico" },
  { modulo: "Agenda", nome: "Visualizar agenda", chave: "agenda.visualizar" },
  { modulo: "Agenda", nome: "Gerenciar agendamentos", chave: "agenda.gerenciar" },
  { modulo: "Financeiro", nome: "Visualizar financeiro", chave: "financeiro.visualizar" },
  { modulo: "Financeiro", nome: "Gerenciar financeiro", chave: "financeiro.gerenciar" },
  { modulo: "Estoque", nome: "Visualizar estoque", chave: "estoque.visualizar" },
  { modulo: "Estoque", nome: "Gerenciar estoque", chave: "estoque.gerenciar" },
  { modulo: "Relatórios", nome: "Visualizar relatórios", chave: "relatorios.visualizar" },
  { modulo: "Marketing", nome: "Visualizar marketing", chave: "marketing.visualizar" },
  { modulo: "Marketing", nome: "Gerenciar marketing", chave: "marketing.gerenciar" },
  { modulo: "Configurações", nome: "Gerenciar configurações", chave: "configuracoes.gerenciar" },
  { modulo: "Usuários", nome: "Gerenciar usuários", chave: "usuarios.gerenciar" },
  { modulo: "Permissões", nome: "Gerenciar permissões", chave: "permissoes.gerenciar" },
  { modulo: "Auditoria", nome: "Visualizar auditoria", chave: "auditoria.visualizar" },
  { modulo: "Backup", nome: "Gerenciar backup", chave: "backup.gerenciar" },
  { modulo: "Automações", nome: "Gerenciar automações", chave: "automacoes.gerenciar" },
];

function limparTexto(valor?: string) {
  const texto = valor?.trim();
  return texto && texto.length > 0 ? texto : null;
}

function limparNivel(valor?: number) {
  if (!valor || Number.isNaN(valor)) return 1;
  return Math.max(1, Math.min(5, valor));
}

export async function criarPerfil(dados: CriarPerfilInput) {
  const usuarioAtual = await requirePermission("permissoes.gerenciar");
  const perfil = await prisma.perfil.create({
    data: {
      nome: dados.nome.trim(),
      descricao: limparTexto(dados.descricao),
      nivel: limparNivel(dados.nivel),
      status: dados.status || "Ativo",
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Permissões",
      acao: "Criou perfil",
      entidade: "Perfil",
      entidadeId: String(perfil.id),
      usuario: usuarioAtual.email,
      detalhes: perfil.nome,
    },
  });

  revalidatePath("/permissoes");
  revalidatePath("/usuarios");
}

export async function atualizarPerfil(dados: AtualizarPerfilInput) {
  const usuarioAtual = await requirePermission("permissoes.gerenciar");
  const perfil = await prisma.perfil.update({
    where: { id: dados.id },
    data: {
      nome: dados.nome.trim(),
      descricao: limparTexto(dados.descricao),
      nivel: limparNivel(dados.nivel),
      status: dados.status || "Ativo",
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Permissões",
      acao: "Atualizou perfil",
      entidade: "Perfil",
      entidadeId: String(perfil.id),
      usuario: usuarioAtual.email,
      detalhes: perfil.nome,
    },
  });

  revalidatePath("/permissoes");
  revalidatePath("/usuarios");
}

export async function excluirPerfil(id: number) {
  const usuarioAtual = await requirePermission("permissoes.gerenciar");
  const perfil = await prisma.perfil.delete({ where: { id } });

  await prisma.auditoria.create({
    data: {
      modulo: "Permissões",
      acao: "Excluiu perfil",
      entidade: "Perfil",
      entidadeId: String(id),
      usuario: usuarioAtual.email,
      detalhes: perfil.nome,
    },
  });

  revalidatePath("/permissoes");
  revalidatePath("/usuarios");
}

export async function criarPermissao(dados: CriarPermissaoInput) {
  const usuarioAtual = await requirePermission("permissoes.gerenciar");
  const permissao = await prisma.permissao.create({
    data: {
      chave: dados.chave.trim().toLowerCase(),
      nome: dados.nome.trim(),
      modulo: dados.modulo.trim(),
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Permissões",
      acao: "Criou permissão",
      entidade: "Permissao",
      entidadeId: String(permissao.id),
      usuario: usuarioAtual.email,
      detalhes: permissao.chave,
    },
  });

  revalidatePath("/permissoes");
}

export async function excluirPermissao(id: number) {
  const usuarioAtual = await requirePermission("permissoes.gerenciar");
  const permissao = await prisma.permissao.delete({ where: { id } });

  await prisma.auditoria.create({
    data: {
      modulo: "Permissões",
      acao: "Excluiu permissão",
      entidade: "Permissao",
      entidadeId: String(id),
      usuario: usuarioAtual.email,
      detalhes: permissao.chave,
    },
  });

  revalidatePath("/permissoes");
}

export async function salvarPermissoesDoPerfil(perfilId: number, permissaoIds: number[]) {
  const usuarioAtual = await requirePermission("permissoes.gerenciar");
  await prisma.$transaction([
    prisma.perfilPermissao.deleteMany({ where: { perfilId } }),
    prisma.perfilPermissao.createMany({
      data: permissaoIds.map((permissaoId) => ({ perfilId, permissaoId })),
    }),
  ]);

  await prisma.auditoria.create({
    data: {
      modulo: "Permissões",
      acao: "Atualizou permissões do perfil",
      entidade: "Perfil",
      entidadeId: String(perfilId),
      usuario: usuarioAtual.email,
      detalhes: `${permissaoIds.length} permissões vinculadas`,
    },
  });

  revalidatePath("/permissoes");
  revalidatePath("/usuarios");
}

export async function criarPermissoesPadrao() {
  const usuarioAtual = await requirePermission("permissoes.gerenciar");
  await prisma.$transaction(
    permissoesPadrao.map((permissao) =>
      prisma.permissao.upsert({
        where: { chave: permissao.chave },
        update: { nome: permissao.nome, modulo: permissao.modulo },
        create: permissao,
      }),
    ),
  );

  await prisma.auditoria.create({
    data: {
      modulo: "Permissões",
      acao: "Sincronizou permissões padrão",
      entidade: "Permissao",
      usuario: usuarioAtual.email,
      detalhes: `${permissoesPadrao.length} permissões padrão`,
    },
  });

  revalidatePath("/permissoes");
}
