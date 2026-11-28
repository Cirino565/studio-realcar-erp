import type { NumerosMes } from "@/lib/comparar-meses";

export const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** R$ sem centavos: leitura rapida. */
export function reais(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Math.round(valor));
}

/** Com centavos (valores pequenos, como media por cliente). */
export function reaisCentavos(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export type Sentido = "maior" | "menor" | "neutro";

/** Diferenca para o mes anterior: texto e cor (verde melhorou, vermelho piorou). */
export function diferenca(
  atual: number,
  anterior: number | undefined,
  sentido: Sentido,
  formato: "reais" | "numero",
  unidade = "",
) {
  if (anterior === undefined) return null;
  const delta = atual - anterior;
  const igual = formato === "reais" ? Math.abs(delta) < 1 : delta === 0;
  if (igual) return { texto: "igual", cor: "text-slate-400", seta: "=" };
  const subiu = delta > 0;
  const bom = sentido === "neutro" ? null : sentido === "maior" ? subiu : !subiu;
  const valor =
    formato === "reais" ? reais(Math.abs(delta)) : `${Math.abs(delta)}${unidade ? ` ${unidade}` : ""}`;
  return {
    texto: `${subiu ? "+" : "−"}${valor}`,
    cor: bom === null ? "text-slate-500" : bom ? "text-emerald-700" : "text-rose-700",
    seta: subiu ? "▲" : "▼",
  };
}

export function mediaPorCliente(n: NumerosMes) {
  return n.clientesAtendidas > 0 ? n.entrou / n.clientesAtendidas : 0;
}

export function vieramDeCada10(n: NumerosMes) {
  const base = n.atendimentos + n.faltas;
  return base > 0 ? Math.round((n.atendimentos / base) * 10) : null;
}

export function custoPorClienteAnuncio(n: NumerosMes) {
  return n.leadsViraramClientes > 0 && n.investimentoAnuncios > 0
    ? n.investimentoAnuncios / n.leadsViraramClientes
    : null;
}
