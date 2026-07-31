import type { ComponentType } from "react";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  ReceiptText,
  TrendingUp,
} from "lucide-react";

import { formatarMoeda } from "@/lib/format";

import type { FinanceiroResumoData } from "../types";

type Props = {
  resumo: FinanceiroResumoData;
};

type CardProps = {
  titulo: string;
  valor: string;
  detalhe: string;
  icon: ComponentType<{ className?: string }>;
  tone: "green" | "red" | "cyan" | "violet";
};

const toneClasses = {
  green:
    "from-emerald-500/18 to-emerald-500/5 text-emerald-700 ring-emerald-200 dark:text-emerald-300 dark:ring-emerald-400/20",
  red: "from-rose-500/18 to-rose-500/5 text-rose-700 ring-rose-200 dark:text-rose-300 dark:ring-rose-400/20",
  cyan: "from-cyan-500/18 to-cyan-500/5 text-cyan-700 ring-cyan-200 dark:text-cyan-300 dark:ring-cyan-400/20",
  violet:
    "from-violet-500/18 to-violet-500/5 text-violet-700 ring-violet-200 dark:text-violet-300 dark:ring-violet-400/20",
};

function FinanceiroResumoCard({
  titulo,
  valor,
  detalhe,
  icon: Icon,
  tone,
}: CardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/[0.05] dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-white/20" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {titulo}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-3xl">
            {valor}
          </h2>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {detalhe}
          </p>
        </div>

        <div
          className={`rounded-2xl bg-gradient-to-br p-3 ring-1 ${toneClasses[tone]}`}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

export default function FinanceiroResumo({ resumo }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <FinanceiroResumoCard
        titulo="Receita bruta recebida"
        valor={formatarMoeda(resumo.entradas)}
        detalhe={`${resumo.quantidadeEntradas} entrada(s), ticket médio ${formatarMoeda(resumo.ticketMedioEntrada)}`}
        icon={ArrowUpRight}
        tone="green"
      />

      <FinanceiroResumoCard
        titulo="Taxas de recebimento"
        valor={formatarMoeda(resumo.taxasPagamento)}
        detalhe={`Receita líquida: ${formatarMoeda(resumo.entradasLiquidas)}`}
        icon={ReceiptText}
        tone="violet"
      />

      <FinanceiroResumoCard
        titulo="Saídas pagas"
        valor={formatarMoeda(resumo.saidas)}
        detalhe={`${resumo.quantidadeSaidas} lançamento(s) pago(s) de despesa`}
        icon={ArrowDownLeft}
        tone="red"
      />

      <FinanceiroResumoCard
        titulo="Saldo operacional líquido"
        valor={formatarMoeda(resumo.saldo)}
        detalhe="Entradas líquidas menos despesas no filtro"
        icon={Banknote}
        tone="cyan"
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/[0.04] dark:border-white/10 dark:bg-white/[0.035] dark:shadow-black/10 md:col-span-2 xl:col-span-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><ReceiptText className="size-4 text-slate-400" />Lançamentos ativos no filtro</div>
            <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{resumo.totalLancamentos}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />Maior entrada</div>
            <p className="mt-2 text-xl font-semibold text-emerald-700 dark:text-emerald-300">{formatarMoeda(resumo.maiorEntrada)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><ArrowDownLeft className="size-4 text-rose-600 dark:text-rose-400" />Maior saída</div>
            <p className="mt-2 text-xl font-semibold text-rose-700 dark:text-rose-300">{formatarMoeda(resumo.maiorSaida)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
