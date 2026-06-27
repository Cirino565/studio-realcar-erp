"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";

import { criarLancamento } from "@/actions/lancamento.actions";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const categoriasEntrada = [
  "Procedimentos",
  "Pacotes",
  "Produtos",
  "Avaliação",
  "Outros recebimentos",
];

const categoriasSaida = [
  "Produtos e insumos",
  "Aluguel",
  "Marketing",
  "Equipamentos",
  "Salários",
  "Impostos",
  "Outras despesas",
];

function getTodayInputValue() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 10);
}

export default function NovoLancamentoModal({
  open,
  onClose,
  onSaved,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [categoria, setCategoria] = useState(categoriasEntrada[0]);
  const [data, setData] = useState(getTodayInputValue());
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState("");

  if (!open) return null;

  const categorias = tipo === "ENTRADA" ? categoriasEntrada : categoriasSaida;

  function resetarFormulario() {
    setDescricao("");
    setValor("");
    setTipo("ENTRADA");
    setCategoria(categoriasEntrada[0]);
    setData(getTodayInputValue());
    setObservacoes("");
    setErro("");
  }

  function handleTipoChange(value: "ENTRADA" | "SAIDA") {
    setTipo(value);
    setCategoria(value === "ENTRADA" ? categoriasEntrada[0] : categoriasSaida[0]);
  }

  function salvar() {
    const valorNumerico = Number(valor.replace(",", "."));

    if (!descricao.trim()) {
      setErro("Informe a descrição do lançamento.");
      return;
    }

    if (!valorNumerico || valorNumerico <= 0) {
      setErro("Informe um valor válido maior que zero.");
      return;
    }

    if (!data) {
      setErro("Informe a data do lançamento.");
      return;
    }

    setErro("");

    startTransition(async () => {
      await criarLancamento({
        descricao: descricao.trim(),
        valor: valorNumerico,
        tipo,
        categoria,
        observacoes: observacoes.trim(),
        data,
      });

      resetarFormulario();
      onSaved();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/[0.10] bg-slate-950 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">
              Financeiro
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Novo lançamento
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Registre entradas e saídas para manter o caixa atualizado.
            </p>
          </div>

          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="grid gap-5 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-300">Descrição</span>
              <input
                value={descricao}
                onChange={(event) => setDescricao(event.target.value)}
                placeholder="Ex: Pagamento de limpeza de pele"
                className="h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Valor</span>
              <input
                value={valor}
                onChange={(event) => setValor(event.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                className="h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Data</span>
              <input
                type="date"
                value={data}
                onChange={(event) => setData(event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white outline-none transition focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Tipo</span>
              <select
                value={tipo}
                onChange={(event) =>
                  handleTipoChange(event.target.value as "ENTRADA" | "SAIDA")
                }
                className="h-11 w-full rounded-2xl border border-white/[0.08] bg-slate-900 px-4 text-sm text-white outline-none transition focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
              >
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Categoria</span>
              <select
                value={categoria}
                onChange={(event) => setCategoria(event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/[0.08] bg-slate-900 px-4 text-sm text-white outline-none transition focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
              >
                {categorias.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-300">Observações</span>
            <textarea
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              placeholder="Detalhes opcionais sobre este lançamento"
              className="h-28 w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
            />
          </label>

          {erro ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {erro}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/[0.08] px-6 py-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={salvar} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar lançamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}
