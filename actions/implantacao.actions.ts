"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { isAdminUser, requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PROCEDIMENTOS_INICIAIS } from "@/lib/procedimentos-iniciais";

const CONFIRMACAO_EXATA = "INICIAR STUDIO REALCAR";
const MARCADOR_IMPLANTACAO = "Preparou início oficial";

export type ResumoImplantacao = {
  clientes: number;
  agendamentos: number;
  bloqueiosAgenda: number;
  vendas: number;
  vendaItens: number;
  lancamentos: number;
  movimentacoesEstoque: number;
  compras: number;
  compraItens: number;
  leads: number;
  leadInteracoes: number;
  campanhas: number;
  comunicacoes: number;
  anamneses: number;
  anamneseRespostas: number;
  fotos: number;
  documentos: number;
  procedimentosCliente: number;
  evolucoes: number;
  produtos: number;
  fornecedores: number;
  procedimentosServicoAtivos: number;
  procedimentosInteresseAtivos: number;
  totalOperacional: number;
  jaPreparado: boolean;
};

export type PrepararInicioInput = {
  confirmacao: string;
  backupConfirmado: boolean;
  apagarProdutosFornecedores: boolean;
};

export type ResultadoProcedimentos = {
  criados: number;
  atualizados: number;
  desativados: number;
  interessesCriados: number;
  interessesAtualizados: number;
  interessesDesativados: number;
};

export type ResultadoImplantacao = {
  ok: true;
  mensagem: string;
  removidos: number;
  produtosRemovidos: boolean;
  procedimentos: ResultadoProcedimentos;
};

function normalizarChave(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function reordenarProcedimentosComTransacao(
  tx: Prisma.TransactionClient,
) {
  const [servicos, interesses] = await Promise.all([
    tx.procedimentoServico.findMany({
      select: { id: true, nome: true, ordem: true },
    }),
    tx.procedimentoInteresse.findMany({
      select: { id: true, nome: true, ordem: true },
    }),
  ]);

  const ordenar = <T extends { nome: string }>(items: T[]) =>
    [...items].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", {
        sensitivity: "base",
        numeric: true,
      }),
    );

  await Promise.all([
    ...ordenar(servicos).map((item, index) =>
      item.ordem === index
        ? Promise.resolve(item)
        : tx.procedimentoServico.update({
            where: { id: item.id },
            data: { ordem: index },
          }),
    ),
    ...ordenar(interesses).map((item, index) =>
      item.ordem === index
        ? Promise.resolve(item)
        : tx.procedimentoInteresse.update({
            where: { id: item.id },
            data: { ordem: index },
          }),
    ),
  ]);
}

async function exigirAdministrador() {
  const usuario = await requireCurrentUser();

  if (!isAdminUser(usuario)) {
    throw new Error("Somente um administrador pode executar a preparação inicial.");
  }

  return usuario;
}

export async function obterResumoImplantacao(): Promise<ResumoImplantacao> {
  await exigirAdministrador();

  const [
    clientes,
    agendamentos,
    bloqueiosAgenda,
    vendas,
    vendaItens,
    lancamentos,
    movimentacoesEstoque,
    compras,
    compraItens,
    leads,
    leadInteracoes,
    campanhas,
    comunicacoes,
    anamneses,
    anamneseRespostas,
    fotos,
    documentos,
    procedimentosCliente,
    evolucoes,
    produtos,
    fornecedores,
    procedimentosServicoAtivos,
    procedimentosInteresseAtivos,
    jaPreparado,
  ] = await Promise.all([
    prisma.cliente.count(),
    prisma.agendamento.count(),
    prisma.bloqueioAgenda.count(),
    prisma.venda.count(),
    prisma.vendaItem.count(),
    prisma.lancamento.count(),
    prisma.movimentacaoEstoque.count(),
    prisma.compra.count(),
    prisma.compraItem.count(),
    prisma.lead.count(),
    prisma.leadInteracao.count(),
    prisma.campanhaMarketing.count(),
    prisma.comunicacaoRegistro.count(),
    prisma.clienteAnamnese.count(),
    prisma.clienteAnamneseResposta.count(),
    prisma.clienteFoto.count(),
    prisma.clienteDocumento.count(),
    prisma.clienteProcedimento.count(),
    prisma.clienteEvolucao.count(),
    prisma.produto.count(),
    prisma.fornecedor.count(),
    prisma.procedimentoServico.count({ where: { status: "Ativo" } }),
    prisma.procedimentoInteresse.count({ where: { status: "Ativo" } }),
    prisma.auditoria.findFirst({
      where: { modulo: "Implantação", acao: MARCADOR_IMPLANTACAO },
      select: { id: true },
    }),
  ]);

  const totalOperacional =
    clientes +
    agendamentos +
    bloqueiosAgenda +
    vendas +
    vendaItens +
    lancamentos +
    movimentacoesEstoque +
    compras +
    compraItens +
    leads +
    leadInteracoes +
    campanhas +
    comunicacoes +
    anamneses +
    anamneseRespostas +
    fotos +
    documentos +
    procedimentosCliente +
    evolucoes;

  return {
    clientes,
    agendamentos,
    bloqueiosAgenda,
    vendas,
    vendaItens,
    lancamentos,
    movimentacoesEstoque,
    compras,
    compraItens,
    leads,
    leadInteracoes,
    campanhas,
    comunicacoes,
    anamneses,
    anamneseRespostas,
    fotos,
    documentos,
    procedimentosCliente,
    evolucoes,
    produtos,
    fornecedores,
    procedimentosServicoAtivos,
    procedimentosInteresseAtivos,
    totalOperacional,
    jaPreparado: Boolean(jaPreparado),
  };
}

async function sincronizarProcedimentosComTransacao(
  tx: Prisma.TransactionClient,
): Promise<ResultadoProcedimentos> {
  const existentesServico = await tx.procedimentoServico.findMany();
  const servicosPorChave = new Map(
    existentesServico.map((item) => [normalizarChave(item.nome), item]),
  );

  const existentesInteresse = await tx.procedimentoInteresse.findMany();
  const interessesPorChave = new Map(
    existentesInteresse.map((item) => [normalizarChave(item.nome), item]),
  );

  const chavesOficiais = new Set(
    PROCEDIMENTOS_INICIAIS.map((item) => normalizarChave(item.nome)),
  );
  const chavesServicoPreservadas = new Set(["avaliacao"]);
  const chavesInteressePreservadas = new Set(["avaliacao", "outro"]);

  let criados = 0;
  let atualizados = 0;
  let desativados = 0;
  let interessesCriados = 0;
  let interessesAtualizados = 0;
  let interessesDesativados = 0;

  for (const [index, procedimento] of PROCEDIMENTOS_INICIAIS.entries()) {
    const chave = normalizarChave(procedimento.nome);
    const existenteServico = servicosPorChave.get(chave);

    if (existenteServico) {
      await tx.procedimentoServico.update({
        where: { id: existenteServico.id },
        data: {
          nome: procedimento.nome,
          categoria: procedimento.categoria,
          descricao: procedimento.descricao,
          duracaoPadrao: procedimento.duracaoPadrao,
          valorPadrao: procedimento.valorPadrao,
          custoPadrao: procedimento.custoPadrao,
          status: "Ativo",
          ordem: index + 1,
        },
      });
      atualizados += 1;
    } else {
      await tx.procedimentoServico.create({
        data: {
          nome: procedimento.nome,
          categoria: procedimento.categoria,
          descricao: procedimento.descricao,
          duracaoPadrao: procedimento.duracaoPadrao,
          valorPadrao: procedimento.valorPadrao,
          custoPadrao: procedimento.custoPadrao,
          status: "Ativo",
          ordem: index + 1,
        },
      });
      criados += 1;
    }

    const existenteInteresse = interessesPorChave.get(chave);
    if (existenteInteresse) {
      await tx.procedimentoInteresse.update({
        where: { id: existenteInteresse.id },
        data: {
          nome: procedimento.nome,
          descricao: procedimento.categoria,
          status: "Ativo",
          ordem: index + 1,
        },
      });
      interessesAtualizados += 1;
    } else {
      await tx.procedimentoInteresse.create({
        data: {
          nome: procedimento.nome,
          descricao: procedimento.categoria,
          status: "Ativo",
          ordem: index + 1,
        },
      });
      interessesCriados += 1;
    }
  }

  for (const servico of existentesServico) {
    const chave = normalizarChave(servico.nome);
    if (!chavesOficiais.has(chave) && !chavesServicoPreservadas.has(chave) && servico.status === "Ativo") {
      await tx.procedimentoServico.update({
        where: { id: servico.id },
        data: { status: "Inativo" },
      });
      desativados += 1;
    }
  }

  for (const interesse of existentesInteresse) {
    const chave = normalizarChave(interesse.nome);
    if (!chavesOficiais.has(chave) && !chavesInteressePreservadas.has(chave) && interesse.status === "Ativo") {
      await tx.procedimentoInteresse.update({
        where: { id: interesse.id },
        data: { status: "Inativo" },
      });
      interessesDesativados += 1;
    }
  }

  await reordenarProcedimentosComTransacao(tx);

  return {
    criados,
    atualizados,
    desativados,
    interessesCriados,
    interessesAtualizados,
    interessesDesativados,
  };
}

export async function sincronizarProcedimentosIniciais(): Promise<ResultadoProcedimentos> {
  const usuario = await exigirAdministrador();

  const resultado = await prisma.$transaction(
    async (tx) => {
      const procedimentos = await sincronizarProcedimentosComTransacao(tx);

      await tx.auditoria.create({
        data: {
          modulo: "Implantação",
          acao: "Sincronizou procedimentos oficiais",
          entidade: "ProcedimentoServico",
          usuario: usuario.email,
          detalhes: `${PROCEDIMENTOS_INICIAIS.length} procedimentos processados.`,
        },
      });

      return procedimentos;
    },
    { maxWait: 10_000, timeout: 30_000 },
  );

  revalidarSistema();
  return resultado;
}

async function reiniciarSequencias(
  tx: Prisma.TransactionClient,
  tabelas: readonly string[],
) {
  for (const tabela of tabelas) {
    await tx.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${tabela}"', 'id'), 1, false)`,
    );
  }
}

function revalidarSistema() {
  const caminhos = [
    "/",
    "/agenda",
    "/clientes",
    "/financeiro",
    "/vendas",
    "/estoque",
    "/relatorios",
    "/marketing",
    "/comunicacoes",
    "/auditoria",
    "/backup",
    "/configuracoes",
    "/configuracoes/implantacao",
  ];

  for (const caminho of caminhos) {
    revalidatePath(caminho);
  }
}

export async function prepararInicioOficial(
  dados: PrepararInicioInput,
): Promise<ResultadoImplantacao> {
  const usuario = await exigirAdministrador();

  if (!dados.backupConfirmado) {
    throw new Error("Confirme que o backup JSON foi baixado antes de continuar.");
  }

  if (dados.confirmacao.trim().toUpperCase() !== CONFIRMACAO_EXATA) {
    throw new Error(`Digite exatamente: ${CONFIRMACAO_EXATA}`);
  }

  const jaExecutado = await prisma.auditoria.findFirst({
    where: { modulo: "Implantação", acao: MARCADOR_IMPLANTACAO },
    select: { id: true },
  });

  if (jaExecutado) {
    throw new Error(
      "A preparação inicial já foi executada. A limpeza destrutiva foi bloqueada para evitar perda de dados reais.",
    );
  }

  const resumoAntes = await obterResumoImplantacao();

  const resultado = await prisma.$transaction(
    async (tx) => {
      await tx.comunicacaoRegistro.deleteMany();
      await tx.leadInteracao.deleteMany();
      await tx.lead.deleteMany();
      await tx.campanhaMarketing.deleteMany();

      await tx.movimentacaoEstoque.deleteMany();
      await tx.vendaItem.deleteMany();
      await tx.venda.deleteMany();
      await tx.lancamento.deleteMany();

      await tx.compraItem.deleteMany();
      await tx.compra.deleteMany();

      await tx.clienteAnamneseResposta.deleteMany();
      await tx.clienteAnamnese.deleteMany();
      await tx.clienteFoto.deleteMany();
      await tx.clienteDocumento.deleteMany();
      await tx.clienteProcedimento.deleteMany();
      await tx.clienteEvolucao.deleteMany();

      await tx.agendamento.deleteMany();
      await tx.bloqueioAgenda.deleteMany();
      await tx.cliente.deleteMany();

      if (dados.apagarProdutosFornecedores) {
        await tx.kitProdutoItem.deleteMany();
        await tx.kitProduto.deleteMany();
        await tx.produto.deleteMany();
        await tx.fornecedor.deleteMany();
      } else {
        await tx.produto.updateMany({ data: { quantidade: 0 } });
      }

      await tx.auditoria.deleteMany();
      await tx.backupRegistro.deleteMany();

      const tabelasParaReiniciar = [
        "ComunicacaoRegistro",
        "LeadInteracao",
        "Lead",
        "CampanhaMarketing",
        "MovimentacaoEstoque",
        "VendaItem",
        "Venda",
        "Lancamento",
        "CompraItem",
        "Compra",
        "ClienteAnamneseResposta",
        "ClienteAnamnese",
        "ClienteFoto",
        "ClienteDocumento",
        "ClienteProcedimento",
        "ClienteEvolucao",
        "Agendamento",
        "BloqueioAgenda",
        "Cliente",
        "Auditoria",
        "BackupRegistro",
      ];

      if (dados.apagarProdutosFornecedores) {
        tabelasParaReiniciar.push(
          "KitProdutoItem",
          "KitProduto",
          "Produto",
          "Fornecedor",
        );
      }

      await reiniciarSequencias(tx, tabelasParaReiniciar);
      const procedimentos = await sincronizarProcedimentosComTransacao(tx);

      await tx.auditoria.create({
        data: {
          modulo: "Implantação",
          acao: MARCADOR_IMPLANTACAO,
          entidade: "Sistema",
          usuario: usuario.email,
          detalhes: [
            `${resumoAntes.totalOperacional} registros operacionais de teste identificados antes da limpeza.`,
            `${PROCEDIMENTOS_INICIAIS.length} procedimentos oficiais processados.`,
            dados.apagarProdutosFornecedores
              ? "Produtos, kits e fornecedores de teste removidos."
              : "Catálogo de produtos e kits preservado, com quantidades dos produtos zeradas para contagem física.",
          ].join(" "),
        },
      });

      return procedimentos;
    },
    { maxWait: 10_000, timeout: 45_000 },
  );

  revalidarSistema();

  return {
    ok: true,
    mensagem: "Preparação inicial concluída. O sistema está pronto para receber clientes e estoque real.",
    removidos: resumoAntes.totalOperacional,
    produtosRemovidos: dados.apagarProdutosFornecedores,
    procedimentos: resultado,
  };
}
