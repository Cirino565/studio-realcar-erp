// Apoio da tabela de Campanhas: filtro por situacao, etiqueta de como a
// campanha esta indo e custo por cliente / por lead.
import type { MetricasPeriodo } from "./periodo";

export type SituacaoFiltro = "Ativa" | "Pausada" | "Finalizada" | "Todas";

export const SITUACOES_FILTRO: {
  valor: SituacaoFiltro;
  rotulo: string;
  titulo: string;
  frase: string;
}[] = [
  { valor: "Ativa", rotulo: "Ativas", titulo: "Campanhas ativas", frase: "só campanhas ativas" },
  { valor: "Pausada", rotulo: "Pausadas", titulo: "Campanhas pausadas", frase: "só campanhas pausadas" },
  { valor: "Finalizada", rotulo: "Finalizadas", titulo: "Campanhas finalizadas", frase: "só campanhas finalizadas" },
  { valor: "Todas", rotulo: "Todas", titulo: "Campanhas cadastradas", frase: "todas as campanhas" },
];

export type TomDaEtiqueta = "bom" | "ruim" | "neutro";

export const CLASSE_DA_ETIQUETA: Record<TomDaEtiqueta, string> = {
  bom: "border-emerald-300/15 bg-emerald-400/10 text-emerald-100",
  ruim: "border-rose-300/15 bg-rose-400/10 text-rose-200",
  neutro: "border-white/[0.10] bg-white/[0.06] text-slate-300",
};

/** Resume em palavras como a campanha foi no periodo escolhido. */
export function etiquetaDaCampanha(m: MetricasPeriodo): {
  texto: string;
  tom: TomDaEtiqueta;
} {
  if (m.custoReal > 0 && m.receitaBruta === 0 && m.clientes === 0) {
    return { texto: "Gastou e ainda sem vendas", tom: "ruim" };
  }
  if (m.resultado > 0) return { texto: "Dando lucro", tom: "bom" };
  if (m.resultado < 0) return { texto: "No prejuízo", tom: "ruim" };
  if (m.custoReal === 0 && m.receitaBruta === 0 && m.leads === 0 && m.clientes === 0) {
    return { texto: "Sem movimento no período", tom: "neutro" };
  }
  return { texto: "Sem vendas ainda", tom: "neutro" };
}

/** Custo dividido pela quantidade; sem quantidade nao ha conta a fazer. */
export function custoPor(custo: number, quantidade: number): number | null {
  return quantidade > 0 ? custo / quantidade : null;
}
