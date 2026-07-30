import type { KitVendaOption, ProdutoVendaOption } from "@/lib/vendas.types";

export type ClienteVendaOption = {
  id: number;
  nome: string;
  telefone: string;
  whatsapp: string | null;
};

export type VendaHistoricoItem = {
  id: number;
  agendamentoId: number | null;
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
  situacao: string;
  canceladaEm: string | null;
  canceladaPor: string | null;
  motivoCancelamento: string | null;
  origem: string;
  observacoes: string | null;
  itens: Array<{
    id: number;
    tipo: string;
    produtoId: number | null;
    kitProdutoId: number | null;
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    custoUnitario: number;
    valorTotal: number;
    custoTotal: number;
    grupoKitId: string | null;
    kitNomeHistorico: string | null;
    kitTipoHistorico: string | null;
    acrescimoUnitario: number;
  }>;
};

export type VendasPageData = {
  clientes: ClienteVendaOption[];
  produtos: ProdutoVendaOption[];
  kits: KitVendaOption[];
  vendas: VendaHistoricoItem[];
  podeGerenciar: boolean;
  podeAutorizarEstoqueNegativo: boolean;
  podeAdministrarVendas: boolean;
};
