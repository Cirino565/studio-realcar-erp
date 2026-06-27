export type TipoLancamento = "ENTRADA" | "SAIDA";

export type PeriodoFinanceiro =
  | "todos"
  | "hoje"
  | "semana"
  | "mes"
  | "ano";

export type LancamentoFinanceiro = {
  id: number;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string | null;
  observacoes: string | null;
  data: Date;
  formaPagamento?: string | null;
  statusPagamento?: string | null;
  origem?: string | null;
  agendamentoId?: number | null;
  clienteId?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FinanceiroResumoData = {
  entradas: number;
  saidas: number;
  saldo: number;
  quantidadeEntradas: number;
  quantidadeSaidas: number;
  totalLancamentos: number;
  ticketMedioEntrada: number;
  maiorEntrada: number;
  maiorSaida: number;
};
