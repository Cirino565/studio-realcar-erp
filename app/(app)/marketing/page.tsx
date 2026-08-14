import { canAccess, requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MarketingClient from "./components/MarketingClient";

export default async function MarketingPage() {
  const usuario = await requirePagePermission("marketing.visualizar");

  const [leadsBase, campanhasBase, profissionais, servicos, procedimentosInteresseBase, clientes, contas, vendasCampanha, lancamentosCampanha, receitasSemCampanhaBase] = await Promise.all([
    prisma.lead.findMany({
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
          },
        },
        agendamento: {
          select: {
            id: true,
            data: true,
            status: true,
            procedimento: true,
            profissional: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
        campanha: {
          select: {
            id: true,
            nome: true,
            canal: true,
          },
        },
        interacoes: {
          orderBy: { createdAt: "desc" },
          take: 12,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campanhaMarketing.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.profissional.findMany({
      where: { status: "Ativa" },
      select: { id: true, nome: true },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
    prisma.procedimentoServico.findMany({
      where: { status: "Ativo" },
      select: {
        id: true,
        nome: true,
        duracaoPadrao: true,
        valorPadrao: true,
      },
      orderBy: [{ nome: "asc" }, { id: "asc" }],
    }),
    prisma.procedimentoInteresse.findMany({
      where: { status: "Ativo" },
      select: { nome: true },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
    prisma.cliente.findMany({
      where: { status: { not: "Inativa" } },
      select: {
        id: true,
        nome: true,
        telefone: true,
        whatsapp: true,
        campanhaAquisicaoId: true,
      },
      orderBy: { nome: "asc" },
    }),
    prisma.contaFinanceira.findMany({
      where: { status: "Ativa" },
      select: { id: true, nome: true, banco: true, principal: true },
      orderBy: [{ principal: "desc" }, { nome: "asc" }],
    }),
    prisma.venda.findMany({
      where: {
        campanhaId: { not: null },
        situacao: { not: "CANCELADA" },
        statusPagamento: "Pago",
      },
      select: {
        campanhaId: true,
        valorTotal: true,
        taxaPagamento: true,
        valorLiquido: true,
      },
    }),
    prisma.lancamento.findMany({
      where: {
        campanhaId: { not: null },
        statusPagamento: "Pago",
      },
      select: {
        campanhaId: true,
        tipo: true,
        categoria: true,
        valor: true,
        valorLiquido: true,
        taxaPagamento: true,
        venda: { select: { id: true } },
      },
    }),
    prisma.lancamento.findMany({
      where: {
        tipo: "ENTRADA",
        campanhaId: null,
        statusPagamento: "Pago",
      },
      orderBy: [{ data: "desc" }, { id: "desc" }],
      take: 200,
      select: {
        id: true,
        descricao: true,
        valor: true,
        data: true,
        clienteId: true,
        venda: {
          select: {
            id: true,
            cliente: { select: { id: true, nome: true } },
          },
        },
      },
    }),
  ]);

  const agendamentoIds = leadsBase
    .map((lead) => lead.agendamentoId)
    .filter((id): id is number => Boolean(id));

  const lancamentos = agendamentoIds.length
    ? await prisma.lancamento.findMany({
        where: {
          agendamentoId: { in: agendamentoIds },
          tipo: "ENTRADA",
          statusPagamento: "Pago",
        },
        select: {
          agendamentoId: true,
          valor: true,
        },
      })
    : [];

  const receitaPorAgendamento = new Map<number, number>();
  for (const lancamento of lancamentos) {
    if (!lancamento.agendamentoId) continue;
    receitaPorAgendamento.set(
      lancamento.agendamentoId,
      (receitaPorAgendamento.get(lancamento.agendamentoId) || 0) + lancamento.valor,
    );
  }

  const leads = leadsBase.map((lead) => ({
    ...lead,
    receitaRastreada: lead.agendamentoId
      ? receitaPorAgendamento.get(lead.agendamentoId) || 0
      : 0,
  }));

  const nomeClientePorId = new Map(clientes.map((cliente) => [cliente.id, cliente.nome]));
  const receitasSemCampanha = receitasSemCampanhaBase.map((receita) => ({
    id: receita.id,
    descricao: receita.descricao,
    valor: receita.valor,
    data: receita.data,
    clienteId: receita.clienteId || receita.venda?.cliente?.id || null,
    clienteNome:
      receita.venda?.cliente?.nome ||
      (receita.clienteId ? nomeClientePorId.get(receita.clienteId) || null : null),
    vendaId: receita.venda?.id || null,
  }));

  const campanhas = campanhasBase.map((campanha) => {
    const leadsCampanha = leads.filter((lead) => lead.campanhaId === campanha.id);
    const clientesCampanha = clientes.filter((cliente) => cliente.campanhaAquisicaoId === campanha.id);
    const vendas = vendasCampanha.filter((venda) => venda.campanhaId === campanha.id);
    const lancamentosManuais = lancamentosCampanha.filter(
      (lancamento) =>
        lancamento.campanhaId === campanha.id &&
        lancamento.tipo === "ENTRADA" &&
        !lancamento.venda,
    );
    const custos = lancamentosCampanha.filter(
      (lancamento) =>
        lancamento.campanhaId === campanha.id && lancamento.tipo === "SAIDA",
    );

    const receitaBrutaVendas = vendas.reduce((total, venda) => total + venda.valorTotal, 0);
    const taxasVendas = vendas.reduce((total, venda) => total + venda.taxaPagamento, 0);
    const receitaLiquidaVendas = vendas.reduce(
      (total, venda) => total + (venda.valorLiquido ?? venda.valorTotal - venda.taxaPagamento),
      0,
    );
    const receitaBrutaManual = lancamentosManuais.reduce((total, item) => total + item.valor, 0);
    const taxasManuais = lancamentosManuais.reduce((total, item) => total + item.taxaPagamento, 0);
    const receitaLiquidaManual = lancamentosManuais.reduce(
      (total, item) => total + (item.valorLiquido ?? item.valor - item.taxaPagamento),
      0,
    );
    const custoReal = custos.reduce((total, item) => total + item.valor, 0);
    const receitaBruta = receitaBrutaVendas + receitaBrutaManual;
    const taxasPagamento = taxasVendas + taxasManuais;
    const receitaLiquida = receitaLiquidaVendas + receitaLiquidaManual;

    return {
      ...campanha,
      metricas: {
        leads: leadsCampanha.length,
        convertidos: leadsCampanha.filter((lead) => lead.etapa === "Convertido").length,
        clientes: clientesCampanha.length,
        receitaBruta,
        taxasPagamento,
        receitaLiquida,
        custoReal,
        resultado: receitaLiquida - custoReal,
        roas: custoReal > 0 ? receitaBruta / custoReal : null,
      },
    };
  });

  const procedimentosInteresse = procedimentosInteresseBase.map((item) => item.nome);

  return (
    <MarketingClient
      leads={leads}
      campanhas={campanhas}
      procedimentosInteresse={procedimentosInteresse}
      clientes={clientes}
      contas={contas}
      receitasSemCampanha={receitasSemCampanha}
      profissionais={profissionais}
      servicos={servicos}
      podeGerenciarMarketing={canAccess(usuario, "marketing.gerenciar")}
      podeGerenciarAgenda={canAccess(usuario, "agenda.gerenciar")}
    />
  );
}