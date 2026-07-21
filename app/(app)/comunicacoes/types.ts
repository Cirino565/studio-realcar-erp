export type MensagemModeloItem = {
  id: number;
  chave: string;
  nome: string;
  categoria: string;
  corpo: string;
  ativo: boolean;
  ordem: number;
};

export type ComunicacaoFilaItem = {
  id: string;
  prioridade: number;
  categoria: string;
  modeloChave: string;
  modeloId: number | null;
  nome: string;
  telefone: string | null;
  clienteId: number | null;
  leadId: number | null;
  agendamentoId: number | null;
  detalhe: string;
  mensagem: string;
  destinoHref: string;
  enviadaHoje: boolean;
  ultimaComunicacaoEm: string | null;
};

export type ComunicacaoHistoricoItem = {
  id: number;
  destinatarioNome: string;
  telefone: string | null;
  categoria: string;
  canal: string;
  status: string;
  usuario: string | null;
  mensagem: string;
  createdAt: string;
  enviadoEm: string | null;
  clienteId: number | null;
  leadId: number | null;
  agendamentoId: number | null;
};

export type ComunicacaoResumo = {
  pendentes: number;
  atrasadas: number;
  enviadasHoje: number;
  abertasHoje: number;
};
