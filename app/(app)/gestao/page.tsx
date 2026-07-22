import Link from "next/link";
import { CalendarRange, Gauge, SlidersHorizontal } from "lucide-react";

import { requirePagePermission } from "@/lib/auth";
import {
  obterDadosGestao,
  resolverPeriodoGestao,
  type GestaoPeriodoKey,
} from "@/lib/gestao";

import GestaoDashboard from "./components/GestaoDashboard";

type GestaoPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

const filtros: Array<{
  value: Exclude<GestaoPeriodoKey, "personalizado">;
  label: string;
}> = [
  { value: "hoje", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "mes", label: "Este mÃªs" },
  { value: "anterior", label: "MÃªs anterior" },
];

export default async function GestaoPage({ searchParams }: GestaoPageProps) {
  await requirePagePermission("relatorios.visualizar");

  const params = searchParams ? await searchParams : {};
  const periodo = getParam(params, "periodo");
  const inicio = getParam(params, "inicio");
  const fim = getParam(params, "fim");

  const dados = await obterDadosGestao({ periodo, inicio, fim });
  const periodoResolvido = resolverPeriodoGestao({ periodo, inicio, fim });

  return (
    <div className="min-w-0 space-y-5 pb-4">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.10),transparent_30%)]" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
              <Gauge className="size-3.5" />
              InteligÃªncia de GestÃ£o, NÃ­vel 3A
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              GestÃ£o baseada no que realmente aconteceu.
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              Financeiro realizado, agenda, clientes, CRM e comunicaÃ§Ã£o em uma
              leitura executiva. O painel nÃ£o transforma agendamentos futuros em
              receita e nÃ£o atribui resultados sem vÃ­nculo rastreÃ¡vel.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 xl:max-w-sm">
            <div className="flex items-center gap-2">
              <CalendarRange className="size-4 text-violet-600" />
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                PerÃ­odo analisado
              </p>
            </div>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {dados.periodo.label}
            </p>
          </div>
        </div>
      </section>

      <section className="premium-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap gap-2">
            {filtros.map((filtro) => {
              const ativo = dados.periodo.chave === filtro.value;

              return (
                <Link
                  key={filtro.value}
                  href={`/gestao?periodo=${filtro.value}`}
                  className={`inline-flex min-h-9 items-center justify-center rounded-xl px-3 py-2 text-xs font-bold transition ${
                    ativo
                      ? "bg-violet-600 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"
                  }`}
                >
                  {filtro.label}
                </Link>
              );
            })}
          </div>

          <form
            action="/gestao"
            method="get"
            className="grid gap-2 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-center"
          >
            <input type="hidden" name="periodo" value="personalizado" />
            <div className="hidden items-center gap-2 pr-1 text-xs font-bold text-slate-500 sm:flex">
              <SlidersHorizontal className="size-4" />
              Personalizar
            </div>
            <input
              type="date"
              name="inicio"
              aria-label="Data inicial"
              defaultValue={
                dados.periodo.chave === "personalizado"
                  ? dados.periodo.inicioISO
                  : periodoResolvido.inicioISO
              }
              className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
            />
            <input
              type="date"
              name="fim"
              aria-label="Data final"
              defaultValue={
                dados.periodo.chave === "personalizado"
                  ? dados.periodo.fimISO
                  : periodoResolvido.fimInclusivoISO
              }
              className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
            />
            <button
              type="submit"
              className="min-h-10 rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
            >
              Aplicar
            </button>
          </form>
        </div>
      </section>

      <GestaoDashboard data={dados} />
    </div>
  );
}

