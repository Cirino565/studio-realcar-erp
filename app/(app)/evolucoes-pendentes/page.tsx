import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import EvolucoesPendentesPageClient from "./components/EvolucoesPendentesPageClient";

function formatarProcedimentoAgendamento(agendamento: {
  procedimento: string;
  naturezaAtendimento?: string | null;
}) {
  return agendamento.naturezaAtendimento === "RETORNO"
    ? `Retorno, ${agendamento.procedimento}`
    : agendamento.procedimento;
}

export default async function EvolucoesPendentesPage() {
  // A própria página já exige "clientes.clinico" para ser aberta, então
  // quem chegou aqui sempre pode registrar evolução.
  await requirePagePermission("clientes.clinico");

  // Sem "take": aqui é a tela feita para ver TUDO que ainda falta, por
  // isso não tem limite de quantidade nem de data - diferente do card do
  // Dashboard, que é só um resumo rápido do que está mais urgente.
  const evolucoesPendentes = await prisma.agendamento.findMany({
    where: {
      status: "Atendido",
      evolucaoStatus: "PENDENTE",
    },
    include: {
      cliente: { select: { id: true, nome: true, whatsapp: true, telefone: true } },
      profissional: { select: { nome: true } },
    },
    orderBy: [{ evolucaoPendenteDesde: "asc" }, { updatedAt: "asc" }],
  });

  const itens = evolucoesPendentes.map((agendamento) => ({
    id: agendamento.id,
    clienteId: agendamento.clienteId,
    cliente: agendamento.cliente.nome,
    procedimento: formatarProcedimentoAgendamento(agendamento),
    profissional: agendamento.profissional?.nome || null,
    data: agendamento.data.toISOString(),
    pendenteDesde:
      agendamento.evolucaoPendenteDesde?.toISOString() ||
      agendamento.updatedAt.toISOString(),
  }));

  return (
    <EvolucoesPendentesPageClient itensIniciais={itens} />
  );
}
