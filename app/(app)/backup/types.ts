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
  agendamentos: number;
  lancamentos: number;
  fornecedores: number;
  produtos: number;
  movimentacoes: number;
  leads: number;
  campanhas: number;
  usuarios: number;
  perfis: number;
  permissoes: number;
  automacoes: number;
  auditoria: number;
  anamneses: number;
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
