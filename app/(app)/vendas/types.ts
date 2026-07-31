import type { KitVendaOption, ProdutoVendaOption } from "@/lib/vendas.types";

export type ClienteVendaOption = {
  id: number;
  nome: string;
  telefone: string;
  whatsapp: string | null;
  campanhaAquisicaoId: number | null;
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
  taxaPagamento: number;
  valorLiquido: number | null;
  formaPagamentoConfigId: number | null;
  contaFinanceiraId: number | null;
  campanhaId: number | null;
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
  formasPagamento: FormaPagamentoVendaOption[];
  vendas: VendaHistoricoItem[];
  podeGerenciar: boolean;
  podeAutorizarEstoqueNegativo: boolean;
  podeAdministrarVendas: boolean;
};

export type FormaPagamentoVendaOption = {
  id: number;
  nome: string;
  taxaPercentual: number;
  taxaFixa: number;
  prazoDias: number;
  status: string;
};
