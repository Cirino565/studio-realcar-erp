"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, CheckCircle2, Search } from "lucide-react";

import RegistrarEvolucaoPendenteModal, {
  type EvolucaoPendenteItem,
} from "@/components/atendimento/RegistrarEvolucaoPendenteModal";

type Props = {
  itensIniciais: EvolucaoPendenteItem[];
};

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function tempoPendente(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const horas = Math.floor(diff / (60 * 60 * 1000));
  if (horas < 1) return "há menos de 1 hora";
  if (horas < 24) return `há ${horas} hora${horas === 1 ? "" : "s"}`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `há ${dias} dia${dias === 1 ? "" : "s"}`;
  const meses = Math.floor(dias / 30);
  return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

function formatarDataAtendimento(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

// Depois de 3 dias sem registrar, o atraso vira destaque mais forte -
// ajuda a bater o olho e saber o que já passou do razoável.
function estaAtrasada(pendenteDesde: string) {
  const dias = (Date.now() - new Date(pendenteDesde).getTime()) / (24 * 60 * 60 * 1000);
  return dias >= 3;
}

export default function EvolucoesPendentesPageClient({ itensIniciais }: Props) {
  const router = useRouter();
  const [resolvidos, setResolvidos] = useState<number[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [busca, setBusca] = useState("");

  const pendentes = useMemo(
    () => itensIniciais.filter((item) => !resolvidos.includes(item.id)),
    [itensIniciais, resolvidos],
  );

  const pendentesFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    if (!termo) return pendentes;

    return pendentes.filter(
      (item) =>
        normalizarBusca(item.cliente).includes(termo) ||
        normalizarBusca(item.procedimento).includes(termo) ||
        normalizarBusca(item.profissional || "").includes(termo),
    );
  }, [pendentes, busca]);

  const selecionado =
    pendentesFiltrados.find((item) => item.id === selecionadoId) || null;

  function concluir(id: number) {
    setResolvidos((atuais) => [...atuais, id]);
    setSelecionadoId(null);
    // Atualiza os números do card no Dashboard também, sem precisar
    // trocar de tela.
    router.refresh();
  }

  const totalAtrasadas = pendentes.filter((item) =>
    estaAtrasada(item.pendenteDesde),
  ).length;

  return (
    <div className="app-mobile-safe space-y-4 pb-6 sm:space-y-6 sm:pb-0">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,119,6,0.12),transparent_36%)]" />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-200">
              <Activity size={14} />
              Registro clínico
            </div>

            <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Evoluções pendentes
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Todos os atendimentos finalizados que ainda esperam o registro
              clínico, do mais antigo para o mais recente. Nada sai dessa
              lista até você registrar a evolução.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {pendentes.length}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                no total
              </p>
            </div>

            {totalAtrasadas > 0 ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-center dark:border-rose-400/20 dark:bg-rose-500/10">
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                  {totalAtrasadas}
                </p>
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                  há 3+ dias
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <label className="relative block min-w-0">
        <span className="sr-only">Buscar por cliente, procedimento ou profissional</span>

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

      {pendentesFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-8 text-center dark:border-emerald-400/20 dark:bg-emerald-500/10">
          <CheckCircle2 className="mx-auto size-7 text-emerald-600 dark:text-emerald-300" />
          <p className="mt-3 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
            {busca
              ? "Nenhum resultado para essa busca."
              : "Nenhuma evolução pendente."}
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            {busca
              ? "Tente buscar por outro nome ou procedimento."
              : "Todos os atendimentos finalizados estão com os registros clínicos em dia."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pendentesFiltrados.map((item) => {
            const atrasada = estaAtrasada(item.pendenteDesde);

            return (
              <div
                key={item.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-white/[0.04] ${
                  atrasada
                    ? "border-rose-200 dark:border-rose-400/25"
                    : "border-amber-200 dark:border-amber-400/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                      {item.cliente}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                      {item.procedimento} · {formatarDataAtendimento(item.data)}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                      <span
                        className={`rounded-lg px-2 py-1 ${
                          atrasada
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                        }`}
                      >
                        {tempoPendente(item.pendenteDesde)}
                      </span>

                      {item.profissional ? (
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                          {item.profissional}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      atrasada
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                    }`}
                  >
                    <AlertTriangle size={12} /> Pendente
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelecionadoId(item.id)}
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-700"
                >
                  <Activity className="size-4" />
                  Registrar evolução
                </button>
              </div>
            );
          })}
        </div>
      )}

      <RegistrarEvolucaoPendenteModal
        open={Boolean(selecionado)}
        item={selecionado}
        temProxima={pendentesFiltrados.length > 1}
        onClose={() => setSelecionadoId(null)}
        onSaved={concluir}
      />
    </div>
  );
}
