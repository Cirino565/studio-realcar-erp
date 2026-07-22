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
  green: "from-emerald-500/18 to-emerald-500/5 text-emerald-300 ring-emerald-400/20",
  red: "from-rose-500/18 to-rose-500/5 text-rose-300 ring-rose-400/20",
  cyan: "from-cyan-500/18 to-cyan-500/5 text-cyan-300 ring-cyan-400/20",
  violet: "from-violet-500/18 to-violet-500/5 text-violet-300 ring-violet-400/20",
};

function FinanceiroResumoCard({
  titulo,
  valor,
  detalhe,
  icon: Icon,
  tone,
}: CardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{titulo}</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            {valor}
          </h2>
          <p className="mt-2 text-xs text-slate-500">{detalhe}</p>
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
        titulo="Entradas recebidas"
        valor={formatarMoeda(resumo.entradas)}
        detalhe={`${resumo.quantidadeEntradas} lançamento(s) pago(s) de receita`}
        icon={ArrowUpRight}
        tone="green"
      />

      <FinanceiroResumoCard
        titulo="Saídas pagas"
        valor={formatarMoeda(resumo.saidas)}
        detalhe={`${resumo.quantidadeSaidas} lançamento(s) pago(s) de despesa`}
        icon={ArrowDownLeft}
        tone="red"
      />

      <FinanceiroResumoCard
        titulo="Saldo realizado"
        valor={formatarMoeda(resumo.saldo)}
        detalhe="Somente valores efetivamente pagos no filtro"
        icon={Banknote}
        tone="cyan"
      />

      <FinanceiroResumoCard
        titulo="Ticket Médio"
        valor={formatarMoeda(resumo.ticketMedioEntrada)}
        detalhe="Média das entradas efetivamente recebidas"
        icon={CircleDollarSign}
        tone="violet"
      />

      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 md:col-span-2 xl:col-span-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/[0.06]">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <ReceiptText className="size-4 text-slate-500" />
              Total de lançamentos
            </div>
            <p className="mt-2 text-xl font-semibold text-white">
              {resumo.totalLancamentos}
            </p>
          </div>

          <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/[0.06]">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <TrendingUp className="size-4 text-emerald-400" />
              Maior entrada
            </div>
            <p className="mt-2 text-xl font-semibold text-emerald-300">
              {formatarMoeda(resumo.maiorEntrada)}
            </p>
          </div>

          <div className="rounded-2xl bg-black/20 p-4 ring-1 ring-white/[0.06]">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <ArrowDownLeft className="size-4 text-rose-400" />
              Maior saída
            </div>
            <p className="mt-2 text-xl font-semibold text-rose-300">
              {formatarMoeda(resumo.maiorSaida)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
