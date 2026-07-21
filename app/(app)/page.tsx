import { canAccess, requirePagePermission } from "@/lib/auth";
import { formatarMoeda } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  buildClientWhatsAppMessage,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
} from "@/lib/whatsapp";
import {
  ArrowUpRight,
  BadgeCheck,
  Bell,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Gift,
  MessageCircle,
  PackageSearch,
  RefreshCw,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import CentralDoDiaClient from "@/components/dashboard/CentralDoDiaClient";
import FilaComercialClient from "@/components/dashboard/FilaComercialClient";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";

const TIMEZONE = "America/Sao_Paulo";

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

function inicioDiaSaoPaulo(dataISO: string) {
  return new Date(`${dataISO}T00:00:00-03:00`);
}

function formatarHorario(data: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  }).format(new Date(data));
}

function formatarDataLonga(data: Date) {
  const texto = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: TIMEZONE,
  }).format(data);

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarDataCurta(data: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: TIMEZONE,
  }).format(new Date(data));
}

function statusClasses(status: string) {
  const normalizado = status.toLowerCase();

  if (normalizado === "confirmado") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (normalizado === "em atendimento") {
    return "bg-cyan-50 text-cyan-700";
  }

  if (normalizado === "atendido") {
    return "bg-blue-50 text-blue-700";
  }

  if (normalizado === "faltou") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-violet-50 text-violet-700";
}

function CardIndicador({
  titulo,
  valor,
  descricao,
  href,
  icon: Icon,
  tone,
}: {
  titulo: string;
  valor: number | string;
  descricao: string;
  href: string;
  icon: typeof CalendarDays;
  tone: "violet" | "emerald" | "amber" | "rose" | "cyan" | "blue";
}) {
  const estilos = {
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
  }[tone];

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-px hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`flex size-9 items-center justify-center rounded-xl border ${estilos}`}>
          <Icon className="size-4" />
        </div>
        <ArrowUpRight className="size-4 text-slate-300 transition group-hover:text-violet-600" />
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{valor}</p>
      <p className="mt-0.5 text-xs font-bold text-slate-700">{titulo}</p>
      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{descricao}</p>
    </Link>
  );
}

export default async function Home() {
  const usuario = await requirePagePermission("dashboard.visualizar");
  const podeGerenciarAgenda = canAccess(usuario, "agenda.gerenciar");
  const podeGerenciarMarketing = canAccess(usuario, "marketing.gerenciar");

  const agora = new Date();
  const hojeISO = dataISOEmSaoPaulo(agora);
  const ontemISO = somarDiasISO(hojeISO, -1);
  const amanhaISO = somarDiasISO(hojeISO, 1);
  const depoisAmanhaISO = somarDiasISO(hojeISO, 2);

  const inicioOntem = inicioDiaSaoPaulo(ontemISO);
  const inicioHoje = inicioDiaSaoPaulo(hojeISO);
  const inicioAmanha = inicioDiaSaoPaulo(amanhaISO);
  const inicioDepoisAmanha = inicioDiaSaoPaulo(depoisAmanhaISO);

  const sessentaDiasAtras = new Date(inicioHoje.getTime() - 60 * 24 * 60 * 60 * 1000);
  const inicioMesISO = `${hojeISO.slice(0, 7)}-01`;
  const inicioMes = inicioDiaSaoPaulo(inicioMesISO);

  const proximoMesBase = new Date(`${inicioMesISO}T12:00:00Z`);
  proximoMesBase.setUTCMonth(proximoMesBase.getUTCMonth() + 1);
  const inicioProximoMes = inicioDiaSaoPaulo(proximoMesBase.toISOString().slice(0, 10));

  const UM_DIA_MS = 24 * 60 * 60 * 1000;
  const limiteNegociacaoParada = new Date(inicioHoje.getTime() - 3 * UM_DIA_MS);
  const limiteAvaliacoesProximas = new Date(inicioHoje.getTime() + 8 * UM_DIA_MS);

  const [
    agendaHoje,
    confirmacoesAmanha,
    posAtendimento,
    clientesComNascimento,
    clientesReativacao,
    produtosAtivos,
    financeiroPendente,
    leadsAbertos,
    totalLeadsAbertos,
    lancamentosMes,
    totalClientes,
  ] = await Promise.all([
    prisma.agendamento.findMany({
      where: {
        data: { gte: inicioHoje, lt: inicioAmanha },
        status: { not: "Cancelado" },
      },
      include: {
        cliente: { select: { id: true, nome: true, whatsapp: true, telefone: true } },
        profissional: { select: { nome: true } },
      },
      orderBy: { data: "asc" },
    }),

    prisma.agendamento.findMany({
      where: {
        data: { gte: inicioAmanha, lt: inicioDepoisAmanha },
        status: "Agendado",
      },
      include: {
        cliente: { select: { nome: true, whatsapp: true, telefone: true } },
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
        cliente: { select: { id: true, nome: true, whatsapp: true, telefone: true } },
        profissional: { select: { nome: true } },
      },
      orderBy: { data: "desc" },
      take: 10,
    }),

    prisma.cliente.findMany({
      where: {
        nascimento: { not: null },
        status: { not: "Inativa" },
      },
      select: {
        id: true,
        nome: true,
        nascimento: true,
        whatsapp: true,
        telefone: true,
      },
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
        whatsapp: true,
        telefone: true,
        ultimaVisita: true,
        procedimento: true,
      },
      orderBy: { ultimaVisita: "asc" },
      take: 10,
    }),

    prisma.produto.findMany({
      where: { status: "Ativo" },
      select: {
        id: true,
        nome: true,
        quantidade: true,
        estoqueMinimo: true,
        unidade: true,
      },
      orderBy: { quantidade: "asc" },
    }),

    prisma.lancamento.findMany({
      where: {
        statusPagamento: { not: "Pago" },
        data: { lt: inicioAmanha },
      },
      orderBy: { data: "asc" },
      take: 20,
    }),

    prisma.lead.findMany({
      where: {
        etapa: { notIn: ["Convertido", "Perdido"] },
      },
      select: {
        id: true,
        nome: true,
        telefone: true,
        origem: true,
        interesse: true,
        etapa: true,
        valorPrevisto: true,
        ultimoContatoEm: true,
        proximoContatoEm: true,
        clienteId: true,
        createdAt: true,
        updatedAt: true,
        agendamento: {
          select: {
            id: true,
            data: true,
            status: true,
            procedimento: true,
          },
        },
      },
      orderBy: [{ updatedAt: "asc" }, { createdAt: "asc" }],
    }),

    prisma.lead.count({
      where: { etapa: { notIn: ["Convertido", "Perdido"] } },
    }),

    prisma.lancamento.findMany({
      where: { data: { gte: inicioMes, lt: inicioProximoMes } },
      select: { tipo: true, valor: true, statusPagamento: true },
    }),

    prisma.cliente.count(),
  ]);

  const [anoHoje, mesHoje, diaHoje] = hojeISO.split("-").map(Number);
  const aniversariantesHoje = clientesComNascimento
    .filter((cliente) => {
      if (!cliente.nascimento) return false;
      return (
        cliente.nascimento.getUTCMonth() + 1 === mesHoje &&
        cliente.nascimento.getUTCDate() === diaHoje
      );
    })
    .slice(0, 10);

  const produtosCriticos = produtosAtivos
    .filter((produto) => produto.quantidade <= produto.estoqueMinimo)
    .slice(0, 10);

  const totalFinanceiroPendente = financeiroPendente.reduce(
    (total, item) => total + item.valor,
    0,
  );

  const entradasMes = lancamentosMes
    .filter((item) => item.tipo === "ENTRADA")
    .reduce((total, item) => total + item.valor, 0);

  const saidasMes = lancamentosMes
    .filter((item) => item.tipo === "SAIDA")
    .reduce((total, item) => total + item.valor, 0);

  const saldoMes = entradasMes - saidasMes;

  const followUpsVencidos = leadsAbertos
    .filter((lead) => lead.proximoContatoEm && lead.proximoContatoEm < inicioHoje)
    .sort((a, b) =>
      (a.proximoContatoEm?.getTime() || 0) - (b.proximoContatoEm?.getTime() || 0),
    );

  const followUpsHoje = leadsAbertos
    .filter(
      (lead) =>
        lead.proximoContatoEm &&
        lead.proximoContatoEm >= inicioHoje &&
        lead.proximoContatoEm < inicioAmanha,
    )
    .sort((a, b) =>
      (a.proximoContatoEm?.getTime() || 0) - (b.proximoContatoEm?.getTime() || 0),
    );

  const avaliacoesSemConfirmacao = leadsAbertos
    .filter(
      (lead) =>
        lead.etapa === "Avaliação" &&
        lead.agendamento &&
        lead.agendamento.status === "Agendado" &&
        lead.agendamento.data >= inicioHoje &&
        lead.agendamento.data < limiteAvaliacoesProximas,
    )
    .sort(
      (a, b) =>
        (a.agendamento?.data.getTime() || Number.MAX_SAFE_INTEGER) -
        (b.agendamento?.data.getTime() || Number.MAX_SAFE_INTEGER),
    );

  const negociacoesParadas = leadsAbertos
    .filter((lead) => {
      if (lead.etapa !== "Negociação") return false;
      const referencia = lead.ultimoContatoEm || lead.updatedAt;
      return referencia < limiteNegociacaoParada;
    })
    .sort((a, b) => {
      const referenciaA = (a.ultimoContatoEm || a.updatedAt).getTime();
      const referenciaB = (b.ultimoContatoEm || b.updatedAt).getTime();
      return referenciaA - referenciaB;
    });

  const oportunidadesPrioritarias = leadsAbertos
    .filter((lead) => {
      const avaliacaoProxima =
        lead.agendamento &&
        lead.agendamento.status !== "Cancelado" &&
        lead.agendamento.status !== "Atendido" &&
        lead.agendamento.data >= inicioHoje &&
        lead.agendamento.data < limiteAvaliacoesProximas;

      return lead.etapa === "Negociação" || Boolean(avaliacaoProxima);
    })
    .sort((a, b) => {
      const dataA = a.agendamento?.data.getTime() || Number.MAX_SAFE_INTEGER;
      const dataB = b.agendamento?.data.getTime() || Number.MAX_SAFE_INTEGER;
      if (dataA !== dataB) return dataA - dataB;
      return b.valorPrevisto - a.valorPrevisto;
    });

  type CategoriaFilaComercial =
    | "Follow-up vencido"
    | "Contato de hoje"
    | "Avaliação sem confirmação"
    | "Negociação parada"
    | "Prioridade comercial";

  type LeadFilaBase = (typeof leadsAbertos)[number];

  const filaComercial: Array<{
    id: number;
    nome: string;
    etapa: string;
    interesse: string | null;
    valorPrevisto: number;
    categoria: CategoriaFilaComercial;
    detalhe: string;
    whatsappUrl: string;
    agendamentoId: number | null;
    agendaUrl: string | null;
    podeConfirmarAgendamento: boolean;
  }> = [];

  const idsNaFila = new Set<number>();

  function adicionarNaFila(
    lead: LeadFilaBase,
    categoria: CategoriaFilaComercial,
    detalhe: string,
    opcoes?: { podeConfirmarAgendamento?: boolean },
  ) {
    if (idsNaFila.has(lead.id)) return;
    idsNaFila.add(lead.id);

    const primeiroNome = lead.nome.split(" ")[0];
    const mensagem =
      categoria === "Negociação parada"
        ? `Olá, ${primeiroNome}! Tudo bem? Aqui é do Studio Realçar. Passando para retomar nossa conversa${lead.interesse ? ` sobre ${lead.interesse}` : ""}. Ficou alguma dúvida em que possamos ajudar?`
        : `Olá, ${primeiroNome}! Tudo bem? Aqui é do Studio Realçar. Passando para dar continuidade ao nosso contato${lead.interesse ? ` sobre ${lead.interesse}` : ""}. Posso te ajudar por aqui?`;

    filaComercial.push({
      id: lead.id,
      nome: lead.nome,
      etapa: lead.etapa,
      interesse: lead.interesse,
      valorPrevisto: lead.valorPrevisto,
      categoria,
      detalhe,
      whatsappUrl: buildWhatsAppUrl(lead.telefone, mensagem),
      agendamentoId: lead.agendamento?.id || null,
      agendaUrl: lead.agendamento
        ? `/agenda?data=${dataISOEmSaoPaulo(lead.agendamento.data)}`
        : null,
      podeConfirmarAgendamento: Boolean(opcoes?.podeConfirmarAgendamento),
    });
  }

  followUpsVencidos.slice(0, 8).forEach((lead) => {
    const dias = Math.max(1, Math.floor((inicioHoje.getTime() - lead.proximoContatoEm!.getTime()) / UM_DIA_MS));
    adicionarNaFila(
      lead,
      "Follow-up vencido",
      `Contato atrasado há ${dias} dia${dias === 1 ? "" : "s"}.`,
    );
  });

  followUpsHoje.slice(0, 8).forEach((lead) => {
    adicionarNaFila(lead, "Contato de hoje", "Follow-up programado para hoje.");
  });

  avaliacoesSemConfirmacao.slice(0, 8).forEach((lead) => {
    if (!lead.agendamento) return;
    adicionarNaFila(
      lead,
      "Avaliação sem confirmação",
      `Avaliação em ${formatarDataCurta(lead.agendamento.data)} às ${formatarHorario(lead.agendamento.data)} ainda está como Agendado.`,
      { podeConfirmarAgendamento: true },
    );
  });

  negociacoesParadas.slice(0, 8).forEach((lead) => {
    const referencia = lead.ultimoContatoEm || lead.updatedAt;
    const dias = Math.max(3, Math.floor((inicioHoje.getTime() - referencia.getTime()) / UM_DIA_MS));
    adicionarNaFila(
      lead,
      "Negociação parada",
      `Sem contato comercial registrado há ${dias} dias.`,
    );
  });

  oportunidadesPrioritarias.slice(0, 8).forEach((lead) => {
    const detalhe = lead.agendamento
      ? `Próximo atendimento em ${formatarDataCurta(lead.agendamento.data)} às ${formatarHorario(lead.agendamento.data)}.`
      : "Oportunidade em negociação que merece acompanhamento.";
    adicionarNaFila(lead, "Prioridade comercial", detalhe);
  });

  const filaComercialLimitada = filaComercial.slice(0, 14);

  const confirmacoes = confirmacoesAmanha.map((agendamento) => ({
    id: agendamento.id,
    cliente: agendamento.cliente.nome,
    procedimento: agendamento.procedimento,
    horario: formatarHorario(agendamento.data),
    profissional: agendamento.profissional?.nome || null,
    whatsappUrl: buildWhatsAppUrl(
      agendamento.cliente.whatsapp || agendamento.cliente.telefone,
      buildWhatsAppMessage({
        template: "confirmation",
        clientName: agendamento.cliente.nome,
        procedure: agendamento.procedimento,
        appointmentDate: agendamento.data,
      }),
    ),
  }));

  const dataAgendaHoje = hojeISO;
  const dataAgendaAmanha = amanhaISO;

  return (
    <div className="min-w-0 space-y-5 pb-4">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_30%)]" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
              <Sparkles className="size-3.5" />
              Central do Dia
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              O que precisa da atenção da equipe hoje.
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {formatarDataLonga(agora)}. Agenda, relacionamento, estoque, financeiro e oportunidades em uma única visão.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/agenda?data=${dataAgendaHoje}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700"
            >
              <CalendarDays className="size-4" />
              Abrir agenda
            </Link>
            <Link
              href="/comunicacoes"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
            >
              <MessageCircle className="size-4" />
              Comunicações
            </Link>
            <Link
              href="/clientes"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700"
            >
              <Users className="size-4" />
              Clientes
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <CardIndicador
          titulo="Atendimentos hoje"
          valor={agendaHoje.length}
          descricao="Agenda ativa de hoje."
          href={`/agenda?data=${dataAgendaHoje}`}
          icon={CalendarDays}
          tone="violet"
        />
        <CardIndicador
          titulo="Confirmar amanhã"
          valor={confirmacoesAmanha.length}
          descricao="Ainda estão como agendados."
          href="#confirmacoes"
          icon={Bell}
          tone="amber"
        />
        <CardIndicador
          titulo="Pós-atendimento"
          valor={posAtendimento.length}
          descricao="Atendidos ontem para acompanhamento."
          href="#pos-atendimento"
          icon={MessageCircle}
          tone="emerald"
        />
        <CardIndicador
          titulo="Aniversariantes"
          valor={aniversariantesHoje.length}
          descricao="Clientes aniversariando hoje."
          href="#aniversariantes"
          icon={Gift}
          tone="rose"
        />
        <CardIndicador
          titulo="Reativação"
          valor={clientesReativacao.length}
          descricao="Sem visita há mais de 60 dias."
          href="#reativacao"
          icon={RefreshCw}
          tone="cyan"
        />
        <CardIndicador
          titulo="Estoque crítico"
          valor={produtosCriticos.length}
          descricao="No mínimo ou abaixo dele."
          href="#alertas"
          icon={PackageSearch}
          tone="rose"
        />
        <CardIndicador
          titulo="Financeiro pendente"
          valor={financeiroPendente.length}
          descricao={formatarMoeda(totalFinanceiroPendente)}
          href="#alertas"
          icon={WalletCards}
          tone="amber"
        />
        <CardIndicador
          titulo="Follow-ups vencidos"
          valor={followUpsVencidos.length}
          descricao={`${followUpsHoje.length} contato(s) programado(s) para hoje.`}
          href="#fila-comercial"
          icon={ClipboardList}
          tone="blue"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="premium-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5">
            <div>
              <div className="flex items-center gap-2">
                <CalendarClock className="size-5 text-violet-600" />
                <h2 className="text-lg font-bold text-slate-950">Agenda de hoje</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Sequência dos atendimentos ativos do dia.
              </p>
            </div>
            <Link
              href={`/agenda?data=${dataAgendaHoje}`}
              className="text-sm font-bold text-violet-700"
            >
              Ver agenda
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {agendaHoje.length > 0 ? (
              agendaHoje.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="grid gap-3 p-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="rounded-xl bg-slate-950 px-2.5 py-2 text-center text-sm font-bold tabular-nums text-white">
                    {formatarHorario(agendamento.data)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/clientes/${agendamento.cliente.id}`}
                        className="truncate font-bold text-slate-900 hover:text-violet-700"
                      >
                        {agendamento.cliente.nome}
                      </Link>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClasses(agendamento.status)}`}>
                        {agendamento.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {agendamento.procedimento}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {agendamento.profissional?.nome || "Profissional não definida"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Link
                      href={`/agenda?data=${dataAgendaHoje}`}
                      className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-violet-200 hover:text-violet-700"
                    >
                      Abrir
                    </Link>
                    <WhatsAppLink
                      href={buildWhatsAppUrl(
                        agendamento.cliente.whatsapp || agendamento.cliente.telefone,
                        buildWhatsAppMessage({
                          template: "reminder",
                          clientName: agendamento.cliente.nome,
                          procedure: agendamento.procedimento,
                          appointmentDate: agendamento.data,
                        }),
                      )}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      <MessageCircle className="size-3.5" />
                      WhatsApp
                    </WhatsAppLink>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <BadgeCheck className="mx-auto size-7 text-emerald-500" />
                <p className="mt-2 text-sm font-bold text-slate-800">Nenhum atendimento ativo hoje.</p>
                <p className="mt-1 text-xs text-slate-500">A agenda está livre neste momento.</p>
              </div>
            )}
          </div>
        </div>

        <div id="confirmacoes" className="premium-card p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="size-5 text-amber-600" />
                <h2 className="text-lg font-bold text-slate-950">Confirmar amanhã</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Envie a mensagem e marque a presença confirmada.
              </p>
            </div>
            <Link
              href={`/agenda?data=${dataAgendaAmanha}`}
              className="shrink-0 text-xs font-bold text-violet-700"
            >
              Ver amanhã
            </Link>
          </div>

          <div className="mt-4">
            <CentralDoDiaClient
              confirmacoes={confirmacoes}
              podeGerenciarAgenda={podeGerenciarAgenda}
            />
          </div>
        </div>
      </section>

      <section id="fila-comercial" className="premium-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="size-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-950">Fila comercial inteligente</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Prioriza o que exige ação hoje usando follow-ups, avaliações, negociações e agenda real do CRM.
            </p>
          </div>
          <Link
            href="/marketing"
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-violet-200 hover:text-violet-700"
          >
            Abrir CRM completo
          </Link>
        </div>

        <div className="mt-4">
          <FilaComercialClient
            itens={filaComercialLimitada}
            resumo={{
              atrasados: followUpsVencidos.length,
              hoje: followUpsHoje.length,
              avaliacoes: avaliacoesSemConfirmacao.length,
              negociacoes: negociacoesParadas.length,
              prioridades: oportunidadesPrioritarias.length,
              totalAbertos: totalLeadsAbertos,
            }}
            podeGerenciarMarketing={podeGerenciarMarketing}
            podeGerenciarAgenda={podeGerenciarAgenda}
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div id="pos-atendimento" className="premium-card p-4 sm:p-5">
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-950">Pós-atendimento</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Clientes atendidos ontem para acompanhamento.</p>
          </div>

          <div className="mt-4 space-y-2.5">
            {posAtendimento.length > 0 ? (
              posAtendimento.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/clientes/${item.cliente.id}`} className="truncate font-bold text-slate-900 hover:text-violet-700">
                        {item.cliente.nome}
                      </Link>
                      <p className="mt-0.5 truncate text-sm text-slate-500">{item.procedimento}</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">
                        {item.profissional?.nome || "Equipe"} · {formatarDataCurta(item.data)}
                      </p>
                    </div>
                    <WhatsAppLink
                      href={buildWhatsAppUrl(
                        item.cliente.whatsapp || item.cliente.telefone,
                        buildWhatsAppMessage({
                          template: "postCare",
                          clientName: item.cliente.nome,
                          procedure: item.procedimento,
                          appointmentDate: item.data,
                        }),
                      )}
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                      aria-label={`Enviar pós-atendimento para ${item.cliente.nome}`}
                    >
                      <MessageCircle className="size-4" />
                    </WhatsAppLink>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                Nenhum atendimento de ontem aguardando acompanhamento.
              </div>
            )}
          </div>
        </div>

        <div id="aniversariantes" className="premium-card p-4 sm:p-5">
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <Gift className="size-5 text-rose-600" />
              <h2 className="text-lg font-bold text-slate-950">Aniversariantes</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Relacionamento simples que não deve ser esquecido.</p>
          </div>

          <div className="mt-4 space-y-2.5">
            {aniversariantesHoje.length > 0 ? (
              aniversariantesHoje.map((cliente) => (
                <div key={cliente.id} className="flex items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50/60 p-3">
                  <div className="min-w-0">
                    <Link href={`/clientes/${cliente.id}`} className="truncate font-bold text-slate-900 hover:text-violet-700">
                      {cliente.nome}
                    </Link>
                    <p className="mt-0.5 text-xs font-semibold text-rose-600">Aniversário hoje</p>
                  </div>
                  <WhatsAppLink
                    href={buildWhatsAppUrl(
                      cliente.whatsapp || cliente.telefone,
                      buildClientWhatsAppMessage({
                        template: "birthday",
                        clientName: cliente.nome,
                      }),
                    )}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <MessageCircle className="size-3.5" />
                    Mensagem
                  </WhatsAppLink>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                Nenhum aniversário cadastrado para hoje.
              </div>
            )}
          </div>
        </div>

        <div id="reativacao" className="premium-card p-4 sm:p-5">
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="size-5 text-cyan-600" />
              <h2 className="text-lg font-bold text-slate-950">Reativação</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">Sem visita há mais de 60 dias e sem agenda futura.</p>
          </div>

          <div className="mt-4 space-y-2.5">
            {clientesReativacao.length > 0 ? (
              clientesReativacao.map((cliente) => (
                <div key={cliente.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/clientes/${cliente.id}`} className="truncate font-bold text-slate-900 hover:text-violet-700">
                        {cliente.nome}
                      </Link>
                      <p className="mt-0.5 truncate text-sm text-slate-500">
                        {cliente.procedimento || "Procedimento não informado"}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-400">
                        Última visita: {cliente.ultimaVisita ? formatarDataCurta(cliente.ultimaVisita) : "não registrada"}
                      </p>
                    </div>
                    <WhatsAppLink
                      href={buildWhatsAppUrl(
                        cliente.whatsapp || cliente.telefone,
                        buildClientWhatsAppMessage({
                          template: "reactivation",
                          clientName: cliente.nome,
                        }),
                      )}
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                      aria-label={`Enviar reativação para ${cliente.nome}`}
                    >
                      <MessageCircle className="size-4" />
                    </WhatsAppLink>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                Nenhum cliente elegível para reativação neste momento.
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="alertas" className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="premium-card p-4 sm:p-5">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold text-slate-950">Alertas operacionais</h2>
            <p className="mt-1 text-sm text-slate-500">Pontos que merecem revisão antes de virarem problema.</p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PackageSearch className="size-4 text-rose-600" />
                  <p className="font-bold text-slate-900">Estoque crítico</p>
                </div>
                <Link href="/estoque" className="text-xs font-bold text-rose-700">Abrir</Link>
              </div>
              <div className="mt-3 space-y-2">
                {produtosCriticos.length > 0 ? produtosCriticos.slice(0, 5).map((produto) => (
                  <div key={produto.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-slate-700">{produto.nome}</span>
                    <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-bold text-rose-700">
                      {produto.quantidade} {produto.unidade} / mín. {produto.estoqueMinimo}
                    </span>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">Estoque dentro dos mínimos configurados.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <WalletCards className="size-4 text-amber-600" />
                  <p className="font-bold text-slate-900">Financeiro pendente</p>
                </div>
                <Link href="/financeiro" className="text-xs font-bold text-amber-700">Abrir</Link>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-950">{formatarMoeda(totalFinanceiroPendente)}</p>
              <p className="mt-1 text-sm text-slate-500">
                {financeiroPendente.length} lançamento(s) com pagamento ainda não marcado como pago e data registrada até hoje.
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-blue-600" />
                <p className="font-bold text-slate-900">Resumo do CRM</p>
              </div>
              <Link href="#fila-comercial" className="text-xs font-bold text-blue-700">Ver fila do dia</Link>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <div className="rounded-xl border border-blue-100 bg-white/80 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Em aberto</p>
                <p className="mt-1 text-xl font-bold text-slate-950">{totalLeadsAbertos}</p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-white/80 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-rose-500">Atrasados</p>
                <p className="mt-1 text-xl font-bold text-rose-700">{followUpsVencidos.length}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-white/80 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-500">Hoje</p>
                <p className="mt-1 text-xl font-bold text-amber-700">{followUpsHoje.length}</p>
              </div>
              <div className="rounded-xl border border-violet-100 bg-white/80 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500">Avaliações</p>
                <p className="mt-1 text-xl font-bold text-violet-700">{avaliacoesSemConfirmacao.length}</p>
              </div>
              <div className="rounded-xl border border-cyan-100 bg-white/80 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-600">Paradas</p>
                <p className="mt-1 text-xl font-bold text-cyan-700">{negociacoesParadas.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="premium-card p-4 sm:p-5">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold text-slate-950">Visão rápida do mês</h2>
            <p className="mt-1 text-sm text-slate-500">Contexto gerencial sem tirar o foco da operação diária.</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-bold text-emerald-700">Entradas</p>
              <p className="mt-1 text-xl font-bold text-emerald-950">{formatarMoeda(entradasMes)}</p>
            </div>
            <div className="rounded-2xl bg-violet-50 p-4">
              <p className="text-xs font-bold text-violet-700">Saldo</p>
              <p className={`mt-1 text-xl font-bold ${saldoMes >= 0 ? "text-violet-950" : "text-rose-700"}`}>
                {formatarMoeda(saldoMes)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-600">Saídas</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{formatarMoeda(saidasMes)}</p>
            </div>
            <div className="rounded-2xl bg-cyan-50 p-4">
              <p className="text-xs font-bold text-cyan-700">Clientes</p>
              <p className="mt-1 text-xl font-bold text-cyan-950">{totalClientes}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Leitura operacional</p>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p><strong className="text-slate-900">{agendaHoje.length}</strong> atendimento(s) ativo(s) hoje.</p>
              <p><strong className="text-slate-900">{confirmacoesAmanha.length}</strong> confirmação(ões) pendente(s) para amanhã.</p>
              <p><strong className="text-slate-900">{clientesReativacao.length}</strong> cliente(s) priorizado(s) para reativação.</p>
              <p><strong className="text-slate-900">{followUpsVencidos.length}</strong> follow-up(s) vencido(s) e <strong className="text-slate-900">{negociacoesParadas.length}</strong> negociação(ões) sem contato há 3+ dias.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <Link href="/relatorios" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-violet-200 hover:text-violet-700">
              Relatórios
              <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/automacoes" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-violet-200 hover:text-violet-700">
              Automações
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
