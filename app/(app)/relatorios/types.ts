export type PeriodoRelatorio = "todos" | "mes" | "trimestre" | "ano";

export type AbaRelatorio = "visao" | "financeiro" | "agenda" | "clientes" | "estoque";

export type ClienteRelatorio = {
  id: number;
  nome: string;
  telefone: string;
  whatsapp: string | null;
  status: string;
  procedimento: string | null;
  valorGasto: number;
  ultimaVisita: string | null;
  createdAt: string;
};

export type AgendamentoRelatorio = {
  id: number;
  clienteId: number;
  clienteNome: string;
  clienteTelefone: string;
  clienteWhatsapp: string | null;
  procedimento: string;
  data: string;
  status: string;
};

export type LancamentoRelatorio = {
  id: number;
  descricao: string;
  valor: number;
  tipo: string;
  categoria: string | null;
  data: string;
};

export type ProdutoRelatorio = {
  id: number;
  nome: string;
  categoria: string | null;
  unidade: string;
  quantidade: number;
  estoqueMinimo: number;
  valorCompra: number;
  valorVenda: number;
  status: string;
  fornecedorNome: string | null;
};

export type LeadRelatorio = {
  id: number;
  nome: string;
  origem: string | null;
  interesse: string | null;
  etapa: string;
  valorPrevisto: number;
  createdAt: string;
};

export type CampanhaRelatorio = {
  id: number;
  nome: string;
  canal: string;
  investimento: number;
  leads: number;
  status: string;
  inicio: string | null;
  fim: string | null;
};

export type RelatoriosData = {
  clientes: ClienteRelatorio[];
  agendamentos: AgendamentoRelatorio[];
  lancamentos: LancamentoRelatorio[];
  produtos: ProdutoRelatorio[];
  leads: LeadRelatorio[];
  campanhas: CampanhaRelatorio[];
};
