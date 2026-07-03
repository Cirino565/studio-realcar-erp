import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import AgendaClient from "./components/AgendaClient";

type AgendaPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function getDataSelecionada(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date();
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inicioDoDia(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function fimDoDia(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  await requirePagePermission("agenda.visualizar");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const dataSelecionada = getDataSelecionada(getParam(resolvedSearchParams, "data"));
  const profissionalFiltro = getParam(resolvedSearchParams, "profissional") || "todas";

  const [clientes, agendamentos, profissionais, origensCliente, servicos] =
    await Promise.all([
      prisma.cliente.findMany({
        orderBy: { nome: "asc" },
        select: {
          id: true,
          nome: true,
          telefone: true,
          whatsapp: true,
        },
      }),

      prisma.agendamento.findMany({
        where: {
          data: {
            gte: inicioDoDia(dataSelecionada),
            lt: fimDoDia(dataSelecionada),
          },
        },
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
        orderBy: { data: "asc" },
      }),

      prisma.profissional.findMany({
        where: { status: "Ativa" },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
        select: {
          id: true,
          nome: true,
          area: true,
          cor: true,
          status: true,
        },
      }),

      prisma.origemCliente.findMany({
        where: { status: "Ativa" },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
        select: {
          id: true,
          nome: true,
        },
      }),

      prisma.procedimentoServico.findMany({
        where: { status: "Ativo" },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
        select: {
          id: true,
          nome: true,
          categoria: true,
          duracaoPadrao: true,
          valorPadrao: true,
        },
      }),
    ]);

  return (
    <div className="space-y-4 lg:space-y-8">
      <AgendaClient
        clientes={clientes}
        agendamentos={agendamentos.map((agendamento) => ({
          ...agendamento,
          data: agendamento.data.toISOString(),
          createdAt: agendamento.createdAt.toISOString(),
          updatedAt: agendamento.updatedAt.toISOString(),
        }))}
        profissionais={profissionais}
        origensCliente={origensCliente}
        servicos={servicos}
        initialDate={toDateInput(dataSelecionada)}
        initialProfissionalFiltro={profissionalFiltro}
      />
    </div>
  );
}
