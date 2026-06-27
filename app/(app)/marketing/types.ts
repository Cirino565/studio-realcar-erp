import type { CampanhaMarketing, Lead } from "@prisma/client";

export type MarketingLead = Lead;
export type MarketingCampanha = CampanhaMarketing;

export type LeadEtapa = "Novo" | "Contato" | "Avaliação" | "Negociação" | "Convertido" | "Perdido";

export type LeadFormData = {
  nome: string;
  telefone: string;
  origem: string;
  interesse: string;
  etapa: LeadEtapa;
  valorPrevisto: number;
  observacoes: string;
};

export type CampanhaFormData = {
  nome: string;
  canal: string;
  investimento: number;
  leads: number;
  status: string;
  inicio: string;
  fim: string;
};

export type MarketingResumo = {
  totalLeads: number;
  leadsAtivos: number;
  leadsConvertidos: number;
  leadsPerdidos: number;
  pipelineTotal: number;
  pipelineAtivo: number;
  ticketMedioPrevisto: number;
  campanhasAtivas: number;
  investimentoTotal: number;
  custoPorLead: number;
  taxaConversao: number;
};

export const LEAD_ETAPAS: { value: LeadEtapa; label: string; description: string }[] = [
  { value: "Novo", label: "Novo", description: "Contato recém-chegado" },
  { value: "Contato", label: "Contato", description: "Primeira conversa iniciada" },
  { value: "Avaliação", label: "Avaliação", description: "Interesse com avaliação marcada" },
  { value: "Negociação", label: "Negociação", description: "Condição ou pacote em análise" },
  { value: "Convertido", label: "Convertido", description: "Virou cliente ou venda" },
  { value: "Perdido", label: "Perdido", description: "Sem avanço comercial" },
];

export const CAMPANHA_STATUS = ["Ativa", "Pausada", "Finalizada"] as const;

export const CAMPANHA_CANAIS = [
  "Instagram",
  "WhatsApp",
  "Google Ads",
  "Meta Ads",
  "Indicação",
  "Orgânico",
  "Parceria",
  "Outro",
] as const;
