import type { CampanhaMarketing, Lead, LeadInteracao } from "@prisma/client";

export type LeadEtapa = "Novo" | "Contato" | "Avaliação" | "Negociação" | "Convertido" | "Perdido";

export type MarketingLead = Lead & {
  cliente: {
    id: number;
    nome: string;
  } | null;
  agendamento: {
    id: number;
    data: Date;
    status: string;
    procedimento: string;
    profissional: {
      id: number;
      nome: string;
    } | null;
  } | null;
  campanha: {
    id: number;
    nome: string;
    canal: string;
  } | null;
  interacoes: LeadInteracao[];
  receitaRastreada: number;
};

export type MarketingCampanha = CampanhaMarketing & {
  metricas: {
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
};

export type MarketingClienteOption = {
  id: number;
  nome: string;
  telefone: string;
  whatsapp: string | null;
  campanhaAquisicaoId: number | null;
};


export type MarketingReceitaOption = {
  id: number;
  descricao: string;
  valor: number;
  data: Date;
  clienteId: number | null;
  clienteNome: string | null;
  vendaId: number | null;
};

export type MarketingContaOption = {
  id: number;
  nome: string;
  banco: string | null;
  principal: boolean;
};

export type MarketingProfissional = {
  id: number;
  nome: string;
};

export type MarketingServico = {
  id: number;
  nome: string;
  duracaoPadrao: number;
  valorPadrao: number;
};

export type LeadFormData = {
  nome: string;
  telefone: string;
  origem: string;
  interesse: string;
  etapa: LeadEtapa;
  valorPrevisto: number;
  observacoes: string;
  campanhaId: number | null;
  codigoAtendimento: string;
};

export type CampanhaFormData = {
  nome: string;
  canal: string;
  utmCampaign: string;
  investimento: number;
  leads: number;
  status: string;
  inicio: string;
  fim: string;
  observacoes: string;
};

export type MarketingResumo = {
  totalLeads: number;
  leadsAtivos: number;
  leadsConvertidos: number;
  leadsPerdidos: number;
  avaliacoesAgendadas: number;
  pipelineTotal: number;
  pipelineAtivo: number;
  ticketMedioPrevisto: number;
  campanhasAtivas: number;
  investimentoTotal: number;
  custoRealTotal: number;
  custoPorCliente: number;
  taxaConversao: number;
  receitaRastreada: number;
  receitaLiquida: number;
  resultadoMarketing: number;
};

export const LEAD_ETAPAS: { value: LeadEtapa; label: string; description: string }[] = [
  { value: "Novo", label: "Novo", description: "Contato recém-chegado" },
  { value: "Contato", label: "Contato", description: "Primeira conversa iniciada" },
  { value: "Avaliação", label: "Avaliação", description: "Avaliação ou atendimento inicial agendado" },
  { value: "Negociação", label: "Negociação", description: "Condição, pacote ou tratamento em análise" },
  { value: "Convertido", label: "Convertido", description: "Virou cliente ou fechou oportunidade" },
  { value: "Perdido", label: "Perdido", description: "Oportunidade encerrada sem avanço" },
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