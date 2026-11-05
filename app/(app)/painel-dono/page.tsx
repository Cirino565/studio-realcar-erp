import Link from "next/link";
import { CalendarRange, SlidersHorizontal } from "lucide-react";

import { requirePagePermission } from "@/lib/auth";
import { obterPainelDono, type PeriodoPainel } from "@/lib/painel-dono";

import PainelDonoClient from "./components/PainelDonoClient";

type PainelDonoPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function lerParametro(params: Record<string, string | string[] | undefined>, chave: string) {
  const valor = params[chave];
  return Array.isArray(valor) ? valor[0] : valor;
}

const FILTROS: Array<{ valor: Exclude<PeriodoPainel, "personalizado">; rotulo: string }> = [
  { valor: "mes", rotulo: "Este mês" },
  { valor: "anterior", rotulo: "Mês passado" },
  { valor: "30d", rotulo: "Últimos 30 dias" },
];

export const dynamic = "force-dynamic";

export default async function PainelDonoPage({ searchParams }: PainelDonoPageProps) {
  await requirePagePermission("relatorios.visualizar");

  const params = searchParams ? await searchParams : {};
  const dados = await obterPainelDono({
    periodo: lerParametro(params, "periodo"),
    inicio: lerParametro(params, "inicio"),
    fim: lerParametro(params, "fim"),
  });

  return (
    <div className="min-w-0 space-y-5 pb-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Painel do Dono</h1>
            <p className="mt-1 text-sm text-slate-500">
              Quanto entrou, quanto saiu, quanto sobrou, os clientes e os anúncios. Clique em qualquer valor para ver de onde ele veio.
            </p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
              <CalendarRange className="size-3.5" />
              {dados.periodo.label}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {FILTROS.map((filtro) => (
                <Link
                  key={filtro.valor}
                  href={`/painel-dono?periodo=${filtro.valor}`}
                  className={`inline-flex min-h-9 items-center rounded-xl px-3 py-2 text-xs font-bold transition ${
                    dados.periodo.chave === filtro.valor
                      ? "bg-violet-600 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"
                  }`}
                >
                  {filtro.rotulo}
                </Link>
              ))}
            </div>
            <form action="/painel-dono" method="get" className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="periodo" value="personalizado" />
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${dados.periodo.chave === "personalizado" ? "text-violet-700" : "text-slate-500"}`}>
                <SlidersHorizontal className="size-4" />
                Personalizado
              </span>
              <input
                type="date"
                name="inicio"
                aria-label="Data inicial"
                defaultValue={dados.periodo.inicioISO}
                className="h-9 min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
              />
              <input
                type="date"
                name="fim"
                aria-label="Data final"
                defaultValue={dados.periodo.fimISO}
                className="h-9 min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
              />
              <button
                type="submit"
                className="min-h-9 rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-700 hover:bg-violet-100"
              >
                Aplicar
              </button>
            </form>
          </div>
        </div>
      </section>

      <PainelDonoClient dados={dados} />
    </div>
  );
}
