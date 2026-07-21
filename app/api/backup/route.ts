import { NextResponse } from "next/server";

import { canAccess, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const usuarioAtual = await getCurrentUser();

  if (!usuarioAtual) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  if (!canAccess(usuarioAtual, "backup.gerenciar")) {
    return NextResponse.json({ erro: "Acesso negado para exportar backup." }, { status: 403 });
  }

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
    fornecedores,
    produtos,
    movimentacoes,
    compras,
    compraItens,
    leads,
    leadInteracoes,
    campanhas,
    usuarios,
    perfis,
    permissoes,
    perfilPermissoes,
    automacoes,
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
    prisma.fornecedor.findMany(),
    prisma.produto.findMany(),
    prisma.movimentacaoEstoque.findMany(),
    prisma.compra.findMany(),
    prisma.compraItem.findMany(),
    prisma.lead.findMany(),
    prisma.leadInteracao.findMany(),
    prisma.campanhaMarketing.findMany(),
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
    fornecedores,
    produtos,
    movimentacoes,
    compras,
    compraItens,
    leads,
    leadInteracoes,
    campanhas,
    usuarios,
    perfis,
    permissoes,
    perfilPermissoes,
    automacoes,
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

  await prisma.auditoria.create({
    data: {
      modulo: "Backup",
      acao: "Exportou backup JSON",
      entidade: "BackupRegistro",
      usuario: usuarioAtual.email,
      detalhes: `${totalRegistros} registros exportados. Campo senha dos usuários removido do snapshot.`,
    },
  });

  return NextResponse.json(
    {
      generatedAt,
      version: "studio-realcar-erp-deploy-ready-1.2",
      type: "logical-snapshot",
      totalRegistros,
      data,
    },
    {
      headers: {
        "Content-Disposition": `attachment; filename="studio-realcar-backup-${generatedAt.slice(0, 10)}.json"`,
      },
    },
  );
}
