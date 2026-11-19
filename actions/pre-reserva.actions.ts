"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PRE_RESERVA_CONFIRMADA, PRE_RESERVA_PENDENTE } from "@/lib/pre-reserva";

/**
 * A cliente confirmou a pre-reserva: vira agendamento normal (a confirmacao
 * da vespera continua como sempre). Liberar o horario usa o "Desmarcou".
 */
export async function confirmarPreReserva(agendamentoId: number) {
  const usuario = await requirePermission("agenda.gerenciar");
  const id = Number(agendamentoId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Agendamento inválido.");

  const atualizado = await prisma.agendamento.updateMany({
    where: { id, preReserva: PRE_RESERVA_PENDENTE },
    data: { preReserva: PRE_RESERVA_CONFIRMADA },
  });

  if (atualizado.count > 0) {
    await prisma.auditoria.create({
      data: {
        modulo: "Agenda",
        acao: "Pré-reserva confirmada",
        entidade: "Agendamento",
        entidadeId: String(id),
        usuario: usuario.email,
        detalhes: "A cliente confirmou o horário pré-reservado.",
      },
    });
  }

  revalidatePath("/agenda");
  revalidatePath("/");
  return { ok: true as const };
}
