import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AutomacoesClient } from "./components/AutomacoesClient";
import type { AutomacaoInsight } from "./types";

function diasAtras(data: Date, dias: number) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() - dias);
}

function amanhaRange() {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
  const fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 2);

  return { inicio, fim };
}

async function carregarInsights(): Promise<AutomacaoInsight[]> {
  const { inicio, fim } = amanhaRange();
  const hoje = new Date();
  const sessentaDiasAtras = diasAtras(hoje, 60);

  const [agendamentosAmanha, clientesInativos, produtosAtivos, lancamentosMes, leadsNovos] = await Promise.all([
    prisma.agendamento.count({
      where: {
        data: { gte: inicio, lt: fim },
        status: { not: "Cancelado" },
      },
    }),
    prisma.cliente.count({
      where: {
        OR: [{ ultimaVisita: null }, { ultimaVisita: { lt: sessentaDiasAtras } }],
        status: { not: "Inativa" },
      },
    }),
    prisma.produto.findMany({
      where: { status: "Ativo" },
      select: { quantidade: true, estoqueMinimo: true },
    }),
    prisma.lancamento.count({
      where: {
        data: { gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1) },
      },
    }),
    prisma.lead.count({
      where: {
        etapa: { notIn: ["Convertido", "Perdido"] },
      },
    }),
  ]);

  const produtosCriticos = produtosAtivos.filter((produto) => produto.quantidade <= produto.estoqueMinimo).length;

  return [
    {
      id: "agenda-amanha",
      titulo: "Lembretes para amanhã",
      descricao: "Agendamentos que podem receber mensagem manual de confirmação pelo WhatsApp.",
      modulo: "Agenda",
      total: agendamentosAmanha,
      prioridade: agendamentosAmanha > 0 ? "Alta" : "Baixa",
      acaoRecomendada: "Abrir Agenda e usar o botão de mensagem do atendimento.",
    },
    {
      id: "clientes-inativos",
      titulo: "Clientes para reativação",
      descricao: "Clientes sem visita recente ou sem última visita registrada.",
      modulo: "Clientes",
      total: clientesInativos,
      prioridade: clientesInativos > 10 ? "Alta" : "Média",
      acaoRecomendada: "Usar modelos de retorno no perfil do cliente.",
    },
    {
      id: "estoque-baixo",
      titulo: "Alertas de estoque",
      descricao: "Produtos ativos com quantidade igual ou abaixo do mínimo configurado.",
      modulo: "Estoque",
      total: produtosCriticos,
      prioridade: produtosCriticos > 0 ? "Crítica" : "Baixa",
      acaoRecomendada: "Revisar compras e fornecedores antes de faltar insumo.",
    },
    {
      id: "financeiro-mes",
      titulo: "Rotina financeira mensal",
      descricao: "Lançamentos registrados no mês atual para revisão de caixa.",
      modulo: "Financeiro",
      total: lancamentosMes,
      prioridade: "Média",
      acaoRecomendada: "Conferir categorias, saídas e saldo semanalmente.",
    },
    {
      id: "leads-ativos",
      titulo: "Leads em aberto",
      descricao: "Oportunidades não convertidas que precisam de acompanhamento comercial.",
      modulo: "Marketing",
      total: leadsNovos,
      prioridade: leadsNovos > 0 ? "Alta" : "Baixa",
      acaoRecomendada: "Avançar pipeline e enviar mensagem comercial manual.",
    },
  ];
}

export default async function AutomacoesPage() {
  await requirePagePermission("automacoes.gerenciar");
  const [automacoes, insights] = await Promise.all([
    prisma.automacao.findMany({ orderBy: [{ prioridade: "desc" }, { createdAt: "desc" }] }),
    carregarInsights(),
  ]);

  return <AutomacoesClient automacoes={automacoes} insights={insights} />;
}
