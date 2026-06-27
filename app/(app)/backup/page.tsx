import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BackupClient } from "./components/BackupClient";
import type { BackupMetricas, BackupSaude } from "./types";

async function carregarMetricas(): Promise<BackupMetricas> {
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
    auditoria,
    anamneses,
    fotos,
    documentos,
    procedimentos,
    evolucoes,
    configuracoes,
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
    prisma.auditoria.count(),
    prisma.clienteAnamnese.count(),
    prisma.clienteFoto.count(),
    prisma.clienteDocumento.count(),
    prisma.clienteProcedimento.count(),
    prisma.clienteEvolucao.count(),
    prisma.configuracaoClinica.count(),
  ]);

  const total = clientes + agendamentos + lancamentos + fornecedores + produtos + movimentacoes + leads + campanhas + usuarios + perfis + permissoes + automacoes + auditoria + anamneses + fotos + documentos + procedimentos + evolucoes + configuracoes;

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
    auditoria,
    anamneses,
    fotos,
    documentos,
    procedimentos,
    evolucoes,
    configuracoes,
    total,
  };
}

export default async function BackupPage() {
  await requirePagePermission("backup.gerenciar");

  const [backups, metricas] = await Promise.all([
    prisma.backupRegistro.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    carregarMetricas(),
  ]);

  const saude: BackupSaude = {
    ultimoBackup: backups[0]?.createdAt ?? null,
    totalBackups: backups.length,
    backupsComErro: backups.filter((backup) => backup.status.toLowerCase().includes("erro")).length,
    registrosProtegidos: metricas.total,
  };

  return <BackupClient backups={backups} metricas={metricas} saude={saude} />;
}
