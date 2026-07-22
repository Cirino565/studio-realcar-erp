export type ProdutoVendaOption = {
  id: number;
  nome: string;
  categoria: string | null;
  unidade: string;
  quantidade: number;
  valorCompra: number;
  valorVenda: number;
  status: string;
};

export type ItemProdutoVendaDraft = {
  produtoId: number;
  nome: string;
  unidade: string;
  quantidade: number;
  estoqueDisponivel: number;
  valorUnitario: number;
  custoUnitario: number;
};

export type ProdutoVendaInput = {
  produtoId: number;
  quantidade: number;
  valorUnitario?: number;
};
