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
  {
    nome: "Limpeza de pele",
    categoria: "Estética facial",
    duracaoPadrao: 120,
    valorPadrao: 0,
    ordem: 2,
  },
  {
    nome: "Microagulhamento",
    categoria: "Estética facial",
    duracaoPadrao: 90,
    valorPadrao: 0,
    ordem: 3,
  },
  {
    nome: "Peeling",
    categoria: "Estética facial",
    duracaoPadrao: 60,
    valorPadrao: 0,
    ordem: 4,
  },
  {
    nome: "Drenagem linfática",
    categoria: "Corporal",
    duracaoPadrao: 60,
    valorPadrao: 0,
    ordem: 5,
  },
  {
    nome: "Cílios fio a fio",
    categoria: "Cílios e sobrancelhas",
    duracaoPadrao: 120,
    valorPadrao: 0,
    ordem: 6,
  },
  {
    nome: "Manutenção de cílios",
    categoria: "Cílios e sobrancelhas",
    duracaoPadrao: 60,
    valorPadrao: 0,
    ordem: 7,
  },
  {
    nome: "Design de sobrancelhas",
    categoria: "Cílios e sobrancelhas",
    duracaoPadrao: 45,
    valorPadrao: 0,
    ordem: 8,
  },
];

async function garantirPadroesDaAgenda() {
  for (const profissional of profissionaisPadrao) {
    await prisma.profissional.upsert({
      where: {
        nome: profissional.nome,
      },
      update: {
        area: profissional.area,
        cor: profissional.cor,
        ordem: profissional.ordem,
        status: "Ativa",
      },
      create: {
        ...profissional,
        status: "Ativa",
      },
    });
  }

  for (const servico of servicosPadrao) {
    await prisma.procedimentoServico.upsert({
      where: {
        nome: servico.nome,
      },
      update: {
        categoria: servico.categoria,
        duracaoPadrao: servico.duracaoPadrao,
        valorPadrao: servico.valorPadrao,
        ordem: servico.ordem,
        status: "Ativo",
      },
      create: {
        ...servico,
        status: "Ativo",
      },
    });
  }
}

type Props = {
  searchParams?: Promise<{
    data?: string;
    profissional?: string;
  }>;
};

function dataInicialParam(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date().toISOString().slice(0, 10);
  }

  return value;
}

export default async function AgendaPage({ searchParams }: Props) {
  await requirePagePermission("agenda.visualizar");
  await garantirPadroesDaAgenda();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialSelectedDate = dataInicialParam(resolvedSearchParams.data);
  const initialProfissionalFiltro = resolvedSearchParams.profissional || "todas";

  const [clientes, agendamentos, profissionais, origensCliente, servicos] =
    await Promise.all([
      prisma.cliente.findMany({
        orderBy: {
          nome: "asc",
        },
        select: {
          id: true,
          nome: true,
          telefone: true,
          whatsapp: true,
        },
      }),
      prisma.agendamento.findMany({
        include: {
          cliente: {
            select: {
              nome: true,
              telefone: true,
              whatsapp: true,
            },
          },
          profissional: {
            select: {
              id: true,
              nome: true,
              area: true,
              cor: true,
              status: true,
            },
          },
        },
        orderBy: {
          data: "asc",
        },
      }),
      prisma.profissional.findMany({
        where: {
          status: "Ativa",
        },
        orderBy: [
          {
            ordem: "asc",
          },
          {
            nome: "asc",
          },
        ],
      }),
      prisma.origemCliente.findMany({
        where: {
          status: "Ativa",
        },
        orderBy: [
          {
            ordem: "asc",
          },
          {
            nome: "asc",
          },
        ],
      }),
      prisma.procedimentoServico.findMany({
        where: {
          status: "Ativo",
        },
        orderBy: [
          {
            ordem: "asc",
          },
          {
            nome: "asc",
          },
        ],
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
        initialSelectedDate={initialSelectedDate}
        initialProfissionalFiltro={initialProfissionalFiltro}
      />
    </div>
  );
}
