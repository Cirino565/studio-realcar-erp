import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BackupClient } from "./components/BackupClient";
import type { BackupMetricas, BackupSaude } from "./types";

async function carregarMetricas(): Promise<BackupMetricas> {
  const [
    clientes,
    origensCliente,
    procedimentosInteresse,
    procedimentosServico,
    profissionais,
    agendamentos,
    bloqueiosAgenda,
    lancamentos,
    fornecedores,
    produtos,
    movimentacoes,
    compras,
    compraItens,
    leads,
    interacoesLeads,
    campanhas,
    usuarios,
    perfis,
    permissoes,
    perfilPermissoes,
    automacoes,
    mensagemModelos,
    comunicacoes,
    auditoria,
    anamneses,
    anamneseModelos,
    anamnesePerguntas,
    anamneseRespostas,
    fotos,
    documentos,
    procedimentos,
    evolucoes,
    configuracoes,
  ] = await Promise.all([
    prisma.cliente.count(),
    prisma.origemCliente.count(),
    prisma.procedimentoInteresse.count(),
    prisma.procedimentoServico.count(),
    prisma.profissional.count(),
    prisma.agendamento.count(),
    prisma.bloqueioAgenda.count(),
    prisma.lancamento.count(),
    prisma.fornecedor.count(),
    prisma.produto.count(),
    prisma.movimentacaoEstoque.count(),
    prisma.compra.count(),
    prisma.compraItem.count(),
    prisma.lead.count(),
    prisma.leadInteracao.count(),
    prisma.campanhaMarketing.count(),
    prisma.usuario.count(),
    prisma.perfil.count(),
    prisma.permissao.count(),
    prisma.perfilPermissao.count(),
    prisma.automacao.count(),
    prisma.mensagemModelo.count(),
    prisma.comunicacaoRegistro.count(),
    prisma.auditoria.count(),
    prisma.clienteAnamnese.count(),
    prisma.anamneseModelo.count(),
    prisma.anamnesePergunta.count(),
    prisma.clienteAnamneseResposta.count(),
    prisma.clienteFoto.count(),
    prisma.clienteDocumento.count(),
    prisma.clienteProcedimento.count(),
    prisma.clienteEvolucao.count(),
    prisma.configuracaoClinica.count(),
  ]);

  const metricasSemTotal = {
    clientes,
    origensCliente,
    procedimentosInteresse,
    procedimentosServico,
    profissionais,
    agendamentos,
    bloqueiosAgenda,
    lancamentos,
    fornecedores,
    produtos,
    movimentacoes,
    compras,
    compraItens,
    leads,
    interacoesLeads,
    campanhas,
    usuarios,
    perfis,
    permissoes,
    perfilPermissoes,
    automacoes,
    mensagemModelos,
    comunicacoes,
    auditoria,
    anamneses,
    anamneseModelos,
    anamnesePerguntas,
    anamneseRespostas,
    fotos,
    documentos,
    procedimentos,
    evolucoes,
    configuracoes,
  };

  const total = Object.values(metricasSemTotal).reduce((acc, valor) => acc + valor, 0);

  return {
    ...metricasSemTotal,
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
