import { canAccess, requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import ComunicacoesClient from "./components/ComunicacoesClient";
import type {
  ComunicacaoFilaItem,
  ComunicacaoHistoricoItem,
  ComunicacaoResumo,
  MensagemModeloItem,
} from "./types";

const TIMEZONE = "America/Sao_Paulo";
const UM_DIA = 24 * 60 * 60 * 1000;

function dataISOEmSaoPaulo(data: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIMEZONE,
  }).formatToParts(data);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function somarDiasISO(dataISO: string, dias: number) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return data.toISOString().slice(0, 10);
}

function inicioDia(dataISO: string) {
  return new Date(`${dataISO}T00:00:00-03:00`);
}

function formatarData(data: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIMEZONE,
  }).format(new Date(data));
}

function formatarHorario(data: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  }).format(new Date(data));
}

function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] || nome;
}

function renderizarModelo(
  corpo: string,
  variaveis: Record<string, string | null | undefined>,
) {
  return corpo.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, chave: string) => {
    return variaveis[chave] ?? "";
  });
}

function chaveRegistro(params: {
  categoria: string;
  clienteId?: number | null;
  leadId?: number | null;
  agendamentoId?: number | null;
}) {
  if (params.agendamentoId) return `agendamento:${params.agendamentoId}:${params.categoria}`;
  if (params.leadId) return `lead:${params.leadId}:${params.categoria}`;
  if (params.clienteId) return `cliente:${params.clienteId}:${params.categoria}`;
  return `sem-id:${params.categoria}`;
}

export default async function ComunicacoesPage() {
  const usuario = await requirePagePermission("marketing.visualizar");
  const podeGerenciar = canAccess(usuario, "marketing.gerenciar");

  const agora = new Date();
  const hojeISO = dataISOEmSaoPaulo(agora);
  const ontemISO = somarDiasISO(hojeISO, -1);
  const amanhaISO = somarDiasISO(hojeISO, 1);
  const depoisAmanhaISO = somarDiasISO(hojeISO, 2);

  const inicioOntem = inicioDia(ontemISO);
  const inicioHoje = inicioDia(hojeISO);
  const inicioAmanha = inicioDia(amanhaISO);
  const inicioDepoisAmanha = inicioDia(depoisAmanhaISO);
  const sessentaDiasAtras = new Date(inicioHoje.getTime() - 60 * UM_DIA);
  const tresDiasAtras = new Date(inicioHoje.getTime() - 3 * UM_DIA);

  const [
    modelos,
    configuracao,
    confirmacoes,
    posAtendimentos,
    faltas,
    clientesNascimento,
    clientesReativacao,
    leadsAbertos,
    registrosHoje,
    historico,
  ] = await Promise.all([
    prisma.mensagemModelo.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
    prisma.configuracaoClinica.findFirst(),
    prisma.agendamento.findMany({
      where: {
        data: { gte: inicioAmanha, lt: inicioDepoisAmanha },
        status: "Agendado",
      },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true, whatsapp: true } },
        profissional: { select: { nome: true } },
      },
      orderBy: { data: "asc" },
    }),
    prisma.agendamento.findMany({
      where: {
        data: { gte: inicioOntem, lt: inicioHoje },
        status: "Atendido",
      },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true, whatsapp: true } },
        profissional: { select: { nome: true } },
      },
      orderBy: { data: "desc" },
      take: 30,
    }),
    prisma.agendamento.findMany({
      where: {
        data: { gte: inicioOntem, lt: inicioHoje },
        status: "Faltou",
      },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true, whatsapp: true } },
      },
      orderBy: { data: "desc" },
      take: 20,
    }),
    prisma.cliente.findMany({
      where: { nascimento: { not: null }, status: { not: "Inativa" } },
      select: { id: true, nome: true, nascimento: true, telefone: true, whatsapp: true },
    }),
    prisma.cliente.findMany({
      where: {
        ultimaVisita: { lt: sessentaDiasAtras },
        status: { not: "Inativa" },
        agendamentos: {
          none: {
            data: { gte: inicioHoje },
            status: { not: "Cancelado" },
          },
        },
      },
      select: {
        id: true,
        nome: true,
        telefone: true,
        whatsapp: true,
        ultimaVisita: true,
        procedimento: true,
      },
      orderBy: { ultimaVisita: "asc" },
      take: 30,
    }),
    prisma.lead.findMany({
      where: { etapa: { notIn: ["Convertido", "Perdido"] } },
      select: {
        id: true,
        nome: true,
        telefone: true,
        interesse: true,
        etapa: true,
        clienteId: true,
        ultimoContatoEm: true,
        proximoContatoEm: true,
        updatedAt: true,
        agendamento: { select: { id: true, data: true, status: true, procedimento: true } },
      },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.comunicacaoRegistro.findMany({
      where: { createdAt: { gte: inicioHoje, lt: inicioAmanha } },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.comunicacaoRegistro.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  const clinica = configuracao?.nome || "Studio Realçar";
  const modelosTipados = modelos as MensagemModeloItem[];
  const modelosPorChave = new Map<string, MensagemModeloItem>(
    modelosTipados.map((modelo) => [modelo.chave, modelo]),
  );
  const registrosPorChave = new Map<string, (typeof registrosHoje)[number]>();
  const enviadosHojePorChave = new Map<string, (typeof registrosHoje)[number]>();

  for (const registro of registrosHoje) {
    const chave = chaveRegistro({
      categoria: registro.categoria,
      clienteId: registro.clienteId,
      leadId: registro.leadId,
      agendamentoId: registro.agendamentoId,
    });
    if (!registrosPorChave.has(chave)) registrosPorChave.set(chave, registro);
    if (registro.status === "Enviada" && !enviadosHojePorChave.has(chave)) {
      enviadosHojePorChave.set(chave, registro);
    }
  }

  const fila: ComunicacaoFilaItem[] = [];

  function adicionarItem(params: {
    id: string;
    prioridade: number;
    categoria: string;
    modeloChave: string;
    nome: string;
    telefone: string | null;
    clienteId?: number | null;
    leadId?: number | null;
    agendamentoId?: number | null;
    detalhe: string;
    destinoHref: string;
    variaveis?: Record<string, string | null | undefined>;
  }) {
    const modelo = modelosPorChave.get(params.modeloChave);
    if (!modelo || !modelo.ativo) return;

    const chaveComunicacao = chaveRegistro({
      categoria: params.categoria,
      clienteId: params.clienteId,
      leadId: params.leadId,
      agendamentoId: params.agendamentoId,
    });
    const registroHoje = registrosPorChave.get(chaveComunicacao);
    const envioHoje = enviadosHojePorChave.get(chaveComunicacao);

    fila.push({
      id: params.id,
      prioridade: params.prioridade,
      categoria: params.categoria,
      modeloChave: params.modeloChave,
      modeloId: modelo.id,
      nome: params.nome,
      telefone: params.telefone,
      clienteId: params.clienteId || null,
      leadId: params.leadId || null,
      agendamentoId: params.agendamentoId || null,
      detalhe: params.detalhe,
      destinoHref: params.destinoHref,
      mensagem: renderizarModelo(modelo.corpo, {
        primeiro_nome: primeiroNome(params.nome),
        nome: params.nome,
        clinica,
        interesse_texto: params.variaveis?.interesse
          ? ` sobre ${params.variaveis.interesse}`
          : "",
        ...params.variaveis,
      }),
      enviadaHoje: Boolean(envioHoje),
      ultimaComunicacaoEm: envioHoje
        ? (envioHoje.enviadoEm || envioHoje.createdAt).toISOString()
        : registroHoje
          ? (registroHoje.abertoEm || registroHoje.createdAt).toISOString()
          : null,
    });
  }

  for (const item of confirmacoes) {
    adicionarItem({
      id: `confirmacao-${item.id}`,
      prioridade: 10,
      categoria: "Confirmação de agendamento",
      modeloChave: "confirmacao_agendamento",
      nome: item.cliente.nome,
      telefone: item.cliente.whatsapp || item.cliente.telefone,
      clienteId: item.cliente.id,
      agendamentoId: item.id,
      detalhe: `${formatarData(item.data)} às ${formatarHorario(item.data)} · ${item.procedimento}`,
      destinoHref: `/agenda?data=${dataISOEmSaoPaulo(item.data)}`,
      variaveis: {
        procedimento: item.procedimento,
        data: formatarData(item.data),
        horario: formatarHorario(item.data),
        profissional: item.profissional?.nome || "",
      },
    });
  }

  const [anoHoje, mesHoje, diaHoje] = hojeISO.split("-").map(Number);
  void anoHoje;
  for (const cliente of clientesNascimento) {
    if (!cliente.nascimento) continue;
    if (
      cliente.nascimento.getUTCMonth() + 1 === mesHoje &&
      cliente.nascimento.getUTCDate() === diaHoje
    ) {
      adicionarItem({
        id: `aniversario-${cliente.id}`,
        prioridade: 20,
        categoria: "Aniversário",
        modeloChave: "aniversario",
        nome: cliente.nome,
        telefone: cliente.whatsapp || cliente.telefone,
        clienteId: cliente.id,
        detalhe: "Cliente aniversariante de hoje.",
        destinoHref: `/clientes/${cliente.id}`,
      });
    }
  }

  for (const item of posAtendimentos) {
    adicionarItem({
      id: `pos-${item.id}`,
      prioridade: 30,
      categoria: "Pós-atendimento",
      modeloChave: "pos_atendimento",
      nome: item.cliente.nome,
      telefone: item.cliente.whatsapp || item.cliente.telefone,
      clienteId: item.cliente.id,
      agendamentoId: item.id,
      detalhe: `Atendido ontem · ${item.procedimento}`,
      destinoHref: `/clientes/${item.cliente.id}`,
      variaveis: {
        procedimento: item.procedimento,
        data: formatarData(item.data),
        horario: formatarHorario(item.data),
        profissional: item.profissional?.nome || "",
      },
    });
  }

  for (const item of faltas) {
    adicionarItem({
      id: `falta-${item.id}`,
      prioridade: 35,
      categoria: "Falta",
      modeloChave: "cliente_faltou",
      nome: item.cliente.nome,
      telefone: item.cliente.whatsapp || item.cliente.telefone,
      clienteId: item.cliente.id,
      agendamentoId: item.id,
      detalhe: `Faltou ao horário de ${formatarData(item.data)} às ${formatarHorario(item.data)}.`,
      destinoHref: `/agenda?data=${dataISOEmSaoPaulo(item.data)}`,
      variaveis: {
        procedimento: item.procedimento,
        data: formatarData(item.data),
        horario: formatarHorario(item.data),
      },
    });
  }

  const leadsJaIncluidos = new Set<number>();
  const followups = leadsAbertos
    .filter((lead) => lead.proximoContatoEm && lead.proximoContatoEm < inicioAmanha)
    .sort((a, b) =>
      (a.proximoContatoEm?.getTime() || 0) - (b.proximoContatoEm?.getTime() || 0),
    );

  for (const lead of followups.slice(0, 30)) {
    leadsJaIncluidos.add(lead.id);
    const vencido = Boolean(lead.proximoContatoEm && lead.proximoContatoEm < inicioHoje);
    adicionarItem({
      id: `followup-${lead.id}`,
      prioridade: vencido ? 5 : 15,
      categoria: "Follow-up comercial",
      modeloChave: "followup_lead",
      nome: lead.nome,
      telefone: lead.telefone,
      clienteId: lead.clienteId,
      leadId: lead.id,
      agendamentoId: lead.agendamento?.id || null,
      detalhe: vencido
        ? `Follow-up vencido desde ${formatarData(lead.proximoContatoEm!)}.`
        : "Contato comercial programado para hoje.",
      destinoHref: "/marketing",
      variaveis: { interesse: lead.interesse || "" },
    });
  }

  for (const lead of leadsAbertos) {
    if (lead.etapa !== "Negociação" || leadsJaIncluidos.has(lead.id)) continue;
    const referencia = lead.ultimoContatoEm || lead.updatedAt;
    if (referencia >= tresDiasAtras) continue;

    adicionarItem({
      id: `negociacao-${lead.id}`,
      prioridade: 25,
      categoria: "Negociação",
      modeloChave: "negociacao_lead",
      nome: lead.nome,
      telefone: lead.telefone,
      clienteId: lead.clienteId,
      leadId: lead.id,
      agendamentoId: lead.agendamento?.id || null,
      detalhe: `Negociação sem contato registrado desde ${formatarData(referencia)}.`,
      destinoHref: "/marketing",
      variaveis: { interesse: lead.interesse || "" },
    });
  }

  for (const cliente of clientesReativacao) {
    adicionarItem({
      id: `reativacao-${cliente.id}`,
      prioridade: 50,
      categoria: "Reativação",
      modeloChave: "reativacao_cliente",
      nome: cliente.nome,
      telefone: cliente.whatsapp || cliente.telefone,
      clienteId: cliente.id,
      detalhe: cliente.ultimaVisita
        ? `Última visita em ${formatarData(cliente.ultimaVisita)}${cliente.procedimento ? ` · ${cliente.procedimento}` : ""}.`
        : "Cliente sem visita recente registrada.",
      destinoHref: `/clientes/${cliente.id}`,
      variaveis: { procedimento: cliente.procedimento || "" },
    });
  }

  fila.sort((a, b) => a.prioridade - b.prioridade || a.nome.localeCompare(b.nome));

  const historicoSerializado: ComunicacaoHistoricoItem[] = historico.map((item) => ({
    id: item.id,
    destinatarioNome: item.destinatarioNome,
    telefone: item.telefone,
    categoria: item.categoria,
    canal: item.canal,
    status: item.status,
    usuario: item.usuario,
    mensagem: item.mensagem,
    createdAt: item.createdAt.toISOString(),
    enviadoEm: item.enviadoEm?.toISOString() || null,
    clienteId: item.clienteId,
    leadId: item.leadId,
    agendamentoId: item.agendamentoId,
  }));

  const modelosSerializados: MensagemModeloItem[] = modelosTipados.map((modelo) => ({
    id: modelo.id,
    chave: modelo.chave,
    nome: modelo.nome,
    categoria: modelo.categoria,
    corpo: modelo.corpo,
    ativo: modelo.ativo,
    ordem: modelo.ordem,
  }));

  const resumo: ComunicacaoResumo = {
    pendentes: fila.filter((item) => !item.enviadaHoje).length,
    atrasadas: fila.filter(
      (item) => !item.enviadaHoje && ["Follow-up comercial", "Negociação", "Falta"].includes(item.categoria),
    ).length,
    enviadasHoje: registrosHoje.filter((item) => item.status === "Enviada").length,
    abertasHoje: registrosHoje.filter((item) => item.status === "Aberta").length,
  };

  return (
    <ComunicacoesClient
      fila={fila}
      modelos={modelosSerializados}
      historico={historicoSerializado}
      resumo={resumo}
      podeGerenciar={podeGerenciar}
    />
  );
}
