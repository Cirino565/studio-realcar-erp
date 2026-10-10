// Filtro de periodo da aba Campanhas (Marketing).
// Tudo aqui e calculo puro: recebe as vendas, os lancamentos, os leads e os
// clientes e devolve os numeros de uma campanha DENTRO do intervalo.

export type PeriodoAtalho = "7d" | "30d" | "custom";

export type VendaCampanhaMovimento = {
  campanhaId: number | null;
  data: Date | string;
  valorTotal: number;
  totalServicos: number;
  totalProdutos: number;
  taxaPagamento: number;
  valorLiquido: number | null;
  // false = a pessoa so caiu na pagina da campanha, sem clique pago.
  cliquePago?: boolean;
};

export type LancamentoCampanhaMovimento = {
  campanhaId: number | null;
  tipo: string;
  categoria: string | null;
  data: Date | string;
  valor: number;
  valorLiquido: number | null;
  taxaPagamento: number;
  temVenda: boolean;
  cliquePago?: boolean;
};

export type MovimentosCampanha = {
  vendas: VendaCampanhaMovimento[];
  lancamentos: LancamentoCampanhaMovimento[];
};

export type MetricasPeriodo = {
  leads: number;
  convertidos: number;
  clientes: number;
  // So cairam na pagina da campanha (sem clique pago): nao entram nos numeros.
  leadsSoPagina: number;
  clientesSoPagina: number;
  receitaSoPagina: number;
  receitaBruta: number;
  taxasPagamento: number;
  receitaLiquida: number;
  receitaServico: number;
  receitaProduto: number;
  receitaLiquidaServico: number;
  receitaLiquidaProduto: number;
  custoReal: number;
  resultado: number;
  roas: number | null;
  roasServico: number | null;
};

export const METRICAS_PERIODO_VAZIAS: MetricasPeriodo = {
  leads: 0,
  convertidos: 0,
  clientes: 0,
  leadsSoPagina: 0,
  clientesSoPagina: 0,
  receitaSoPagina: 0,
  receitaBruta: 0,
  taxasPagamento: 0,
  receitaLiquida: 0,
  receitaServico: 0,
  receitaProduto: 0,
  receitaLiquidaServico: 0,
  receitaLiquidaProduto: 0,
  custoReal: 0,
  resultado: 0,
  roas: null,
  roasServico: null,
};

const FUSO = "America/Sao_Paulo";

/** Dia de hoje no horario de Brasilia, no formato aaaa-mm-dd. */
export function hojeNoFuso(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

export function somarDias(dia: string, dias: number): string {
  const [ano, mes, diaDoMes] = dia.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, diaDoMes + dias))
    .toISOString()
    .slice(0, 10);
}

/** "Ultimos 7 dias" = hoje e os 6 dias anteriores (idem para 30). */
export function periodoDoAtalho(
  atalho: "7d" | "30d",
  hoje: string = hojeNoFuso(),
): { de: string; ate: string } {
  const dias = atalho === "7d" ? 7 : 30;
  return { de: somarDias(hoje, -(dias - 1)), ate: hoje };
}

export function formatarDiaCurto(dia: string): string {
  const [ano, mes, diaDoMes] = dia.split("-");
  return `${diaDoMes}/${mes}/${ano}`;
}

/** Do comeco do dia inicial ate o ultimo instante do dia final (Brasilia). */
export function limitesDoPeriodo(de: string, ate: string) {
  return {
    inicio: new Date(`${de}T00:00:00-03:00`).getTime(),
    fim: new Date(`${ate}T23:59:59.999-03:00`).getTime(),
  };
}

function dentro(valor: Date | string, inicio: number, fim: number) {
  const tempo = new Date(valor).getTime();
  return Number.isFinite(tempo) && tempo >= inicio && tempo <= fim;
}

export function calcularMetricasPeriodo({
  campanhaId,
  inicio,
  fim,
  movimentos,
  leads,
  clientes,
}: {
  campanhaId: number;
  inicio: number;
  fim: number;
  movimentos: MovimentosCampanha;
  leads: Array<{
    campanhaId: number | null;
    etapa: string;
    createdAt: Date | string;
    cliquePago?: boolean;
  }>;
  clientes: Array<{
    campanhaAquisicaoId: number | null;
    createdAt: Date | string;
    cliquePago?: boolean;
  }>;
}): MetricasPeriodo {
  // Da pagina = ligada a campanha. Pago = alem disso, com clique pago de verdade.
  // Sem a marca (cliquePago ausente) vale como antes.
  const vendasDaPagina = movimentos.vendas.filter(
    (venda) => venda.campanhaId === campanhaId && dentro(venda.data, inicio, fim),
  );
  const vendas = vendasDaPagina.filter((venda) => venda.cliquePago !== false);
  const receitaSoPagina = vendasDaPagina
    .filter((venda) => venda.cliquePago === false)
    .reduce((total, venda) => total + venda.valorTotal, 0);
  const manuais = movimentos.lancamentos.filter(
    (item) =>
      item.campanhaId === campanhaId &&
      item.tipo === "ENTRADA" &&
      !item.temVenda &&
      item.cliquePago !== false &&
      dentro(item.data, inicio, fim),
  );
  const custos = movimentos.lancamentos.filter(
    (item) =>
      item.campanhaId === campanhaId &&
      item.tipo === "SAIDA" &&
      dentro(item.data, inicio, fim),
  );
  const leadsDaPaginaNoPeriodo = leads.filter(
    (lead) => lead.campanhaId === campanhaId && dentro(lead.createdAt, inicio, fim),
  );
  const leadsNoPeriodo = leadsDaPaginaNoPeriodo.filter((lead) => lead.cliquePago !== false);
  const clientesDaPaginaNoPeriodo = clientes.filter(
    (cliente) =>
      cliente.campanhaAquisicaoId === campanhaId &&
      dentro(cliente.createdAt, inicio, fim),
  );
  const clientesNoPeriodo = clientesDaPaginaNoPeriodo.filter(
    (cliente) => cliente.cliquePago !== false,
  );

  const soma = <T,>(lista: T[], valor: (item: T) => number) =>
    lista.reduce((total, item) => total + valor(item), 0);

  // Cada venda e dividida entre servico e produto pelo que ela tem registrado
  // (kits contam como produto). A venda continua inteira na mesma campanha.
  // O valor liquido e dividido na mesma proporcao do valor bruto.
  const partesDasVendas = vendas.map((venda) => {
    const produto = Math.min(Math.max(venda.totalProdutos, 0), Math.max(venda.valorTotal, 0));
    const liquido = venda.valorLiquido ?? venda.valorTotal - venda.taxaPagamento;
    const fatiaProduto = venda.valorTotal > 0 ? produto / venda.valorTotal : 0;
    return {
      servico: venda.valorTotal - produto,
      produto,
      liquidoServico: liquido - liquido * fatiaProduto,
      liquidoProduto: liquido * fatiaProduto,
    };
  });
  // Entradas lancadas a mao so contam como produto quando a categoria e "Produtos".
  const partesDosManuais = manuais.map((item) => {
    const liquido = item.valorLiquido ?? item.valor - item.taxaPagamento;
    const ehProduto = (item.categoria || "").trim().toLowerCase() === "produtos";
    return {
      servico: ehProduto ? 0 : item.valor,
      produto: ehProduto ? item.valor : 0,
      liquidoServico: ehProduto ? 0 : liquido,
      liquidoProduto: ehProduto ? liquido : 0,
    };
  });
  const partes = [...partesDasVendas, ...partesDosManuais];

  const receitaServico = soma(partes, (parte) => parte.servico);
  const receitaProduto = soma(partes, (parte) => parte.produto);
  const receitaLiquidaServico = soma(partes, (parte) => parte.liquidoServico);
  const receitaLiquidaProduto = soma(partes, (parte) => parte.liquidoProduto);
  const receitaBruta = receitaServico + receitaProduto;
  const receitaLiquida = receitaLiquidaServico + receitaLiquidaProduto;
  const taxasPagamento =
    soma(vendas, (venda) => venda.taxaPagamento) +
    soma(manuais, (item) => item.taxaPagamento);
  const custoReal = soma(custos, (item) => item.valor);

  return {
    leads: leadsNoPeriodo.length,
    convertidos: leadsNoPeriodo.filter((lead) => lead.etapa === "Convertido").length,
    clientes: clientesNoPeriodo.length,
    leadsSoPagina: leadsDaPaginaNoPeriodo.length - leadsNoPeriodo.length,
    clientesSoPagina: clientesDaPaginaNoPeriodo.length - clientesNoPeriodo.length,
    receitaSoPagina,
    receitaBruta,
    taxasPagamento,
    receitaLiquida,
    receitaServico,
    receitaProduto,
    receitaLiquidaServico,
    receitaLiquidaProduto,
    custoReal,
    resultado: receitaLiquida - custoReal,
    roas: custoReal > 0 ? receitaBruta / custoReal : null,
    roasServico: custoReal > 0 ? receitaServico / custoReal : null,
  };
}
