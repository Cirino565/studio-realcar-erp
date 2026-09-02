import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import AtendimentosAbertosClient from "./components/AtendimentosAbertosClient";

// Status que significam "ainda não resolvido". Um agendamento que já passou
// e continua num destes precisa de uma decisão: foi atendido (e ninguém
// finalizou) ou a pessoa faltou (e ninguém marcou).
const STATUS_EM_ABERTO = ["Agendado", "Confirmado", "Em atendimento"];

export default async function AtendimentosAbertosPage() {
  await requirePagePermission("agenda.visualizar");

  const agora = new Date();

  // Só o que já passou do horário. O que ainda vai acontecer hoje continua
  // sendo assunto da agenda, não desta tela.
  const emAberto = await prisma.agendamento.findMany({
    where: {
      data: { lt: agora },
      status: { in: STATUS_EM_ABERTO },
    },
    select: {
      id: true,
      data: true,
      procedimento: true,
      status: true,
      valor: true,
      naturezaAtendimento: true,
      cliente: {
        select: { id: true, nome: true, whatsapp: true, telefone: true },
      },
      profissional: { select: { nome: true } },
    },
    orderBy: { data: "desc" },
  });

  const itens = emAberto.map((agendamento) => ({
    id: agendamento.id,
    clienteId: agendamento.cliente.id,
    cliente: agendamento.cliente.nome,
    procedimento:
      agendamento.naturezaAtendimento === "RETORNO"
        ? `Retorno, ${agendamento.procedimento}`
        : agendamento.procedimento,
    profissional: agendamento.profissional?.nome || null,
    data: agendamento.data.toISOString(),
    status: agendamento.status,
    valor: agendamento.valor,
  }));

  return <AtendimentosAbertosClient itens={itens} />;
}
