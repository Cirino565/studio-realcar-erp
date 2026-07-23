export type ClienteAnamneseData = {
  id: number;
  procedimento: string | null;
  queixaPrincipal: string | null;
  alergias: string | null;
  medicamentos: string | null;
  doencasPreExistentes: string | null;
  procedimentosAnteriores: string | null;
  gestante: boolean;
  lactante: boolean;
  usaAcidos: boolean;
  possuiMarcapasso: boolean;
  restricoes: string | null;
  objetivoTratamento: string | null;
  observacoesClinicas: string | null;
  respostasRapidas: string | null;
  assinaturaCliente: string | null;
  assinaturaNome: string | null;
  termoConsentimento: boolean;
  status: string;
  versao: number;
  finalizadaEm: string | null;
  assinadaEm: string | null;
  profissional: string | null;
  dataFicha: string;
  updatedAt: string;
};

export type ClienteFotoData = {
  id: number;
  titulo: string;
  tipo: string;
  url: string;
  descricao: string | null;
  dataRegistro: string;
};

export type ClienteDocumentoData = {
  id: number;
  titulo: string;
  tipo: string;
  url: string | null;
  observacoes: string | null;
  dataRegistro: string;
};

export type ClienteProcedimentoData = {
  id: number;
  nome: string;
  profissional: string | null;
  valor: number;
  status: string;
  dataProcedimento: string;
  observacoes: string | null;
};

export type ClienteEvolucaoData = {
  id: number;
  titulo: string;
  descricao: string;
  profissional: string | null;
  dataRegistro: string;
};

export type ClienteClinicoData = {
  id: number;
  nome: string;
  anamnese: ClienteAnamneseData | null;
  anamneses: ClienteAnamneseData[];
  fotos: ClienteFotoData[];
  documentos: ClienteDocumentoData[];
  procedimentos: ClienteProcedimentoData[];
  evolucoes: ClienteEvolucaoData[];
  anamneseModelos: ClienteAnamneseModeloData[];
  anamneseRespostas: ClienteAnamneseRespostaData[];
};

export type ClienteAnamnesePerguntaModelo = {
  id: number;
  modeloId: number;
  pergunta: string;
  tipo: string;
  opcoes: string | null;
  obrigatoria: boolean;
  ativa: boolean;
  ordem: number;
};

export type ClienteAnamneseModeloData = {
  id: number;
  nome: string;
  procedimentoNome: string | null;
  status: string;
  perguntas: ClienteAnamnesePerguntaModelo[];
};

export type ClienteAnamneseRespostaData = {
  id: number;
  anamneseId: number | null;
  perguntaId: number | null;
  procedimento: string | null;
  perguntaTexto: string;
  tipo: string;
  resposta: string | null;
  observacao: string | null;
  profissional: string | null;
  dataResposta: string;
};

