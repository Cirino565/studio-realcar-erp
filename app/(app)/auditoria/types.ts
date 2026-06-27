export type AuditoriaLog = {
  id: number;
  modulo: string;
  acao: string;
  entidade: string | null;
  entidadeId: string | null;
  usuario: string | null;
  detalhes: string | null;
  createdAt: Date;
};

export type AuditoriaResumo = {
  total: number;
  hoje: number;
  modulos: number;
  usuarios: number;
  criticos: number;
};
