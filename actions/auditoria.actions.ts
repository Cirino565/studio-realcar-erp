"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CriarAuditoriaInput = {
  modulo: string;
  acao: string;
  entidade?: string;
  entidadeId?: string;
  usuario?: string;
  detalhes?: string;
};

function limparTexto(valor?: string) {
  const texto = valor?.trim();
  return texto && texto.length > 0 ? texto : null;
}

export async function registrarAuditoria(dados: CriarAuditoriaInput) {
  await prisma.auditoria.create({
    data: {
      modulo: dados.modulo.trim(),
      acao: dados.acao.trim(),
      entidade: limparTexto(dados.entidade),
      entidadeId: limparTexto(dados.entidadeId),
      usuario: limparTexto(dados.usuario) || "Sistema",
      detalhes: limparTexto(dados.detalhes),
    },
  });

  revalidatePath("/auditoria");
}

export async function excluirRegistroAuditoria(id: number) {
  const usuarioAtual = await requirePermission("auditoria.visualizar");
  await prisma.auditoria.delete({ where: { id } });

  await prisma.auditoria.create({
    data: {
      modulo: "Auditoria",
      acao: "Excluiu registro de auditoria",
      entidade: "Auditoria",
      entidadeId: String(id),
      usuario: usuarioAtual.email,
    },
  });

  revalidatePath("/auditoria");
}

export async function limparAuditoriaAntiga(dias: number) {
  const usuarioAtual = await requirePermission("auditoria.visualizar");
  const diasSeguros = Math.max(30, Math.min(3650, Math.round(dias)));
  const limite = new Date();
  limite.setDate(limite.getDate() - diasSeguros);

  await prisma.auditoria.deleteMany({
    where: {
      createdAt: {
        lt: limite,
      },
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Auditoria",
      acao: "Limpou registros antigos",
      entidade: "Auditoria",
      usuario: usuarioAtual.email,
      detalhes: `Registros anteriores a ${diasSeguros} dias foram removidos.`,
    },
  });

  revalidatePath("/auditoria");
}
