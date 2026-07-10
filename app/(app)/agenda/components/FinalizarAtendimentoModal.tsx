"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CalendarPlus,
  Check,
  CheckCircle2,
  ClipboardCheck,
  RotateCcw,
  Sparkles,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import { finalizarAtendimento } from "@/actions/agendamento.actions";

type AppointmentForFinish = {
  id: number;
  clienteId: number;
  profissionalId: number | null;
  procedimento: string;
  data: string;
  duracao: number;
  valor: number;
  observacoes: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  cliente: {
    nome: string;
    telefone?: string | null;
    whatsapp?: string | null;
  };
  profissional: {
    id: number;
    nome: string;
    area: string | null;
    cor: string;
    status: string;
  } | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentForFinish | null;
  onAgendarRetorno?: (appointment: AppointmentForFinish) => void;
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

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "CL";

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
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
  const [finalizado, setFinalizado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open || !appointment) {
      setProcedimentoRealizado("");
      setEvolucao("");
      setValor(0);
      setConfirmando(false);
      setFinalizado(false);
      setError(null);
      return;
    }

    setProcedimentoRealizado(appointment.procedimento || "");
    setValor(appointment.valor || 0);
    setEvolucao("");
    setConfirmando(false);
    setFinalizado(false);
    setError(null);
  }, [open, appointment]);

  if (!open || !appointment) return null;

  const currentAppointment = appointment;

  const procedimentoFinal =
    procedimentoRealizado.trim() ||
    currentAppointment.procedimento ||
    "Atendimento";

  const valorFinal = valor || currentAppointment.valor || 0;

  function limparEFechar() {
    setProcedimentoRealizado("");
    setEvolucao("");
    setValor(0);
    setConfirmando(false);
    setFinalizado(false);
    setError(null);
    onClose();
  }

  function validarAntesDeConfirmar() {
    setError(null);

    if (!procedimentoFinal.trim()) {
      setError("Informe o procedimento realizado.");
      return;
    }

    if (!evolucao.trim()) {
      setError("Informe a evolução ou observação clínica do atendimento.");
      return;
    }

    setConfirmando(true);
  }

  function handleFinalizarConfirmado() {
    const evolucaoClinica = evolucao.trim();

    setError(null);

    if (!evolucaoClinica) {
      setError("Informe a evolução ou observação clínica do atendimento.");
      setConfirmando(false);
      return;
    }

    const agendamentoId = currentAppointment.id;
    const procedimento = procedimentoFinal;
    const valorCobrado = valorFinal;

    startTransition(async () => {
      try {
        await finalizarAtendimento({
          agendamentoId,
          procedimentoRealizado: procedimento,
          profissional: undefined,
          valorCobrado,
          formaPagamento: "Dinheiro",
          statusPagamento: "Pago",
          evolucao: evolucaoClinica,
        });

        setFinalizado(true);
        setConfirmando(false);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Não foi possível finalizar o atendimento.",
        );
      }
    });
  }

  function concluirSemRetorno() {
    window.location.reload();
  }

  function agendarRetornoAgora() {
    if (!onAgendarRetorno) {
      window.location.reload();
      return;
    }

    onClose();
    onAgendarRetorno(currentAppointment);
  }

  const etapa = finalizado ? "success" : confirmando ? "review" : "form";

  const headerLabel =
    etapa === "success"
      ? "Atendimento concluído"
      : etapa === "review"
        ? "Revisão final"
        : "Registro clínico";

  const headerTitle =
    etapa === "success"
      ? "Finalizado com sucesso"
      : etapa === "review"
        ? "Confira os dados"
        : "Finalizar atendimento";

  const headerDescription =
    etapa === "success"
      ? "Os registros foram atualizados."
      : etapa === "review"
        ? "Revise antes de confirmar."
        : currentAppointment.cliente.nome;

  return (
    <div className="fixed inset-0 z-[110] h-[100dvh] overflow-hidden">
      <button
        type="button"
        aria-label="Fechar finalização do atendimento"
        onClick={finalizado ? concluirSemRetorno : limparEFechar}
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="finalizar-atendimento-title"
        className="absolute inset-0 flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-slate-50 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-[540px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:border-slate-200"
      >
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                  finalizado ? "bg-emerald-600" : "bg-violet-600"
                }`}
              >
                {finalizado ? (
                  <CheckCircle2 size={19} />
                ) : (
                  <ClipboardCheck size={19} />
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                  {headerLabel}
                </p>

                <h2
                  id="finalizar-atendimento-title"
                  className="mt-0.5 truncate text-[17px] font-bold leading-5 text-slate-950"
                >
                  {headerTitle}
                </h2>

                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {headerDescription}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={finalizado ? concluirSemRetorno : limparEFechar}
              disabled={isPending}
              className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              aria-label="Fechar"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        {finalizado ? (
          <>
            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3.5 sm:px-5 sm:py-5">
              <div className="space-y-3">
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <Check size={19} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-emerald-900">
                        Atendimento salvo
                      </p>

                      <p className="mt-1 text-xs leading-5 text-emerald-700">
                        Procedimento, evolução, financeiro e status foram
                        atualizados.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white">
                      {getInitials(currentAppointment.cliente.nome)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Cliente
                      </p>

                      <p className="mt-0.5 truncate text-sm font-bold text-slate-950">
                        {currentAppointment.cliente.nome}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {procedimentoFinal}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Valor
                      </p>

                      <p className="mt-0.5 text-sm font-bold text-violet-700">
                        {formatCurrency(valorFinal)}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <div className="flex items-start gap-3">
                    <CalendarPlus
                      size={19}
                      className="mt-0.5 shrink-0 text-violet-700"
                    />

                    <div>
                      <p className="text-sm font-bold text-violet-900">
                        Agendar retorno
                      </p>

                      <p className="mt-1 text-xs leading-5 text-violet-700">
                        A cliente, a profissional e o procedimento serão
                        preenchidos automaticamente.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                    Registros criados
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[
                      "Procedimento",
                      "Evolução clínica",
                      "Financeiro",
                      "Status atendido",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <Check size={12} />
                        </span>

                        <span className="min-w-0">{item}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </main>

            <footer className="shrink-0 border-t border-slate-200 bg-white p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:p-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={concluirSemRetorno}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Voltar à agenda
                </button>

                <button
                  type="button"
                  onClick={agendarRetornoAgora}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-semibold text-white transition hover:bg-violet-700"
                >
                  <CalendarPlus size={15} />
                  Agendar retorno
                </button>
              </div>
            </footer>
          </>
        ) : !confirmando ? (
          <>
            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3.5 sm:px-5 sm:py-5">
              <div className="space-y-3">
                {error ? (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0 text-rose-700"
                    />

                    <p className="text-xs leading-5 text-rose-700">
                      {error}
                    </p>
                  </div>
                ) : null}

                <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <UserRound size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Cliente
                      </p>

                      <p className="mt-0.5 truncate text-sm font-bold text-slate-950">
                        {currentAppointment.cliente.nome}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {currentAppointment.profissional?.nome ||
                          "Profissional não definida"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <label className="block p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles size={16} className="text-violet-600" />

                      <span className="text-xs font-bold text-slate-900">
                        Procedimento realizado
                      </span>
                    </div>

                    <textarea
                      value={procedimentoRealizado}
                      onChange={(event) => {
                        setProcedimentoRealizado(event.target.value);
                        setError(null);
                      }}
                      placeholder={
                        currentAppointment.procedimento ||
                        "Informe o procedimento realizado"
                      }
                      className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                    />
                  </label>

                  <label className="block p-4">
                    <div className="mb-1.5 flex items-center gap-2">
                      <ClipboardCheck size={16} className="text-violet-600" />

                      <span className="text-xs font-bold text-slate-900">
                        Evolução da cliente
                      </span>
                    </div>

                    <p className="mb-2 text-[11px] leading-4 text-slate-500">
                      Resposta ao procedimento, observações e recomendações.
                    </p>

                    <textarea
                      value={evolucao}
                      onChange={(event) => {
                        setEvolucao(event.target.value);
                        setError(null);
                      }}
                      placeholder="Descreva como foi o atendimento."
                      className="min-h-28 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                    />
                  </label>

                  <label className="block p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <WalletCards size={16} className="text-violet-600" />

                      <span className="text-xs font-bold text-slate-900">
                        Valor cobrado
                      </span>
                    </div>

                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                        R$
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={valor}
                        onChange={(event) => {
                          setValor(Number(event.target.value));
                          setError(null);
                        }}
                        placeholder="0,00"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-[13px] font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                      />
                    </div>
                  </label>
                </section>
              </div>
            </main>

            <footer className="shrink-0 border-t border-slate-200 bg-white p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:p-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={limparEFechar}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={validarAntesDeConfirmar}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-semibold text-white transition hover:bg-violet-700"
                >
                  <ClipboardCheck size={15} />
                  Revisar
                </button>
              </div>
            </footer>
          </>
        ) : (
          <>
            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3.5 sm:px-5 sm:py-5">
              <div className="space-y-3">
                {error ? (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5">
                    <AlertCircle
                      size={18}
                      className="mt-0.5 shrink-0 text-rose-700"
                    />

                    <p className="text-xs leading-5 text-rose-700">
                      {error}
                    </p>
                  </div>
                ) : null}

                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle
                      size={18}
                      className="mt-0.5 shrink-0 text-amber-700"
                    />

                    <div>
                      <p className="text-xs font-bold text-amber-900">
                        Confirmar finalização?
                      </p>

                      <p className="mt-1 text-[11px] leading-4 text-amber-800">
                        O atendimento será marcado como atendido e os registros
                        serão criados.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                      Resumo do atendimento
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Cliente
                        </p>

                        <p className="mt-1 truncate text-xs font-bold text-slate-950">
                          {currentAppointment.cliente.nome}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Valor
                        </p>

                        <p className="mt-1 text-xs font-bold text-violet-700">
                          {formatCurrency(valorFinal)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Procedimento
                    </p>

                    <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-900">
                      {procedimentoFinal}
                    </p>
                  </div>

                  <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Evolução clínica
                    </p>

                    <p className="mt-1.5 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                      {evolucao}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-violet-200 bg-violet-50 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <RotateCcw
                      size={17}
                      className="mt-0.5 shrink-0 text-violet-700"
                    />

                    <p className="text-[11px] leading-4 text-violet-800">
                      Após confirmar, você poderá agendar o retorno ou voltar
                      para a agenda.
                    </p>
                  </div>
                </section>
              </div>
            </main>

            <footer className="shrink-0 border-t border-slate-200 bg-white p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:p-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmando(false);
                    setError(null);
                  }}
                  disabled={isPending}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={handleFinalizarConfirmado}
                  disabled={isPending}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />

                  {isPending ? "Finalizando..." : "Confirmar"}
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}