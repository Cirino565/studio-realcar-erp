import Link from "next/link";
import {
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Package,
  Settings,
  UsersRound,
} from "lucide-react";

import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export default async function DashboardPage() {
  await requirePagePermission("dashboard.visualizar");

  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  const hojeFim = new Date();
  hojeFim.setHours(23, 59, 59, 999);

  const [
    totalClientes,
    totalAgendamentosHoje,
    totalProdutos,
    lancamentosEntrada,
  ] = await Promise.all([
    prisma.cliente.count(),
    prisma.agendamento.count({
      where: {
        data: {
          gte: hojeInicio,
          lte: hojeFim,
        },
      },
    }),
    prisma.produto.count(),
    prisma.lancamento.findMany({
      where: {
        tipo: "ENTRADA",
      },
      select: {
        valor: true,
      },
    }),
  ]);

  const totalEntradas = lancamentosEntrada.reduce(
    (total, item) => total + item.valor,
    0,
  );

  const cards = [
    {
      titulo: "Clientes",
      valor: String(totalClientes),
      descricao: "Base ativa de relacionamento",
      href: "/clientes",
      icone: UsersRound,
    },
    {
      titulo: "Agenda hoje",
      valor: String(totalAgendamentosHoje),
      descricao: "Atendimentos agendados para hoje",
      href: "/agenda",
      icone: CalendarDays,
    },
    {
      titulo: "Financeiro",
      valor: formatarMoeda(totalEntradas),
      descricao: "Entradas registradas no sistema",
      href: "/financeiro",
      icone: CircleDollarSign,
    },
    {
      titulo: "Estoque",
      valor: String(totalProdutos),
      descricao: "Produtos cadastrados",
      href: "/estoque",
      icone: Package,
    },
  ];

  const atalhos = [
    {
      titulo: "Novo cliente",
      descricao: "Cadastrar cliente no CRM",
      href: "/clientes/novo",
      icone: UsersRound,
    },
    {
      titulo: "Novo agendamento",
      descricao: "Criar atendimento na agenda",
      href: "/agenda/novo",
      icone: CalendarDays,
    },
    {
      titulo: "Relatórios",
      descricao: "Acompanhar indicadores da clínica",
      href: "/relatorios",
      icone: ClipboardList,
    },
    {
      titulo: "Configurações",
      descricao: "Ajustar dados da clínica",
      href: "/configuracoes",
      icone: Settings,
    },
  ];

  return (
    <div className="app-mobile-safe space-y-6">
      <section className="premium-card relative overflow-hidden p-6 sm:p-8">
        <div className="absolute right-0 top-0 size-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 size-48 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-violet-300">
            Studio Realçar
          </p>

          <h1 className="premium-title mt-3">
            Dashboard administrativo
          </h1>

          <p className="premium-subtitle">
            Visão geral da clínica, clientes, agenda, financeiro e estoque.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icone = card.icone;

          return (
            <Link
              key={card.titulo}
              href={card.href}
              className="premium-card group p-5 transition hover:border-violet-400/30 hover:bg-white/[0.055]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">{card.titulo}</p>
                  <strong className="mt-2 block text-2xl font-semibold text-white">
                    {card.valor}
                  </strong>
                </div>

                <div className="flex size-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05] text-violet-200 transition group-hover:bg-violet-500/20">
                  <Icone size={20} />
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                {card.descricao}
              </p>
            </Link>
          );
        })}
      </section>

      <section className="premium-card p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">
            Atalhos rápidos
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Acesse as principais rotinas administrativas.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {atalhos.map((atalho) => {
            const Icone = atalho.icone;

            return (
              <Link
                key={atalho.titulo}
                href={atalho.href}
                className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4 transition hover:border-violet-400/30 hover:bg-white/[0.06]"
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
                  <Icone size={20} />
                </div>

                <h3 className="font-semibold text-white">{atalho.titulo}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {atalho.descricao}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}