export type Lancamento = {
  id: number;

  descricao: string;

  valor: number;

  tipo: string;

  categoria: string | null;

  observacoes: string | null;

  data: Date;

  createdAt: Date;

  updatedAt: Date;
};