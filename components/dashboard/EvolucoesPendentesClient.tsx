"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";

import RegistrarEvolucaoPendenteModal, {
  type EvolucaoPendenteItem,
} from "@/components/atendimento/RegistrarEvolucaoPendenteModal";

type Props = {
  itens: EvolucaoPendenteItem[];
  podeRegistrar: boolean;
};

function tempoPendente(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const horas = Math.floor(diff / (60 * 60 * 1000));
  if (horas < 1) return "há menos de 1 hora";
  if (horas < 24) return `há ${horas} hora${horas === 1 ? "" : "s"}`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} dia${dias === 1 ? "" : "s"}`;
}

export default function EvolucoesPendentesClient({ itens, podeRegistrar }: Props) {
  const [resolvidos, setResolvidos] = useState<number[]>([]);
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);

  const pendentes = useMemo(
    () => itens.filter((item) => !resolvidos.includes(item.id)),
    [itens, resolvidos],
  );
  const selecionado = pendentes.find((item) => item.id === selecionadoId) || null;

  function concluir(id: number) {
    const indice = pendentes.findIndex((item) => item.id === id);
    const proximo = pendentes[indice + 1] || pendentes[0];

    setResolvidos((atuais) => [...atuais, id]);

    if (proximo && proximo.id !== id) {
      setSelecionadoId(proximo.id);
    } else {
      setSelecionadoId(null);
    }
  }

  if (pendentes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-center">
        <CheckCircle2 className="mx-auto size-6 text-emerald-600" />
        <p className="mt-2 text-sm font-semibold text-emerald-900">
          Nenhuma evolução pendente.
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          Os atendimentos finalizados estão com os registros clínicos em dia.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2.5">
        {pendentes.map((item) => (
          <div key={item.id} className="rounded-2xl border border-amber-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{item.cliente}</p>
                <p className="mt-0.5 truncate text-sm text-slate-500">{item.procedimento}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                  <span className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700">
                    {tempoPendente(item.pendenteDesde)}
                  </span>
                  {item.profissional ? (
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">
                      {item.profissional}
                    </span>
                  ) : null}
                </div>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                <AlertTriangle size={12} /> Pendente
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelecionadoId(item.id)}
              disabled={!podeRegistrar}
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              <Activity className="size-4" />
              {podeRegistrar ? "Registrar evolução" : "Sem permissão clínica"}
            </button>
          </div>
        ))}
      </div>

      <RegistrarEvolucaoPendenteModal
        open={Boolean(selecionado)}
        item={selecionado}
        temProxima={pendentes.length > 1}
        onClose={() => setSelecionadoId(null)}
        onSaved={concluir}
      />
    </>
  );
}
