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
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
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
    prisma.agendamento.count({ where: { data: { gte: inicioHoje, lt: fimHoje } } }),
    prisma.agendamento.count({ where: { data: { gte: inicioMesAtual, lt: fimMesAtual } } }),
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
    prisma.produto.findMany({ orderBy: { quantidade: "asc" }, take: 8 }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.automacao.count({ where: { status: "Ativa" } }),
  ]);

  const entradasMes = lancamentosMes
    .filter((lancamento) => lancamento.tipo === "ENTRADA")
    .reduce((total, lancamento) => total + lancamento.valor, 0);

  const saidasMes = lancamentosMes
    .filter((lancamento) => lancamento.tipo === "SAIDA")
    .reduce((total, lancamento) => total + lancamento.valor, 0);

  const saldoMes = entradasMes - saidasMes;
  const ticketMedio = agendamentosMes > 0 ? entradasMes / agendamentosMes : 0;
  const margemMes = entradasMes > 0 ? (saldoMes / entradasMes) * 100 : 0;
  const estoqueBaixo = produtos.filter((produto) => produto.quantidade <= produto.estoqueMinimo).length;
  const valorEstoque = produtos.reduce((total, produto) => total + produto.quantidade * produto.valorCompra, 0);

  const maiorFluxo = Math.max(entradasMes, saidasMes, 1);
  const percentualEntrada = percentual(entradasMes, maiorFluxo);
  const percentualSaida = percentual(saidasMes, maiorFluxo);
  const percentualClientesAtivos = percentual(clientesAtivos, totalClientes);
  const percentualAgenda = percentual(agendamentosHoje, Math.max(agendamentosMes, 1));

  const prioridades = [
    {
      titulo: "Confirmar agenda",
      descricao: `${agendamentosHoje} atendimento(s) previsto(s) para hoje.`,
      href: "/agenda",
      icon: CalendarClock,
      indicador: agendamentosHoje > 0 ? "Alta" : "Normal",
    },
    {
      titulo: "Repor estoque",
      descricao: `${estoqueBaixo} produto(s) com estoque abaixo do mínimo.`,
      href: "/estoque",
      icon: PackageSearch,
      indicador: estoqueBaixo > 0 ? "Atenção" : "Ok",
    },
    {
      titulo: "Nutrir leads",
      descricao: `${leads.length} oportunidade(s) recente(s) para acompanhamento.`,
      href: "/marketing",
      icon: ClipboardList,
      indicador: leads.length > 0 ? "Aberto" : "Baixo",
    },
  ];

  const atalhos = [
    { titulo: "Novo cliente", href: "/clientes", icon: Users },
    { titulo: "Agendar horário", href: "/agenda", icon: CalendarDays },
    { titulo: "Lançar financeiro", href: "/financeiro", icon: WalletCards },
    { titulo: "Ver estoque", href: "/estoque", icon: PackageSearch },
  ];

  return (
    <div className="space-y-6 pb-8 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.12] bg-white/[0.08] p-5 shadow-2xl shadow-black/15 backdrop-blur-xl sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(34,211,238,0.12),transparent_30%)]" />
        <div className="relative grid gap-7 xl:grid-cols-[1.25fr_0.75fr] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/12 px-3 py-1.5 text-xs font-semibold text-violet-100">
              <Sparkles className="h-3.5 w-3.5" />
              Painel executivo Studio Realçar
            </div>
            <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl xl:text-5xl">
              Visão clara da clínica para decisões rápidas.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              Receita, agenda, clientes, estoque e oportunidades em uma tela mais legível, responsiva e preparada para operação diária.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-white/[0.12] bg-slate-950/20 p-4">
              <p className="text-xs font-medium text-slate-400">Margem do mês</p>
              <p className={`mt-2 text-2xl font-semibold ${margemMes >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                {formatarPercentual(margemMes)}
              </p>
            </div>
            <div className="rounded-3xl border border-white/[0.12] bg-slate-950/20 p-4">
              <p className="text-xs font-medium text-slate-400">Automações</p>
              <p className="mt-2 text-2xl font-semibold text-white">{automacoesAtivas}</p>
            </div>
            <div className="rounded-3xl border border-white/[0.12] bg-slate-950/20 p-4">
              <p className="text-xs font-medium text-slate-400">Agenda no mês</p>
              <p className="mt-2 text-2xl font-semibold text-white">{agendamentosMes}</p>
            </div>
            <div className="rounded-3xl border border-white/[0.12] bg-slate-950/20 p-4">
              <p className="text-xs font-medium text-slate-400">Estoque</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatarMoeda(valorEstoque)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard titulo="Receita mensal" valor={formatarMoeda(entradasMes)} cor="text-emerald-200" descricao="Entradas registradas no mês atual." />
        <StatCard titulo="Saldo mensal" valor={formatarMoeda(saldoMes)} cor={saldoMes >= 0 ? "text-cyan-200" : "text-rose-200"} descricao="Entradas menos saídas no período." />
        <StatCard titulo="Ticket médio" valor={formatarMoeda(ticketMedio)} cor="text-violet-100" descricao="Receita média por atendimento do mês." />
        <StatCard titulo="Clientes ativos" valor={`${clientesAtivos}/${totalClientes}`} cor="text-white" descricao="Base ativa em relação ao total cadastrado." />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="premium-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-white/[0.10] pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">Saúde operacional</h2>
              <p className="mt-1 text-sm text-slate-400">Leitura rápida dos pontos que sustentam a operação.</p>
            </div>
            <Link href="/relatorios" className="premium-button-secondary inline-flex w-full items-center justify-center gap-2 md:w-auto">
              Ver relatórios
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-200">Entradas do mês</span>
                <span className="text-slate-300">{formatarMoeda(entradasMes)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full bg-emerald-300/80" style={{ width: `${percentualEntrada}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-200">Saídas do mês</span>
                <span className="text-slate-300">{formatarMoeda(saidasMes)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full bg-rose-300/80" style={{ width: `${percentualSaida}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-200">Clientes ativos</span>
                <span className="text-slate-300">{percentualClientesAtivos}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full bg-violet-300/80" style={{ width: `${percentualClientesAtivos}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-200">Agenda de hoje no mês</span>
                <span className="text-slate-300">{percentualAgenda}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full bg-cyan-300/80" style={{ width: `${percentualAgenda}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="premium-card p-5 sm:p-6">
          <div className="border-b border-white/[0.10] pb-5">
            <h2 className="text-xl font-semibold tracking-tight text-white">Ações rápidas</h2>
            <p className="mt-1 text-sm text-slate-400">Atalhos para rotina diária no celular e desktop.</p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {atalhos.map((atalho) => {
              const Icon = atalho.icon;

              return (
                <Link
                  key={atalho.titulo}
                  href={atalho.href}
                  className="group flex items-center justify-between rounded-3xl border border-white/[0.12] bg-white/[0.06] p-4 transition hover:border-violet-300/30 hover:bg-white/[0.09]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/12 text-violet-100 ring-1 ring-violet-300/15">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-white">{atalho.titulo}</span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-500 transition group-hover:text-violet-200" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[1.1fr_0.9fr]">
        <div className="premium-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-white/[0.10] pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">Próximos atendimentos</h2>
              <p className="mt-1 text-sm text-slate-400">Agenda operacional com foco nos próximos horários.</p>
            </div>
            <Link href="/agenda" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-100 hover:text-white">
              Abrir agenda
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {proximosAgendamentos.length > 0 ? (
              proximosAgendamentos.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="flex flex-col gap-4 rounded-3xl border border-white/[0.12] bg-white/[0.055] p-4 transition hover:border-white/[0.18] hover:bg-white/[0.08] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-100 ring-1 ring-cyan-300/15">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{agendamento.cliente.nome}</p>
                      <p className="mt-1 truncate text-sm text-slate-400">{agendamento.procedimento}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                    <p className="rounded-2xl border border-white/[0.10] bg-white/[0.055] px-3 py-2 text-sm font-medium text-slate-200">
                      {formatarDataHora(agendamento.data)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-white/[0.14] p-8 text-center text-sm text-slate-400">
                Nenhum atendimento futuro encontrado.
              </div>
            )}
          </div>
        </div>

        <div className="premium-card p-5 sm:p-6">
          <div className="border-b border-white/[0.10] pb-5">
            <h2 className="text-xl font-semibold tracking-tight text-white">Prioridades do dia</h2>
            <p className="mt-1 text-sm text-slate-400">Pontos que merecem acompanhamento operacional.</p>
          </div>

          <div className="mt-5 space-y-3">
            {prioridades.map((prioridade) => {
              const Icon = prioridade.icon;

              return (
                <Link
                  key={prioridade.titulo}
                  href={prioridade.href}
                  className="group flex gap-4 rounded-3xl border border-white/[0.12] bg-white/[0.055] p-4 transition hover:border-white/[0.18] hover:bg-white/[0.08]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-slate-200 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{prioridade.titulo}</p>
                      <span className="rounded-full border border-white/[0.12] bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                        {prioridade.indicador}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-5 text-slate-400">{prioridade.descricao}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="premium-card-soft p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-200">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-white">Entradas</p>
              <p className="mt-1 text-sm leading-5 text-slate-400">{formatarMoeda(entradasMes)} registrados como receita neste mês.</p>
            </div>
          </div>
        </div>

        <div className="premium-card-soft p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-400/12 text-rose-200">
              <ArrowDownRight className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-white">Saídas</p>
              <p className="mt-1 text-sm leading-5 text-slate-400">{formatarMoeda(saidasMes)} registrados como despesas neste mês.</p>
            </div>
          </div>
        </div>

        <div className="premium-card-soft p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-400/12 text-violet-100">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-white">Base pronta</p>
              <p className="mt-1 text-sm leading-5 text-slate-400">Dashboard preparado para relatórios, metas e comparativos avançados.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
