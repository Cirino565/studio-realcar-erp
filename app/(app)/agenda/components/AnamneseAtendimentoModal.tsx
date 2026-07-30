"use client";

import { ClipboardList, X } from "lucide-react";

type Props = {
  open: boolean;
  clienteId: number;
  clienteNome: string;
  procedimento: string;
  onClose: () => void;
};

export default function AnamneseAtendimentoModal({
  open,
  clienteId,
  clienteNome,
  procedimento,
  onClose,
}: Props) {
  if (!open) return null;

  const params = new URLSearchParams({ procedimento });
  const src = `/anamnese-atendimento/${clienteId}?${params.toString()}`;

  return (
    <div className="fixed inset-0 z-[160] flex h-[100dvh] w-[100vw] min-w-0 flex-col overflow-hidden bg-slate-50 overscroll-none">
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <ClipboardList size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Anamnese do atendimento
            </p>
            <h2 className="truncate text-sm font-bold text-slate-950 sm:text-base">
              {clienteNome}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
          aria-label="Voltar ao atendimento"
        >
          <X size={16} />
          <span className="hidden sm:inline">Voltar ao atendimento</span>
          <span className="sm:hidden">Voltar</span>
        </button>
      </header>

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <iframe
          title={`Anamnese de ${clienteNome}`}
          src={src}
          className="block h-full w-full min-w-0 border-0 bg-slate-50"
        />
      </div>
    </div>
  );
}
