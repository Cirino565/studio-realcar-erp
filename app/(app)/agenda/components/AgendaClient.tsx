"use client";

import { useState } from "react";
import type { Agendamento, Cliente } from "@prisma/client";

import FinalizarAtendimentoModal from "./FinalizarAtendimentoModal";

type Props = {
  clientes: Cliente[];
  agendamentos: (Agendamento & {
    cliente: Cliente;
  })[];
  profissionais: any[];
  origensCliente: any[];
  servicos: any[]; // 🔥 FIX FINAL AQUI
};

export default function AgendaClient({
  clientes,
  agendamentos,
  profissionais,
  origensCliente,
  servicos,
}: Props) {
  const [finishAppointment, setFinishAppointment] =
    useState<Agendamento | null>(null);

  return (
    <div className="space-y-4 lg:space-y-8">

      {/* 🔥 LISTA DE AGENDAMENTOS */}
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

            <p className="text-xs text-slate-500">
              Cliente: {agendamento.cliente?.nome}
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

      {/* 🔥 MODAL */}
      <FinalizarAtendimentoModal
        open={Boolean(finishAppointment)}
        appointment={finishAppointment}
        onClose={() => setFinishAppointment(null)}
      />

    </div>
  );
}