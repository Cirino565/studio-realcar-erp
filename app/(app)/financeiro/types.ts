export type TipoLancamento = "ENTRADA" | "SAIDA";

export type PeriodoFinanceiro =
  | "todos"
  | "hoje"
  | "semana"
  | "mes"
  | "ano";

export type ContaFinanceiraData = {
  id: number;
  nome: string;
  banco: string | null;
  tipo: string;
  saldoInicial: number;
  saldoBancoInformado: number | null;
  conciliadoEm: Date | null;
  diferencaConciliacao: number | null;
  principal: boolean;
  status: string;
  observacoes: string | null;
  createdAt: Date;
  saldoCalculado: number;
  entradasLiquidas: number;
  saidas: number;
};

export type FormaPagamentoConfigData = {
  id: number;
  nome: string;
  taxaPercentual: number;
  taxaFixa: number;
  prazoDias: number;
  status: string;
  ordem: number;
};

export type CampanhaFinanceiroOption = {
  id: number;
  nome: string;
  canal: string;
  status: string;
};

export type LancamentoFinanceiro = {
  id: number;
  descricao: string;
  valor: number;
  valorLiquido?: number | null;
  taxaPagamento?: number;
  taxaPercentualAplicada?: number;
  taxaFixaAplicada?: number;
  tipo: string;
  categoria: string | null;
  observacoes: string | null;
  data: Date;
  formaPagamento?: string | null;
  formaPagamentoConfigId?: number | null;
  contaFinanceiraId?: number | null;
  campanhaId?: number | null;
  statusPagamento?: string | null;
  origem?: string | null;
  agendamentoId?: number | null;
  clienteId?: number | null;
  contaFinanceira?: { id: number; nome: string } | null;
  campanha?: { id: number; nome: string } | null;
  venda?: {
    id: number;
    situacao: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FinanceiroResumoData = {
  entradas: number;
  entradasLiquidas: number;
  taxasPagamento: number;
  saidas: number;
  saldo: number;
  quantidadeEntradas: number;
  quantidadeSaidas: number;
  totalLancamentos: number;
  ticketMedioEntrada: number;
  maiorEntrada: number;
  maiorSaida: number;
};
