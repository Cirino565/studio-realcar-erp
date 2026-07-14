"use client";

import ClienteProfileActions from "./ClienteProfileActions";
import type { Cliente } from "@/lib/types";
import {
  Camera,
  FileText,
  Sparkles,
  Stethoscope,
} from "lucide-react";

import type { ClienteClinicoData } from "../types";
import { formatarData, formatarMoeda } from "@/lib/format";

type Props = {
  data: ClienteClinicoData;
  cliente: Cliente;
};

function getInitials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

export default function ClienteProfileHeader({
  data,
  cliente,
}: Props) {
  const totalProcedimentos = data.procedimentos.length;

  const valorInvestido = data.procedimentos.reduce(
    (total, procedimento) => total + procedimento.valor,
    0,
  );

  const ultimoProcedimento = data.procedimentos[0];
  const ultimaEvolucao = data.evolucoes[0];
  const totalFotos = data.fotos.length;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(13,148,136,0.10),transparent_32%)]" />

      <div className="relative space-y-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-xl font-bold text-white shadow-lg shadow-violet-500/20">
              {getInitials(data.nome)}
            </div>

            <div className="min-w-0">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                  cliente.status === "Ativa"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/15 dark:text-rose-300"
                }`}
              >
                <Sparkles className="size-3.5" />
                Cliente {cliente.status.toLowerCase()}
              </div>

              <h1 className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {data.nome}
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Histórico clínico, evolução e relacionamento.
              </p>
            </div>
          </div>

          <ClienteProfileActions cliente={cliente} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 text-slate-500">
              <Stethoscope className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Procedimentos
              </span>
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {totalProcedimentos}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 text-slate-500">
              <Sparkles className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Investimento
              </span>
            </div>

            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {formatarMoeda(valorInvestido)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 text-slate-500">
              <Stethoscope className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Último procedimento
              </span>
            </div>

            <p className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-white">
              {ultimoProcedimento?.nome ?? "Nenhum"}
            </p>

            {ultimoProcedimento ? (
              <p className="mt-1 text-xs text-slate-500">
                {formatarData(ultimoProcedimento.dataProcedimento)}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 text-slate-500">
              <Camera className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Fotos
              </span>
            </div>

            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {totalFotos}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Evolução visual registrada
            </p>
          </div>
        </div>

        {(ultimaEvolucao || data.anamnese) && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-400/20 dark:bg-violet-500/15">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 size-5 text-violet-700" />

              <div>
                <p className="font-semibold text-violet-900 dark:text-violet-100">
                  Última atualização clínica
                </p>

                <p className="mt-1 text-sm text-violet-700 dark:text-violet-300">
                  {ultimaEvolucao
                    ? ultimaEvolucao.titulo
                    : "Anamnese registrada"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}