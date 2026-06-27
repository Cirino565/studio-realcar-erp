"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

async function contarRegistrosBackup() {
  const [
    clientes,
    agendamentos,
    lancamentos,
    fornecedores,
    produtos,
    movimentacoes,
    leads,
    campanhas,
    usuarios,
    perfis,
    permissoes,
    automacoes,
    configuracoes,
    auditoria,
    anamneses,
    fotos,
    documentos,
    procedimentos,
    evolucoes,
  ] = await Promise.all([
    prisma.cliente.count(),
    prisma.agendamento.count(),
    prisma.lancamento.count(),
    prisma.fornecedor.count(),
    prisma.produto.count(),
    prisma.movimentacaoEstoque.count(),
    prisma.lead.count(),
    prisma.campanhaMarketing.count(),
    prisma.usuario.count(),
    prisma.perfil.count(),
    prisma.permissao.count(),
    prisma.automacao.count(),
    prisma.configuracaoClinica.count(),
    prisma.auditoria.count(),
    prisma.clienteAnamnese.count(),
    prisma.clienteFoto.count(),
    prisma.clienteDocumento.count(),
    prisma.clienteProcedimento.count(),
    prisma.clienteEvolucao.count(),
  ]);

  const total = clientes + agendamentos + lancamentos + fornecedores + produtos + movimentacoes + leads + campanhas + usuarios + perfis + permissoes + automacoes + configuracoes + auditoria + anamneses + fotos + documentos + procedimentos + evolucoes;

  return {
    clientes,
    agendamentos,
    lancamentos,
    fornecedores,
    produtos,
    movimentacoes,
    leads,
    campanhas,
    usuarios,
    perfis,
    permissoes,
    automacoes,
    configuracoes,
    auditoria,
    anamneses,
    fotos,
    documentos,
    procedimentos,
    evolucoes,
    total,
  };
}

export async function registrarBackupManual() {
  const usuarioAtual = await requirePermission("backup.gerenciar");
  const metricas = await contarRegistrosBackup();
  const agora = new Date();

  await prisma.backupRegistro.create({
    data: {
      nome: `Backup lógico ${agora.toLocaleString("pt-BR")}`,
      status: "Concluído",
      tamanho: `${metricas.total} registros`,
      observacoes: "Snapshot lógico registrado. Use a exportação JSON para baixar os dados atuais do ERP.",
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Backup",
      acao: "Gerou backup lógico",
      entidade: "BackupRegistro",
      usuario: usuarioAtual.email,
      detalhes: `${metricas.total} registros mapeados para exportação.`,
    },
  });

  revalidatePath("/backup");
  revalidatePath("/auditoria");
}

export async function excluirBackupRegistro(id: number) {
  const usuarioAtual = await requirePermission("backup.gerenciar");
  const backup = await prisma.backupRegistro.findUnique({ where: { id } });

  if (!backup) {
    return;
  }

  await prisma.backupRegistro.delete({ where: { id } });
  await prisma.auditoria.create({
    data: {
      modulo: "Backup",
      acao: "Excluiu registro de backup",
      entidade: "BackupRegistro",
      entidadeId: String(id),
      usuario: usuarioAtual.email,
      detalhes: backup.nome,
    },
  });

  revalidatePath("/backup");
  revalidatePath("/auditoria");
}

export async function limparBackupsAntigos() {
  const usuarioAtual = await requirePermission("backup.gerenciar");
  const backups = await prisma.backupRegistro.findMany({
    orderBy: { createdAt: "desc" },
    skip: 10,
    select: { id: true },
  });

  if (backups.length === 0) {
    return;
  }

  await prisma.backupRegistro.deleteMany({
    where: { id: { in: backups.map((backup) => backup.id) } },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Backup",
      acao: "Limpou backups antigos",
      entidade: "BackupRegistro",
      usuario: usuarioAtual.email,
      detalhes: `${backups.length} registros antigos removidos.`,
    },
  });

  revalidatePath("/backup");
  revalidatePath("/auditoria");
}
