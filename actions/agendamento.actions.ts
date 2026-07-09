"use server";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type ClienteNovoAgendamento = {
  nome: string;
  whatsapp?: string;
  telefone?: string;
  origem?: string;
  procedimentoInteresse?: string;
  observacoes?: string;
};

type NovoAgendamento = {
  clienteId?: number;
  novoCliente?: ClienteNovoAgendamento;
  profissionalId?: number;
  procedimento: string;
  data: string;
  duracao?: number;
  valor?: number;
  status?: string;
  observacoes?: string;
};

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

export async function criarProfissionaisPadrao() {
  await requirePermission("agenda.gerenciar");

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

  revalidatePath("/agenda");
}

export async function criarServicosPadrao() {
  await requirePermission("agenda.gerenciar");

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

  revalidatePath("/agenda");
  revalidatePath("/configuracoes");
}

async function resolverCliente(dados: NovoAgendamento) {
  if (dados.clienteId) {
    return dados.clienteId;
  }

  if (!dados.novoCliente?.nome?.trim()) {
    throw new Error("Informe um cliente cadastrado ou cadastre um novo cliente.");
  }

  const cliente = await prisma.cliente.create({
    data: {
      nome: dados.novoCliente.nome.trim(),
      telefone:
        dados.novoCliente.telefone?.trim() ||
        dados.novoCliente.whatsapp?.trim() ||
        "Não informado",
      whatsapp: dados.novoCliente.whatsapp?.trim() || null,
      origem: dados.novoCliente.origem || null,
      procedimentoInteresse:
        dados.novoCliente.procedimentoInteresse || dados.procedimento,
      observacoes: dados.novoCliente.observacoes || null,
    },
  });

  return cliente.id;
}

function addMinutes(date: Date, minutes: number) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);

  return next;
}

async function validarConflitoAgenda({
  profissionalId,
  data,
  duracao,
  ignoreId,
}: {
  profissionalId?: number;
  data: Date;
  duracao: number;
  ignoreId?: number;
}) {
  if (!profissionalId) return;

  const inicioNovo = data;
  const fimNovo = addMinutes(inicioNovo, duracao);
  const inicioDia = new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
  );
  const fimDia = new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate() + 1,
  );

  const agendamentosDoDia = await prisma.agendamento.findMany({
    where: {
      profissionalId,
      data: {
        gte: inicioDia,
        lt: fimDia,
      },
      status: {
        notIn: ["Cancelado"],
      },
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
    },
    select: {
      id: true,
      data: true,
      duracao: true,
      cliente: {
        select: {
          nome: true,
        },
      },
    },
  });

  const conflito = agendamentosDoDia.find((agendamento) => {
    const inicioExistente = new Date(agendamento.data);
    const fimExistente = addMinutes(inicioExistente, agendamento.duracao);

    return inicioExistente < fimNovo && fimExistente > inicioNovo;
  });

  if (!conflito) return;

  const inicio = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(conflito.data);

  const fim = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(addMinutes(conflito.data, conflito.duracao));

  throw new Error(
    `Este horário conflita com ${conflito.cliente.nome}, agendado das ${inicio} às ${fim}. Escolha outro horário ou ajuste a duração.`,
  );
}

export async function criarAgendamento(dados: NovoAgendamento) {
  await requirePermission("agenda.gerenciar");

  const data = new Date(dados.data);
  const duracao = dados.duracao || 60;

  await validarConflitoAgenda({
    profissionalId: dados.profissionalId,
    data,
    duracao,
  });

  const clienteId = await resolverCliente(dados);

  await prisma.agendamento.create({
    data: {
      clienteId,
      profissionalId: dados.profissionalId || null,
      procedimento: dados.procedimento,
      data,
      duracao,
      valor: dados.valor || 0,
      status: dados.status || "Agendado",
      observacoes: dados.observacoes || null,
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function atualizarAgendamento({
  id,
  ...dados
}: NovoAgendamento & { id: number }) {
  await requirePermission("agenda.gerenciar");

  const data = new Date(dados.data);
  const duracao = dados.duracao || 60;

  await validarConflitoAgenda({
    profissionalId: dados.profissionalId,
    data,
    duracao,
    ignoreId: id,
  });

  const clienteId = dados.clienteId || (await resolverCliente(dados));

  await prisma.agendamento.update({
    where: {
      id,
    },
    data: {
      clienteId,
      profissionalId: dados.profissionalId || null,
      procedimento: dados.procedimento,
      data,
      duracao,
      valor: dados.valor || 0,
      status: dados.status || "Agendado",
      observacoes: dados.observacoes || null,
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function excluirAgendamento(id: number) {
  await requirePermission("agenda.gerenciar");

  await prisma.agendamento.delete({
    where: {
      id,
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function iniciarAtendimento(agendamentoId: number) {
  await requirePermission("agenda.gerenciar");

  if (!agendamentoId) {
    throw new Error("Agendamento inválido.");
  }

  const agendamento = await prisma.agendamento.findUnique({
    where: {
      id: agendamentoId,
    },
    include: {
      cliente: {
        select: {
          nome: true,
        },
      },
      profissional: {
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
    throw new Error("Não é possível iniciar um agendamento cancelado.");
  }

  if (agendamento.status === "Atendido") {
    throw new Error("Este atendimento já foi finalizado.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.agendamento.update({
      where: {
        id: agendamento.id,
      },
      data: {
        status: "Em atendimento",
      },
    });

    await tx.auditoria.create({
      data: {
        modulo: "Agenda",
        acao: "Iniciou atendimento",
        entidade: "Agendamento",
        entidadeId: String(agendamento.id),
        usuario: agendamento.profissional?.nome || "Equipe Studio Realçar",
        detalhes: `Atendimento iniciado para ${agendamento.cliente.nome}. Procedimento: ${agendamento.procedimento}.`,
      },
    });
  });

  revalidatePath("/agenda");
  revalidatePath(`/clientes/${agendamento.clienteId}`);
  revalidatePath("/");
}

export type FinalizarAtendimentoInput = {
  agendamentoId: number;
  procedimentoRealizado: string;
  profissional?: string;
  valorCobrado: number;
  formaPagamento: string;
  statusPagamento: string;
  evolucao: string;
  observacoes?: string;
  dataAtendimento?: string;
};

export async function finalizarAtendimento(dados: FinalizarAtendimentoInput) {
  await requirePermission("agenda.gerenciar");

  if (!dados.agendamentoId) {
    throw new Error("Agendamento inválido.");
  }

  if (!dados.procedimentoRealizado?.trim()) {
    throw new Error("Informe o procedimento realizado.");
  }

  if (!dados.evolucao?.trim()) {
    throw new Error("Informe a evolução/observação clínica do atendimento.");
  }

  const valorCobrado = Number.isFinite(Number(dados.valorCobrado))
    ? Number(dados.valorCobrado)
    : 0;

  const dataAtendimento = dados.dataAtendimento
    ? new Date(dados.dataAtendimento)
    : new Date();

  const statusPagamento = dados.statusPagamento || "Pago";
  const formaPagamento = dados.formaPagamento || "Não informado";

  const agendamento = await prisma.agendamento.findUnique({
    where: { id: dados.agendamentoId },
    include: {
      cliente: { select: { id: true, nome: true } },
      profissional: { select: { nome: true } },
    },
  });

  if (!agendamento) {
    throw new Error("Agendamento não encontrado.");
  }

  if (agendamento.status === "Cancelado") {
    throw new Error("Não é possível finalizar um agendamento cancelado.");
  }

  const profissional =
    dados.profissional?.trim() ||
    agendamento.profissional?.nome ||
    "Equipe Studio Realçar";

  const procedimentoRealizado = dados.procedimentoRealizado.trim();
  const observacoes = dados.observacoes?.trim() || null;

  await prisma.$transaction(async (tx) => {
    await tx.clienteProcedimento.create({
      data: {
        clienteId: agendamento.clienteId,
        nome: procedimentoRealizado,
        profissional,
        valor: valorCobrado,
        status: "Realizado",
        dataProcedimento: dataAtendimento,
        observacoes,
      },
    });

    await tx.clienteEvolucao.create({
      data: {
        clienteId: agendamento.clienteId,
        titulo: `Atendimento - ${procedimentoRealizado}`,
        descricao: dados.evolucao.trim(),
        profissional,
        dataRegistro: dataAtendimento,
      },
    });

    if (valorCobrado > 0) {
      await tx.lancamento.create({
        data: {
          descricao: `Atendimento ${procedimentoRealizado} - ${agendamento.cliente.nome}`,
          valor: valorCobrado,
          tipo: "ENTRADA",
          categoria: statusPagamento === "Pago" ? "Procedimentos" : "A receber",
          observacoes: [
            `Gerado automaticamente pela Agenda.`,
            `Agendamento #${agendamento.id}.`,
            `Cliente: ${agendamento.cliente.nome}.`,
            `Profissional: ${profissional}.`,
            `Forma de pagamento: ${formaPagamento}.`,
            `Status do pagamento: ${statusPagamento}.`,
            observacoes ? `Observações: ${observacoes}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          data: dataAtendimento,
          formaPagamento,
          statusPagamento,
          origem: "Agenda",
          agendamentoId: agendamento.id,
          clienteId: agendamento.clienteId,
        },
      });
    }

    await tx.agendamento.update({
      where: { id: agendamento.id },
      data: {
        status: "Atendido",
        procedimento: procedimentoRealizado,
        valor: valorCobrado,
        observacoes: [agendamento.observacoes, observacoes]
          .filter(Boolean)
          .join("\n\nFinalização: "),
      },
    });

    await tx.cliente.update({
      where: { id: agendamento.clienteId },
      data: {
        ultimaVisita: dataAtendimento,
        procedimento: procedimentoRealizado,
        valorGasto: {
          increment: valorCobrado,
        },
        status: "Ativa",
      },
    });

    await tx.auditoria.create({
      data: {
        modulo: "Agenda",
        acao: "Finalizou atendimento",
        entidade: "Agendamento",
        entidadeId: String(agendamento.id),
        usuario: profissional,
        detalhes: `Atendimento finalizado para ${agendamento.cliente.nome}. Procedimento: ${procedimentoRealizado}. Valor: ${valorCobrado}. Pagamento: ${statusPagamento}.`,
      },
    });
  });

  revalidatePath("/agenda");
  revalidatePath("/financeiro");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${agendamento.clienteId}`);
  revalidatePath("/relatorios");
  revalidatePath("/");
}

export type HorarioDisponivelAgenda = {
  hora: string;
  disponivel: boolean;
  motivo?: string;
};

function montarHorario(baseDate: Date, hora: string) {
  const [hours, minutes] = hora.split(":").map(Number);

  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hours,
    minutes,
    0,
  );
}

const CLINICA_HORA_ABERTURA = 9;
const CLINICA_HORA_FECHAMENTO = 19;
const CLINICA_INTERVALO_MINUTOS = 30;

function gerarSlotsDisponibilidade() {
  const slots: string[] = [];

  for (
    let minutos = CLINICA_HORA_ABERTURA * 60;
    minutos < CLINICA_HORA_FECHAMENTO * 60;
    minutos += CLINICA_INTERVALO_MINUTOS
  ) {
    const hour = Math.floor(minutos / 60);
    const minute = minutos % 60;

    slots.push(
      `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );
  }

  return slots;
}

export async function buscarDisponibilidadeAgenda({
  profissionalId,
  data,
  duracao = 60,
}: {
  profissionalId?: number;
  data: string;
  duracao?: number;
}): Promise<HorarioDisponivelAgenda[]> {
  await requirePermission("agenda.visualizar");

  if (!profissionalId || !data) {
    return [];
  }

  const dataBase = new Date(`${data}T00:00:00`);
  const inicioDia = new Date(
    dataBase.getFullYear(),
    dataBase.getMonth(),
    dataBase.getDate(),
  );
  const fimDia = new Date(
    dataBase.getFullYear(),
    dataBase.getMonth(),
    dataBase.getDate() + 1,
  );

  const agendamentosDoDia = await prisma.agendamento.findMany({
    where: {
      profissionalId,
      data: {
        gte: inicioDia,
        lt: fimDia,
      },
      status: {
        notIn: ["Cancelado"],
      },
    },
    select: {
      id: true,
      data: true,
      duracao: true,
      cliente: {
        select: {
          nome: true,
        },
      },
    },
    orderBy: {
      data: "asc",
    },
  });

  return gerarSlotsDisponibilidade().map((hora) => {
    const inicioNovo = montarHorario(dataBase, hora);
    const fimNovo = addMinutes(inicioNovo, duracao);

    const conflito = agendamentosDoDia.find((agendamento) => {
      const inicioExistente = new Date(agendamento.data);
      const fimExistente = addMinutes(inicioExistente, agendamento.duracao);

      return inicioExistente < fimNovo && fimExistente > inicioNovo;
    });

    if (!conflito) {
      return {
        hora,
        disponivel: true,
      };
    }

    const inicio = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(conflito.data);

    const fim = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(addMinutes(conflito.data, conflito.duracao));

    return {
      hora,
      disponivel: false,
      motivo: `${conflito.cliente.nome} · ${inicio} às ${fim}`,
    };
  });
}