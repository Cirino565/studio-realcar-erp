export type Agendamento = {
  id: number;

  clienteId: number;

  procedimento: string;

  data: Date;

  observacoes: string | null;

  status: string;

  createdAt: Date;

  updatedAt: Date;

  cliente: {
    id: number;
    nome: string;
  };
};