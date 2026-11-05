import { buscarIdsClientesComCliquePago, origemEhGoogleAds, origemEhInstagramAds } from "@/lib/atribuicao-campanha";
import { gerarContasFixasPendentes } from "@/lib/contas-fixas";
import { resolverPeriodoGestao } from "@/lib/gestao";
import { prisma } from "@/lib/prisma";
import { entradaEhSinal } from "@/lib/receita-campanha";

/**
 * Painel do Dono: o resumo do negocio numa tela so.
 *
 * Tudo em CAIXA, pela data do lancamento (igual ao Financeiro e a Gestao):
 *  - Quanto entrou  = receitas pagas no periodo (servicos + produtos + outros);
 *  - Quanto saiu    = despesas pagas no periodo + taxas da maquininha;
 *  - Quanto sobrou  = entrou - saiu;
 *  - Ainda a pagar  = despesas do periodo (contas fixas inclusive) nao pagas;
 *  - Sobra depois de pagar tudo = sobrou - ainda a pagar.
 *
 * Cada numero leva junto a lista do que esta por tras (para abrir o detalhe).
 */

export type PeriodoPainel = "mes" | "anterior" | "30d" | "personalizado";

export type ItemDetalhe = {
  id: string;
  data: string | null;
  titulo: string;
  detalhe: string | null;
  valor: number | null;
  href: string | null;
};

export type Numero = { valor: number; itens: ItemDetalhe[] };

export type Canal = "google" | "instagram" | "outros";
export type PorCanal = Record<Canal, Numero> & { total: Numero };

export type PainelDono = {
  periodo: { chave: PeriodoPainel; label: string; inicioISO: string; fimISO: string };
  entrou: {
    total: Numero;
    servicos: Numero;
    produtos: Numero;
    outros: Numero;
    sinais: number;
    pacotes: number;
    aMao: number;
  };
  saiu: {
    total: Numero;
    categorias: Array<{ nome: string } & Numero>;
    taxas: Numero;
  };
  sobrou: number;
  aPagar: Numero;
  sobraDepoisDePagar: number;
  clientes: {
    novos: Numero;
    atendimentos: Numero;
    vendas: Numero;
    ticketAtendimento: number | null;
    ticketCliente: number | null;
    /** Clientes diferentes no periodo (atendidas ou que compraram): divisor do ticket por cliente. */
    clientesQueCompraram: number;
    voltaram: Numero;
    voltaramRenderam: Numero;
  };
  anuncios: {
    gasto: PorCanal;
    leads: PorCanal;
    clientes: PorCanal;
    renderam: PorCanal;
    retorno: Record<Canal | "total", number | null>;
  };
};

const PERIODOS: PeriodoPainel[] = ["mes", "anterior", "30d", "personalizado"];

function norm(texto?: string | null) {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

const ehPago = (status?: string | null) => norm(status) === "pago";
const arred = (valor: number) => Math.round(valor * 100) / 100;
const iso = (data: Date | null | undefined) => (data ? data.toISOString() : null);

function numero(itens: ItemDetalhe[], contar = false): Numero {
  return {
    valor: contar ? itens.length : arred(itens.reduce((soma, item) => soma + (item.valor ?? 0), 0)),
    itens: [...itens].sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")),
  };
}

export function canalDaCampanha(canal?: string | null): Canal {
  const texto = norm(canal);
  if (texto.includes("google")) return "google";
  if (texto.includes("instagram") || texto.includes("meta") || texto.includes("facebook")) return "instagram";
  return "outros";
}

function porCanal(itens: Array<ItemDetalhe & { canal: Canal }>, contar = false): PorCanal {
  const separar = (canal: Canal) => numero(itens.filter((item) => item.canal === canal), contar);
  return {
    google: separar("google"),
    instagram: separar("instagram"),
    outros: separar("outros"),
    total: numero(itens, contar),
  };
}

const NOME_CATEGORIA: Record<string, string> = {
  marketing: "Anúncios e marketing",
};

export async function obterPainelDono(parametros: {
  periodo?: string;
  inicio?: string;
  fim?: string;
}): Promise<PainelDono> {
  const chave: PeriodoPainel = PERIODOS.includes(parametros.periodo as PeriodoPainel)
    ? (parametros.periodo as PeriodoPainel)
    : "mes";
  const periodo = resolverPeriodoGestao({ ...parametros, periodo: chave });
  const { inicio, fim } = periodo;
  const noPeriodo = { gte: inicio, lt: fim };

  // As contas fixas do mes sao criadas quando alguem abre o Financeiro; aqui
  // tambem, para o "ainda a pagar" nunca ficar sem elas.
  await gerarContasFixasPendentes();

  const [lancamentos, aPagarBase, vendasBase, clientesNovosBase, atendidosBase, leadsBase, campanhas, idsPagos] =
    await Promise.all([
      prisma.lancamento.findMany({
        where: { data: noPeriodo, statusPagamento: { notIn: ["Cancelado", "cancelado"] } },
        select: {
          id: true,
          descricao: true,
          valor: true,
          taxaPagamento: true,
          taxaPercentualAplicada: true,
          taxaFixaAplicada: true,
          formaPagamento: true,
          tipo: true,
          categoria: true,
          origem: true,
          statusPagamento: true,
          data: true,
          clienteId: true,
          pacoteClienteId: true,
          campanhaId: true,
          venda: { select: { id: true, totalProdutos: true, clienteId: true } },
        },
      }),
      prisma.lancamento.findMany({
        where: {
          tipo: "SAIDA",
          statusPagamento: { notIn: ["Pago", "pago", "Cancelado", "cancelado"] },
          OR: [{ vencimento: noPeriodo }, { vencimento: null, data: noPeriodo }],
        },
        select: { id: true, descricao: true, valor: true, categoria: true, data: true, vencimento: true },
      }),
      prisma.venda.findMany({
        where: { data: noPeriodo, situacao: { not: "CANCELADA" }, statusPagamento: "Pago" },
        select: {
          id: true,
          clienteId: true,
          valorTotal: true,
          data: true,
          campanhaId: true,
          itens: { select: { descricao: true }, take: 3, orderBy: { id: "asc" } },
        },
      }),
      prisma.cliente.findMany({
        where: { createdAt: noPeriodo },
        select: { id: true, nome: true, createdAt: true, origem: true, campanhaAquisicaoId: true },
      }),
      prisma.agendamento.findMany({
        where: { data: noPeriodo, status: "Atendido" },
        select: { id: true, data: true, procedimento: true, clienteId: true, cliente: { select: { nome: true } } },
      }),
      prisma.lead.findMany({
        where: { createdAt: noPeriodo },
        select: { id: true, nome: true, origem: true, gclid: true, createdAt: true, campanha: { select: { nome: true } } },
      }),
      prisma.campanhaMarketing.findMany({ select: { id: true, nome: true, canal: true } }),
      buscarIdsClientesComCliquePago(),
    ]);

  const campanhaPorId = new Map(campanhas.map((item) => [item.id, item]));
  const idsClientes = new Set<number>();
  for (const item of lancamentos) if (item.clienteId) idsClientes.add(item.clienteId);
  for (const item of vendasBase) if (item.clienteId) idsClientes.add(item.clienteId);
  const nomesClientes = new Map(
    (
      await prisma.cliente.findMany({
        where: { id: { in: Array.from(idsClientes) } },
        select: { id: true, nome: true },
      })
    ).map((item) => [item.id, item.nome]),
  );
  const nomeCliente = (id?: number | null) => (id ? nomesClientes.get(id) ?? null : null);
  const linkCliente = (id?: number | null) => (id ? `/clientes/${id}` : null);
  const descricaoVenda = (venda: (typeof vendasBase)[number]) =>
    venda.itens.map((item) => item.descricao).filter(Boolean).join(" + ") || `Venda #${venda.id}`;

  /* ----------------------------------------------- Bloco 1: entrou / saiu */
  const entradasPagas = lancamentos.filter((item) => item.tipo === "ENTRADA" && ehPago(item.statusPagamento));
  const saidasPagas = lancamentos.filter((item) => item.tipo === "SAIDA" && ehPago(item.statusPagamento));

  const servicos: ItemDetalhe[] = [];
  const produtos: ItemDetalhe[] = [];
  const outros: ItemDetalhe[] = [];
  let sinais = 0;
  let pacotes = 0;
  let aMao = 0;

  for (const item of entradasPagas) {
    const base = {
      data: iso(item.data),
      titulo: nomeCliente(item.clienteId ?? item.venda?.clienteId) ?? item.descricao,
      href: linkCliente(item.clienteId ?? item.venda?.clienteId),
    };
    if (item.venda) {
      const parteProduto = Math.min(Math.max(item.venda.totalProdutos, 0), item.valor);
      const parteServico = item.valor - parteProduto;
      if (parteServico > 0.004) {
        servicos.push({ ...base, id: `s-${item.id}`, detalhe: item.descricao, valor: arred(parteServico) });
      }
      if (parteProduto > 0.004) {
        produtos.push({ ...base, id: `p-${item.id}`, detalhe: item.descricao, valor: arred(parteProduto) });
      }
      continue;
    }
    let tipoOutro = "Lançado à mão";
    if (entradaEhSinal(item)) {
      tipoOutro = "Sinal";
      sinais += item.valor;
    } else if (item.pacoteClienteId) {
      tipoOutro = "Pacote";
      pacotes += item.valor;
    } else {
      aMao += item.valor;
    }
    outros.push({ ...base, id: `o-${item.id}`, detalhe: `${tipoOutro} · ${item.descricao}`, valor: item.valor });
  }

  const entrouTotal = numero([...servicos, ...produtos, ...outros]);

  // Taxa da maquininha lancada a mao (ex.: diferenca do fechamento do mes)
  // soma com a taxa calculada sozinha, na mesma linha.
  const ehTaxaManual = (categoria?: string | null) => /^taxas? da maquininha$/.test(norm(categoria));
  const porCategoria = new Map<string, ItemDetalhe[]>();
  for (const item of saidasPagas) {
    if (ehTaxaManual(item.categoria)) continue;
    const chaveCategoria = norm(item.categoria) || "sem categoria";
    const nome = NOME_CATEGORIA[chaveCategoria] ?? (item.categoria?.trim() || "Sem categoria");
    const lista = porCategoria.get(nome) ?? [];
    lista.push({
      id: `d-${item.id}`,
      data: iso(item.data),
      titulo: item.descricao,
      detalhe: item.categoria || null,
      valor: item.valor,
      href: null,
    });
    porCategoria.set(nome, lista);
  }
  const categorias = Array.from(porCategoria.entries())
    .map(([nome, itens]) => ({ nome, ...numero(itens) }))
    .sort((a, b) => b.valor - a.valor);

  const taxas = numero([
    ...entradasPagas
      .filter((item) => item.taxaPagamento > 0)
      .map((item) => {
        const regra = [
          item.taxaPercentualAplicada > 0 ? `${String(item.taxaPercentualAplicada).replace(".", ",")}%` : null,
          item.taxaFixaAplicada > 0 ? `R$ ${item.taxaFixaAplicada.toFixed(2).replace(".", ",")} fixo` : null,
        ]
          .filter(Boolean)
          .join(" + ");
        return {
          id: `t-${item.id}`,
          data: iso(item.data),
          titulo: nomeCliente(item.clienteId ?? item.venda?.clienteId) ?? item.descricao,
          detalhe: `Automática · ${item.formaPagamento || "forma não informada"}${regra ? ` (${regra})` : ""} sobre ${formatarReais(item.valor)}`,
          valor: item.taxaPagamento,
          href: null,
        };
      }),
    ...saidasPagas
      .filter((item) => ehTaxaManual(item.categoria))
      .map((item) => ({
        id: `tm-${item.id}`,
        data: iso(item.data),
        titulo: item.descricao,
        detalhe: "Lançada à mão",
        valor: item.valor,
        href: "/financeiro",
      })),
  ]);

  const saiuTotal = numero([...categorias.flatMap((categoria) => categoria.itens), ...taxas.itens]);

  const aPagar = numero(
    aPagarBase.map((item) => ({
      id: `a-${item.id}`,
      data: iso(item.vencimento ?? item.data),
      titulo: item.descricao,
      detalhe: item.categoria ? `${item.categoria} · vence ${formatarDia(item.vencimento ?? item.data)}` : `Vence ${formatarDia(item.vencimento ?? item.data)}`,
      valor: item.valor,
      href: "/financeiro",
    })),
  );

  const sobrou = arred(entrouTotal.valor - saiuTotal.valor);

  /* ------------------------------------------------------ Bloco 2: clientes */
  const novos = numero(
    clientesNovosBase.map((item) => ({
      id: `n-${item.id}`,
      data: iso(item.createdAt),
      titulo: item.nome,
      detalhe: item.origem ? `Origem: ${item.origem}` : null,
      valor: null,
      href: linkCliente(item.id),
    })),
    true,
  );

  const atendimentos = numero(
    atendidosBase.map((item) => ({
      id: `at-${item.id}`,
      data: iso(item.data),
      titulo: item.cliente?.nome ?? "Cliente",
      detalhe: item.procedimento,
      valor: null,
      href: linkCliente(item.clienteId),
    })),
    true,
  );

  const vendasComValor = vendasBase.filter((venda) => venda.valorTotal > 0);
  const vendas = numero(
    vendasComValor.map((venda) => ({
      id: `v-${venda.id}`,
      data: iso(venda.data),
      titulo: nomeCliente(venda.clienteId) ?? "Sem cliente",
      detalhe: descricaoVenda(venda),
      valor: venda.valorTotal,
      href: linkCliente(venda.clienteId),
    })),
  );
  // Ticket medio: o mesmo faturamento (vendas pagas do periodo) dividido
  // pelo numero de atendimentos ou pelo numero de clientes diferentes.
  const clientesQueCompraram = new Set<number>([
    ...atendidosBase.map((item) => item.clienteId),
    ...vendasComValor.map((venda) => venda.clienteId).filter((id): id is number => typeof id === "number"),
  ]).size;

  const idsAtendidos = Array.from(new Set(atendidosBase.map((item) => item.clienteId)));
  const comHistorico = idsAtendidos.length
    ? await prisma.agendamento.findMany({
        where: { clienteId: { in: idsAtendidos }, status: "Atendido", data: { lt: inicio } },
        select: { clienteId: true },
        distinct: ["clienteId"],
      })
    : [];
  const idsVoltaram = new Set(comHistorico.map((item) => item.clienteId));
  const nomesAtendidos = new Map(atendidosBase.map((item) => [item.clienteId, item.cliente?.nome ?? "Cliente"]));
  const voltaram = numero(
    Array.from(idsVoltaram).map((id) => ({
      id: `r-${id}`,
      data: null,
      titulo: nomesAtendidos.get(id) ?? "Cliente",
      detalhe: "Já tinha sido atendida antes deste período",
      valor: null,
      href: linkCliente(id),
    })),
    true,
  );
  const voltaramRenderam = numero(
    vendasComValor
      .filter((venda) => venda.clienteId && idsVoltaram.has(venda.clienteId))
      .map((venda) => ({
        id: `rv-${venda.id}`,
        data: iso(venda.data),
        titulo: nomeCliente(venda.clienteId) ?? "Cliente",
        detalhe: descricaoVenda(venda),
        valor: venda.valorTotal,
        href: linkCliente(venda.clienteId),
      })),
  );

  /* ------------------------------------------------------ Bloco 3: anuncios */
  const canalDe = (campanhaId?: number | null): Canal =>
    canalDaCampanha(campanhaId ? campanhaPorId.get(campanhaId)?.canal : null);
  const nomeCampanha = (campanhaId?: number | null) =>
    (campanhaId ? campanhaPorId.get(campanhaId)?.nome : null) ?? "Campanha";

  const gasto = porCanal(
    saidasPagas
      .filter((item) => item.campanhaId)
      .map((item) => ({
        id: `g-${item.id}`,
        data: iso(item.data),
        titulo: nomeCampanha(item.campanhaId),
        detalhe: item.descricao,
        valor: item.valor,
        href: "/marketing",
        canal: canalDe(item.campanhaId),
      })),
  );

  const leads = porCanal(
    leadsBase
      .filter((lead) => Boolean(lead.gclid?.trim()) || origemEhGoogleAds(lead.origem) || origemEhInstagramAds(lead.origem))
      .map((lead) => ({
        id: `l-${lead.id}`,
        data: iso(lead.createdAt),
        titulo: lead.nome,
        detalhe: [lead.origem, lead.campanha?.nome].filter(Boolean).join(" · ") || null,
        valor: null,
        href: "/marketing",
        canal: (origemEhInstagramAds(lead.origem) && !lead.gclid?.trim() ? "instagram" : "google") as Canal,
      })),
    true,
  );

  // Receita dos anuncios: mesma regra do "Entrou" das campanhas (venda fechada
  // e paga, ou receita a mao que nao seja sinal, de cliente com clique pago).
  const pagoPorClique = (clienteId?: number | null) => (clienteId == null ? true : idsPagos.has(clienteId));
  const receitaVendas = vendasComValor
    .filter((venda) => venda.campanhaId && pagoPorClique(venda.clienteId))
    .map((venda) => ({
      id: `rc-${venda.id}`,
      data: iso(venda.data),
      titulo: nomeCliente(venda.clienteId) ?? "Sem cliente",
      detalhe: `${descricaoVenda(venda)} · ${nomeCampanha(venda.campanhaId)}`,
      valor: venda.valorTotal,
      href: linkCliente(venda.clienteId),
      canal: canalDe(venda.campanhaId),
      clienteId: venda.clienteId,
      campanhaId: venda.campanhaId,
    }));
  const receitaManual = entradasPagas
    .filter((item) => item.campanhaId && !item.venda && !entradaEhSinal(item) && pagoPorClique(item.clienteId) && item.valor > 0)
    .map((item) => ({
      id: `rm-${item.id}`,
      data: iso(item.data),
      titulo: nomeCliente(item.clienteId) ?? item.descricao,
      detalhe: `${item.descricao} · ${nomeCampanha(item.campanhaId)}`,
      valor: item.valor,
      href: linkCliente(item.clienteId),
      canal: canalDe(item.campanhaId),
      clienteId: item.clienteId,
      campanhaId: item.campanhaId,
    }));
  const renderam = porCanal([...receitaVendas, ...receitaManual]);

  // Clientes dos anuncios: cadastrou pela campanha OU comprou pela campanha
  // no periodo (com clique pago). Cada pessoa uma vez so.
  const clientesAnuncio = new Map<number, ItemDetalhe & { canal: Canal }>();
  for (const cliente of clientesNovosBase) {
    if (!cliente.campanhaAquisicaoId || !idsPagos.has(cliente.id)) continue;
    clientesAnuncio.set(cliente.id, {
      id: `ca-${cliente.id}`,
      data: iso(cliente.createdAt),
      titulo: cliente.nome,
      detalhe: `Cadastrada pela campanha ${nomeCampanha(cliente.campanhaAquisicaoId)}`,
      valor: null,
      href: linkCliente(cliente.id),
      canal: canalDe(cliente.campanhaAquisicaoId),
    });
  }
  for (const item of [...receitaVendas, ...receitaManual]) {
    if (item.clienteId == null || clientesAnuncio.has(item.clienteId)) continue;
    clientesAnuncio.set(item.clienteId, {
      id: `ca-${item.clienteId}`,
      data: item.data,
      titulo: item.titulo,
      detalhe: `Comprou pela campanha ${nomeCampanha(item.campanhaId)}`,
      valor: null,
      href: item.href,
      canal: item.canal,
    });
  }
  const clientesAds = porCanal(Array.from(clientesAnuncio.values()), true);

  const retornoDe = (receita: number, custo: number) => (custo > 0 ? arred(receita / custo) : null);

  return {
    periodo: {
      chave,
      label: periodo.label,
      inicioISO: periodo.inicioISO,
      fimISO: periodo.fimInclusivoISO,
    },
    entrou: {
      total: entrouTotal,
      servicos: numero(servicos),
      produtos: numero(produtos),
      outros: numero(outros),
      sinais: arred(sinais),
      pacotes: arred(pacotes),
      aMao: arred(aMao),
    },
    saiu: { total: saiuTotal, categorias, taxas },
    sobrou,
    aPagar,
    sobraDepoisDePagar: arred(sobrou - aPagar.valor),
    clientes: {
      novos,
      atendimentos,
      vendas,
      ticketAtendimento: atendimentos.valor > 0 ? arred(vendas.valor / atendimentos.valor) : null,
      ticketCliente: clientesQueCompraram > 0 ? arred(vendas.valor / clientesQueCompraram) : null,
      clientesQueCompraram,
      voltaram,
      voltaramRenderam,
    },
    anuncios: {
      gasto,
      leads,
      clientes: clientesAds,
      renderam,
      retorno: {
        google: retornoDe(renderam.google.valor, gasto.google.valor),
        instagram: retornoDe(renderam.instagram.valor, gasto.instagram.valor),
        outros: retornoDe(renderam.outros.valor, gasto.outros.valor),
        total: retornoDe(renderam.total.valor, gasto.total.valor),
      },
    },
  };
}

function formatarReais(valor: number) {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

function formatarDia(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(data);
}
