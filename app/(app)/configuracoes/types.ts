export type ConfiguracaoClinicaView = {
  id: number;
  nome: string;
  razaoSocial: string | null;
  cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  site: string | null;
  instagram: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  responsavelTecnico: string | null;
  registroProfissional: string | null;
  especialidadePrincipal: string | null;
  horarioAtendimento: string | null;
  intervaloAgenda: number;
  antecedenciaLembrete: number;
  toleranciaAtraso: number;
  moeda: string;
  timezone: string;
  logoUrl: string | null;
  corPrincipal: string;
  assinaturaMensagem: string | null;
  mensagemConfirmacao: string | null;
  mensagemLembrete: string | null;
  mensagemRetorno: string | null;
  politicaCancelamento: string | null;
  observacoesInternas: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CadastroAuxiliarView = {
  id: number;
  nome: string;
  descricao: string | null;
  status: string;
  ordem: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ConfiguracoesTab = "clinica" | "agenda" | "mensagens" | "identidade" | "auxiliares" | "anamnese";

export type ProcedimentoServicoView = {
  id: number;
  nome: string;
  categoria: string | null;
  descricao: string | null;
  duracaoPadrao: number;
  valorPadrao: number;
  status: string;
  ordem: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AnamnesePerguntaView = {
  id: number;
  modeloId: number;
  pergunta: string;
  tipo: string;
  opcoes: string | null;
  obrigatoria: boolean;
  ativa: boolean;
  ordem: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AnamneseModeloView = {
  id: number;
  nome: string;
  procedimentoId: number | null;
  procedimentoNome: string | null;
  descricao: string | null;
  status: string;
  ordem: number;
  createdAt: Date;
  updatedAt: Date;
  perguntas: AnamnesePerguntaView[];
};
