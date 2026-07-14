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

    prisma.cliente.count({
      where: {
        status: "Ativa",
      },
    }),

    prisma.agendamento.count({
      where: {
        data: {
          gte: inicioHoje,
          lt: fimHoje,
        },
      },
    }),

    prisma.agendamento.count({
      where: {
        data: {
          gte: inicioMesAtual,
          lt: fimMesAtual,
        },
      },
    }),

    prisma.agendamento.findMany({
      where: {
        data: {
          gte: hoje,
        },
      },
      include: {
        cliente: true,
        profissional: true,
      },
      orderBy: {
        data: "asc",
      },
      take: 6,
    }),

    prisma.lancamento.findMany({
      where: {
        data: {
          gte: inicioMesAtual,
          lt: fimMesAtual,
        },
      },
      orderBy: {
        data: "desc",
      },
    }),

    prisma.produto.findMany({
      select: {
        quantidade: true,
        estoqueMinimo: true,
      },
      orderBy: {
        quantidade: "asc",
      },
    }),

    prisma.lead.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
    }),

    prisma.automacao.count({
      where: {
        status: "Ativa",
      },
    }),
  ]);

  const entradasMes = lancamentosMes
    .filter((lancamento) => lancamento.tipo === "ENTRADA")
    .reduce((total, lancamento) => total + lancamento.valor, 0);

  const saidasMes = lancamentosMes
    .filter((lancamento) => lancamento.tipo === "SAIDA")
    .reduce((total, lancamento) => total + lancamento.valor, 0);

  const saldoMes = entradasMes - saidasMes;

  const ticketMedio =
    agendamentosMes > 0
      ? entradasMes / agendamentosMes
      : 0;

  const margemMes =
    entradasMes > 0
      ? (saldoMes / entradasMes) * 100
      : 0;

  const estoqueBaixo = produtos.filter(
    (produto) =>
      produto.quantidade <= produto.estoqueMinimo,
  ).length;

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
      descricao: `${estoqueBaixo} produto(s) abaixo do mínimo.`,
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
      descricao: `${leads.length} oportunidade(s) recente(s).`,
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
    {
      titulo: "Nova cliente",
      href: "/clientes",
      icon: Users,
    },
    {
      titulo: "Novo atendimento",
      href: "/agenda",
      icon: CalendarDays,
    },
    {
      titulo: "Financeiro",
      href: "/financeiro",
      icon: WalletCards,
    },
    {
      titulo: "Estoque",
      href: "/estoque",
      icon: PackageSearch,
    },
  ];
    return (
    <div className="min-w-0 space-y-4 pb-2 sm:space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(13,148,136,0.12),transparent_32%)]" />

        <div className="relative grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
              <Sparkles className="size-3.5" />
              Painel executivo Studio Realçar
            </div>

            <h1 className="mt-3 max-w-3xl text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Visão completa da clínica para decisões rápidas.
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Acompanhe desempenho financeiro, agenda, clientes e operação em
              uma única visão.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Receita
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {formatarMoeda(entradasMes)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Margem
              </p>
              <p
                className={`mt-1 text-xl font-bold ${
                  margemMes >= 0
                    ? "text-emerald-700"
                    : "text-rose-700"
                }`}
              >
                {formatarPercentual(margemMes)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Ocupação
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {percentualAgenda}%
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Clientes ativos
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {clientesAtivos}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          titulo="Receita mensal"
          valor={formatarMoeda(entradasMes)}
          descricao="Entradas registradas no mês."
          icon={WalletCards}
          tone="emerald"
        />

        <StatCard
          titulo="Saldo mensal"
          valor={formatarMoeda(saldoMes)}
          descricao="Resultado após despesas."
          icon={
            saldoMes >= 0
              ? ArrowUpRight
              : ArrowDownRight
          }
          tone={saldoMes >= 0 ? "cyan" : "rose"}
        />

        <StatCard
          titulo="Ticket médio"
          valor={formatarMoeda(ticketMedio)}
          descricao="Valor médio por atendimento."
          icon={BadgeCheck}
          tone="violet"
        />

        <StatCard
          titulo="Clientes ativos"
          valor={`${clientesAtivos}/${totalClientes}`}
          descricao="Base ativa da clínica."
          icon={Users}
          tone="blue"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">

        <div className="premium-card p-4 sm:p-5">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Hoje na clínica
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Resumo operacional do dia.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3">
              <p className="text-xs font-semibold text-emerald-700">
                Atendimentos
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">
                {agendamentosHoje}
              </p>
            </div>

            <div className="rounded-2xl bg-violet-50 p-3">
              <p className="text-xs font-semibold text-violet-700">
                Leads
              </p>
              <p className="mt-1 text-2xl font-bold text-violet-900">
                {leads.length}
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-700">
                Estoque crítico
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-900">
                {estoqueBaixo}
              </p>
            </div>

            <div className="rounded-2xl bg-cyan-50 p-3">
              <p className="text-xs font-semibold text-cyan-700">
                Automações
              </p>
              <p className="mt-1 text-2xl font-bold text-cyan-900">
                {automacoesAtivas}
              </p>
            </div>
          </div>
        </div>

        <div className="premium-card p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Saúde operacional
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Indicadores essenciais.
              </p>
            </div>

            <Link
              href="/relatorios"
              className="text-sm font-semibold text-violet-700"
            >
              Relatórios
            </Link>
          </div>

          <div className="mt-4 space-y-4">
            {[
              {
                titulo: "Entradas do mês",
                valor: entradasMes,
                percentual: percentual(
                  entradasMes,
                  Math.max(entradasMes, 1),
                ),
                cor: "bg-emerald-500",
              },
              {
                titulo: "Saídas do mês",
                valor: saidasMes,
                percentual: percentual(
                  saidasMes,
                  Math.max(entradasMes, 1),
                ),
                cor: "bg-rose-500",
              },
              {
                titulo: "Clientes ativos",
                valor: clientesAtivos,
                percentual: percentualClientesAtivos,
                cor: "bg-violet-500",
              },
            ].map((item) => (
              <div key={item.titulo}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold text-slate-700">
                    {item.titulo}
                  </span>

                  <span className="text-slate-500">
                    {typeof item.valor === "number" &&
                    item.titulo !== "Clientes ativos"
                      ? formatarMoeda(item.valor)
                      : item.percentual + "%"}
                  </span>
                </div>

                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${item.cor}`}
                    style={{
                      width: `${item.percentual}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>
            <section className="grid gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
        <div className="premium-card p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Próximos atendimentos
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Agenda futura da clínica.
              </p>
            </div>

            <Link
              href="/agenda"
              className="inline-flex items-center gap-1 text-sm font-semibold text-violet-700"
            >
              Abrir agenda
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="mt-4 space-y-2.5">
            {proximosAgendamentos.length > 0 ? (
              proximosAgendamentos.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[auto_1fr_auto]"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                    <CalendarDays className="size-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {agendamento.cliente.nome}
                    </p>

                    <p className="truncate text-sm text-slate-500">
                      {agendamento.procedimento}
                    </p>

                    {agendamento.profissional ? (
                      <p className="mt-1 text-xs text-slate-400">
                        {agendamento.profissional.nome}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                      {formatarDataHora(agendamento.data)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Nenhum atendimento futuro encontrado.
              </div>
            )}
          </div>
        </div>

        <div className="premium-card p-4 sm:p-5">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Prioridades do dia
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Pontos que precisam de atenção.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {prioridades.map((prioridade) => {
              const Icon = prioridade.icon;

              return (
                <Link
                  key={prioridade.titulo}
                  href={prioridade.href}
                  className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition hover:border-violet-300 hover:bg-violet-50"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                    <Icon className="size-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-slate-900">
                        {prioridade.titulo}
                      </p>

                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${prioridade.indicadorClass}`}
                      >
                        {prioridade.indicador}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {prioridade.descricao}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {atalhos.map((atalho) => {
          const Icon = atalho.icon;

          return (
            <Link
              key={atalho.titulo}
              href={atalho.href}
              className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-300 hover:bg-violet-50"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Icon className="size-5" />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800">
                  {atalho.titulo}
                </span>

                <ArrowUpRight className="size-4 text-slate-400 transition group-hover:text-violet-700" />
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}