export type AutomacaoStatus = "Ativa" | "Pausada" | "Em teste" | "Erro";
export type AutomacaoPrioridade = "Baixa" | "Média" | "Alta" | "Crítica";
export type AutomacaoTipo = "Agenda" | "Clientes" | "Estoque" | "Financeiro" | "Marketing" | "Operacional";
export type AutomacaoFrequencia = "Manual" | "Diária" | "Semanal" | "Mensal" | "Evento";

export type AutomacaoItem = {
  id: number;
  nome: string;
  tipo: string;
  gatilho: string;
  acao: string;
  canal: string | null;
  frequencia: string;
  prioridade: string;
  status: string;
  proximaExecucao: Date | string | null;
  ultimaExecucao: Date | string | null;
  execucoes: number;
  falhas: number;
  observacoes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type AutomacaoInsight = {
  id: string;
  titulo: string;
  descricao: string;
  modulo: AutomacaoTipo;
  total: number;
  prioridade: AutomacaoPrioridade;
  acaoRecomendada: string;
};

export type AutomacaoFormData = {
  nome: string;
  tipo: AutomacaoTipo;
  gatilho: string;
  acao: string;
  canal: string;
  frequencia: AutomacaoFrequencia;
  prioridade: AutomacaoPrioridade;
  status: AutomacaoStatus;
  proximaExecucao: string;
  observacoes: string;
};

export type AutomacaoResumo = {
  total: number;
  ativas: number;
  pausadas: number;
  criticas: number;
  execucoes: number;
  falhas: number;
  taxaSucesso: number;
};

export const AUTOMACAO_TIPOS: AutomacaoTipo[] = ["Agenda", "Clientes", "Estoque", "Financeiro", "Marketing", "Operacional"];
export const AUTOMACAO_STATUS: AutomacaoStatus[] = ["Ativa", "Pausada", "Em teste", "Erro"];
export const AUTOMACAO_PRIORIDADES: AutomacaoPrioridade[] = ["Baixa", "Média", "Alta", "Crítica"];
export const AUTOMACAO_FREQUENCIAS: AutomacaoFrequencia[] = ["Manual", "Diária", "Semanal", "Mensal", "Evento"];
