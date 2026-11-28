import type { MesComparado } from "@/lib/comparar-meses";

import { MESES_CURTOS, reais } from "./numeros";

/** Barras simples (sem biblioteca): o que entrou e o lucro de cada mes. */
export default function GraficoAno({ meses }: { meses: MesComparado[] }) {
  const ordem = [...meses].reverse(); // do mais antigo para o mais recente
  const maior = Math.max(1, ...ordem.map((mes) => Math.max(mes.numeros.entrou, mes.numeros.lucro)));
  const completos = meses.filter((mes) => !mes.emAndamento);
  const totalEntrou = completos.reduce((total, mes) => total + mes.numeros.entrou, 0);
  const totalLucro = completos.reduce((total, mes) => total + mes.numeros.lucro, 0);
  const comMovimento = completos.filter((mes) => mes.numeros.entrou > 0);
  const media = comMovimento.length > 0 ? totalEntrou / comMovimento.length : 0;
  const mediaLucro = comMovimento.length > 0 ? totalLucro / comMovimento.length : 0;
  const melhor = comMovimento.reduce<MesComparado | null>(
    (atual, mes) => (!atual || mes.numeros.entrou > atual.numeros.entrou ? mes : atual),
    null,
  );

  return (
    <section className="premium-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-950">Últimos 12 meses</h2>
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-violet-500" />Entrou</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-emerald-500" />Lucro</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-end gap-1 sm:gap-2" style={{ height: 170 }}>
          {ordem.map((mes) => {
            const alturaEntrou = (Math.max(0, mes.numeros.entrou) / maior) * 140;
            const alturaLucro = (Math.max(0, mes.numeros.lucro) / maior) * 140;
            return (
              <div key={mes.chave} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div className="flex h-[140px] items-end gap-0.5">
                  <div
                    title={`${mes.nome}: entrou ${reais(mes.numeros.entrou)}`}
                    className={`w-2 rounded-t sm:w-4 ${mes.emAndamento ? "bg-violet-300" : "bg-violet-500"}`}
                    style={{ height: Math.max(2, alturaEntrou) }}
                  />
                  <div
                    title={`${mes.nome}: lucro ${reais(mes.numeros.lucro)}`}
                    className={`w-2 rounded-t sm:w-4 ${mes.numeros.lucro < 0 ? "bg-rose-500" : mes.emAndamento ? "bg-emerald-300" : "bg-emerald-500"}`}
                    style={{ height: Math.max(2, alturaLucro) }}
                  />
                </div>
                <span className={`text-[10px] font-semibold sm:text-[11px] ${mes.emAndamento ? "text-violet-700" : "text-slate-500"}`}>
                  {MESES_CURTOS[Number(mes.chave.slice(5)) - 1]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Barras mais claras: mês atual, ainda em andamento.</p>

      {comMovimento.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Média por mês</p>
            <p className="text-lg font-black text-slate-900">{reais(media)}</p>
            <p className="text-xs text-slate-500">lucro médio {reais(mediaLucro)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Total dos {completos.length} meses fechados
            </p>
            <p className="text-lg font-black text-slate-900">{reais(totalEntrou)}</p>
            <p className="text-xs text-slate-500">lucro {reais(totalLucro)}</p>
          </div>
          {melhor ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Melhor mês</p>
              <p className="text-lg font-black text-emerald-900">
                {melhor.nome} {melhor.ano}
              </p>
              <p className="text-xs text-emerald-800">entrou {reais(melhor.numeros.entrou)}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
