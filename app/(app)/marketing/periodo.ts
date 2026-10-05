// Filtro de periodo da aba Campanhas (Marketing).
// Tudo aqui e calculo puro: recebe as vendas, os lancamentos, os leads e os
// clientes e devolve os numeros de uma campanha DENTRO do intervalo.

export type PeriodoAtalho = "7d" | "30d" | "custom";

export type VendaCampanhaMovimento = {
  campanhaId: number | null;
  data: Date | string;
  valorTotal: number;
  taxaPagamento: number;
  valorLiquido: number | null;
};

export type LancamentoCampanhaMovimento = {
  campanhaId: number | null;
  tipo: string;
  data: Date | string;
  valor: number;
  valorLiquido: number | null;
  taxaPagamento: number;
  temVenda: boolean;
};

export type MovimentosCampanha = {
  vendas: VendaCampanhaMovimento[];
  lancamentos: LancamentoCampanhaMovimento[];
};

export type MetricasPeriodo = {
  leads: number;
  convertidos: number;
  clientes: number;
  receitaBruta: number;
  taxasPagamento: number;
  receitaLiquida: number;
  custoReal: number;
  resultado: number;
  roas: number | null;
};

export const METRICAS_PERIODO_VAZIAS: MetricasPeriodo = {
  leads: 0,
  convertidos: 0,
  clientes: 0,
  receitaBruta: 0,
  taxasPagamento: 0,
  receitaLiquida: 0,
  custoReal: 0,
  resultado: 0,
  roas: null,
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
  leads: Array<{ campanhaId: number | null; etapa: string; createdAt: Date | string }>;
  clientes: Array<{ campanhaAquisicaoId: number | null; createdAt: Date | string }>;
}): MetricasPeriodo {
  const vendas = movimentos.vendas.filter(
    (venda) => venda.campanhaId === campanhaId && dentro(venda.data, inicio, fim),
  );
  const manuais = movimentos.lancamentos.filter(
    (item) =>
      item.campanhaId === campanhaId &&
      item.tipo === "ENTRADA" &&
      !item.temVenda &&
      dentro(item.data, inicio, fim),
  );
  const custos = movimentos.lancamentos.filter(
    (item) =>
      item.campanhaId === campanhaId &&
      item.tipo === "SAIDA" &&
      dentro(item.data, inicio, fim),
  );
  const leadsNoPeriodo = leads.filter(
    (lead) => lead.campanhaId === campanhaId && dentro(lead.createdAt, inicio, fim),
  );
  const clientesNoPeriodo = clientes.filter(
    (cliente) =>
      cliente.campanhaAquisicaoId === campanhaId &&
      dentro(cliente.createdAt, inicio, fim),
  );

  const soma = <T,>(lista: T[], valor: (item: T) => number) =>
    lista.reduce((total, item) => total + valor(item), 0);

  const receitaBruta =
    soma(vendas, (venda) => venda.valorTotal) + soma(manuais, (item) => item.valor);
  const taxasPagamento =
    soma(vendas, (venda) => venda.taxaPagamento) +
    soma(manuais, (item) => item.taxaPagamento);
  const receitaLiquida =
    soma(vendas, (venda) => venda.valorLiquido ?? venda.valorTotal - venda.taxaPagamento) +
    soma(manuais, (item) => item.valorLiquido ?? item.valor - item.taxaPagamento);
  const custoReal = soma(custos, (item) => item.valor);

  return {
    leads: leadsNoPeriodo.length,
    convertidos: leadsNoPeriodo.filter((lead) => lead.etapa === "Convertido").length,
    clientes: clientesNoPeriodo.length,
    receitaBruta,
    taxasPagamento,
    receitaLiquida,
    custoReal,
    resultado: receitaLiquida - custoReal,
    roas: custoReal > 0 ? receitaBruta / custoReal : null,
  };
}
