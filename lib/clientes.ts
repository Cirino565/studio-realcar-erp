export type Cliente = {
  id: number;
  nome: string;
  telefone: string;

  whatsapp: string | null;
  cpf: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  enderecoOriginal: string | null;
  origem: string | null;
  procedimentoInteresse: string | null;
  nascimento: Date | null;
  observacoes: string | null;

  procedimento: string | null;
  valorGasto: number;
  ultimaVisita: Date | null;
  status: string;
};
