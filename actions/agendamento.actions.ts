"use server";

import { randomUUID } from "node:crypto";

import { isAdminUser, requirePermission } from "@/lib/auth";
import { obterAreaPadraoAgendamento } from "@/lib/area-cliente";
import { prisma } from "@/lib/prisma";
import {
  criarVendaNoTx,
  type VendaKitInput,
  type VendaProdutoInput,
} from "@/lib/vendas";
import { revalidatePath } from "next/cache";

type ClienteNovoAgendamento = {
  nome: string;
  whatsapp?: string;
  telefone?: string;
  origem?: string;
  procedimentoInteresse?: string;
  observacoes?: string;
};

export type RecorrenciaAgendaInput = {
  tipo?: "nenhuma" | "semanal" | "quinzenal" | "mensal" | "personalizada";
  intervalo?: number;
  unidade?: "dias" | "semanas" | "meses";
  ocorrencias?: number;
};

export type NaturezaAtendimentoAgenda = "PROCEDIMENTO" | "RETORNO";

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
  sinalPago?: boolean;
  naturezaAtendimento?: NaturezaAtendimentoAgenda;
  agendamentoOrigemId?: number;
  areaEstetica?: boolean;
  areaCilios?: boolean;
  recorrencia?: RecorrenciaAgendaInput;
};

export type ResultadoSalvarAgenda =
  | {
      ok: true;
    }
  | {
      ok: false;
      codigo: "CONFLITO_AGENDAMENTO" | "CONFLITO_BLOQUEIO";
      titulo: string;
      mensagem: string;
      campo: "hora";
    };

type ErroEsperadoAgendamento = Extract<
  ResultadoSalvarAgenda,
  { ok: false }
>;

type ParametrosConflitoAgenda = {
  profissionalId?: number;
  data: Date;
  duracao: number;
  ignoreId?: number;
  ignoreBloqueioId?: number;
};

function normalizarNaturezaAtendimento(
  value?: NaturezaAtendimentoAgenda,
): NaturezaAtendimentoAgenda {
  return value === "RETORNO" ? "RETORNO" : "PROCEDIMENTO";
}

export type NovoBloqueioAgenda = {
  profissionalId: number;
  data: string;
  duracao?: number;
  motivo: string;
  observacoes?: string;
  recorrencia?: RecorrenciaAgendaInput;
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

type RecorrenciaNormalizada = {
  tipo: "nenhuma" | "semanal" | "quinzenal" | "mensal" | "personalizada";
  intervalo: number;
  unidade: "dias" | "semanas" | "meses";
  ocorrencias: number;
};

function normalizarRecorrencia(
  recorrencia?: RecorrenciaAgendaInput,
): RecorrenciaNormalizada {
  const tipo = recorrencia?.tipo || "nenhuma";

  if (tipo === "nenhuma") {
    return {
      tipo,
      intervalo: 1,
      unidade: "semanas",
      ocorrencias: 1,
    };
  }

  const ocorrencias = Math.min(52, Math.max(2, recorrencia?.ocorrencias || 4));

  if (tipo === "semanal") {
    return { tipo, intervalo: 1, unidade: "semanas", ocorrencias };
  }

  if (tipo === "quinzenal") {
    return { tipo, intervalo: 2, unidade: "semanas", ocorrencias };
  }

  if (tipo === "mensal") {
    return { tipo, intervalo: 1, unidade: "meses", ocorrencias };
  }

  return {
    tipo,
    intervalo: Math.min(90, Math.max(1, recorrencia?.intervalo || 1)),
    unidade: recorrencia?.unidade || "semanas",
    ocorrencias,
  };
}

function addDaysFixed(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMonthsSaoPaulo(date: Date, monthsToAdd: number) {
  const [year, month, day] = formatDateSaoPaulo(date).split("-").map(Number);
  const totalMonths = year * 12 + (month - 1) + monthsToAdd;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonthIndex = ((totalMonths % 12) + 12) % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonthIndex + 1, 0),
  ).getUTCDate();
  const targetDay = Math.min(day, lastDay);
  const targetDate = `${targetYear}-${String(targetMonthIndex + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;

  return parseLocalDateTime(`${targetDate}T${formatHourMinute(date)}`);
}

function gerarDatasRecorrencia(
  dataBase: Date,
  recorrencia?: RecorrenciaAgendaInput,
) {
  const regra = normalizarRecorrencia(recorrencia);

  return {
    regra,
    datas: Array.from({ length: regra.ocorrencias }, (_, index) => {
      if (index === 0) return new Date(dataBase);

      if (regra.unidade === "meses") {
        return addMonthsSaoPaulo(dataBase, regra.intervalo * index);
      }

      const diasPorUnidade = regra.unidade === "semanas" ? 7 : 1;
      return addDaysFixed(dataBase, regra.intervalo * diasPorUnidade * index);
    }),
  };
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

async function obterConflitoAgenda({
  profissionalId,
  data,
  duracao,
  ignoreId,
  ignoreBloqueioId,
}: ParametrosConflitoAgenda): Promise<ErroEsperadoAgendamento | null> {
  if (!profissionalId) return null;

  const inicioNovo = data;
  const fimNovo = addMinutes(inicioNovo, duracao);
  const dataSaoPaulo = formatDateSaoPaulo(data);
  const dataTexto = dataSaoPaulo.split("-").reverse().join("/");
  const inicioNovoTexto = formatHourMinute(inicioNovo);
  const fimNovoTexto = formatHourMinute(fimNovo);
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

    return {
      ok: false,
      codigo: "CONFLITO_AGENDAMENTO",
      titulo: "Horário indisponível",
      mensagem: `Não foi possível salvar. Em ${dataTexto}, o intervalo escolhido (${inicioNovoTexto} às ${fimNovoTexto}) se sobrepõe ao atendimento de ${conflitoAgendamento.cliente.nome}, marcado das ${inicio} às ${fim}. Escolha outro horário ou ajuste a duração.`,
      campo: "hora",
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
      ok: false,
      codigo: "CONFLITO_BLOQUEIO",
      titulo: "Horário bloqueado",
      mensagem: `Não foi possível salvar. Em ${dataTexto}, o intervalo escolhido (${inicioNovoTexto} às ${fimNovoTexto}) se sobrepõe ao bloqueio “${conflitoBloqueio.motivo}”, das ${inicio} às ${fim}. Escolha outro horário ou edite o bloqueio existente.`,
      campo: "hora",
    };
  }

  return null;
}

async function validarConflitoAgenda(
  parametros: ParametrosConflitoAgenda,
) {
  const conflito = await obterConflitoAgenda(parametros);

  if (conflito) {
    throw new Error(conflito.mensagem);
  }
}

async function validarDatasNoHorarioFuncionamento(datas: Date[]) {
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

  for (const data of datas) {
    const dataTexto = formatDateSaoPaulo(data);
    const diaSemana = getDiaSemana(dataTexto);
    const funcionamento =
      diaSemana === 0
        ? configuracaoHorario.domingo
        : diaSemana === 6
          ? configuracaoHorario.sabado
          : configuracaoHorario.semana;

    if (!funcionamento) {
      throw new Error(
        `A recorrência inclui ${dataTexto}, dia em que a clínica está fechada. Ajuste a repetição antes de salvar.`,
      );
    }

    const inicio = minutosDoHorario(formatHourMinute(data));
    const abertura = minutosDoHorario(funcionamento.abertura);
    const ultimoInicio = minutosDoHorario(funcionamento.fechamento);

    if (inicio < abertura || inicio > ultimoInicio) {
      throw new Error(
        `O horário de ${dataTexto} fica fora da faixa permitida para iniciar atendimentos (${funcionamento.abertura} às ${funcionamento.fechamento}). Ajuste a série antes de salvar.`,
      );
    }
  }
}

export async function criarAgendamento(
  dados: NovoAgendamento,
): Promise<ResultadoSalvarAgenda> {
  const usuarioAtual = await requirePermission("agenda.gerenciar");
  const areaPadrao = obterAreaPadraoAgendamento(
    usuarioAtual.nome,
    isAdminUser(usuarioAtual),
  );
  const areaEstetica = Boolean(dados.areaEstetica) || areaPadrao === "estetica";
  const areaCilios = Boolean(dados.areaCilios) || areaPadrao === "cilios";

  const naturezaAtendimento = normalizarNaturezaAtendimento(
    dados.naturezaAtendimento,
  );

  if (naturezaAtendimento === "RETORNO" && !dados.clienteId) {
    throw new Error("O retorno deve ser vinculado a um cliente já cadastrado.");
  }

  const dataBase = parseLocalDateTime(dados.data);
  const duracao = dados.duracao || 60;
  const recorrenciaAplicada =
    naturezaAtendimento === "RETORNO"
      ? ({ tipo: "nenhuma" } as const)
      : dados.recorrencia;
  const { regra, datas } = gerarDatasRecorrencia(
    dataBase,
    recorrenciaAplicada,
  );
  const valorAgendamento =
    naturezaAtendimento === "RETORNO"
      ? 0
      : Math.max(0, Number(dados.valor) || 0);

  await validarDatasNoHorarioFuncionamento(datas);

  for (const data of datas) {
    const conflito = await obterConflitoAgenda({
      profissionalId: dados.profissionalId,
      data,
      duracao,
    });

    if (conflito) {
      return conflito;
    }
  }

  const serieId = datas.length > 1 ? randomUUID() : null;

  await prisma.$transaction(async (tx) => {
    let clienteId = dados.clienteId;

    if (!clienteId) {
      if (!dados.novoCliente?.nome?.trim()) {
        throw new Error(
          "Informe um cliente cadastrado ou cadastre um novo cliente.",
        );
      }

      const cliente = await tx.cliente.create({
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
          areaEstetica,
          areaCilios,
        },
      });

      clienteId = cliente.id;
    } else if (areaEstetica || areaCilios) {
      await tx.cliente.update({
        where: { id: clienteId },
        data: {
          areaEstetica: areaEstetica ? true : undefined,
          areaCilios: areaCilios ? true : undefined,
        },
      });
    }

    let agendamentoOrigemId: number | null = null;

    if (naturezaAtendimento === "RETORNO" && dados.agendamentoOrigemId) {
      const agendamentoOrigem = await tx.agendamento.findUnique({
        where: { id: dados.agendamentoOrigemId },
        select: { id: true, clienteId: true },
      });

      if (!agendamentoOrigem) {
        throw new Error("O atendimento de origem do retorno não foi encontrado.");
      }

      if (agendamentoOrigem.clienteId !== clienteId) {
        throw new Error(
          "O retorno deve pertencer ao mesmo cliente do atendimento de origem.",
        );
      }

      agendamentoOrigemId = agendamentoOrigem.id;
    }

    await tx.agendamento.createMany({
      data: datas.map((data, index) => ({
        clienteId: clienteId!,
        profissionalId: dados.profissionalId || null,
        procedimento: dados.procedimento,
        data,
        duracao,
        valor: valorAgendamento,
        status: dados.status || "Agendado",
        observacoes: dados.observacoes || null,
        sinalPago:
          naturezaAtendimento === "RETORNO"
            ? false
            : Boolean(dados.sinalPago),
        naturezaAtendimento,
        agendamentoOrigemId,
        serieId,
        recorrenciaTipo: serieId ? regra.tipo : null,
        recorrenciaIntervalo: serieId ? regra.intervalo : null,
        recorrenciaIndice: serieId ? index + 1 : null,
        recorrenciaTotal: serieId ? datas.length : null,
      })),
    });
  });

  revalidatePath("/agenda");
  revalidatePath("/clientes");
  revalidatePath("/");

  return { ok: true };
}

export async function atualizarAgendamento({
  id,
  ...dados
}: NovoAgendamento & { id: number }): Promise<ResultadoSalvarAgenda> {
  await requirePermission("agenda.gerenciar");

  const naturezaAtendimento = normalizarNaturezaAtendimento(
    dados.naturezaAtendimento,
  );

  if (naturezaAtendimento === "RETORNO" && !dados.clienteId) {
    throw new Error("O retorno deve ser vinculado a um cliente já cadastrado.");
  }

  const data = parseLocalDateTime(dados.data);
  const duracao = dados.duracao || 60;
  const valorAgendamento =
    naturezaAtendimento === "RETORNO"
      ? 0
      : Math.max(0, Number(dados.valor) || 0);

  await validarDatasNoHorarioFuncionamento([data]);

  const conflito = await obterConflitoAgenda({
    profissionalId: dados.profissionalId,
    data,
    duracao,
    ignoreId: id,
  });

  if (conflito) {
    return conflito;
  }

  const clienteId = dados.clienteId || (await resolverCliente(dados));

  await prisma.$transaction(async (tx) => {
    let agendamentoOrigemId: number | null = null;

    if (naturezaAtendimento === "RETORNO" && dados.agendamentoOrigemId) {
      if (dados.agendamentoOrigemId === id) {
        throw new Error("Um retorno não pode ser vinculado a ele mesmo.");
      }

      const agendamentoOrigem = await tx.agendamento.findUnique({
        where: { id: dados.agendamentoOrigemId },
        select: { id: true, clienteId: true },
      });

      if (!agendamentoOrigem) {
        throw new Error("O atendimento de origem do retorno não foi encontrado.");
      }

      if (agendamentoOrigem.clienteId !== clienteId) {
        throw new Error(
          "O retorno deve pertencer ao mesmo cliente do atendimento de origem.",
        );
      }

      agendamentoOrigemId = agendamentoOrigem.id;
    }

    if (dados.areaEstetica || dados.areaCilios) {
      await tx.cliente.update({
        where: { id: clienteId },
        data: {
          areaEstetica: dados.areaEstetica ? true : undefined,
          areaCilios: dados.areaCilios ? true : undefined,
        },
      });
    }

    await tx.agendamento.update({
      where: {
        id,
      },
      data: {
        clienteId,
        profissionalId: dados.profissionalId || null,
        procedimento: dados.procedimento,
        data,
        duracao,
        valor: valorAgendamento,
        status: dados.status || "Agendado",
        observacoes: dados.observacoes || null,
        sinalPago:
          naturezaAtendimento === "RETORNO"
            ? false
            : Boolean(dados.sinalPago),
        naturezaAtendimento,
        agendamentoOrigemId,
        statusAntesAtendimento:
          dados.status === "Em atendimento" ? undefined : null,
      },
    });
  });

  revalidatePath("/agenda");
  revalidatePath("/clientes");
  revalidatePath("/");

  return { ok: true };
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

export async function cancelarSerieAgendamento({
  id,
  escopo = "seguintes",
}: {
  id: number;
  escopo?: "seguintes" | "toda";
}) {
  await requirePermission("agenda.gerenciar");

  const atual = await prisma.agendamento.findUnique({
    where: { id },
    select: { serieId: true, data: true },
  });

  if (!atual?.serieId) {
    throw new Error("Este agendamento não pertence a uma série recorrente.");
  }

  const resultado = await prisma.agendamento.updateMany({
    where: {
      serieId: atual.serieId,
      ...(escopo === "seguintes" ? { data: { gte: atual.data } } : {}),
      status: { notIn: ["Atendido", "Em atendimento", "Cancelado"] },
    },
    data: { status: "Cancelado" },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Agenda",
      acao: escopo === "toda" ? "Cancelou série recorrente" : "Cancelou recorrências futuras",
      entidade: "Agendamento",
      entidadeId: String(id),
      usuario: "Equipe Studio Realçar",
      detalhes: `${resultado.count} agendamento(s) recorrente(s) cancelado(s).`,
    },
  });

  revalidatePath("/agenda");
  revalidatePath("/");
}

export async function criarBloqueioAgenda(
  dados: NovoBloqueioAgenda,
): Promise<ResultadoSalvarAgenda> {
  await requirePermission("agenda.gerenciar");

  if (!dados.profissionalId) {
    throw new Error("Selecione a profissional para o bloqueio.");
  }

  if (!dados.motivo?.trim()) {
    throw new Error("Informe o motivo do bloqueio.");
  }

  const dataBase = parseLocalDateTime(dados.data);
  const duracao = Math.max(5, dados.duracao || 60);
  const { regra, datas } = gerarDatasRecorrencia(dataBase, dados.recorrencia);

  await validarDatasNoHorarioFuncionamento(datas);

  for (const data of datas) {
    const conflito = await obterConflitoAgenda({
      profissionalId: dados.profissionalId,
      data,
      duracao,
    });

    if (conflito) {
      return conflito;
    }
  }

  const serieId = datas.length > 1 ? randomUUID() : null;

  await prisma.$transaction(async (tx) => {
    await tx.bloqueioAgenda.createMany({
      data: datas.map((data, index) => ({
        profissionalId: dados.profissionalId,
        data,
        duracao,
        motivo: dados.motivo.trim(),
        observacoes: dados.observacoes?.trim() || null,
        status: "Ativo",
        serieId,
        recorrenciaTipo: serieId ? regra.tipo : null,
        recorrenciaIntervalo: serieId ? regra.intervalo : null,
        recorrenciaIndice: serieId ? index + 1 : null,
        recorrenciaTotal: serieId ? datas.length : null,
      })),
    });

    await tx.auditoria.create({
      data: {
        modulo: "Agenda",
        acao: serieId ? "Criou série de bloqueios" : "Criou bloqueio de agenda",
        entidade: "BloqueioAgenda",
        entidadeId: serieId || "novo",
        usuario: "Equipe Studio Realçar",
        detalhes: serieId
          ? `${datas.length} bloqueios recorrentes criados para ${dados.motivo.trim()}.`
          : `${dados.motivo.trim()} em ${formatDateSaoPaulo(dataBase)} das ${formatHourMinute(dataBase)} às ${formatHourMinute(addMinutes(dataBase, duracao))}.`,
      },
    });
  });

  revalidatePath("/agenda");
  revalidatePath("/");

  return { ok: true };
}

export async function atualizarBloqueioAgenda({
  id,
  ...dados
}: NovoBloqueioAgenda & { id: number }): Promise<ResultadoSalvarAgenda> {
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

  await validarDatasNoHorarioFuncionamento([data]);

  const conflito = await obterConflitoAgenda({
    profissionalId: dados.profissionalId,
    data,
    duracao,
    ignoreBloqueioId: id,
  });

  if (conflito) {
    return conflito;
  }

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

  return { ok: true };
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

export async function excluirSerieBloqueioAgenda({
  id,
  escopo = "seguintes",
}: {
  id: number;
  escopo?: "seguintes" | "toda";
}) {
  await requirePermission("agenda.gerenciar");

  const atual = await prisma.bloqueioAgenda.findUnique({
    where: { id },
    select: { serieId: true, data: true, motivo: true },
  });

  if (!atual?.serieId) {
    throw new Error("Este bloqueio não pertence a uma série recorrente.");
  }

  const resultado = await prisma.bloqueioAgenda.deleteMany({
    where: {
      serieId: atual.serieId,
      ...(escopo === "seguintes" ? { data: { gte: atual.data } } : {}),
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Agenda",
      acao: escopo === "toda" ? "Excluiu série de bloqueios" : "Excluiu bloqueios futuros da série",
      entidade: "BloqueioAgenda",
      entidadeId: String(id),
      usuario: "Equipe Studio Realçar",
      detalhes: `${resultado.count} bloqueio(s) removido(s) da série ${atual.motivo}.`,
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

  if (agendamento.status === "Em atendimento") {
    throw new Error("Este atendimento já está em andamento.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.agendamento.update({
      where: {
        id: agendamento.id,
      },
      data: {
        statusAntesAtendimento: agendamento.status,
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

export async function desfazerInicioAtendimento(agendamentoId: number) {
  await requirePermission("agenda.gerenciar");

  if (!agendamentoId) {
    throw new Error("Agendamento inválido.");
  }

  const agendamento = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: {
      cliente: { select: { nome: true } },
      profissional: { select: { nome: true } },
    },
  });

  if (!agendamento) {
    throw new Error("Agendamento não encontrado.");
  }

  if (agendamento.status !== "Em atendimento") {
    throw new Error("Este atendimento não está em andamento.");
  }

  const statusRestaurado =
    agendamento.statusAntesAtendimento?.trim() || "Agendado";

  await prisma.$transaction(async (tx) => {
    await tx.agendamento.update({
      where: { id: agendamento.id },
      data: {
        status: statusRestaurado,
        statusAntesAtendimento: null,
      },
    });

    await tx.auditoria.create({
      data: {
        modulo: "Agenda",
        acao: "Desfez início de atendimento",
        entidade: "Agendamento",
        entidadeId: String(agendamento.id),
        usuario: agendamento.profissional?.nome || "Equipe Studio Realçar",
        detalhes: `Atendimento de ${agendamento.cliente.nome} retornou para o status ${statusRestaurado}.`,
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
  procedimentoServicoId?: number | null;
  valorCobrado: number;
  custoServico?: number;
  produtos?: VendaProdutoInput[];
  kits?: VendaKitInput[];
  permitirEstoqueNegativo?: boolean;
  formaPagamento: string;
  statusPagamento: string;
  evolucao?: string;
  observacoes?: string;
  dataAtendimento?: string;
};

export async function finalizarAtendimento(dados: FinalizarAtendimentoInput) {
  const usuarioAtual = await requirePermission("agenda.gerenciar");

  if (!dados.agendamentoId) {
    throw new Error("Agendamento inválido.");
  }

  if (!dados.procedimentoRealizado?.trim()) {
    throw new Error("Informe o procedimento realizado.");
  }

  const valorCobradoInformado = Number.isFinite(Number(dados.valorCobrado))
    ? Math.max(0, Number(dados.valorCobrado))
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

  if (agendamento.status === "Atendido") {
    throw new Error("Este atendimento já foi finalizado.");
  }

  const atendimentoRetorno =
    agendamento.naturezaAtendimento === "RETORNO";
  const valorCobrado = atendimentoRetorno ? 0 : valorCobradoInformado;

  const profissional =
    dados.profissional?.trim() ||
    agendamento.profissional?.nome ||
    "Equipe Studio Realçar";

  const procedimentoRealizado = dados.procedimentoRealizado.trim();
  const observacoes = dados.observacoes?.trim() || null;
  const evolucaoClinica = dados.evolucao?.trim() || null;

  const servicoBase = dados.procedimentoServicoId
    ? await prisma.procedimentoServico.findUnique({
        where: { id: dados.procedimentoServicoId },
        select: { id: true, custoPadrao: true },
      })
    : await prisma.procedimentoServico.findUnique({
        where: { nome: procedimentoRealizado },
        select: { id: true, custoPadrao: true },
      });

  const custoServico = atendimentoRetorno
    ? 0
    : Number.isFinite(Number(dados.custoServico))
      ? Math.max(0, Number(dados.custoServico))
      : Math.max(0, servicoBase?.custoPadrao || 0);

  const produtos = (dados.produtos || []).filter(
    (item) => item.produtoId > 0 && item.quantidade > 0,
  );
  const kits = (dados.kits || []).filter(
    (item) => item.kitId > 0 && item.quantidade > 0,
  );
  const permitirEstoqueNegativo =
    Boolean(dados.permitirEstoqueNegativo) && isAdminUser(usuarioAtual);

  if (dados.permitirEstoqueNegativo && !permitirEstoqueNegativo) {
    throw new Error("Somente administradores podem autorizar estoque negativo.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.clienteProcedimento.create({
      data: {
        clienteId: agendamento.clienteId,
        nome: procedimentoRealizado,
        profissional,
        valor: valorCobrado,
        status: atendimentoRetorno ? "Retorno" : "Realizado",
        dataProcedimento: dataAtendimento,
        observacoes,
      },
    });

    if (evolucaoClinica) {
      await tx.clienteEvolucao.create({
        data: {
          clienteId: agendamento.clienteId,
          agendamentoId: agendamento.id,
          titulo: `Atendimento - ${procedimentoRealizado}`,
          descricao: evolucaoClinica,
          profissional,
          dataRegistro: dataAtendimento,
        },
      });
    }

    const venda = await criarVendaNoTx(tx, {
      clienteId: agendamento.clienteId,
      agendamentoId: agendamento.id,
      data: dataAtendimento,
      formaPagamento,
      statusPagamento,
      origem: atendimentoRetorno ? "Agenda - Retorno" : "Agenda",
      observacoes,
      servico: {
        procedimentoServicoId: servicoBase?.id || null,
        descricao: procedimentoRealizado,
        valorUnitario: valorCobrado,
        custoUnitario: custoServico,
      },
      produtos,
      kits,
      permitirEstoqueNegativo,
      estoqueNegativoAutorizadoPor: permitirEstoqueNegativo
        ? usuarioAtual.email
        : null,
    });

    await tx.agendamento.update({
      where: { id: agendamento.id },
      data: {
        status: "Atendido",
        statusAntesAtendimento: null,
        evolucaoStatus: evolucaoClinica ? "CONCLUIDA" : "PENDENTE",
        evolucaoPendenteDesde: evolucaoClinica ? null : dataAtendimento,
        evolucaoRegistradaEm: evolucaoClinica ? dataAtendimento : null,
        evolucaoRegistradaPor: evolucaoClinica ? profissional : null,
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
        status: "Ativa",
      },
    });

    const leadVinculado = await tx.lead.findUnique({
      where: { agendamentoId: agendamento.id },
      select: { id: true, etapa: true },
    });

    if (leadVinculado?.etapa === "Avaliação") {
      await tx.lead.update({
        where: { id: leadVinculado.id },
        data: { etapa: "Negociação" },
      });

      await tx.leadInteracao.create({
        data: {
          leadId: leadVinculado.id,
          tipo: "Atendimento",
          descricao: `Atendimento concluído: ${procedimentoRealizado}. Lead movido automaticamente para Negociação.`,
        },
      });
    }

    await tx.auditoria.create({
      data: {
        modulo: "Agenda",
        acao: atendimentoRetorno
          ? evolucaoClinica
            ? "Finalizou retorno e registrou evolução"
            : "Finalizou retorno com evolução pendente"
          : evolucaoClinica
            ? "Finalizou atendimento, registrou evolução e venda"
            : "Finalizou atendimento com evolução pendente e registrou venda",
        entidade: "Venda",
        entidadeId: String(venda.vendaId),
        usuario: profissional,
        detalhes: `${atendimentoRetorno ? "Retorno" : "Atendimento"} finalizado para ${agendamento.cliente.nome}. Evolução: ${evolucaoClinica ? "registrada" : "pendente"}. Serviço: R$ ${venda.totalServicos.toFixed(2)}. Produtos e kits: R$ ${venda.totalProdutos.toFixed(2)}. Total: R$ ${venda.valorTotal.toFixed(2)}. Custo direto: R$ ${venda.custoTotal.toFixed(2)}. Pagamento: ${statusPagamento}.${venda.estoqueNegativoAutorizado ? ` Estoque negativo autorizado por ${usuarioAtual.email}.` : ""}`,
      },
    });
  });

  revalidatePath("/vendas");
  revalidatePath("/estoque");
  revalidatePath("/financeiro");
  revalidatePath("/gestao");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${agendamento.clienteId}`);
  revalidatePath("/relatorios");
  revalidatePath("/marketing");
  revalidatePath("/");

  return {
    ok: true,
    agendamentoId: agendamento.id,
    status: "Atendido" as const,
    procedimento: procedimentoRealizado,
    valor: valorCobrado,
    dataAtendimento: dataAtendimento.toISOString(),
    evolucaoStatus: evolucaoClinica
      ? ("CONCLUIDA" as const)
      : ("PENDENTE" as const),
  };
}

export type RegistrarEvolucaoPendenteInput = {
  agendamentoId: number;
  descricao: string;
  profissional?: string;
  dataRegistro?: string;
};

export async function registrarEvolucaoPendente(
  dados: RegistrarEvolucaoPendenteInput,
) {
  const usuario = await requirePermission("clientes.clinico");

  if (!dados.agendamentoId) {
    throw new Error("Atendimento inválido.");
  }

  const descricao = dados.descricao?.trim();

  if (!descricao) {
    throw new Error("Informe a evolução clínica.");
  }

  const dataRegistro = dados.dataRegistro
    ? new Date(dados.dataRegistro)
    : new Date();

  if (Number.isNaN(dataRegistro.getTime())) {
    throw new Error("Data da evolução inválida.");
  }

  const agendamento = await prisma.agendamento.findUnique({
    where: { id: dados.agendamentoId },
    include: {
      cliente: { select: { id: true, nome: true } },
      profissional: { select: { nome: true } },
      evolucao: { select: { id: true } },
    },
  });

  if (!agendamento) {
    throw new Error("Atendimento não encontrado.");
  }

  if (agendamento.status !== "Atendido") {
    throw new Error("A evolução posterior só pode ser registrada em atendimento finalizado.");
  }

  if (agendamento.evolucao || agendamento.evolucaoStatus === "CONCLUIDA") {
    throw new Error("Este atendimento já possui evolução registrada.");
  }

  if (agendamento.evolucaoStatus !== "PENDENTE") {
    throw new Error("Este atendimento não está marcado com evolução pendente.");
  }

  const profissional =
    dados.profissional?.trim() ||
    agendamento.profissional?.nome ||
    usuario.nome ||
    usuario.email;

  await prisma.$transaction(async (tx) => {
    await tx.clienteEvolucao.create({
      data: {
        clienteId: agendamento.clienteId,
        agendamentoId: agendamento.id,
        titulo: `Atendimento - ${agendamento.procedimento}`,
        descricao,
        profissional,
        dataRegistro,
      },
    });

    await tx.agendamento.update({
      where: { id: agendamento.id },
      data: {
        evolucaoStatus: "CONCLUIDA",
        evolucaoPendenteDesde: null,
        evolucaoRegistradaEm: dataRegistro,
        evolucaoRegistradaPor: profissional,
      },
    });

    await tx.auditoria.create({
      data: {
        modulo: "Clientes",
        acao: "Registrou evolução pendente",
        entidade: "Agendamento",
        entidadeId: String(agendamento.id),
        usuario: profissional,
        detalhes: `Evolução do atendimento ${agendamento.procedimento} registrada posteriormente para ${agendamento.cliente.nome}.`,
      },
    });
  });

  revalidatePath("/agenda");
  revalidatePath("/");
  revalidatePath(`/clientes/${agendamento.clienteId}`);

  return {
    ok: true,
    agendamentoId: agendamento.id,
    clienteId: agendamento.clienteId,
    evolucaoStatus: "CONCLUIDA" as const,
    evolucaoRegistradaEm: dataRegistro.toISOString(),
    evolucaoRegistradaPor: profissional,
  };
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
) {
  if (!funcionamento) {
    return [];
  }

  const slots: string[] = [];
  const abertura = minutosDoHorario(funcionamento.abertura);
  const ultimoInicio = minutosDoHorario(funcionamento.fechamento);

  for (
    let minutos = abertura;
    minutos <= ultimoInicio;
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
