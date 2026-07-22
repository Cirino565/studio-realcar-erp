import type { ProdutoVendaOption } from "@/lib/vendas.types";

export type ClienteVendaOption = {
  id: number;
  nome: string;
  telefone: string;
  whatsapp: string | null;
};

export type VendaHistoricoItem = {
  id: number;
  data: string;
  cliente: { id: number; nome: string } | null;
  totalServicos: number;
  totalProdutos: number;
  custoServicos: number;
  custoProdutos: number;
  valorTotal: number;
  custoTotal: number;
  formaPagamento: string | null;
  statusPagamento: string;
  origem: string;
  itens: Array<{
    id: number;
    tipo: string;
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    custoUnitario: number;
    valorTotal: number;
    custoTotal: number;
  }>;
};

export type VendasPageData = {
  clientes: ClienteVendaOption[];
  produtos: ProdutoVendaOption[];
  vendas: VendaHistoricoItem[];
  podeGerenciar: boolean;
};
