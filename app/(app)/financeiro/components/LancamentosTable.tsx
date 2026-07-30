import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  CalendarDays,
  CheckCircle2,
  LockKeyhole,
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

function isCancelado(lancamento: LancamentoFinanceiro) {
  return (
    (lancamento.statusPagamento || "").trim().toLowerCase() === "cancelado" ||
    lancamento.venda?.situacao === "CANCELADA"
  );
}

function getTipoConfig(tipo: string) {
  if (tipo === "ENTRADA") {
    return {
      label: "Entrada",
      icon: ArrowUpRight,
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
      valueClassName: "text-emerald-700 dark:text-emerald-300",
    };
  }

  return {
    label: "Saída",
    icon: ArrowDownLeft,
    className:
      "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20",
    valueClassName: "text-rose-700 dark:text-rose-300",
  };
}

function StatusCancelado() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
      <Ban className="size-3.5" />
      Cancelado, não contabilizado
    </span>
  );
}

function AcoesLancamento({
  lancamento,
  onExcluir,
  onMarcarPago,
  isPending,
  mobile = false,
}: {
  lancamento: LancamentoFinanceiro;
  onExcluir: (id: number) => void;
  onMarcarPago: (id: number) => void;
  isPending: boolean;
  mobile?: boolean;
}) {
  const cancelado = isCancelado(lancamento);
  const vinculadoVenda = Boolean(lancamento.venda);
  const size = mobile ? "icon-xs" : "sm";

  if (cancelado) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400"
        title="O histórico foi preservado para auditoria"
      >
        <LockKeyhole className="size-3.5" />
        {mobile ? null : "Auditoria"}
      </span>
    );
  }

  return (
    <div className="flex justify-end gap-2">
      {lancamento.tipo === "ENTRADA" &&
      !["pago", "cancelado"].includes(
        (lancamento.statusPagamento || "Pago").toLowerCase(),
      ) ? (
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled={isPending}
          onClick={() => onMarcarPago(lancamento.id)}
          aria-label={`Marcar ${lancamento.descricao} como pago`}
        >
          <CheckCircle2 className="size-4" />
          {mobile ? null : "Marcar pago"}
        </Button>
      ) : null}

      {vinculadoVenda ? (
        <Button
          type="button"
          variant="outline"
          size={mobile ? "icon-xs" : "icon-sm"}
          disabled
          title="Gerencie este lançamento pela venda vinculada"
          aria-label="Lançamento protegido por venda vinculada"
        >
          <LockKeyhole className="size-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="destructive"
          size={mobile ? "icon-xs" : "icon-sm"}
          disabled={isPending}
          onClick={() => onExcluir(lancamento.id)}
          aria-label={`Excluir lançamento ${lancamento.descricao}`}
        >
          <Trash className="size-4" />
        </Button>
      )}
    </div>
  );
}

export default function LancamentosTable({
  lancamentos,
  onExcluir,
  onMarcarPago,
  isPending = false,
}: Props) {
  if (lancamentos.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-900/[0.05] dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/20">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.05]">
          <SearchX className="size-6 text-slate-400" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-slate-950 dark:text-white">
          Nenhum lançamento encontrado
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
          Ajuste os filtros ou cadastre um novo lançamento financeiro.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.05] dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/20">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            Lançamentos
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {lancamentos.length} registro(s) no filtro atual.
          </p>
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500 dark:bg-white/[0.035] dark:text-slate-400">
            <tr>
              <th className="px-5 py-4 font-medium">Descrição</th>
              <th className="px-5 py-4 font-medium">Tipo</th>
              <th className="px-5 py-4 font-medium">Categoria e status</th>
              <th className="px-5 py-4 font-medium">Data</th>
              <th className="px-5 py-4 text-right font-medium">Valor</th>
              <th className="px-5 py-4 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {lancamentos.map((lancamento) => {
              const tipoConfig = getTipoConfig(lancamento.tipo);
              const TipoIcon = tipoConfig.icon;
              const cancelado = isCancelado(lancamento);

              return (
                <tr
                  key={lancamento.id}
                  className={
                    cancelado
                      ? "bg-rose-50/50 dark:bg-rose-500/[0.03]"
                      : "transition hover:bg-slate-50 dark:hover:bg-white/[0.035]"
                  }
                >
                  <td className="px-5 py-4">
                    <p
                      className={`font-medium ${
                        cancelado
                          ? "text-slate-500 line-through dark:text-slate-400"
                          : "text-slate-950 dark:text-white"
                      }`}
                    >
                      {lancamento.descricao}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
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
                  <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                    <p>
                      {cancelado ? "Categoria original: " : ""}
                      {lancamento.categoria || "Sem categoria"}
                    </p>
                    <div className="mt-1.5">
                      {cancelado ? (
                        <StatusCancelado />
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {lancamento.origem || "Manual"} • {lancamento.statusPagamento || "Pago"}
                          {lancamento.formaPagamento
                            ? ` • ${lancamento.formaPagamento}`
                            : ""}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="size-4 text-slate-400" />
                      {formatarData(lancamento.data)}
                    </span>
                  </td>
                  <td
                    className={`px-5 py-4 text-right font-semibold ${
                      cancelado
                        ? "text-slate-400 line-through dark:text-slate-500"
                        : tipoConfig.valueClassName
                    }`}
                  >
                    {lancamento.tipo === "SAIDA" ? "- " : "+ "}
                    {formatarMoeda(lancamento.valor)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <AcoesLancamento
                      lancamento={lancamento}
                      onExcluir={onExcluir}
                      onMarcarPago={onMarcarPago}
                      isPending={isPending}
                    />
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
          const cancelado = isCancelado(lancamento);

          return (
            <div
              key={lancamento.id}
              className={`rounded-2xl border p-4 ${
                cancelado
                  ? "border-rose-200 bg-rose-50/60 dark:border-rose-400/20 dark:bg-rose-500/[0.05]"
                  : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={`font-semibold ${
                      cancelado
                        ? "text-slate-500 line-through dark:text-slate-400"
                        : "text-slate-950 dark:text-white"
                    }`}
                  >
                    {lancamento.descricao}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {formatarData(lancamento.data)} • {cancelado ? "Categoria original: " : ""}
                    {lancamento.categoria || "Sem categoria"}
                  </p>
                  <div className="mt-2">
                    {cancelado ? (
                      <StatusCancelado />
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {lancamento.origem || "Manual"} • {lancamento.statusPagamento || "Pago"}
                        {lancamento.formaPagamento
                          ? ` • ${lancamento.formaPagamento}`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>

                <AcoesLancamento
                  lancamento={lancamento}
                  onExcluir={onExcluir}
                  onMarcarPago={onMarcarPago}
                  isPending={isPending}
                  mobile
                />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tipoConfig.className}`}
                >
                  <TipoIcon className="size-3.5" />
                  {tipoConfig.label}
                </span>

                <span
                  className={`font-semibold ${
                    cancelado
                      ? "text-slate-400 line-through dark:text-slate-500"
                      : tipoConfig.valueClassName
                  }`}
                >
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
