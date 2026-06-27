export type PerfilResumo = {
  id: number;
  nome: string;
  descricao: string | null;
  nivel: number;
  status: string;
  totalPermissoes: number;
};

export type UsuarioComPerfil = {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  cargo: string | null;
  tipo: string;
  especialidade: string | null;
  status: string;
  perfilId: number | null;
  perfil: {
    id: number;
    nome: string;
    nivel: number;
  } | null;
  dataAdmissao: string | null;
  ultimoAcesso: string | null;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
};
