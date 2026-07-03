"use client";

import { useState, useTransition } from "react";
import { finalizarAtendimento } from "@/actions/agendamento.actions";

type AppointmentForFinish = {
  id: number;
  procedimento?: string;
  valor?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentForFinish | null;
};

export default function FinalizarAtendimentoModal({
  open,
  onClose,
  appointment,
}: Props) {
  const [procedimentoRealizado, setProcedimentoRealizado] = useState("");
  const [evolucao, setEvolucao] = useState("");
  const [valor, setValor] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleFinalizar() {
    if (!appointment) return;

    const procedimento = procedimentoRealizado.trim() || appointment.procedimento || "Atendimento";
    const evolucaoClinica = evolucao.trim();

    if (!evolucaoClinica) {
      alert("Informe a evolução/observação clínica do atendimento.");
      return;
    }

    startTransition(async () => {
      try {
        await finalizarAtendimento({
          agendamentoId: appointment.id,
          procedimentoRealizado: procedimento,
          profissional: undefined,
          valorCobrado: valor || appointment.valor || 0,
          formaPagamento: "DINHEIRO",
          statusPagamento: "PAGO",
          evolucao: evolucaoClinica,
        });

        setProcedimentoRealizado("");
        setEvolucao("");
        setValor(0);
        onClose();
        window.location.reload();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Não foi possível finalizar o atendimento.");
      }
    });
  }

  if (!open || !appointment) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[460px] rounded-2xl border border-white/[0.10] bg-zinc-900 p-6 shadow-2xl shadow-black/40">
        <h2 className="text-lg font-semibold text-white">
          Finalizar atendimento
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Registre o procedimento realizado, valor cobrado e evolução clínica do atendimento.
        </p>

        <div className="mt-5 space-y-4">
          <label className="space-y-2 block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Procedimento realizado
            </span>
            <textarea
              value={procedimentoRealizado}
              onChange={(event) => setProcedimentoRealizado(event.target.value)}
              placeholder={appointment.procedimento || "Procedimento realizado"}
              className="premium-input min-h-24 w-full resize-none py-3 text-white"
            />
          </label>

          <label className="space-y-2 block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Evolução / observação clínica
            </span>
            <textarea
              value={evolucao}
              onChange={(event) => setEvolucao(event.target.value)}
              placeholder="Descreva como foi o atendimento, resposta da cliente, recomendações ou observações clínicas."
              className="premium-input min-h-28 w-full resize-none py-3 text-white"
            />
          </label>

          <label className="space-y-2 block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Valor cobrado
            </span>
            <input
              type="number"
              value={valor}
              onChange={(event) => setValor(Number(event.target.value))}
              placeholder="Valor cobrado"
              className="premium-input w-full text-white"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.08]"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleFinalizar}
            disabled={isPending}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Finalizando..." : "Finalizar"}
          </button>
        </div>
      </div>
    </div>
  );
}
