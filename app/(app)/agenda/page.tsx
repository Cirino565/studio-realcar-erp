import { isAdminUser, requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import AgendaClient from "./components/AgendaClient";

type AgendaPageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
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

function normalizarTexto(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function encontrarProfissionalDoUsuario<
  T extends {
    id: number;
    nome: string;
    email?: string | null;
  },
>(usuario: { nome: string; email: string }, profissionais: T[]) {
  const emailUsuario = usuario.email.trim().toLowerCase();
  const nomeUsuario = normalizarTexto(usuario.nome);

  const porEmail = profissionais.find(
    (profissional) =>
      profissional.email?.trim().toLowerCase() === emailUsuario,
  );

  if (porEmail) {
    return porEmail;
  }

  const porNomeExato = profissionais.find(
    (profissional) => normalizarTexto(profissional.nome) === nomeUsuario,
  );

  if (porNomeExato) {
    return porNomeExato;
  }

  return profissionais.find((profissional) => {
    const nomeProfissional = normalizarTexto(profissional.nome);

    return (
      nomeUsuario.includes(nomeProfissional) ||
      nomeProfissional.includes(nomeUsuario)
    );
  });
}

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const usuario = await requirePagePermission("agenda.visualizar");
  const usuarioAdmin = isAdminUser(usuario);

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const dataSelecionada = getDataSelecionada(
    getParam(resolvedSearchParams, "data"),
  );

  const profissionalFiltroParam = getParam(
    resolvedSearchParams,
    "profissional",
  );

  const [clientes, profissionais, origensCliente, servicos] = await Promise.all([
    prisma.cliente.findMany({
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        telefone: true,
        whatsapp: true,
      },
    }),

    prisma.profissional.findMany({
      where: { status: "Ativa" },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: {
        id: true,
        nome: true,
        area: true,
        cor: true,
        telefone: true,
        email: true,
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

  const profissionalDoUsuario = usuarioAdmin
    ? null
    : encontrarProfissionalDoUsuario(usuario, profissionais);

  const profissionalFiltro =
    profissionalFiltroParam && profissionalFiltroParam !== "todas"
      ? profissionalFiltroParam
      : profissionalDoUsuario
        ? String(profissionalDoUsuario.id)
        : "todas";

  const agendamentos = await prisma.agendamento.findMany({
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
  });

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-24 lg:space-y-8 lg:pb-0">
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