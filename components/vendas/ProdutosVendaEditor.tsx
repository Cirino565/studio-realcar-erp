"use client";

import { useMemo, useState } from "react";
import { Minus, PackagePlus, Plus, Trash2 } from "lucide-react";

import type {
  ItemProdutoVendaDraft,
  ProdutoVendaOption,
} from "@/lib/vendas.types";

function formatarMoeda(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type Props = {
  produtos: ProdutoVendaOption[];
  itens: ItemProdutoVendaDraft[];
  onChange: (itens: ItemProdutoVendaDraft[]) => void;
  compact?: boolean;
};

export default function ProdutosVendaEditor({
  produtos,
  itens,
  onChange,
  compact = false,
}: Props) {
  const [produtoSelecionado, setProdutoSelecionado] = useState("");

  const produtosDisponiveis = useMemo(
    () =>
      produtos.filter(
        (produto) =>
          produto.status.toLowerCase() === "ativo" && produto.quantidade > 0,
      ),
    [produtos],
  );

  function adicionarProduto() {
    const id = Number(produtoSelecionado);
    const produto = produtosDisponiveis.find((item) => item.id === id);

    if (!produto) return;

    const existente = itens.find((item) => item.produtoId === produto.id);

    if (existente) {
      if (existente.quantidade >= existente.estoqueDisponivel) return;
      onChange(
        itens.map((item) =>
          item.produtoId === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item,
        ),
      );
    } else {
      onChange([
        ...itens,
        {
          produtoId: produto.id,
          nome: produto.nome,
          unidade: produto.unidade,
          quantidade: 1,
          estoqueDisponivel: produto.quantidade,
          valorUnitario: produto.valorVenda,
          custoUnitario: produto.valorCompra,
        },
      ]);
    }

    setProdutoSelecionado("");
  }

  function atualizarQuantidade(produtoId: number, quantidade: number) {
    onChange(
      itens.map((item) =>
        item.produtoId === produtoId
          ? {
              ...item,
              quantidade: Math.min(
                item.estoqueDisponivel,
                Math.max(1, Math.trunc(quantidade || 1)),
              ),
            }
          : item,
      ),
    );
  }

  function atualizarValor(produtoId: number, valorUnitario: number) {
    onChange(
      itens.map((item) =>
        item.produtoId === produtoId
          ? { ...item, valorUnitario: Math.max(0, valorUnitario || 0) }
          : item,
      ),
    );
  }

  function remover(produtoId: number) {
    onChange(itens.filter((item) => item.produtoId !== produtoId));
  }

  const totalProdutos = itens.reduce(
    (total, item) => total + item.valorUnitario * item.quantidade,
    0,
  );
  const custoProdutos = itens.reduce(
    (total, item) => total + item.custoUnitario * item.quantidade,
    0,
  );

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex gap-2">
        <select
          value={produtoSelecionado}
          onChange={(event) => setProdutoSelecionado(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-white/10"
        >
          <option value="">Adicionar produto...</option>
          {produtosDisponiveis.map((produto) => (
            <option key={produto.id} value={produto.id}>
              {produto.nome} · estoque {produto.quantidade} · {formatarMoeda(produto.valorVenda)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={adicionarProduto}
          disabled={!produtoSelecionado}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white transition hover:bg-violet-700 disabled:opacity-40"
        >
          <PackagePlus className="size-4" />
          <span className="hidden sm:inline">Adicionar</span>
        </button>
      </div>

      {itens.length > 0 ? (
        <div className="space-y-2">
          {itens.map((item) => {
            const valorTotal = item.valorUnitario * item.quantidade;
            const custoTotal = item.custoUnitario * item.quantidade;
            const margem = valorTotal - custoTotal;

            return (
              <div
                key={item.produtoId}
                className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {item.nome}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      Custo histórico ao vender: {formatarMoeda(item.custoUnitario)} por {item.unidade}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remover(item.produtoId)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-400/10"
                    aria-label={`Remover ${item.nome}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr_auto] sm:items-end">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Quantidade
                    </p>
                    <div className="flex h-9 items-center rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                      <button
                        type="button"
                        onClick={() =>
                          atualizarQuantidade(item.produtoId, item.quantidade - 1)
                        }
                        disabled={item.quantidade <= 1}
                        className="flex h-full w-9 items-center justify-center text-slate-500 disabled:opacity-30"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={item.estoqueDisponivel}
                        value={item.quantidade}
                        onChange={(event) =>
                          atualizarQuantidade(
                            item.produtoId,
                            Number(event.target.value),
                          )
                        }
                        className="min-w-0 flex-1 bg-transparent text-center text-sm font-bold text-slate-900 outline-none dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          atualizarQuantidade(item.produtoId, item.quantidade + 1)
                        }
                        disabled={item.quantidade >= item.estoqueDisponivel}
                        className="flex h-full w-9 items-center justify-center text-slate-500 disabled:opacity-30"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <label>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Preço unitário vendido
                    </p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        R$
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.valorUnitario}
                        onChange={(event) =>
                          atualizarValor(
                            item.produtoId,
                            Number(event.target.value),
                          )
                        }
                        className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>
                  </label>

                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Subtotal
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                      {formatarMoeda(valorTotal)}
                    </p>
                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                      margem {formatarMoeda(margem)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-white/5">
            <span className="text-slate-500 dark:text-slate-400">
              Custo dos produtos: {formatarMoeda(custoProdutos)}
            </span>
            <strong className="text-slate-900 dark:text-white">
              Produtos: {formatarMoeda(totalProdutos)}
            </strong>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          Nenhum produto adicionado nesta venda.
        </div>
      )}
    </div>
  );
}
