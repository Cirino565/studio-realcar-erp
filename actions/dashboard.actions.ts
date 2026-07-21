"use server";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function confirmarAgendamentoCentral(agendamentoId: number) {
  await requirePermission("agenda.gerenciar");

  if (!Number.isInteger(agendamentoId) || agendamentoId <= 0) {
    throw new Error("Agendamento inválido.");
  }

  const agendamento = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: {
      cliente: {
        select: {
          nome: true,
        },
      },
    },
  });

  if (!agendamento) {
    throw new Error("Agendamento não encontrado.");
  }

  if (agendamento.status === "Cancelado") {
    throw new Error("Não é possível confirmar um agendamento cancelado.");
  }

  if (["Atendido", "Em atendimento"].includes(agendamento.status)) {
    throw new Error("Este atendimento já foi iniciado ou finalizado.");
  }

  if (agendamento.status !== "Confirmado") {
    await prisma.$transaction(async (tx) => {
      await tx.agendamento.update({
        where: { id: agendamentoId },
        data: { status: "Confirmado" },
      });

      await tx.auditoria.create({
        data: {
          modulo: "Agenda",
          acao: "Confirmou presença pela Central do Dia",
          entidade: "Agendamento",
          entidadeId: String(agendamentoId),
          usuario: "Equipe Studio Realçar",
          detalhes: `${agendamento.cliente.nome} confirmado para ${agendamento.procedimento}.`,
        },
      });
    });
  }

  revalidatePath("/");
  revalidatePath("/agenda");

  return { success: true };
}
