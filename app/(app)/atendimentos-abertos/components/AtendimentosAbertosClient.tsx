"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarX, CheckCircle2, Search } from "lucide-react";

type AtendimentoAberto = {
  id: number;
  clienteId: number;
  cliente: string;
  procedimento: string;
  profissional: string | null;
  data: string;
  status: string;
  valor: number;
};

type Props = {
  itens: AtendimentoAberto[];
};

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatarDataHora(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function diasParado(value: string) {
  const dias = Math.floor(
    (Date.now() - new Date(value).getTime()) / (24 * 60 * 60 * 1000),
  );

  if (dias <= 0) return "hoje";
  if (dias === 1) return "1 dia";
  if (dias < 30) return `${dias} dias`;
  const meses = Math.floor(dias / 30);
  return `${meses} ${meses === 1 ? "mês" : "meses"}`;
}

export default function AtendimentosAbertosClient({ itens }: Props) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    if (!termo) return itens;

    return itens.filter(
      (item) =>
        normalizarBusca(item.cliente).includes(termo) ||
        normalizarBusca(item.procedimento).includes(termo) ||
        normalizarBusca(item.profissional || "").includes(termo),
    );
  }, [itens, busca]);

  const valorParado = itens.reduce((total, item) => total + item.valor, 0);

  return (
    <div className="app-mobile-safe space-y-4 pb-6 sm:space-y-6 sm:pb-0">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.10),transparent_36%)]" />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/15 dark:text-rose-200">
              <CalendarX size={14} />
              Pendências da agenda
            </div>

            <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Atendimentos em aberto
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Horários que já passaram e continuam sem desfecho. Cada um
              precisa de uma decisão: finalizar (se foi atendido) ou marcar
              como falta/cancelado. Enquanto ficarem assim, não geram venda,
              não entram no faturamento e não pedem evolução clínica.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {itens.length}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                em aberto
              </p>
            </div>

            {valorParado > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-center dark:border-amber-400/20 dark:bg-amber-500/10">
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {valorParado.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-300">
                  não lançados
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {itens.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-8 text-center dark:border-emerald-400/20 dark:bg-emerald-500/10">
          <CheckCircle2 className="mx-auto size-7 text-emerald-600 dark:text-emerald-300" />
          <p className="mt-3 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            Nenhum atendimento em aberto.
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            Toda a agenda passada está com desfecho registrado.
          </p>
        </div>
      ) : (
        <>
          <label className="relative block min-w-0">
            <span className="sr-only">Buscar</span>

            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por cliente, procedimento ou profissional"
              className="premium-input w-full pl-11"
            />
          </label>

          {filtrados.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-white/10">
              Nenhum resultado para essa busca.
            </p>
          ) : (
            <div className="space-y-2.5">
              {filtrados.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm dark:border-rose-400/25 dark:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-white">
                        {item.cliente}
                      </p>

                      <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                        {item.procedimento} · {formatarDataHora(item.data)}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                        <span className="rounded-lg bg-rose-50 px-2 py-1 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                          parado há {diasParado(item.data)}
                        </span>

                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                          {item.status}
                        </span>

                        {item.profissional ? (
                          <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                            {item.profissional}
                          </span>
                        ) : null}

                        {item.valor > 0 ? (
                          <span className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                            {item.valor.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                      <AlertTriangle size={12} /> Sem desfecho
                    </span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <a
                      href={`/agenda?data=${item.data.slice(0, 10)}&agendamento=${item.id}`}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-700"
                    >
                      Abrir na agenda
                    </a>

                    <a
                      href={`/clientes/${item.clienteId}`}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                    >
                      Ver ficha
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
