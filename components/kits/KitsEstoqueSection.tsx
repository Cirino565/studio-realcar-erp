"use client";

import { useMemo, useState, useTransition } from "react";
import { Boxes, CheckCircle2, Pencil, Plus, Power, X } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  alterarStatusKitProduto,
  salvarKitProduto,
} from "@/actions/kit.actions";
import type { KitVendaOption, ProdutoVendaOption } from "@/lib/vendas.types";

type ItemForm = {
  produtoId: number;
  quantidade: number;
  acrescimo: number;
};

type FormState = {
  id?: number;
  nome: string;
  tipo: "FIXO" | "FLEXIVEL";
  precoVenda: number;
  quantidadeEscolha: number;
  permitirRepeticao: boolean;
  status: string;
  observacoes: string;
  itens: ItemForm[];
};

type Props = {
  kits: KitVendaOption[];
  produtos: ProdutoVendaOption[];
  podeGerenciar: boolean;
};

function moeda(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formularioVazio(): FormState {
  return {
    nome: "",
    tipo: "FIXO",
    precoVenda: 0,
    quantidadeEscolha: 3,
    permitirRepeticao: false,
    status: "Ativo",
    observacoes: "",
    itens: [],
  };
}

function formularioDoKit(kit: KitVendaOption): FormState {
  return {
    id: kit.id,
    nome: kit.nome,
    tipo: kit.tipo === "FLEXIVEL" ? "FLEXIVEL" : "FIXO",
    precoVenda: kit.precoVenda,
    quantidadeEscolha: kit.quantidadeEscolha,
    permitirRepeticao: kit.permitirRepeticao,
    status: kit.status,
    observacoes: kit.observacoes || "",
    itens: kit.itens.map((item) => ({
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      acrescimo: item.acrescimo,
    })),
  };
}

export default function KitsEstoqueSection({
  kits,
  produtos,
  podeGerenciar,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [isPending, startTransition] = useTransition();

  const produtosAtivos = useMemo(
    () => produtos.filter((produto) => produto.status.toLowerCase() === "ativo"),
    [produtos],
  );

  function adicionarProduto() {
    if (!form) return;
    const produtoId = Number(produtoSelecionado);
    if (!produtoId || form.itens.some((item) => item.produtoId === produtoId)) return;
    setForm({
      ...form,
      itens: [...form.itens, { produtoId, quantidade: 1, acrescimo: 0 }],
    });
    setProdutoSelecionado("");
  }

  function atualizarItem(produtoId: number, patch: Partial<ItemForm>) {
    if (!form) return;
    setForm({
      ...form,
      itens: form.itens.map((item) =>
        item.produtoId === produtoId ? { ...item, ...patch } : item,
      ),
    });
  }

  function removerItem(produtoId: number) {
    if (!form) return;
    setForm({ ...form, itens: form.itens.filter((item) => item.produtoId !== produtoId) });
  }

  function salvar() {
    if (!form) return;
    setErro("");
    setMensagem("");
    startTransition(async () => {
      try {
        await salvarKitProduto({
          ...form,
          itens: form.itens.map((item, ordem) => ({ ...item, ordem })),
        });
        setMensagem(form.id ? "Kit atualizado com sucesso." : "Kit cadastrado com sucesso.");
        setForm(null);
        router.refresh();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível salvar o kit.");
      }
    });
  }

  function alternarStatus(kit: KitVendaOption) {
    setErro("");
    setMensagem("");
    const novoStatus = kit.status.toLowerCase() === "ativo" ? "Inativo" : "Ativo";
    startTransition(async () => {
      try {
        await alterarStatusKitProduto(kit.id, novoStatus);
        setMensagem(`Kit ${novoStatus.toLowerCase()} com sucesso.`);
        router.refresh();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível alterar o kit.");
      }
    });
  }

  return (
    <section className="rounded-3xl border border-violet-400/20 bg-violet-500/[0.04] p-4 shadow-2xl shadow-black/10 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white">
            <Boxes className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Kits de produtos</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              O kit é uma composição comercial. O estoque permanece somente nos produtos individuais, e a baixa dos componentes é automática na venda.
            </p>
          </div>
        </div>
        {podeGerenciar ? (
          <button
            type="button"
            onClick={() => {
              setErro("");
              setMensagem("");
              setForm(formularioVazio());
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white hover:bg-violet-700"
          >
            <Plus className="size-4" /> Novo kit
          </button>
        ) : null}
      </div>

      {mensagem ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 className="size-4" /> {mensagem}
        </div>
      ) : null}
      {erro && !form ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{erro}</div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {kits.length > 0 ? (
          kits.map((kit) => {
            const fixo = kit.tipo === "FIXO";
            const acrescimoFixo = fixo
              ? kit.itens.reduce(
                  (total, item) => total + item.acrescimo * item.quantidade,
                  0,
                )
              : 0;
            const precoExibido = kit.precoVenda + acrescimoFixo;
            const disponibilidade = fixo
              ? Math.max(
                  0,
                  Math.min(
                    ...kit.itens.map((item) =>
                      Math.floor(
                        item.produto.quantidade / Math.max(1, item.quantidade),
                      ),
                    ),
                  ),
                )
              : null;
            return (
              <article key={kit.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-bold text-white">{kit.nome}</h3>
                      <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-bold text-violet-200">
                        {fixo ? "FIXO" : "FLEXÍVEL"}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${kit.status.toLowerCase() === "ativo" ? "bg-emerald-500/15 text-emerald-200" : "bg-slate-500/20 text-slate-300"}`}>
                        {kit.status}
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-black text-violet-200">
                      {fixo
                        ? moeda(precoExibido)
                        : `Base ${moeda(kit.precoVenda)}`}
                    </p>
                  </div>
                  {podeGerenciar ? (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setForm(formularioDoKit(kit))} className="rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/10" aria-label={`Editar ${kit.nome}`}>
                        <Pencil className="size-4" />
                      </button>
                      <button type="button" onClick={() => alternarStatus(kit)} disabled={isPending} className="rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/10 disabled:opacity-40" aria-label={`Alterar status de ${kit.nome}`}>
                        <Power className="size-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-400">
                  {fixo
                    ? kit.itens.map((item) => `${item.quantidade}x ${item.produto.nome}`).join(", ")
                    : `Escolha ${kit.quantidadeEscolha} item(ns) entre ${kit.itens.length} produtos permitidos${kit.permitirRepeticao ? ", com repetição" : ", sem repetição"}.`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-400">
                  {fixo ? <span>Disponibilidade calculada: {Number.isFinite(disponibilidade) ? disponibilidade : 0} kit(s)</span> : <span>Disponibilidade depende da escolha</span>}
                  {acrescimoFixo > 0 ? (
                    <span>
                      Base {moeda(kit.precoVenda)} + {moeda(acrescimoFixo)} premium
                    </span>
                  ) : kit.itens.some((item) => item.acrescimo > 0) ? (
                    <span>Preço varia conforme os produtos premium escolhidos</span>
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400 lg:col-span-2">
            Nenhum kit cadastrado. Cadastre os produtos individuais primeiro e depois monte as composições.
          </div>
        )}
      </div>

      {form ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
          <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5">
              <div>
                <h3 className="text-lg font-bold text-white">{form.id ? "Editar kit" : "Novo kit"}</h3>
                <p className="mt-1 text-xs text-slate-400">Cadastre a regra comercial sem criar estoque duplicado.</p>
              </div>
              <button type="button" onClick={() => setForm(null)} className="rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/10"><X className="size-4" /></button>
            </header>
            <main className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              {erro ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{erro}</div> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-bold text-slate-300">Nome do kit</span>
                  <input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} className="premium-input w-full" placeholder="Ex.: Kit Home Care Completo" />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-bold text-slate-300">Tipo</span>
                  <select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as FormState["tipo"], itens: [] })} className="premium-input w-full">
                    <option value="FIXO">Kit fixo</option>
                    <option value="FLEXIVEL">Kit flexível</option>
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-bold text-slate-300">Preço base do kit</span>
                  <input type="number" min="0" step="0.01" value={form.precoVenda} onChange={(event) => setForm({ ...form, precoVenda: Math.max(0, Number(event.target.value) || 0) })} className="premium-input w-full" />
                </label>
                {form.tipo === "FLEXIVEL" ? (
                  <>
                    <label>
                      <span className="mb-1.5 block text-xs font-bold text-slate-300">Quantidade que a cliente escolhe</span>
                      <input type="number" min="1" value={form.quantidadeEscolha} onChange={(event) => setForm({ ...form, quantidadeEscolha: Math.max(1, Math.trunc(Number(event.target.value) || 1)) })} className="premium-input w-full" />
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <input type="checkbox" checked={form.permitirRepeticao} onChange={(event) => setForm({ ...form, permitirRepeticao: event.target.checked })} className="size-4" />
                      <span className="text-sm text-slate-200">Permitir repetir o mesmo produto</span>
                    </label>
                  </>
                ) : null}
              </div>

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex gap-2">
                  <select value={produtoSelecionado} onChange={(event) => setProdutoSelecionado(event.target.value)} className="premium-input min-w-0 flex-1">
                    <option value="">Selecione um produto</option>
                    {produtosAtivos.filter((produto) => !form.itens.some((item) => item.produtoId === produto.id)).map((produto) => (
                      <option key={produto.id} value={produto.id}>{produto.nome} · estoque {produto.quantidade}</option>
                    ))}
                  </select>
                  <button type="button" onClick={adicionarProduto} disabled={!produtoSelecionado} className="rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-40">Adicionar</button>
                </div>
                <div className="mt-3 space-y-2">
                  {form.itens.map((item) => {
                    const produto = produtos.find((produto) => produto.id === item.produtoId);
                    if (!produto) return null;
                    return (
                      <div key={item.produtoId} className="grid gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-3 sm:grid-cols-[1fr_130px_150px_auto] sm:items-end">
                        <div>
                          <p className="text-sm font-bold text-white">{produto.nome}</p>
                          <p className="text-[10px] text-slate-400">Estoque atual {produto.quantidade} {produto.unidade}</p>
                        </div>
                        {form.tipo === "FIXO" ? (
                          <label>
                            <span className="mb-1 block text-[10px] font-bold text-slate-400">Quantidade no kit</span>
                            <input type="number" min="1" value={item.quantidade} onChange={(event) => atualizarItem(item.produtoId, { quantidade: Math.max(1, Math.trunc(Number(event.target.value) || 1)) })} className="premium-input h-10 w-full" />
                          </label>
                        ) : <div />}
                        <label>
                          <span className="mb-1 block text-[10px] font-bold text-slate-400">Acréscimo premium</span>
                          <input type="number" min="0" step="0.01" value={item.acrescimo} onChange={(event) => atualizarItem(item.produtoId, { acrescimo: Math.max(0, Number(event.target.value) || 0) })} className="premium-input h-10 w-full" />
                        </label>
                        <button type="button" onClick={() => removerItem(item.produtoId)} className="h-10 rounded-xl border border-rose-400/20 px-3 text-xs font-bold text-rose-300 hover:bg-rose-500/10">Remover</button>
                      </div>
                    );
                  })}
                  {form.itens.length === 0 ? <p className="py-4 text-center text-xs text-slate-500">Adicione os produtos da composição ou da lista permitida.</p> : null}
                </div>
              </section>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-300">Observações</span>
                <textarea value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} className="premium-input min-h-20 w-full resize-none" />
              </label>
            </main>
            <footer className="grid shrink-0 grid-cols-2 gap-2 border-t border-white/10 p-3 sm:p-4">
              <button type="button" onClick={() => setForm(null)} className="h-10 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/5">Cancelar</button>
              <button type="button" onClick={salvar} disabled={isPending} className="h-10 rounded-xl bg-violet-600 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-40">{isPending ? "Salvando..." : "Salvar kit"}</button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
