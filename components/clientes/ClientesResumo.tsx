import {
  CalendarClock,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { formatarMoeda } from "@/lib/format";
import type { Cliente } from "@/lib/types";

type Props = {
  clientes: Cliente[];
  totalGeral: number;
};

type CardTone = "cyan" | "emerald" | "amber" | "pink";

type CardResumo = {
  titulo: string;
  valor: string;
  detalhe: string;
  icon: LucideIcon;
  tone: CardTone;
};

const toneStyles: Record<
  CardTone,
  {
    accent: string;
    icon: string;
    value: string;
  }
> = {
  cyan: {
    accent: "bg-cyan-500",
    icon:
      "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    value: "text-cyan-700 dark:text-cyan-300",
  },
  emerald: {
    accent: "bg-emerald-500",
    icon:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    value: "text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    accent: "bg-amber-500",
    icon:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    value: "text-amber-700 dark:text-amber-300",
  },
  pink: {
    accent: "bg-pink-500",
    icon:
      "bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
    value: "text-pink-700 dark:text-pink-300",
  },
};

export default function ClientesResumo({
  clientes,
  totalGeral,
}: Props) {
  const totalFiltrado = clientes.length;

  const ativos = clientes.filter(
    (cliente) => cliente.status === "Ativa",
  ).length;

  const faturamento = clientes.reduce(
    (totalAtual, cliente) =>
      totalAtual + cliente.valorGasto,
    0,
  );

  const limiteRetorno = new Date();
  limiteRetorno.setDate(limiteRetorno.getDate() - 60);

  const oportunidadesRetorno = clientes.filter((cliente) => {
    if (cliente.status !== "Ativa") return false;
    if (!cliente.ultimaVisita) return true;

    return new Date(cliente.ultimaVisita) <= limiteRetorno;
  }).length;

  const taxaAtivos =
    totalFiltrado > 0
      ? Math.round((ativos / totalFiltrado) * 100)
      : 0;

  const cards: CardResumo[] = [
    {
      titulo: "Total de clientes",
      valor: totalGeral.toString(),
      detalhe:
        totalFiltrado === totalGeral
          ? "Toda a base está sendo exibida"
          : `${totalFiltrado} resultado(s) após os filtros`,
      icon: Users,
      tone: "cyan",
    },
    {
      titulo: "Clientes ativos",
      valor: ativos.toString(),
      detalhe: `${taxaAtivos}% dos resultados exibidos`,
      icon: Sparkles,
      tone: "emerald",
    },
    {
      titulo: "Valor acumulado",
      valor: formatarMoeda(faturamento),
      detalhe: "Considerando os resultados atuais",
      icon: TrendingUp,
      tone: "amber",
    },
    {
      titulo: "Oportunidades de retorno",
      valor: oportunidadesRetorno.toString(),
      detalhe: "Ativas sem visita nos últimos 60 dias",
      icon: CalendarClock,
      tone: "pink",
    },
  ];

  return (
    <section
      aria-label="Resumo dos clientes"
      className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        const styles = toneStyles[card.tone];
        const valorLongo = card.valor.length > 12;

        return (
          <article
            key={card.titulo}
            className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-px hover:shadow-md dark:border-white/10 dark:bg-white/[0.06] sm:p-4"
          >
            <div
              aria-hidden="true"
              className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`}
            />

            <div className="flex min-w-0 items-start justify-between gap-2">
              <p className="min-w-0 text-[11px] font-semibold leading-4 text-slate-500 dark:text-slate-300 sm:text-xs">
                {card.titulo}
              </p>

              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-9 ${styles.icon}`}
              >
                <Icon className="size-4 sm:size-[18px]" />
              </div>
            </div>

            <p
              title={card.valor}
              className={`mt-3 min-w-0 break-words font-bold leading-tight tracking-tight tabular-nums ${styles.value} ${
                valorLongo
                  ? "text-base sm:text-xl"
                  : "text-xl sm:text-2xl"
              }`}
            >
              {card.valor}
            </p>

            <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
              {card.detalhe}
            </p>
          </article>
        );
      })}
    </section>
  );
}