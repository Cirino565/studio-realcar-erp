import { requirePagePermission } from "@/lib/auth";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  PackageSearch,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import StatCard from "@/components/dashboard/StatCard";
import { formatarDataHora, formatarMoeda } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function percentual(valor: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((valor / total) * 100)));
}

function inicioDoMes(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

function fimDoMes(data: Date) {
  return new Date(data.getFullYear(), data.getMonth() + 1, 1);
}

function formatarPercentual(valor: number) {
  return `${valor.toFixed(1).replace(".", ",")}%`;
}

export default async function Home() {
  await requirePagePermission("dashboard.visualizar");

  const hoje = new Date();
  const inicioHoje = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate(),
  );
  const fimHoje = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    hoje.getDate() + 1,
  );
  const inicioMesAtual = inicioDoMes(hoje);
  const fimMesAtual = fimDoMes(hoje);

  const [
    totalClientes,
    clientesAtivos,
    agendamentosHoje,
    agendamentosMes,
    proximosAgendamentos,
    lancamentosMes,
    produtos,
    leads,
    automacoesAtivas,
  ] = await Promise.all([
    prisma.cliente.count(),
    prisma.cliente.count({ where: { status: "Ativa" } }),
    prisma.agendamento.count({
      where: { data: { gte: inicioHoje, lt: fimHoje } },
    }),
    prisma.agendamento.count({
      where: { data: { gte: inicioMesAtual, lt: fimMesAtual } },
    }),
    prisma.agendamento.findMany({
      where: { data: { gte: hoje } },
      include: { cliente: true },
      orderBy: { data: "asc" },
      take: 6,
    }),
    prisma.lancamento.findMany({
      where: { data: { gte: inicioMesAtual, lt: fimMesAtual } },
      orderBy: { data: "desc" },
    }),
    prisma.produto.findMany({
      select: {
        quantidade: true,
        estoqueMinimo: true,
        valorCompra: true,
      },
      orderBy: { quantidade: "asc" },
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.automacao.count({ where: { status: "Ativa" } }),
  ]);

  const entradasMes = lancamentosMes
    .filter((lancamento) => lancamento.tipo === "ENTRADA")
    .reduce((total, lancamento) => total + lancamento.valor, 0);

  const saidasMes = lancamentosMes
    .filter((lancamento) => lancamento.tipo === "SAIDA")
    .reduce((total, lancamento) => total + lancamento.valor, 0);

  const saldoMes = entradasMes - saidasMes;
  const ticketMedio =
    agendamentosMes > 0 ? entradasMes / agendamentosMes : 0;
  const margemMes =
    entradasMes > 0 ? (saldoMes / entradasMes) * 100 : 0;

  const estoqueBaixo = produtos.filter(
    (produto) => produto.quantidade <= produto.estoqueMinimo,
  ).length;

  const valorEstoque = produtos.reduce(
    (total, produto) =>
      total + produto.quantidade * produto.valorCompra,
    0,
  );

  const maiorFluxo = Math.max(entradasMes, saidasMes, 1);
  const percentualEntrada = percentual(entradasMes, maiorFluxo);
  const percentualSaida = percentual(saidasMes, maiorFluxo);
  const percentualClientesAtivos = percentual(
    clientesAtivos,
    totalClientes,
  );
  const percentualAgenda = percentual(
    agendamentosHoje,
    Math.max(agendamentosMes, 1),
  );

  const prioridades = [
    {
      titulo: "Confirmar agenda",
      descricao: `${agendamentosHoje} atendimento(s) previsto(s) para hoje.`,
      href: "/agenda",
      icon: CalendarClock,
      indicador: agendamentosHoje > 0 ? "Alta" : "Normal",
      indicadorClass:
        agendamentosHoje > 0
          ? "bg-amber-50 text-amber-700"
          : "bg-emerald-50 text-emerald-700",
    },
    {
      titulo: "Repor estoque",
      descricao: `${estoqueBaixo} produto(s) com estoque abaixo do mínimo.`,
      href: "/estoque",
      icon: PackageSearch,
      indicador: estoqueBaixo > 0 ? "Atenção" : "Ok",
      indicadorClass:
        estoqueBaixo > 0
          ? "bg-rose-50 text-rose-700"
          : "bg-emerald-50 text-emerald-700",
    },
    {
      titulo: "Nutrir leads",
      descricao: `${leads.length} oportunidade(s) recente(s) para acompanhamento.`,
      href: "/marketing",
      icon: ClipboardList,
      indicador: leads.length > 0 ? "Aberto" : "Baixo",
      indicadorClass:
        leads.length > 0
          ? "bg-violet-50 text-violet-700"
          : "bg-slate-100 text-slate-600",
    },
  ];

  const atalhos = [
    { titulo: "Novo cliente", href: "/clientes", icon: Users },
    { titulo: "Agendar horário", href: "/agenda", icon: CalendarDays },
    {
      titulo: "Lançar financeiro",
      href: "/financeiro",
      icon: WalletCards,
    },
    { titulo: "Ver estoque", href: "/estoque", icon: PackageSearch },
  ];

  return (
    <div className="min-w-0 space-y-4 pb-2 sm:space-y-6 sm:pb-6">
      <section className="relative min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.15),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(13,148,136,0.10),transparent_34%)]" />

        <div className="relative grid min-w-0 gap-5 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                Painel executivo Studio Realçar
              </span>
            </div>

            <h1 className="mt-4 max-w-3xl text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
              Visão clara da clínica para decisões rápidas.
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Receita, agenda, clientes, estoque e oportunidades organizados
              em uma visão compacta para a rotina diária.
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-3">
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                Margem do mês
              </p>
              <p
                className={`mt-1.5 truncate text-lg font-bold sm:text-2xl ${
                  margemMes >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {formatarPercentual(margemMes)}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                Automações
              </p>
              <p className="mt-1.5 truncate text-lg font-bold text-slate-900 sm:text-2xl">
                {automacoesAtivas}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                Agenda no mês
              </p>
              <p className="mt-1.5 truncate text-lg font-bold text-slate-900 sm:text-2xl">
                {agendamentosMes}
              </p>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                Estoque
              </p>
              <p
                className="mt-1.5 truncate text-base font-bold text-slate-900 sm:text-xl"
                title={formatarMoeda(valorEstoque)}
              >
                {formatarMoeda(valorEstoque)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          titulo="Receita mensal"
          valor={formatarMoeda(entradasMes)}
          descricao="Entradas do mês atual."
          icon={WalletCards}
          tone="emerald"
        />

        <StatCard
          titulo="Saldo mensal"
          valor={formatarMoeda(saldoMes)}
          descricao="Entradas menos saídas."
          icon={saldoMes >= 0 ? ArrowUpRight : ArrowDownRight}
          tone={saldoMes >= 0 ? "cyan" : "rose"}
        />

        <StatCard
          titulo="Ticket médio"
          valor={formatarMoeda(ticketMedio)}
          descricao="Média por atendimento."
          icon={BadgeCheck}
          tone="violet"
        />

        <StatCard
          titulo="Clientes ativos"
          valor={`${clientesAtivos}/${totalClientes}`}
          descricao="Ativos sobre o total."
          icon={Users}
          tone="blue"
        />
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="premium-card min-w-0 p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Saúde operacional
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Indicadores essenciais da operação no mês.
              </p>
            </div>

            <Link
              href="/relatorios"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Ver relatórios
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-1.5 flex min-w-0 items-center justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-slate-700">
                  Entradas do mês
                </span>
                <span className="shrink-0 font-medium text-slate-600">
                  {formatarMoeda(entradasMes)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${percentualEntrada}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex min-w-0 items-center justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-slate-700">
                  Saídas do mês
                </span>
                <span className="shrink-0 font-medium text-slate-600">
                  {formatarMoeda(saidasMes)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-rose-500"
                  style={{ width: `${percentualSaida}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex min-w-0 items-center justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-slate-700">
                  Clientes ativos
                </span>
                <span className="shrink-0 font-medium text-slate-600">
                  {percentualClientesAtivos}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{ width: `${percentualClientesAtivos}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex min-w-0 items-center justify-between gap-3 text-sm">
                <span className="truncate font-semibold text-slate-700">
                  Agenda de hoje no mês
                </span>
                <span className="shrink-0 font-medium text-slate-600">
                  {percentualAgenda}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-cyan-500"
                  style={{ width: `${percentualAgenda}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="premium-card min-w-0 p-4 sm:p-5">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Ações rápidas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Atalhos compactos para a rotina.
            </p>
          </div>

          <div className="mt-4 grid min-w-0 grid-cols-2 gap-2.5">
            {atalhos.map((atalho) => {
              const Icon = atalho.icon;

              return (
                <Link
                  key={atalho.titulo}
                  href={atalho.href}
                  className="group flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-violet-300 hover:bg-violet-50 sm:p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 text-sm font-semibold leading-5 text-slate-800">
                      {atalho.titulo}
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-violet-700" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
        <div className="premium-card min-w-0 p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Próximos atendimentos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Os seis próximos horários da agenda.
              </p>
            </div>

            <Link
              href="/agenda"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-800"
            >
              Abrir agenda
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 space-y-2.5">
            {proximosAgendamentos.length > 0 ? (
              proximosAgendamentos.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {agendamento.cliente.nome}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {agendamento.procedimento}
                    </p>
                  </div>

                  <p className="col-start-2 inline-flex w-fit max-w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 sm:col-start-auto sm:text-sm">
                    {formatarDataHora(agendamento.data)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Nenhum atendimento futuro encontrado.
              </div>
            )}
          </div>
        </div>

        <div className="premium-card min-w-0 p-4 sm:p-5">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Prioridades do dia
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pontos que merecem acompanhamento.
            </p>
          </div>

          <div className="mt-4 space-y-2.5">
            {prioridades.map((prioridade) => {
              const Icon = prioridade.icon;

              return (
                <Link
                  key={prioridade.titulo}
                  href={prioridade.href}
                  className="group grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-violet-300 hover:bg-violet-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <p className="truncate font-semibold text-slate-900">
                        {prioridade.titulo}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${prioridade.indicadorClass}`}
                      >
                        {prioridade.indicador}
                      </span>
                    </div>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {prioridade.descricao}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="premium-card-soft min-w-0 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">Entradas</p>
              <p className="mt-0.5 text-sm leading-5 text-slate-500">
                {formatarMoeda(entradasMes)} registrados no mês.
              </p>
            </div>
          </div>
        </div>

        <div className="premium-card-soft min-w-0 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <ArrowDownRight className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">Saídas</p>
              <p className="mt-0.5 text-sm leading-5 text-slate-500">
                {formatarMoeda(saidasMes)} registrados no mês.
              </p>
            </div>
          </div>
        </div>

        <div className="premium-card-soft min-w-0 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">
                Base operacional
              </p>
              <p className="mt-0.5 text-sm leading-5 text-slate-500">
                Indicadores prontos para acompanhamento diário.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
