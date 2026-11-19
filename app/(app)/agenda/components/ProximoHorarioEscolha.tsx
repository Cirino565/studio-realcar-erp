"use client";

import { CalendarPlus, RotateCcw, X } from "lucide-react";

export type TipoProximoHorario = "procedimento" | "retorno";

/**
 * As duas opcoes de "proximo horario", grandes para tocar no celular:
 * novo procedimento (pago) ou retorno sem custo (revisao do que foi feito).
 */
export function ProximoHorarioOpcoes({
  procedimento,
  onEscolher,
}: {
  procedimento?: string;
  onEscolher: (tipo: TipoProximoHorario) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onEscolher("procedimento")}
        className="flex min-h-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-xl bg-violet-600 px-2 py-2 text-center text-white shadow-sm hover:bg-violet-700"
      >
        <span className="inline-flex items-center gap-1.5 text-sm font-bold">
          <CalendarPlus size={16} /> Procedimento
        </span>
        <span className="text-[11px] leading-4 text-violet-100">
          pago{procedimento ? ` · ${procedimento}` : ""}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onEscolher("retorno")}
        className="flex min-h-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-xl border border-cyan-300 bg-cyan-50 px-2 py-2 text-center text-cyan-800 hover:bg-cyan-100"
      >
        <span className="inline-flex items-center gap-1.5 text-sm font-bold">
          <RotateCcw size={16} /> Retorno
        </span>
        <span className="text-[11px] leading-4 text-cyan-700">sem custo · só revisão</span>
      </button>
    </div>
  );
}

/** Janela pequena (de baixo, no celular) com as duas opcoes. */
export default function ProximoHorarioEscolha({
  clienteNome,
  procedimento,
  onEscolher,
  onClose,
}: {
  clienteNome: string;
  procedimento?: string;
  onEscolher: (tipo: TipoProximoHorario) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[125] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0" />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900">Próximo horário</p>
            <p className="truncate text-sm text-slate-600">O que {clienteNome.split(/\s+/)[0]} vai fazer?</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X size={17} />
          </button>
        </div>
        <ProximoHorarioOpcoes procedimento={procedimento} onEscolher={onEscolher} />
      </div>
    </div>
  );
}
