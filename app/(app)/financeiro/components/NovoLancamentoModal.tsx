"use client";

import { useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";

import { criarLancamento } from "@/actions/lancamento.actions";
import { Button } from "@/components/ui/button";
import type { CampanhaFinanceiroOption, ContaFinanceiraData, FormaPagamentoConfigData } from "../types";

type Props = {
  open: boolean;
  contas: ContaFinanceiraData[];
  formasPagamento: FormaPagamentoConfigData[];
  campanhas: CampanhaFinanceiroOption[];
  onClose: () => void;
  onSaved: () => void;
};

const categoriasEntrada = ["Procedimentos", "Pacotes", "Produtos", "Avaliação", "Outros recebimentos"];
const categoriasSaida = ["Produtos e insumos", "Aluguel", "Marketing", "Equipamentos", "Salários", "Impostos", "Outras despesas"];

function hoje() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export default function NovoLancamentoModal({ open, contas, formasPagamento, campanhas, onClose, onSaved }: Props) {
  const principal = contas.find((item) => item.principal);
  const pix = formasPagamento.find((item) => item.nome === "Pix") || formasPagamento[0];
  const [isPending, startTransition] = useTransition();
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [categoria, setCategoria] = useState(categoriasEntrada[0]);
  const [data, setData] = useState(hoje());
  const [observacoes, setObservacoes] = useState("");
  const [formaId, setFormaId] = useState(pix ? String(pix.id) : "");
  const [contaId, setContaId] = useState(principal ? String(principal.id) : "");
  const [campanhaId, setCampanhaId] = useState("");
  const [erro, setErro] = useState("");

  const forma = useMemo(() => formasPagamento.find((item) => String(item.id) === formaId), [formaId, formasPagamento]);
  const valorNumero = Number(valor.replace(",", ".")) || 0;
  const taxaPrevista = tipo === "ENTRADA" && forma ? Math.min(valorNumero, valorNumero * forma.taxaPercentual / 100 + forma.taxaFixa) : 0;

  if (!open) return null;

  const categorias = tipo === "ENTRADA" ? categoriasEntrada : categoriasSaida;

  function trocarTipo(value: "ENTRADA" | "SAIDA") {
    setTipo(value);
    setCategoria(value === "ENTRADA" ? categoriasEntrada[0] : categoriasSaida[0]);
  }

  function salvar() {
    if (!descricao.trim() || valorNumero <= 0 || !data) {
      setErro("Preencha descrição, valor e data.");
      return;
    }
    setErro("");
    startTransition(async () => {
      try {
        await criarLancamento({
          descricao: descricao.trim(),
          valor: valorNumero,
          tipo,
          categoria,
          observacoes: observacoes.trim(),
          data,
          formaPagamento: tipo === "ENTRADA" ? forma?.nome : undefined,
          formaPagamentoConfigId: tipo === "ENTRADA" && forma ? forma.id : null,
          contaFinanceiraId: contaId ? Number(contaId) : null,
          campanhaId: campanhaId ? Number(campanhaId) : null,
        });
        setDescricao(""); setValor(""); setObservacoes(""); setCampanhaId("");
        onSaved(); onClose();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">Financeiro</p><h2 className="mt-2 text-2xl font-semibold text-white">Novo lançamento</h2></div><button type="button" onClick={onClose} className="rounded-xl border border-white/10 p-2 text-slate-300"><X className="size-4" /></button></div>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm text-slate-300">Descrição<input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="premium-input" /></label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2 text-sm text-slate-300">Valor<input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" className="premium-input" /></label>
            <label className="grid gap-2 text-sm text-slate-300">Data<input type="date" value={data} onChange={(e) => setData(e.target.value)} className="premium-input" /></label>
            <label className="grid gap-2 text-sm text-slate-300">Tipo<select value={tipo} onChange={(e) => trocarTipo(e.target.value as "ENTRADA" | "SAIDA")} className="premium-input bg-slate-900"><option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option></select></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-slate-300">Categoria<select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="premium-input bg-slate-900">{categorias.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="grid gap-2 text-sm text-slate-300">Conta<select value={contaId} onChange={(e) => setContaId(e.target.value)} className="premium-input bg-slate-900"><option value="">Sem conta</option>{contas.map((item) => <option key={item.id} value={item.id}>{item.nome}{item.principal ? " · principal" : ""}</option>)}</select></label>
          </div>
          {tipo === "ENTRADA" ? <label className="grid gap-2 text-sm text-slate-300">Forma de pagamento<select value={formaId} onChange={(e) => setFormaId(e.target.value)} className="premium-input bg-slate-900"><option value="">Não informada</option>{formasPagamento.filter((item) => item.status === "Ativa").map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select>{forma && valorNumero > 0 ? <span className="text-xs text-cyan-200">Taxa prevista: R$ {taxaPrevista.toFixed(2).replace(".", ",")} · líquido R$ {(valorNumero - taxaPrevista).toFixed(2).replace(".", ",")}</span> : null}</label> : null}
          <label className="grid gap-2 text-sm text-slate-300">Campanha relacionada<select value={campanhaId} onChange={(e) => setCampanhaId(e.target.value)} className="premium-input bg-slate-900"><option value="">Sem campanha</option>{campanhas.map((item) => <option key={item.id} value={item.id}>{item.nome} · {item.canal}</option>)}</select></label>
          <label className="grid gap-2 text-sm text-slate-300">Observações<textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="premium-input min-h-24" /></label>
          {erro ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{erro}</div> : null}
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="button" onClick={salvar} disabled={isPending}>{isPending ? "Salvando..." : "Salvar lançamento"}</Button></div>
        </div>
      </div>
    </div>
  );
}
