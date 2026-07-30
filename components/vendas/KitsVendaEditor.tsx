"use client";

import { useMemo, useState } from "react";
import { Boxes, Minus, Plus, Trash2 } from "lucide-react";

import type {
  ItemKitVendaDraft,
  KitVendaOption,
} from "@/lib/vendas.types";
import {
  custoUnitarioKit,
  valorUnitarioKit,
} from "@/lib/vendas.types";

function moeda(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function chaveCliente() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

type Props = {
  kits: KitVendaOption[];
  itens: ItemKitVendaDraft[];
  onChange: (itens: ItemKitVendaDraft[]) => void;
  compact?: boolean;
};

export default function KitsVendaEditor({
  kits,
  itens,
  onChange,
  compact = false,
}: Props) {
  const [kitSelecionado, setKitSelecionado] = useState("");
  const [selecaoFlexivel, setSelecaoFlexivel] = useState<Record<number, number>>({});
  const [erro, setErro] = useState("");

  const kitsAtivos = useMemo(
    () =>
      kits.filter(
        (kit) =>
          kit.status.toLowerCase() === "ativo" &&
          kit.itens.length > 0 &&
          kit.itens.every(
            (item) => item.produto.status.toLowerCase() === "ativo",
          ),
      ),
    [kits],
  );
  const kitAtual = kitsAtivos.find((kit) => kit.id === Number(kitSelecionado));
  const totalSelecionado = Object.values(selecaoFlexivel).reduce(
    (total, quantidade) => total + quantidade,
    0,
  );

  function mudarKit(value: string) {
    setKitSelecionado(value);
    setSelecaoFlexivel({});
    setErro("");
  }

  function ajustarSelecao(produtoId: number, delta: number) {
    if (!kitAtual || kitAtual.tipo !== "FLEXIVEL") return;
    setSelecaoFlexivel((atual) => {
      const quantidadeAtual = atual[produtoId] || 0;
      const limite = kitAtual.permitirRepeticao ? kitAtual.quantidadeEscolha : 1;
      const proxima = Math.max(0, Math.min(limite, quantidadeAtual + delta));
      const copia = { ...atual };
      if (proxima === 0) delete copia[produtoId];
      else copia[produtoId] = proxima;
      return copia;
    });
    setErro("");
  }

  function adicionarKit() {
    if (!kitAtual) return;

    let componentes: ItemKitVendaDraft["componentes"];
    if (kitAtual.tipo === "FIXO") {
      componentes = kitAtual.itens.map((item) => ({
        produtoId: item.produtoId,
        nome: item.produto.nome,
        unidade: item.produto.unidade,
        quantidadePorKit: item.quantidade,
        estoqueDisponivel: item.produto.quantidade,
        custoUnitario: item.produto.valorCompra,
        acrescimoUnitario: item.acrescimo,
      }));
    } else {
      if (totalSelecionado !== kitAtual.quantidadeEscolha) {
        setErro(`Escolha exatamente ${kitAtual.quantidadeEscolha} item(ns).`);
        return;
      }
      componentes = kitAtual.itens
        .filter((item) => (selecaoFlexivel[item.produtoId] || 0) > 0)
        .map((item) => ({
          produtoId: item.produtoId,
          nome: item.produto.nome,
          unidade: item.produto.unidade,
          quantidadePorKit: selecaoFlexivel[item.produtoId],
          estoqueDisponivel: item.produto.quantidade,
          custoUnitario: item.produto.valorCompra,
          acrescimoUnitario: item.acrescimo,
        }));
    }

    onChange([
      ...itens,
      {
        clientKey: chaveCliente(),
        kitId: kitAtual.id,
        nome: kitAtual.nome,
        tipo: kitAtual.tipo === "FLEXIVEL" ? "FLEXIVEL" : "FIXO",
        quantidadeKits: 1,
        precoBaseUnitario: kitAtual.precoVenda,
        componentes,
      },
    ]);
    setKitSelecionado("");
    setSelecaoFlexivel({});
    setErro("");
  }

  function atualizarQuantidade(clientKey: string, quantidade: number) {
    onChange(
      itens.map((item) =>
        item.clientKey === clientKey
          ? { ...item, quantidadeKits: Math.max(1, Math.trunc(quantidade || 1)) }
          : item,
      ),
    );
  }

  function remover(clientKey: string) {
    onChange(itens.filter((item) => item.clientKey !== clientKey));
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-400/20 dark:bg-violet-400/5">
        <div className="flex gap-2">
          <select
            value={kitSelecionado}
            onChange={(event) => mudarKit(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="">Adicionar kit...</option>
            {kitsAtivos.map((kit) => (
              <option key={kit.id} value={kit.id}>
                {kit.nome} · {kit.tipo === "FIXO" ? "fixo" : `escolha ${kit.quantidadeEscolha}`} · {kit.tipo === "FIXO"
                  ? moeda(
                      kit.precoVenda +
                        kit.itens.reduce(
                          (total, item) =>
                            total + item.acrescimo * item.quantidade,
                          0,
                        ),
                    )
                  : `base ${moeda(kit.precoVenda)}`}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={adicionarKit}
            disabled={!kitAtual || (kitAtual.tipo === "FLEXIVEL" && totalSelecionado !== kitAtual.quantidadeEscolha)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-40"
          >
            <Boxes className="size-4" />
            <span className="hidden sm:inline">Adicionar kit</span>
          </button>
        </div>

        {kitAtual?.tipo === "FLEXIVEL" ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <p className="font-bold text-violet-900 dark:text-violet-200">
                Escolha {kitAtual.quantidadeEscolha} item(ns)
              </p>
              <span className={totalSelecionado === kitAtual.quantidadeEscolha ? "font-bold text-emerald-700" : "font-bold text-amber-700"}>
                {totalSelecionado}/{kitAtual.quantidadeEscolha}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {kitAtual.itens.map((item) => {
                const quantidade = selecaoFlexivel[item.produtoId] || 0;
                return (
                  <div key={item.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-white/5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{item.produto.nome}</p>
                      <p className="text-[10px] text-slate-500">
                        Estoque {item.produto.quantidade}
                        {item.acrescimo > 0 ? ` · + ${moeda(item.acrescimo)}` : ""}
                      </p>
                    </div>
                    <button type="button" onClick={() => ajustarSelecao(item.produtoId, -1)} disabled={quantidade <= 0} className="rounded-lg border border-slate-200 p-1 text-slate-500 disabled:opacity-30">
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-5 text-center text-xs font-black">{quantidade}</span>
                    <button
                      type="button"
                      onClick={() => ajustarSelecao(item.produtoId, 1)}
                      disabled={totalSelecionado >= kitAtual.quantidadeEscolha || (!kitAtual.permitirRepeticao && quantidade >= 1)}
                      className="rounded-lg border border-slate-200 p-1 text-slate-500 disabled:opacity-30"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
            {!kitAtual.permitirRepeticao ? (
              <p className="text-[10px] text-slate-500">Este kit não permite repetir o mesmo produto.</p>
            ) : null}
          </div>
        ) : kitAtual ? (
          <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
            Composição fixa: {kitAtual.itens.map((item) => `${item.quantidade}x ${item.produto.nome}`).join(", ")}.
          </p>
        ) : null}
        {erro ? <p className="mt-2 text-xs font-semibold text-rose-700">{erro}</p> : null}
      </div>

      {itens.length > 0 ? (
        <div className="space-y-2">
          {itens.map((item) => {
            const valorUnitario = valorUnitarioKit(item);
            const custoUnitario = custoUnitarioKit(item);
            const valorTotal = valorUnitario * item.quantidadeKits;
            const custoTotal = custoUnitario * item.quantidadeKits;
            return (
              <div key={item.clientKey} className="rounded-2xl border border-violet-200 bg-white p-3 dark:border-violet-400/20 dark:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{item.nome}</p>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-700">{item.tipo === "FIXO" ? "FIXO" : "FLEXÍVEL"}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {item.componentes.map((componente) => `${componente.quantidadePorKit}x ${componente.nome}`).join(", ")}
                    </p>
                  </div>
                  <button type="button" onClick={() => remover(item.clientKey)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remover ${item.nome}`}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr_auto] sm:items-end">
                  <label>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Quantidade de kits</p>
                    <input
                      type="number"
                      min={1}
                      value={item.quantidadeKits}
                      onChange={(event) => atualizarQuantidade(item.clientKey, Number(event.target.value))}
                      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-sm font-bold outline-none dark:border-white/10 dark:bg-white/5"
                    />
                  </label>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Preço por kit</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{moeda(valorUnitario)}</p>
                    <p className="text-[10px] text-slate-500">Base {moeda(item.precoBaseUnitario)} + acréscimos</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Subtotal</p>
                    <p className="mt-1 text-sm font-black text-violet-700">{moeda(valorTotal)}</p>
                    <p className="text-[10px] font-semibold text-emerald-600">margem {moeda(valorTotal - custoTotal)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-violet-200 px-4 py-4 text-center text-xs text-slate-500 dark:border-violet-400/20">
          Nenhum kit adicionado nesta venda.
        </div>
      )}
    </div>
  );
}
