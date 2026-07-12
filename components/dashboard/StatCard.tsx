import type { LucideIcon } from "lucide-react";

type Tone = "emerald" | "cyan" | "violet" | "blue" | "rose";

type Props = {
  titulo: string;
  valor: string;
  descricao?: string;
  icon?: LucideIcon;
  tone?: Tone;
  cor?: string;
};

const toneStyles: Record<
  Tone,
  {
    icon: string;
    value: string;
    accent: string;
  }
> = {
  emerald: {
    icon:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    value: "text-emerald-700 dark:text-emerald-300",
    accent: "bg-emerald-500",
  },
  cyan: {
    icon:
      "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    value: "text-cyan-700 dark:text-cyan-300",
    accent: "bg-cyan-500",
  },
  violet: {
    icon:
      "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    value: "text-violet-700 dark:text-violet-300",
    accent: "bg-violet-500",
  },
  blue: {
    icon:
      "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    value: "text-blue-700 dark:text-blue-300",
    accent: "bg-blue-500",
  },
  rose: {
    icon:
      "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    value: "text-rose-700 dark:text-rose-300",
    accent: "bg-rose-500",
  },
};

export default function StatCard({
  titulo,
  valor,
  descricao,
  icon: Icon,
  tone = "violet",
  cor,
}: Props) {
  const styles = toneStyles[tone];
  const valueClassName = cor ?? styles.value;

  return (
    <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.06] sm:p-4">
      <div
        className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`}
        aria-hidden="true"
      />

      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 text-xs font-semibold leading-4 text-slate-500 dark:text-slate-300 sm:text-sm">
          {titulo}
        </p>

        {Icon ? (
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9 ${styles.icon}`}
          >
            <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </div>
        ) : null}
      </div>

      <p
        className={`mt-2 min-w-0 break-words text-lg font-bold leading-tight tracking-tight sm:text-2xl ${valueClassName}`}
        title={valor}
      >
        {valor}
      </p>

      {descricao ? (
        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400 sm:text-xs">
          {descricao}
        </p>
      ) : null}
    </div>
  );
}