"use client";

import { useState, useTransition } from "react";
import type { Agendamento } from "@prisma/client";
import { finalizarAtendimento } from "@/actions/agendamento.actions";

type Props = {
  open: boolean;
  onClose: () => void;
  appointment: Agendamento | null;
};

export default function FinalizarAtendimentoModal({
  open,
  onClose,
  appointment,
}: Props) {
  const [procedimentoRealizado, setProcedimentoRealizado] = useState("");
  const [valor, setValor] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleFinalizar() {
    // 🔥 FIX DEFINITIVO DE NULL SAFETY
    if (!appointment) return;

    startTransition(async () => {
      await finalizarAtendimento({
        agendamentoId: appointment.id,
        procedimentoRealizado: procedimentoRealizado.trim(),
        profissional: undefined,
        valorCobrado: valor,
        formaPagamento: "DINHEIRO",
        statusPagamento: "PAGO",
        evolucao: "",
      });

      setProcedimentoRealizado("");
      setValor(0);
      onClose();
    });
  }

  if (!open || !appointment) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-900 p-6 rounded-xl w-[420px] space-y-4">

        <h2 className="text-white text-lg font-semibold">
          Finalizar Atendimento
        </h2>

        <textarea
          value={procedimentoRealizado}
          onChange={(e) => setProcedimentoRealizado(e.target.value)}
          placeholder="Procedimento realizado..."
          className="w-full p-2 rounded bg-zinc-800 text-white"
        />

        <input
          type="number"
          value={valor}
          onChange={(e) => setValor(Number(e.target.value))}
          placeholder="Valor cobrado"
          className="w-full p-2 rounded bg-zinc-800 text-white"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-700 rounded"
          >
            Cancelar
          </button>

          <button
            onClick={handleFinalizar}
            disabled={isPending}
            className="px-4 py-2 bg-green-600 rounded"
          >
            Finalizar
          </button>
        </div>

      </div>
    </div>
  );
}