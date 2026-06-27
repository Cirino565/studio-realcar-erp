export type Cliente = {
  id: number;
  nome: string;
  telefone: string;

  whatsapp: string | null;
  cpf: string | null;
  instagram: string | null;
  origem: string | null;
  procedimentoInteresse: string | null;
  nascimento: Date | null;
  observacoes: string | null;

  procedimento: string | null;
  valorGasto: number;
  ultimaVisita: Date | null;
  status: string;
};