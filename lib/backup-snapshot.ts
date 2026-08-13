import { prisma } from "@/lib/prisma";

export const BACKUP_SNAPSHOT_VERSION = "studio-realcar-erp-deploy-ready-1.7";

export type BackupSnapshot = {
  generatedAt: string;
  version: string;
  type: string;
  totalRegistros: number;
  data: Record<string, unknown[]>;
};

/**
 * Monta o snapshot lógico completo do ERP.
 *
 * Usado em dois lugares:
 * - exportação manual pela tela /backup (rota /api/backup)
 * - backup automático diário para o Google Drive (rota /api/backup/automatico)
 *
 * O campo "senha" dos usuários NUNCA entra no snapshot.
 */
export async function gerarSnapshotBackup(): Promise<BackupSnapshot> {
  const generatedAt = new Date().toISOString();

  const [
    clientes,
    origensCliente,
    procedimentosInteresse,
    procedimentosServico,
    profissionais,
    agendamentos,
    bloqueiosAgenda,
    lancamentos,
    vendas,
    vendaItens,
    kitsProdutos,
    kitsProdutosItens,
    fornecedores,
    produtos,
    movimentacoes,
    compras,
    compraItens,
    leads,
    leadInteracoes,
    campanhas,
    contasFinanceiras,
    formasPagamento,
    usuarios,
    perfis,
    permissoes,
    perfilPermissoes,
    automacoes,
    mensagemModelos,
    comunicacoes,
    configuracoes,
    auditoria,
    backupRegistros,
    anamneses,
    anamneseModelos,
    anamnesePerguntas,
    anamneseRespostas,
    fotos,
    documentos,
    procedimentos,
    evolucoes,
  ] = await Promise.all([
    prisma.cliente.findMany(),
    prisma.origemCliente.findMany(),
    prisma.procedimentoInteresse.findMany(),
    prisma.procedimentoServico.findMany(),
    prisma.profissional.findMany(),
    prisma.agendamento.findMany(),
    prisma.bloqueioAgenda.findMany(),
    prisma.lancamento.findMany(),
    prisma.venda.findMany(),
    prisma.vendaItem.findMany(),
    prisma.kitProduto.findMany(),
    prisma.kitProdutoItem.findMany(),
    prisma.fornecedor.findMany(),
    prisma.produto.findMany(),
    prisma.movimentacaoEstoque.findMany(),
    prisma.compra.findMany(),
    prisma.compraItem.findMany(),
    prisma.lead.findMany(),
    prisma.leadInteracao.findMany(),
    prisma.campanhaMarketing.findMany(),
    prisma.contaFinanceira.findMany(),
    prisma.formaPagamentoConfig.findMany(),
    prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        cargo: true,
        tipo: true,
        especialidade: true,
        status: true,
        perfilId: true,
        dataAdmissao: true,
        ultimoAcesso: true,
        observacoes: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.perfil.findMany(),
    prisma.permissao.findMany(),
    prisma.perfilPermissao.findMany(),
    prisma.automacao.findMany(),
    prisma.mensagemModelo.findMany(),
    prisma.comunicacaoRegistro.findMany(),
    prisma.configuracaoClinica.findMany(),
    prisma.auditoria.findMany(),
    prisma.backupRegistro.findMany(),
    prisma.clienteAnamnese.findMany(),
    prisma.anamneseModelo.findMany(),
    prisma.anamnesePergunta.findMany(),
    prisma.clienteAnamneseResposta.findMany(),
    prisma.clienteFoto.findMany(),
    prisma.clienteDocumento.findMany(),
    prisma.clienteProcedimento.findMany(),
    prisma.clienteEvolucao.findMany(),
  ]);

  const data = {
    clientes,
    origensCliente,
    procedimentosInteresse,
    procedimentosServico,
    profissionais,
    agendamentos,
    bloqueiosAgenda,
    lancamentos,
    vendas,
    vendaItens,
    kitsProdutos,
    kitsProdutosItens,
    fornecedores,
    produtos,
    movimentacoes,
    compras,
    compraItens,
    leads,
    leadInteracoes,
    campanhas,
    contasFinanceiras,
    formasPagamento,
    usuarios,
    perfis,
    permissoes,
    perfilPermissoes,
    automacoes,
    mensagemModelos,
    comunicacoes,
    configuracoes,
    auditoria,
    backupRegistros,
    anamneses,
    anamneseModelos,
    anamnesePerguntas,
    anamneseRespostas,
    fotos,
    documentos,
    procedimentos,
    evolucoes,
  };

  const totalRegistros = Object.values(data).reduce(
    (total, registros) => total + registros.length,
    0,
  );

  return {
    generatedAt,
    version: BACKUP_SNAPSHOT_VERSION,
    type: "logical-snapshot",
    totalRegistros,
    data,
  };
}