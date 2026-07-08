"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw, X } from "lucide-react";

import { finalizarAtendimento } from "@/actions/agendamento.actions";

type AppointmentForFinish = {
  id: number;
  procedimento?: string;
  valor?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentForFinish | null;
  onAgendarRetorno?: () => void;
};

function useLockBodyScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);
}

export default function FinalizarAtendimentoModal({
  open,
  onClose,
  appointment,
  onAgendarRetorno,
}: Props) {
  const [procedimentoRealizado, setProcedimentoRealizado] = useState("");
  const [evolucao, setEvolucao] = useState("");
  const [valor, setValor] = useState(0);
  const [confirmando, setConfirmando] = useState(false);
  const [isPending, startTransition] = useTransition();

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open || !appointment) {
      setConfirmando(false);
      return;
    }

    setProcedimentoRealizado(appointment.procedimento || "");
    setValor(appointment.valor || 0);
    setEvolucao("");
    setConfirmando(false);
  }, [open, appointment]);

  function limparEFechar() {
    setProcedimentoRealizado("");
    setEvolucao("");
    setValor(0);
    setConfirmando(false);
    onClose();
  }

  function validarAntesDeConfirmar() {
    if (!appointment) return;

    const procedimento =
      procedimentoRealizado.trim() || appointment.procedimento || "Atendimento";
    const evolucaoClinica = evolucao.trim();

    if (!procedimento.trim()) {
      alert("Informe o procedimento realizado.");
      return;
    }

    if (!evolucaoClinica) {
      alert("Informe a evolução/observação clínica do atendimento.");
      return;
    }

    setConfirmando(true);
  }

  function handleFinalizarConfirmado() {
    if (!appointment) return;

    const procedimento =
      procedimentoRealizado.trim() || appointment.procedimento || "Atendimento";
    const evolucaoClinica = evolucao.trim();

    if (!evolucaoClinica) {
      alert("Informe a evolução/observação clínica do atendimento.");
      setConfirmando(false);
      return;
    }

    startTransition(async () => {
      try {
        await finalizarAtendimento({
          agendamentoId: appointment.id,
          procedimentoRealizado: procedimento,
          profissional: undefined,
          valorCobrado: valor || appointment.valor || 0,
          formaPagamento: "Dinheiro",
          statusPagamento: "Pago",
          evolucao: evolucaoClinica,
        });

        setProcedimentoRealizado("");
        setEvolucao("");
        setValor(0);
        setConfirmando(false);

        const desejaRetorno = window.confirm(
          "Atendimento finalizado com sucesso. Deseja agendar um retorno para esta cliente agora?",
        );

        onClose();

        if (desejaRetorno && onAgendarRetorno) {
          onAgendarRetorno();
          return;
        }

        window.location.reload();
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Não foi possível finalizar o atendimento.",
        );
      }
    });
  }

  if (!open || !appointment) return null;

  return (
    <div className="fixed inset-0 z-[110] flex h-[100dvh] items-stretch justify-center overflow-hidden bg-black/60 px-0 py-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-4">
      <div className="flex h-[100dvh] w-full max-w-[500px] flex-col overflow-hidden rounded-none border border-white/[0.10] bg-zinc-900 shadow-2xl shadow-black/40 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.08] p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Finalizar atendimento
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Registre a evolução clínica antes de marcar este atendimento como
              atendido.
            </p>
          </div>

          <button
            type="button"
            onClick={limparEFechar}
            className="rounded-xl border border-white/[0.10] bg-white/[0.04] p-2 text-slate-300 hover:bg-white/[0.08]"
            aria-label="Fechar"
          >
            <X size={17} />
          </button>
        </div>

        {!confirmando ? (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Procedimento realizado
                </span>

                <textarea
                  value={procedimentoRealizado}
                  onChange={(event) =>
                    setProcedimentoRealizado(event.target.value)
                  }
                  placeholder={appointment.procedimento || "Procedimento realizado"}
                  className="premium-input min-h-24 w-full resize-none py-3 text-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Evolução / observação clínica
                </span>

                <textarea
                  value={evolucao}
                  onChange={(event) => setEvolucao(event.target.value)}
                  placeholder="Descreva como foi o atendimento, resposta da cliente, recomendações ou observações clínicas."
                  className="premium-input min-h-32 w-full resize-none py-3 text-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Valor cobrado
                </span>

                <input
                  type="number"
                  value={valor}
                  onChange={(event) => setValor(Number(event.target.value))}
                  placeholder="Valor cobrado"
                  className="premium-input w-full text-white"
                />
              </label>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/[0.08] bg-white/[0.025] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={limparEFechar}
                className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/[0.08] sm:py-2"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={validarAntesDeConfirmar}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 sm:py-2"
              >
                Revisar e finalizar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
              <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    size={20}
                    className="mt-0.5 shrink-0 text-amber-200"
                  />

                  <div>
                    <p className="font-semibold text-amber-100">
                      Confirmar finalização?
                    </p>

                    <p className="mt-2 text-sm leading-6 text-amber-100/80">
                      Essa ação vai marcar o agendamento como{" "}
                      <strong>Atendido</strong>, registrar procedimento,
                      evolução clínica e lançamento financeiro, caso exista
                      valor cobrado.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Resumo
                </p>

                <p className="mt-3 text-sm font-semibold text-white">
                  {procedimentoRealizado.trim() ||
                    appointment.procedimento ||
                    "Atendimento"}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Valor:{" "}
                  {(valor || appointment.valor || 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>

                <p className="mt-3 line-clamp-5 text-sm leading-6 text-slate-400">
                  {evolucao}
                </p>
              </div>

              <div className="rounded-2xl border border-violet-300/20 bg-violet-400/10 p-4">
                <div className="flex items-start gap-3">
                  <RotateCcw
                    size={18}
                    className="mt-0.5 shrink-0 text-violet-200"
                  />

                  <p className="text-sm leading-6 text-violet-100/85">
                    Depois de finalizar, o sistema perguntará se você deseja
                    agendar retorno para esta cliente.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/[0.08] bg-white/[0.025] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                disabled={isPending}
                className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60 sm:py-2"
              >
                Voltar e editar
              </button>

              <button
                type="button"
                onClick={handleFinalizarConfirmado}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2"
              >
                <CheckCircle2 size={16} />
                {isPending ? "Finalizando..." : "Sim, finalizar"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}