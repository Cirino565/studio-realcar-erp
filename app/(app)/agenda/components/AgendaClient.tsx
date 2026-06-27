"use client";

import { useState } from "react";
import type { Agendamento } from "@prisma/client";

import FinalizarAtendimentoModal from "./FinalizarAtendimentoModal";

type Props = {
  agendamentos: Agendamento[];
};

export default function AgendaClient({ agendamentos }: Props) {
  // 🔥 CORREÇÃO PRINCIPAL: usar tipo Prisma correto
  const [finishAppointment, setFinishAppointment] =
    useState<Agendamento | null>(null);

  return (
    <div className="space-y-4">

      {/* LISTA DE AGENDAMENTOS */}
      {agendamentos.map((agendamento) => (
        <div
          key={agendamento.id}
          className="p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between"
        >
          <div>
            <p className="text-white font-medium">
              {agendamento.procedimento}
            </p>

            <p className="text-xs text-slate-400">
              {new Date(agendamento.data).toLocaleString()}
            </p>
          </div>

          <button
            onClick={() => setFinishAppointment(agendamento)}
            className="px-3 py-1 bg-green-600 rounded text-white"
          >
            Finalizar
          </button>
        </div>
      ))}

      {/* MODAL */}
      <FinalizarAtendimentoModal
        open={Boolean(finishAppointment)}
        appointment={finishAppointment}
        onClose={() => setFinishAppointment(null)}
      />

    </div>
  );
}