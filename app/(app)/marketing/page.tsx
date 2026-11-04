import { canAccess, requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buscarIdsClientesComCliquePago,
  leadTeveCliquePago,
  movimentoEhDeCliquePago,
} from "@/lib/atribuicao-campanha";
import { calcularVinculosClique } from "@/lib/vinculo-clique";
import {
  entradaEhSinal,
  itemDaEntrada,
  itemDaVenda,
  type ItemReceitaCampanha,
} from "@/lib/receita-campanha";
import MarketingClient from "./components/MarketingClient";

export default async function MarketingPage() {
  const usuario = await requirePagePermission("marketing.visualizar");

  // Quem teve clique pago de verdade (codigo do clique ou origem Google Ads).
  // So essas pessoas entram nos numeros da campanha paga.
  const idsPagos = await buscarIdsClientesComCliquePago();

  const [leadsBase, campanhasBase, profissionais, servicos, procedimentosInteresseBase, clientesBase, contas, vendasCampanha, lancamentosCampanha, receitasSemCampanhaBase, motivosPerda] = await Promise.all([
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
        createdAt: true,
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
        clienteId: true,
        data: true,
        valorTotal: true,
        totalServicos: true,
        totalProdutos: true,
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
        clienteId: true,
        data: true,
        tipo: true,
        categoria: true,
        origem: true,
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

    // Motivos de perda cadastrados em Configuracoes.
    prisma.motivoPerdaLead.findMany({
      where: { status: "Ativo" },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, descricao: true, naoChamou: true },
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

  const clientes = clientesBase.map((cliente) => ({
    ...cliente,
    cliquePago: idsPagos.has(cliente.id),
  }));

  // Lista do que esta por tras do "Entrou" de cada campanha: tudo que esta
  // ligado a campanha (vendas e receitas), dizendo o que conta e o que nao.
  const [vendasLista, entradasLista] = await Promise.all([
    prisma.venda.findMany({
      where: { campanhaId: { not: null }, situacao: { not: "CANCELADA" } },
      orderBy: [{ data: "desc" }, { id: "desc" }],
      select: {
        id: true,
        campanhaId: true,
        clienteId: true,
        data: true,
        valorTotal: true,
        statusPagamento: true,
        origem: true,
        itens: { select: { descricao: true }, take: 3, orderBy: { id: "asc" } },
      },
    }),
    prisma.lancamento.findMany({
      where: {
        campanhaId: { not: null },
        tipo: "ENTRADA",
        venda: { is: null },
        statusPagamento: { not: "Cancelado" },
      },
      orderBy: [{ data: "desc" }, { id: "desc" }],
      select: {
        id: true,
        campanhaId: true,
        clienteId: true,
        data: true,
        valor: true,
        descricao: true,
        categoria: true,
        origem: true,
        statusPagamento: true,
        agendamentoId: true,
        pacoteClienteId: true,
      },
    }),
  ]);
  const idsClientesLista = Array.from(
    new Set(
      [...vendasLista, ...entradasLista]
        .map((item) => item.clienteId)
        .filter((id): id is number => typeof id === "number"),
    ),
  );
  const idsAgendamentosSinal = Array.from(
    new Set(
      entradasLista
        .filter((item) => entradaEhSinal(item) && item.agendamentoId)
        .map((item) => item.agendamentoId as number),
    ),
  );
  const [clientesLista, agendamentosSinal] = await Promise.all([
    idsClientesLista.length
      ? prisma.cliente.findMany({
          where: { id: { in: idsClientesLista } },
          select: { id: true, nome: true, origem: true },
        })
      : Promise.resolve([] as Array<{ id: number; nome: string; origem: string | null }>),
    idsAgendamentosSinal.length
      ? prisma.agendamento.findMany({
          where: { id: { in: idsAgendamentosSinal } },
          select: { id: true, status: true },
        })
      : Promise.resolve([] as Array<{ id: number; status: string }>),
  ]);
  const clientePorIdLista = new Map(clientesLista.map((item) => [item.id, item]));
  const statusAgendamentoPorId = new Map(agendamentosSinal.map((item) => [item.id, item.status]));
  const itensReceita: ItemReceitaCampanha[] = [
    ...vendasLista.map((venda) =>
      itemDaVenda(
        {
          id: venda.id,
          campanhaId: venda.campanhaId as number,
          data: venda.data,
          valorTotal: venda.valorTotal,
          statusPagamento: venda.statusPagamento,
          clienteId: venda.clienteId,
          descricao:
            venda.itens.map((item) => item.descricao).filter(Boolean).join(" + ") ||
            `Venda (${venda.origem})`,
        },
        venda.clienteId ? clientePorIdLista.get(venda.clienteId) ?? null : null,
        movimentoEhDeCliquePago(venda.clienteId, idsPagos),
      ),
    ),
    ...entradasLista.map((entrada) =>
      itemDaEntrada(
        {
          id: entrada.id,
          campanhaId: entrada.campanhaId as number,
          data: entrada.data,
          valor: entrada.valor,
          descricao: entrada.descricao,
          categoria: entrada.categoria,
          origem: entrada.origem,
          statusPagamento: entrada.statusPagamento,
          clienteId: entrada.clienteId,
          pacoteClienteId: entrada.pacoteClienteId,
          statusAgendamento: entrada.agendamentoId
            ? statusAgendamentoPorId.get(entrada.agendamentoId) ?? null
            : null,
        },
        entrada.clienteId ? clientePorIdLista.get(entrada.clienteId) ?? null : null,
        movimentoEhDeCliquePago(entrada.clienteId, idsPagos),
      ),
    ),
  ].sort((a, b) => b.data.localeCompare(a.data));

  const leads = leadsBase.map((lead) => ({
    ...lead,
    cliquePago: leadTeveCliquePago(lead),
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
    // "Da pagina" = caiu na pagina da campanha. "Pago" = alem disso, teve clique
    // pago de verdade. So os pagos entram nos numeros; os demais aparecem a parte.
    const leadsDaPagina = leads.filter((lead) => lead.campanhaId === campanha.id);
    const leadsCampanha = leadsDaPagina.filter((lead) => lead.cliquePago);
    const clientesDaPagina = clientes.filter((cliente) => cliente.campanhaAquisicaoId === campanha.id);
    const clientesCampanha = clientesDaPagina.filter((cliente) => cliente.cliquePago);
    const vendasDaPagina = vendasCampanha.filter((venda) => venda.campanhaId === campanha.id);
    const vendas = vendasDaPagina.filter((venda) => movimentoEhDeCliquePago(venda.clienteId, idsPagos));
    const receitaSoPagina = vendasDaPagina
      .filter((venda) => !movimentoEhDeCliquePago(venda.clienteId, idsPagos))
      .reduce((total, venda) => total + venda.valorTotal, 0);
    const lancamentosManuais = lancamentosCampanha.filter(
      (lancamento) =>
        lancamento.campanhaId === campanha.id &&
        lancamento.tipo === "ENTRADA" &&
        !lancamento.venda &&
        !entradaEhSinal(lancamento) &&
        movimentoEhDeCliquePago(lancamento.clienteId, idsPagos),
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
    // Cadastrada pela campanha OU comprou pela campanha (uma vez por pessoa).
    const pessoasCampanha = new Set<number>(clientesCampanha.map((cliente) => cliente.id));
    for (const item of [
      ...vendas.map((venda) => ({ clienteId: venda.clienteId, valor: venda.valorTotal })),
      ...lancamentosManuais,
    ]) {
      if (item.clienteId != null && item.valor > 0) pessoasCampanha.add(item.clienteId);
    }
    const taxasPagamento = taxasVendas + taxasManuais;
    const receitaLiquida = receitaLiquidaVendas + receitaLiquidaManual;

    return {
      ...campanha,
      metricas: {
        leads: leadsCampanha.length,
        convertidos: leadsCampanha.filter((lead) => lead.etapa === "Convertido").length,
        clientes: pessoasCampanha.size,
        leadsSoPagina: leadsDaPagina.length - leadsCampanha.length,
        clientesSoPagina: clientesDaPagina.length - clientesCampanha.length,
        receitaSoPagina,
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
      vinculosClique={calcularVinculosClique(leads)}
      campanhas={campanhas}
      procedimentosInteresse={procedimentosInteresse}
      clientes={clientes}
      contas={contas}
      receitasSemCampanha={receitasSemCampanha}
      itensReceita={itensReceita}
      movimentosCampanha={{
        vendas: vendasCampanha.map((venda) => ({
          ...venda,
          cliquePago: movimentoEhDeCliquePago(venda.clienteId, idsPagos),
        })),
        lancamentos: lancamentosCampanha.map((item) => ({
          cliquePago: movimentoEhDeCliquePago(item.clienteId, idsPagos),
          campanhaId: item.campanhaId,
          clienteId: item.clienteId,
          tipo: item.tipo,
          categoria: item.categoria,
          data: item.data,
          valor: item.valor,
          valorLiquido: item.valorLiquido,
          taxaPagamento: item.taxaPagamento,
          temVenda: Boolean(item.venda),
          contaNaReceita: !entradaEhSinal(item),
        })),
      }}
      profissionais={profissionais}
      servicos={servicos}
      motivosPerda={motivosPerda}
      podeGerenciarMarketing={canAccess(usuario, "marketing.gerenciar")}
      podeGerenciarAgenda={canAccess(usuario, "agenda.gerenciar")}
    />
  );
}