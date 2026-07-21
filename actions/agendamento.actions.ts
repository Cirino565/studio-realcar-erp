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

export type NovoBloqueioAgenda = {
  profissionalId: number;
  data: string;
  duracao?: number;
  motivo: string;
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

function parseLocalDateTime(value: string) {
  const [datePart, rawTimePart = "00:00"] = value.split("T");
  const timePart = rawTimePart
    .replace(/Z$/i, "")
    .slice(0, 5);

  return new Date(`${datePart}T${timePart}:00-03:00`);
}

function formatDateSaoPaulo(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(value);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Não foi possível interpretar a data do agendamento.");
  }

  return `${year}-${month}-${day}`;
}

function formatHourMinute(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

async function validarConflitoAgenda({
  profissionalId,
  data,
  duracao,
  ignoreId,
  ignoreBloqueioId,
}: {
  profissionalId?: number;
  data: Date;
  duracao: number;
  ignoreId?: number;
  ignoreBloqueioId?: number;
}) {
  if (!profissionalId) return;

  const inicioNovo = data;
  const fimNovo = addMinutes(inicioNovo, duracao);
  const dataSaoPaulo = formatDateSaoPaulo(data);
  const inicioDia = parseLocalDateTime(`${dataSaoPaulo}T00:00`);
  const fimDia = addMinutes(inicioDia, 24 * 60);

  const [agendamentosDoDia, bloqueiosDoDia] = await Promise.all([
    prisma.agendamento.findMany({
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
    }),
    prisma.bloqueioAgenda.findMany({
      where: {
        profissionalId,
        data: {
          gte: inicioDia,
          lt: fimDia,
        },
        status: "Ativo",
        ...(ignoreBloqueioId ? { id: { not: ignoreBloqueioId } } : {}),
      },
      select: {
        id: true,
        data: true,
        duracao: true,
        motivo: true,
      },
    }),
  ]);

  const conflitoAgendamento = agendamentosDoDia.find((agendamento) => {
    const inicioExistente = new Date(agendamento.data);
    const fimExistente = addMinutes(inicioExistente, agendamento.duracao);
    return inicioExistente < fimNovo && fimExistente > inicioNovo;
  });

  if (conflitoAgendamento) {
    const inicio = formatHourMinute(conflitoAgendamento.data);
    const fim = formatHourMinute(
      addMinutes(conflitoAgendamento.data, conflitoAgendamento.duracao),
    );

    throw new Error(
      `Este horário conflita com ${conflitoAgendamento.cliente.nome}, agendado das ${inicio} às ${fim}. Escolha outro horário ou ajuste a duração.`,
    );
  }

  const conflitoBloqueio = bloqueiosDoDia.find((bloqueio) => {
    const inicioExistente = new Date(bloqueio.data);
    const fimExistente = addMinutes(inicioExistente, bloqueio.duracao);
    return inicioExistente < fimNovo && fimExistente > inicioNovo;
  });

  if (conflitoBloqueio) {
    const inicio = formatHourMinute(conflitoBloqueio.data);
    const fim = formatHourMinute(
      addMinutes(conflitoBloqueio.data, conflitoBloqueio.duracao),
    );

    throw new Error(
      `Este horário está bloqueado por "${conflitoBloqueio.motivo}" das ${inicio} às ${fim}. Escolha outro horário ou edite o bloqueio existente.`,
    );
  }
}

export async function criarAgendamento(dados: NovoAgendamento) {
  await requirePermission("agenda.gerenciar");

  const data = parseLocalDateTime(dados.data);
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

  const data = parseLocalDateTime(dados.data);
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

export async function criarBloqueioAgenda(dados: NovoBloqueioAgenda) {
  await requirePermission("agenda.gerenciar");

  if (!dados.profissionalId) {
    throw new Error("Selecione a profissional para o bloqueio.");
  }

  if (!dados.motivo?.trim()) {
    throw new Error("Informe o motivo do bloqueio.");
  }

  const data = parseLocalDateTime(dados.data);
  const duracao = Math.max(5, dados.duracao || 60);

  await validarConflitoAgenda({
    profissionalId: dados.profissionalId,
    data,
    duracao,
  });

  await prisma.$transaction(async (tx) => {
    const bloqueio = await tx.bloqueioAgenda.create({
      data: {
        profissionalId: dados.profissionalId,
        data,
        duracao,
        motivo: dados.motivo.trim(),
        observacoes: dados.observacoes?.trim() || null,
        status: "Ativo",
      },
    });

    await tx.auditoria.create({
      data: {
        modulo: "Agenda",
        acao: "Criou bloqueio de agenda",
        entidade: "BloqueioAgenda",
        entidadeId: String(bloqueio.id),
        usuario: "Equipe Studio Realçar",
        detalhes: `${dados.motivo.trim()} em ${formatDateSaoPaulo(data)} das ${formatHourMinute(data)} às ${formatHourMinute(addMinutes(data, duracao))}.`,
      },
    });
  });

  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function atualizarBloqueioAgenda({
  id,
  ...dados
}: NovoBloqueioAgenda & { id: number }) {
  await requirePermission("agenda.gerenciar");

  if (!id) {
    throw new Error("Bloqueio inválido.");
  }

  if (!dados.profissionalId) {
    throw new Error("Selecione a profissional para o bloqueio.");
  }

  if (!dados.motivo?.trim()) {
    throw new Error("Informe o motivo do bloqueio.");
  }

  const data = parseLocalDateTime(dados.data);
  const duracao = Math.max(5, dados.duracao || 60);

  await validarConflitoAgenda({
    profissionalId: dados.profissionalId,
    data,
    duracao,
    ignoreBloqueioId: id,
  });

  await prisma.bloqueioAgenda.update({
    where: { id },
    data: {
      profissionalId: dados.profissionalId,
      data,
      duracao,
      motivo: dados.motivo.trim(),
      observacoes: dados.observacoes?.trim() || null,
      status: "Ativo",
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function excluirBloqueioAgenda(id: number) {
  await requirePermission("agenda.gerenciar");

  if (!id) {
    throw new Error("Bloqueio inválido.");
  }

  await prisma.$transaction(async (tx) => {
    const bloqueio = await tx.bloqueioAgenda.findUnique({
      where: { id },
      select: { motivo: true },
    });

    await tx.bloqueioAgenda.delete({
      where: { id },
    });

    await tx.auditoria.create({
      data: {
        modulo: "Agenda",
        acao: "Excluiu bloqueio de agenda",
        entidade: "BloqueioAgenda",
        entidadeId: String(id),
        usuario: "Equipe Studio Realçar",
        detalhes: bloqueio?.motivo || "Bloqueio removido da agenda.",
      },
    });
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

function montarHorario(data: string, hora: string) {
  return parseLocalDateTime(`${data}T${hora}`);
}

type HorarioFuncionamento = {
  abertura: string;
  fechamento: string;
} | null;

type ConfiguracaoHorarioAgenda = {
  semana: HorarioFuncionamento;
  sabado: HorarioFuncionamento;
  domingo: HorarioFuncionamento;
  intervalo: number;
};

function parseHorarioFuncionamento(
  value: string | null | undefined,
  intervaloAgenda: number,
): ConfiguracaoHorarioAgenda {
  const padrao: ConfiguracaoHorarioAgenda = {
    semana: { abertura: "09:00", fechamento: "19:00" },
    sabado: { abertura: "09:00", fechamento: "17:00" },
    domingo: null,
    intervalo: Math.max(5, intervaloAgenda || 30),
  };

  if (!value) {
    return padrao;
  }

  const semana = value.match(/SEG-SEX=(\d{2}:\d{2})-(\d{2}:\d{2})/i);
  const sabado = value.match(/SAB=(FECHADO|(\d{2}:\d{2})-(\d{2}:\d{2}))/i);
  const domingo = value.match(/DOM=(FECHADO|(\d{2}:\d{2})-(\d{2}:\d{2}))/i);

  return {
    semana: semana
      ? { abertura: semana[1], fechamento: semana[2] }
      : padrao.semana,
    sabado:
      sabado?.[1]?.toUpperCase() === "FECHADO"
        ? null
        : sabado?.[2] && sabado?.[3]
          ? { abertura: sabado[2], fechamento: sabado[3] }
          : padrao.sabado,
    domingo:
      domingo?.[1]?.toUpperCase() === "FECHADO"
        ? null
        : domingo?.[2] && domingo?.[3]
          ? { abertura: domingo[2], fechamento: domingo[3] }
          : null,
    intervalo: padrao.intervalo,
  };
}

function getDiaSemana(data: string) {
  const [year, month, day] = data.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function minutosDoHorario(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function gerarSlotsDisponibilidade(
  funcionamento: HorarioFuncionamento,
  intervalo: number,
  duracao: number,
) {
  if (!funcionamento) {
    return [];
  }

  const slots: string[] = [];
  const abertura = minutosDoHorario(funcionamento.abertura);
  const fechamento = minutosDoHorario(funcionamento.fechamento);

  for (
    let minutos = abertura;
    minutos + duracao <= fechamento;
    minutos += intervalo
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
  ignoreId,
  ignoreBloqueioId,
}: {
  profissionalId?: number;
  data: string;
  duracao?: number;
  ignoreId?: number;
  ignoreBloqueioId?: number;
}): Promise<HorarioDisponivelAgenda[]> {
  await requirePermission("agenda.visualizar");

  if (!profissionalId || !data) {
    return [];
  }

  const configuracaoClinica = await prisma.configuracaoClinica.findFirst({
    select: {
      horarioAtendimento: true,
      intervaloAgenda: true,
    },
  });

  const configuracaoHorario = parseHorarioFuncionamento(
    configuracaoClinica?.horarioAtendimento,
    configuracaoClinica?.intervaloAgenda || 30,
  );

  const diaSemana = getDiaSemana(data);
  const funcionamento =
    diaSemana === 0
      ? configuracaoHorario.domingo
      : diaSemana === 6
        ? configuracaoHorario.sabado
        : configuracaoHorario.semana;

  const slots = gerarSlotsDisponibilidade(
    funcionamento,
    configuracaoHorario.intervalo,
    duracao,
  );

  if (slots.length === 0) {
    return [];
  }

  const inicioDia = parseLocalDateTime(`${data}T00:00`);
  const fimDia = addMinutes(inicioDia, 24 * 60);

  const [agendamentosDoDia, bloqueiosDoDia] = await Promise.all([
    prisma.agendamento.findMany({
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
      orderBy: {
        data: "asc",
      },
    }),
    prisma.bloqueioAgenda.findMany({
      where: {
        profissionalId,
        data: {
          gte: inicioDia,
          lt: fimDia,
        },
        status: "Ativo",
        ...(ignoreBloqueioId ? { id: { not: ignoreBloqueioId } } : {}),
      },
      select: {
        id: true,
        data: true,
        duracao: true,
        motivo: true,
      },
      orderBy: {
        data: "asc",
      },
    }),
  ]);

  return slots.map((hora) => {
    const inicioNovo = montarHorario(data, hora);
    const fimNovo = addMinutes(inicioNovo, duracao);

    const conflitoAgendamento = agendamentosDoDia.find((agendamento) => {
      const inicioExistente = new Date(agendamento.data);
      const fimExistente = addMinutes(inicioExistente, agendamento.duracao);

      return inicioExistente < fimNovo && fimExistente > inicioNovo;
    });

    if (conflitoAgendamento) {
      const inicio = formatHourMinute(conflitoAgendamento.data);
      const fim = formatHourMinute(
        addMinutes(conflitoAgendamento.data, conflitoAgendamento.duracao),
      );

      return {
        hora,
        disponivel: false,
        motivo: `${conflitoAgendamento.cliente.nome} · ${inicio} às ${fim}`,
      };
    }

    const conflitoBloqueio = bloqueiosDoDia.find((bloqueio) => {
      const inicioExistente = new Date(bloqueio.data);
      const fimExistente = addMinutes(inicioExistente, bloqueio.duracao);

      return inicioExistente < fimNovo && fimExistente > inicioNovo;
    });

    if (conflitoBloqueio) {
      const inicio = formatHourMinute(conflitoBloqueio.data);
      const fim = formatHourMinute(
        addMinutes(conflitoBloqueio.data, conflitoBloqueio.duracao),
      );

      return {
        hora,
        disponivel: false,
        motivo: `${conflitoBloqueio.motivo} · ${inicio} às ${fim}`,
      };
    }

    return {
      hora,
      disponivel: true,
    };
  });
}