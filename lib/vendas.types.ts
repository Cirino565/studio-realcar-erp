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

export type KitProdutoItemOption = {
  id: number;
  produtoId: number;
  quantidade: number;
  acrescimo: number;
  ordem: number;
  produto: ProdutoVendaOption;
};

export type KitVendaOption = {
  id: number;
  nome: string;
  tipo: string;
  precoVenda: number;
  quantidadeEscolha: number;
  permitirRepeticao: boolean;
  descontoTipo: string;
  descontoValor: number;
  status: string;
  observacoes: string | null;
  itens: KitProdutoItemOption[];
};

export type ItemKitComponenteDraft = {
  produtoId: number;
  nome: string;
  unidade: string;
  quantidadePorKit: number;
  estoqueDisponivel: number;
  custoUnitario: number;
  valorVendaUnitario: number;
  acrescimoUnitario: number;
};

export type ItemKitVendaDraft = {
  clientKey: string;
  kitId: number;
  nome: string;
  tipo: "FIXO" | "FLEXIVEL";
  quantidadeKits: number;
  precoBaseUnitario: number;
  descontoTipo: string;
  descontoValor: number;
  componentes: ItemKitComponenteDraft[];
};

export type KitVendaInput = {
  kitId: number;
  quantidade: number;
  componentes?: Array<{
    produtoId: number;
    quantidade: number;
  }>;
};

export function valorBrutoUnitarioKit(item: ItemKitVendaDraft) {
  if (item.tipo === "FLEXIVEL") {
    return item.componentes.reduce(
      (total, componente) =>
        total +
        (componente.valorVendaUnitario + componente.acrescimoUnitario) *
          componente.quantidadePorKit,
      0,
    );
  }

  return (
    item.precoBaseUnitario +
    item.componentes.reduce(
      (total, componente) =>
        total + componente.acrescimoUnitario * componente.quantidadePorKit,
      0,
    )
  );
}

export function descontoUnitarioKit(item: ItemKitVendaDraft) {
  if (item.tipo !== "FLEXIVEL") return 0;

  const bruto = valorBrutoUnitarioKit(item);
  const valor = Math.max(0, Number(item.descontoValor || 0));

  if (item.descontoTipo === "PERCENTUAL") {
    return Math.min(bruto, bruto * Math.min(100, valor) / 100);
  }
  if (item.descontoTipo === "VALOR") {
    return Math.min(bruto, valor);
  }
  return 0;
}

export function valorUnitarioKit(item: ItemKitVendaDraft) {
  return Math.max(0, valorBrutoUnitarioKit(item) - descontoUnitarioKit(item));
}

export function custoUnitarioKit(item: ItemKitVendaDraft) {
  return item.componentes.reduce(
    (total, componente) =>
      total + componente.custoUnitario * componente.quantidadePorKit,
    0,
  );
}

export function necessidadesEstoqueVenda(
  produtos: ItemProdutoVendaDraft[],
  kits: ItemKitVendaDraft[],
) {
  const necessidades = new Map<
    number,
    { nome: string; necessario: number; disponivel: number; unidade: string }
  >();

  for (const item of produtos) {
    const atual = necessidades.get(item.produtoId);
    necessidades.set(item.produtoId, {
      nome: item.nome,
      unidade: item.unidade,
      disponivel: item.estoqueDisponivel,
      necessario: (atual?.necessario || 0) + item.quantidade,
    });
  }

  for (const kit of kits) {
    for (const componente of kit.componentes) {
      const atual = necessidades.get(componente.produtoId);
      necessidades.set(componente.produtoId, {
        nome: componente.nome,
        unidade: componente.unidade,
        disponivel: componente.estoqueDisponivel,
        necessario:
          (atual?.necessario || 0) +
          componente.quantidadePorKit * kit.quantidadeKits,
      });
    }
  }

  return Array.from(necessidades.values()).filter(
    (item) => item.necessario > item.disponivel,
  );
}
