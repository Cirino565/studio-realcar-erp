import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import AgendaClient from "./components/AgendaClient";

const profissionaisPadrao = [
  {
    nome: "Vivian",
    area: "Estética facial e corporal",
    cor: "violet",
    ordem: 1,
  },
  {
    nome: "Gabriely",
    area: "Cílios e sobrancelhas",
    cor: "rose",
    ordem: 2,
  },
];

const servicosPadrao = [
  {
    nome: "Avaliação",
    categoria: "Atendimento inicial",
    duracaoPadrao: 30,
    valorPadrao: 0,
    ordem: 1,
  },
];

async function garantirPadroesDaAgenda() {
  for (const profissional of profissionaisPadrao) {
    await prisma.profissional.upsert({
      where: { nome: profissional.nome },
      update: profissional,
      create: { ...profissional, status: "Ativa" },
    });
  }

  for (const servico of servicosPadrao) {
    await prisma.procedimentoServico.upsert({
      where: { nome: servico.nome },
      update: servico,
      create: { ...servico, status: "Ativo" },
    });
  }
}

export default async function AgendaPage() {
  await requirePagePermission("agenda.visualizar");
  await garantirPadroesDaAgenda();

  const [clientes, agendamentos, profissionais, origensCliente, servicos] =
    await Promise.all([
      prisma.cliente.findMany({
        orderBy: { nome: "asc" },
      }),

      prisma.agendamento.findMany({
        include: {
          cliente: true,
          profissional: true,
        },
        orderBy: { data: "asc" },
      }),

      prisma.profissional.findMany({
        where: { status: "Ativa" },
      }),

      prisma.origemCliente.findMany({
        where: { status: "Ativa" },
      }),

      prisma.procedimentoServico.findMany({
        where: { status: "Ativo" },
      }),
    ]);

  return (
    <div className="space-y-4 lg:space-y-8">
      <AgendaClient
        clientes={clientes}
        agendamentos={agendamentos}
        profissionais={profissionais}
        origensCliente={origensCliente}
        servicos={servicos}
      />
    </div>
  );
}