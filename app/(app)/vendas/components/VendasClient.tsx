"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleDollarSign,
  PackageCheck,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

import { criarVendaProdutos } from "@/actions/venda.actions";
import ProdutosVendaEditor from "@/components/vendas/ProdutosVendaEditor";
import type { ItemProdutoVendaDraft } from "@/lib/vendas.types";
import type {
  ClienteVendaOption,
  VendaHistoricoItem,
} from "../types";
import type { ProdutoVendaOption } from "@/lib/vendas.types";

type Props = {
  clientes: ClienteVendaOption[];
  produtos: ProdutoVendaOption[];
  vendas: VendaHistoricoItem[];
  podeGerenciar: boolean;
};

const FORMAS_PAGAMENTO = [
  "Pix",
  "Dinheiro",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência",
  "Outro",
];

function moeda(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataHora(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default function VendasClient({
  clientes,
  produtos,
  vendas,
  podeGerenciar,
}: Props) {
  const router = useRouter();
  const [clienteId, setClienteId] = useState("");
  const [itens, setItens] = useState<ItemProdutoVendaDraft[]>([]);
  const [formaPagamento, setFormaPagamento] = useState("Pix");
  const [statusPagamento, setStatusPagamento] = useState("Pago");
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [isPending, startTransition] = useTransition();

  const resumo = useMemo(() => {
    const receita = itens.reduce(
      (total, item) => total + item.valorUnitario * item.quantidade,
      0,
    );
    const custo = itens.reduce(
      (total, item) => total + item.custoUnitario * item.quantidade,
      0,
    );
    const margem = receita - custo;
    return {
      receita,
      custo,
      margem,
      margemPercentual: receita > 0 ? (margem / receita) * 100 : 0,
    };
  }, [itens]);

  const vendasPagas = vendas.filter(
    (venda) => venda.statusPagamento.toLowerCase() === "pago",
  );
  const receitaRecente = vendasPagas.reduce(
    (total, venda) => total + venda.valorTotal,
    0,
  );
  const margemRecente = vendasPagas.reduce(
    (total, venda) => total + venda.valorTotal - venda.custoTotal,
    0,
  );

  function limpar() {
    setClienteId("");
    setItens([]);
    setFormaPagamento("Pix");
    setStatusPagamento("Pago");
    setObservacoes("");
    setErro("");
  }

  function salvarVenda() {
    setErro("");
    setSucesso("");

    if (!clienteId) {
      setErro("Selecione a cliente da venda.");
      return;
    }
    if (itens.length === 0) {
      setErro("Adicione pelo menos um produto.");
      return;
    }

    startTransition(async () => {
      try {
        const resultado = await criarVendaProdutos({
          clienteId: Number(clienteId),
          produtos: itens.map((item) => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            valorUnitario: item.valorUnitario,
          })),
          formaPagamento,
          statusPagamento,
          observacoes,
        });

        setSucesso(`Venda #${resultado.vendaId} registrada em ${moeda(resultado.valorTotal)}.`);
        limpar();
        router.refresh();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível registrar a venda.");
      }
    });
  }

  return (
    <div className="min-w-0 space-y-5 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Nível 3A+</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">Vendas e rentabilidade</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Venda produtos sem criar agendamento. Vendas feitas junto ao atendimento também aparecem aqui com serviço e produtos separados.
          </p>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <ResumoCard icon={ReceiptText} label="Vendas recentes" valor={String(vendas.length)} detalhe="Últimos 60 registros carregados" />
        <ResumoCard icon={CircleDollarSign} label="Receita paga carregada" valor={moeda(receitaRecente)} detalhe="Somente vendas marcadas como pagas" />
        <ResumoCard icon={TrendingUp} label="Margem direta carregada" valor={moeda(margemRecente)} detalhe="Receita menos custo histórico dos itens" />
      </section>

      {podeGerenciar ? (
        <section className="premium-card p-4 sm:p-5">
          <div className="flex items-start gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
              <ShoppingCart className="size-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">Nova venda de produtos</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">A baixa de estoque, histórico da cliente e lançamento financeiro são criados juntos.</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {erro ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro}</div> : null}
            {sucesso ? <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"><CheckCircle2 className="size-4" />{sucesso}</div> : null}

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Cliente</span>
              <select value={clienteId} onChange={(event) => setClienteId(event.target.value)} className="premium-input w-full">
                <option value="">Selecione a cliente</option>
                {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome} · {cliente.whatsapp || cliente.telefone}</option>)}
              </select>
            </label>

            <ProdutosVendaEditor produtos={produtos} itens={itens} onChange={setItens} />

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Forma de pagamento</span>
                <select value={formaPagamento} onChange={(event) => setFormaPagamento(event.target.value)} className="premium-input w-full">
                  {FORMAS_PAGAMENTO.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Status</span>
                <select value={statusPagamento} onChange={(event) => setStatusPagamento(event.target.value)} className="premium-input w-full">
                  <option value="Pago">Pago</option>
                  <option value="Pendente">Pendente / a receber</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">Observações</span>
              <textarea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} className="premium-input min-h-20 w-full resize-none" placeholder="Opcional" />
            </label>

            <div className="grid gap-3 sm:grid-cols-4">
              <ValorCard label="Receita" value={resumo.receita} />
              <ValorCard label="Custo" value={resumo.custo} />
              <ValorCard label="Margem" value={resumo.margem} />
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-400/20 dark:bg-violet-400/10">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">Margem %</p>
                <p className="mt-1 text-xl font-black text-violet-950 dark:text-white">{resumo.margemPercentual.toFixed(1).replace(".", ",")}%</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={salvarVenda} disabled={isPending || itens.length === 0 || !clienteId} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-40">
                <PackageCheck className="size-4" />
                {isPending ? "Registrando..." : `Registrar venda · ${moeda(resumo.receita)}`}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="premium-card overflow-hidden">
        <div className="border-b border-slate-200 p-4 sm:p-5 dark:border-white/10">
          <h2 className="font-bold text-slate-950 dark:text-white">Histórico de vendas</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Serviços e produtos permanecem separados para preservar receita, custo e margem.</p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-white/10">
          {vendas.length > 0 ? vendas.map((venda) => <VendaRow key={venda.id} venda={venda} />) : (
            <div className="p-8 text-center text-sm text-slate-500">Nenhuma venda registrada ainda.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function ResumoCard({ icon: Icon, label, valor, detalhe }: { icon: typeof ReceiptText; label: string; valor: string; detalhe: string }) {
  return <div className="premium-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-xl font-black text-slate-950 dark:text-white">{valor}</p><p className="mt-1 text-[11px] text-slate-400">{detalhe}</p></div><Icon className="size-5 text-violet-500" /></div></div>;
}

function ValorCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{moeda(value)}</p></div>;
}

function VendaRow({ venda }: { venda: VendaHistoricoItem }) {
  const margem = venda.valorTotal - venda.custoTotal;
  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-slate-950 dark:text-white">Venda #{venda.id} · {venda.cliente?.nome || "Cliente não vinculada"}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${venda.statusPagamento.toLowerCase() === "pago" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{venda.statusPagamento}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{dataHora(venda.data)} · {venda.origem} · {venda.formaPagamento || "Pagamento não informado"}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {venda.itens.map((item) => <span key={item.id}>{item.quantidade}x {item.descricao} · {moeda(item.valorTotal)}</span>)}
          </div>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-lg font-black text-slate-950 dark:text-white">{moeda(venda.valorTotal)}</p>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">Margem direta {moeda(margem)}</p>
          <p className="text-[10px] text-slate-400">Custo {moeda(venda.custoTotal)}</p>
        </div>
      </div>
    </div>
  );
}
