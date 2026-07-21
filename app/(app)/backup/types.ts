export type BackupRegistroItem = {
  id: number;
  nome: string;
  status: string;
  tamanho: string | null;
  observacoes: string | null;
  createdAt: Date;
};

export type BackupMetricas = {
  clientes: number;
  origensCliente: number;
  procedimentosInteresse: number;
  procedimentosServico: number;
  profissionais: number;
  agendamentos: number;
  bloqueiosAgenda: number;
  lancamentos: number;
  fornecedores: number;
  produtos: number;
  movimentacoes: number;
  compras: number;
  compraItens: number;
  leads: number;
  interacoesLeads: number;
  campanhas: number;
  usuarios: number;
  perfis: number;
  permissoes: number;
  perfilPermissoes: number;
  automacoes: number;
  mensagemModelos: number;
  comunicacoes: number;
  auditoria: number;
  anamneses: number;
  anamneseModelos: number;
  anamnesePerguntas: number;
  anamneseRespostas: number;
  fotos: number;
  documentos: number;
  procedimentos: number;
  evolucoes: number;
  configuracoes: number;
  total: number;
};

export type BackupSaude = {
  ultimoBackup: Date | null;
  totalBackups: number;
  backupsComErro: number;
  registrosProtegidos: number;
};
