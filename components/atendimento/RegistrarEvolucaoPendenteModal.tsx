/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useTransition } from "react";
import { Activity, AlertCircle, CheckCircle2, X } from "lucide-react";

import { registrarEvolucaoPendente } from "@/actions/agendamento.actions";

export type EvolucaoPendenteItem = {
  id: number;
  clienteId: number;
  cliente: string;
  procedimento: string;
  profissional: string | null;
  data: string;
  pendenteDesde: string;
};

type Props = {
  open: boolean;
  item: EvolucaoPendenteItem | null;
  temProxima?: boolean;
  onClose: () => void;
  onSaved: (agendamentoId: number) => void;
};

function formatarDataHora(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default function RegistrarEvolucaoPendenteModal({
  open,
  item,
  temProxima = false,
  onClose,
  onSaved,
}: Props) {
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDescricao("");
    setErro(null);
  }, [open, item?.id]);

  if (!open || !item) return null;

  function salvar() {
    if (!item) return;

    const itemAtual = item;
    const texto = descricao.trim();

    if (!texto) {
      setErro("Informe a evolução clínica antes de salvar.");
      return;
    }

    setErro(null);

    startTransition(async () => {
      try {
        await registrarEvolucaoPendente({
          agendamentoId: itemAtual.id,
          descricao: texto,
        });
        onSaved(itemAtual.id);
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível registrar a evolução.",
        );
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[150] h-[100dvh] overflow-hidden">
      <button
        type="button"
        aria-label="Fechar evolução pendente"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
      />

      <div className="absolute inset-0 flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-slate-50 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-[620px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:border-slate-200">
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Activity size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                  Evolução pendente
                </p>
                <h2 className="truncate text-base font-bold text-slate-950">
                  {item.cliente}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              aria-label="Fechar"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-4">
            {erro ? (
              <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <p>{erro}</p>
              </div>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Procedimento
                  </dt>
                  <dd className="mt-1 font-bold text-slate-900">{item.procedimento}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Profissional
                  </dt>
                  <dd className="mt-1 font-bold text-slate-900">
                    {item.profissional || "Equipe Studio Realçar"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Atendimento
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-700">
                    {formatarDataHora(item.data)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Pendente desde
                  </dt>
                  <dd className="mt-1 font-semibold text-amber-700">
                    {formatarDataHora(item.pendenteDesde)}
                  </dd>
                </div>
              </dl>
            </section>

            <label className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="mb-2 block text-xs font-bold text-slate-900">
                Evolução clínica
              </span>
              <textarea
                autoFocus
                value={descricao}
                onChange={(event) => {
                  setDescricao(event.target.value);
                  setErro(null);
                }}
                placeholder="Descreva a resposta da cliente, o procedimento realizado, produtos utilizados, intercorrências e orientações fornecidas."
                className="premium-input min-h-44 w-full resize-y py-3"
              />
            </label>
          </div>
        </main>

        <footer className="shrink-0 border-t border-slate-200 bg-white p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:px-5">
          <button
            type="button"
            onClick={salvar}
            disabled={isPending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 size={17} />
            {isPending
              ? "Salvando evolução..."
              : temProxima
                ? "Salvar e abrir próxima"
                : "Salvar evolução"}
          </button>
        </footer>
      </div>
    </div>
  );
}
