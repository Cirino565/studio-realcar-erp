export type PermissaoResumo = {
  id: number;
  chave: string;
  nome: string;
  modulo: string;
};

export type PerfilComPermissoes = {
  id: number;
  nome: string;
  descricao: string | null;
  nivel: number;
  status: string;
  usuarios: { id: number; nome: string; email: string; status: string }[];
  permissoes: { permissaoId: number; permissao: PermissaoResumo }[];
};
