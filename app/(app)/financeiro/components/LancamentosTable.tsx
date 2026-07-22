import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  SearchX,
  Trash,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatarData, formatarMoeda } from "@/lib/format";

import type { LancamentoFinanceiro } from "../types";

type Props = {
  lancamentos: LancamentoFinanceiro[];
  onExcluir: (id: number) => void;
  onMarcarPago: (id: number) => void;
  isPending?: boolean;
};

function getTipoConfig(tipo: string) {
  if (tipo === "ENTRADA") {
    return {
      label: "Entrada",
      icon: ArrowUpRight,
      className:
        "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
      valueClassName: "text-emerald-300",
    };
  }

  return {
    label: "Saída",
    icon: ArrowDownLeft,
    className: "bg-rose-500/10 text-rose-300 ring-rose-400/20",
    valueClassName: "text-rose-300",
  };
}

export default function LancamentosTable({
  lancamentos,
  onExcluir,
  onMarcarPago,
  isPending = false,
}: Props) {
  if (lancamentos.length === 0) {
    return (
      <div className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-10 text-center shadow-2xl shadow-black/20">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.08]">
          <SearchX className="size-6 text-slate-400" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-white">
          Nenhum lançamento encontrado
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          Ajuste os filtros ou cadastre um novo lançamento financeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-950/70 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-2 border-b border-white/[0.08] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Lançamentos</h2>
          <p className="text-sm text-slate-400">
            {lancamentos.length} registro(s) no filtro atual.
          </p>
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-white/[0.035] text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-5 py-4 font-medium">Descrição</th>
              <th className="px-5 py-4 font-medium">Tipo</th>
              <th className="px-5 py-4 font-medium">Categoria</th>
              <th className="px-5 py-4 font-medium">Data</th>
              <th className="px-5 py-4 text-right font-medium">Valor</th>
              <th className="px-5 py-4 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {lancamentos.map((lancamento) => {
              const tipoConfig = getTipoConfig(lancamento.tipo);
              const TipoIcon = tipoConfig.icon;

              return (
                <tr
                  key={lancamento.id}
                  className="transition hover:bg-white/[0.035]"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">
                      {lancamento.descricao}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                      {lancamento.observacoes || "Sem observações"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tipoConfig.className}`}
                    >
                      <TipoIcon className="size-3.5" />
                      {tipoConfig.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    <p>{lancamento.categoria || "Sem categoria"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {lancamento.origem || "Manual"} • {lancamento.statusPagamento || "Pago"}
                      {lancamento.formaPagamento ? ` • ${lancamento.formaPagamento}` : ""}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="size-4 text-slate-500" />
                      {formatarData(lancamento.data)}
                    </span>
                  </td>
                  <td
                    className={`px-5 py-4 text-right font-semibold ${tipoConfig.valueClassName}`}
                  >
                    {lancamento.tipo === "SAIDA" ? "- " : "+ "}
                    {formatarMoeda(lancamento.valor)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {lancamento.tipo === "ENTRADA" &&
                      (lancamento.statusPagamento || "Pago").toLowerCase() !== "pago" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => onMarcarPago(lancamento.id)}
                        >
                          <CheckCircle2 className="size-4" />
                          Marcar pago
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => onExcluir(lancamento.id)}
                        aria-label={`Excluir lançamento ${lancamento.descricao}`}
                      >
                        <Trash className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-4 md:hidden">
        {lancamentos.map((lancamento) => {
          const tipoConfig = getTipoConfig(lancamento.tipo);
          const TipoIcon = tipoConfig.icon;

          return (
            <div
              key={lancamento.id}
              className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/[0.07]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">
                    {lancamento.descricao}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatarData(lancamento.data)} • {lancamento.categoria || "Sem categoria"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {lancamento.origem || "Manual"} • {lancamento.statusPagamento || "Pago"}
                    {lancamento.formaPagamento ? ` • ${lancamento.formaPagamento}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {lancamento.tipo === "ENTRADA" &&
                  (lancamento.statusPagamento || "Pago").toLowerCase() !== "pago" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-xs"
                      disabled={isPending}
                      onClick={() => onMarcarPago(lancamento.id)}
                      aria-label={`Marcar ${lancamento.descricao} como pago`}
                    >
                      <CheckCircle2 className="size-3.5" />
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-xs"
                    disabled={isPending}
                    onClick={() => onExcluir(lancamento.id)}
                    aria-label={`Excluir lançamento ${lancamento.descricao}`}
                  >
                    <Trash className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tipoConfig.className}`}
                >
                  <TipoIcon className="size-3.5" />
                  {tipoConfig.label}
                </span>

                <span className={`font-semibold ${tipoConfig.valueClassName}`}>
                  {lancamento.tipo === "SAIDA" ? "- " : "+ "}
                  {formatarMoeda(lancamento.valor)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
