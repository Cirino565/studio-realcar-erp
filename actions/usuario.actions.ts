"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CriarUsuarioInput = {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  cargo?: string;
  tipo?: string;
  especialidade?: string;
  status?: string;
  perfilId?: number;
  dataAdmissao?: string;
  observacoes?: string;
};

export type AtualizarUsuarioInput = Omit<CriarUsuarioInput, "senha"> & {
  id: number;
  senha?: string;
};

function limparTexto(valor?: string) {
  const texto = valor?.trim();
  return texto && texto.length > 0 ? texto : null;
}

function limparData(valor?: string) {
  if (!valor) return null;
  const data = new Date(`${valor}T12:00:00`);
  return Number.isNaN(data.getTime()) ? null : data;
}

function limparPerfilId(valor?: number) {
  return valor && valor > 0 ? valor : null;
}

function validarSenha(senha?: string, obrigatoria = false) {
  const senhaLimpa = senha?.trim() || "";

  if (!senhaLimpa) {
    if (obrigatoria) throw new Error("Informe uma senha inicial para o usuário.");
    return null;
  }

  if (senhaLimpa.length < 6) {
    throw new Error("A senha precisa ter pelo menos 6 caracteres.");
  }

  return senhaLimpa;
}

export async function criarUsuario(dados: CriarUsuarioInput) {
  const usuarioAtual = await requirePermission("usuarios.gerenciar");
  const senha = validarSenha(dados.senha, true);
  const senhaHash = await bcrypt.hash(senha as string, 10);

  const usuarioCriado = await prisma.usuario.create({
    data: {
      nome: dados.nome.trim(),
      email: dados.email.trim().toLowerCase(),
      senha: senhaHash,
      telefone: limparTexto(dados.telefone),
      cargo: limparTexto(dados.cargo),
      tipo: dados.tipo || "Equipe",
      especialidade: limparTexto(dados.especialidade),
      status: dados.status || "Ativo",
      perfilId: limparPerfilId(dados.perfilId),
      dataAdmissao: limparData(dados.dataAdmissao),
      observacoes: limparTexto(dados.observacoes),
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Usuários",
      acao: "Criou usuário",
      entidade: "Usuario",
      entidadeId: String(usuarioCriado.id),
      usuario: usuarioAtual.email,
      detalhes: usuarioCriado.email,
    },
  });

  revalidatePath("/usuarios");
  revalidatePath("/permissoes");
}

export async function atualizarUsuario(dados: AtualizarUsuarioInput) {
  const usuarioAtual = await requirePermission("usuarios.gerenciar");
  const senha = validarSenha(dados.senha);
  const senhaData = senha ? { senha: await bcrypt.hash(senha, 10) } : {};

  const usuarioEditado = await prisma.usuario.update({
    where: { id: dados.id },
    data: {
      nome: dados.nome.trim(),
      email: dados.email.trim().toLowerCase(),
      ...senhaData,
      telefone: limparTexto(dados.telefone),
      cargo: limparTexto(dados.cargo),
      tipo: dados.tipo || "Equipe",
      especialidade: limparTexto(dados.especialidade),
      status: dados.status || "Ativo",
      perfilId: limparPerfilId(dados.perfilId),
      dataAdmissao: limparData(dados.dataAdmissao),
      observacoes: limparTexto(dados.observacoes),
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Usuários",
      acao: senha ? "Atualizou usuário e senha" : "Atualizou usuário",
      entidade: "Usuario",
      entidadeId: String(usuarioEditado.id),
      usuario: usuarioAtual.email,
      detalhes: usuarioEditado.email,
    },
  });

  revalidatePath("/usuarios");
  revalidatePath("/permissoes");
}

export async function alterarStatusUsuario(id: number, status: string) {
  const usuarioAtual = await requirePermission("usuarios.gerenciar");
  const usuarioEditado = await prisma.usuario.update({ where: { id }, data: { status } });

  await prisma.auditoria.create({
    data: {
      modulo: "Usuários",
      acao: `Alterou status para ${status}`,
      entidade: "Usuario",
      entidadeId: String(id),
      usuario: usuarioAtual.email,
      detalhes: usuarioEditado.email,
    },
  });

  revalidatePath("/usuarios");
}

export async function excluirUsuario(id: number) {
  const usuarioAtual = await requirePermission("usuarios.gerenciar");
  const usuarioExcluido = await prisma.usuario.delete({ where: { id } });

  await prisma.auditoria.create({
    data: {
      modulo: "Usuários",
      acao: "Excluiu usuário",
      entidade: "Usuario",
      entidadeId: String(id),
      usuario: usuarioAtual.email,
      detalhes: usuarioExcluido.email,
    },
  });

  revalidatePath("/usuarios");
  revalidatePath("/permissoes");
}
