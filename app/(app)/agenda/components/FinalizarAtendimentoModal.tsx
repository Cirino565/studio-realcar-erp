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

  const valorFinal =
    valor || currentAppointment.valor || 0;

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
      setError(
        "Informe a evolução ou observação clínica do atendimento.",
      );
      return;
    }

    setConfirmando(true);
  }

  function handleFinalizarConfirmado() {
    const evolucaoClinica = evolucao.trim();

    setError(null);

    if (!evolucaoClinica) {
      setError(
        "Informe a evolução ou observação clínica do atendimento.",
      );
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

  return (
    <div className="fixed inset-0 z-[110] h-[100dvh] overflow-hidden">
      <button
        type="button"
        aria-label="Fechar finalização do atendimento"
        onClick={finalizado ? concluirSemRetorno : limparEFechar}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="finalizar-atendimento-title"
        className="absolute inset-0 flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-50 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-[560px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:border-slate-200"
      >
        <header className="relative shrink-0 overflow-hidden border-b border-slate-200 bg-white px-5 py-5 sm:px-6 sm:py-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-violet-100 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-emerald-100 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${
                  finalizado
                    ? "bg-emerald-600 shadow-emerald-600/20"
                    : "bg-violet-600 shadow-violet-600/20"
                }`}
              >
                {finalizado ? (
                  <CheckCircle2 size={22} />
                ) : (
                  <ClipboardCheck size={22} />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {finalizado
                    ? "Atendimento concluído"
                    : confirmando
                      ? "Revisão final"
                      : "Registro clínico"}
                </p>

                <h2
                  id="finalizar-atendimento-title"
                  className="mt-1 text-xl font-bold tracking-tight text-slate-950"
                >
                  {finalizado
                    ? "Atendimento finalizado"
                    : confirmando
                      ? "Confira antes de finalizar"
                      : "Finalizar atendimento"}
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {finalizado
                    ? "O atendimento foi registrado com sucesso."
                    : confirmando
                      ? "Revise as informações antes de confirmar."
                      : "Registre o procedimento e a evolução da cliente."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={finalizado ? concluirSemRetorno : limparEFechar}
              disabled={isPending}
              className="shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {finalizado ? (
          <>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
              <div className="space-y-5">
                <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                      <Check size={23} />
                    </div>

                    <div>
                      <p className="font-bold text-emerald-900">
                        Tudo foi salvo corretamente
                      </p>

                      <p className="mt-2 text-sm leading-6 text-emerald-700">
                        O procedimento, a evolução clínica, o financeiro e o
                        status do agendamento foram atualizados.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-base font-bold text-white">
                      {getInitials(currentAppointment.cliente.nome)}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Cliente
                      </p>

                      <p className="mt-1 truncate text-lg font-bold text-slate-950">
                        {currentAppointment.cliente.nome}
                      </p>

                      <p className="mt-1 truncate text-sm text-slate-500">
                        {procedimentoFinal}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Valor
                      </p>

                      <p className="mt-2 text-sm font-bold text-slate-900">
                        {formatCurrency(valorFinal)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Status
                      </p>

                      <p className="mt-2 text-sm font-bold text-emerald-700">
                        Atendido
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
                  <div className="flex items-start gap-3">
                    <CalendarPlus
                      size={21}
                      className="mt-0.5 shrink-0 text-violet-700"
                    />

                    <div>
                      <p className="font-bold text-violet-900">
                        Próximo passo
                      </p>

                      <p className="mt-2 text-sm leading-6 text-violet-700">
                        Você pode agendar o retorno agora com a mesma cliente,
                        profissional e procedimento já preenchidos.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Registros criados
                  </p>

                  <div className="mt-4 space-y-3">
                    {[
                      "Procedimento realizado",
                      "Evolução clínica",
                      "Lançamento financeiro",
                      "Status do agendamento",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 text-sm font-medium text-slate-700"
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <Check size={14} />
                        </span>

                        {item}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <footer className="shrink-0 border-t border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={agendarRetornoAgora}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm shadow-violet-600/20 transition hover:bg-violet-700"
                >
                  <CalendarPlus size={18} />
                  Agendar retorno
                </button>

                <button
                  type="button"
                  onClick={concluirSemRetorno}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                >
                  Voltar para agenda
                </button>
              </div>
            </footer>
          </>
        ) : !confirmando ? (
          <>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
              <div className="space-y-5">
                {error ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <AlertCircle
                      size={19}
                      className="mt-0.5 shrink-0 text-rose-700"
                    />

                    <div>
                      <p className="text-sm font-bold text-rose-900">
                        Verifique as informações
                      </p>

                      <p className="mt-1 text-sm leading-6 text-rose-700">
                        {error}
                      </p>
                    </div>
                  </div>
                ) : null}

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                      <UserRound size={19} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Cliente
                      </p>

                      <p className="mt-1 truncate text-base font-bold text-slate-950">
                        {currentAppointment.cliente.nome}
                      </p>

                      <p className="mt-1 truncate text-sm text-slate-500">
                        {currentAppointment.profissional?.nome ||
                          "Profissional não definida"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <label className="block">
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles size={17} className="text-violet-600" />

                      <span className="text-sm font-bold text-slate-900">
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
                      className="min-h-24 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </label>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <label className="block">
                    <div className="mb-2 flex items-center gap-2">
                      <ClipboardCheck
                        size={17}
                        className="text-violet-600"
                      />

                      <span className="text-sm font-bold text-slate-900">
                        Evolução da cliente
                      </span>
                    </div>

                    <p className="mb-3 text-xs leading-5 text-slate-500">
                      Registre a resposta ao procedimento, observações,
                      recomendações e próximos cuidados.
                    </p>

                    <textarea
                      value={evolucao}
                      onChange={(event) => {
                        setEvolucao(event.target.value);
                        setError(null);
                      }}
                      placeholder="Descreva como foi o atendimento, a resposta da cliente e as recomendações fornecidas."
                      className="min-h-40 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />
                  </label>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <label className="block">
                    <div className="mb-3 flex items-center gap-2">
                      <WalletCards
                        size={17}
                        className="text-violet-600"
                      />

                      <span className="text-sm font-bold text-slate-900">
                        Valor cobrado
                      </span>
                    </div>

                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                        R$
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={valor}
                        onChange={(event) => {
                          setValor(Number(event.target.value));
                          setError(null);
                        }}
                        placeholder="0,00"
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      />
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      Valor previsto no agendamento:{" "}
                      {formatCurrency(currentAppointment.valor || 0)}
                    </p>
                  </label>
                </section>

                <section className="rounded-3xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      size={19}
                      className="mt-0.5 shrink-0 text-blue-700"
                    />

                    <p className="text-sm leading-6 text-blue-800">
                      Antes de finalizar, o sistema mostrará uma tela de revisão
                      com todas as informações registradas.
                    </p>
                  </div>
                </section>
              </div>
            </div>

            <footer className="shrink-0 border-t border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-5">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={limparEFechar}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={validarAntesDeConfirmar}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm shadow-violet-600/20 transition hover:bg-violet-700"
                >
                  <ClipboardCheck size={18} />
                  Revisar e finalizar
                </button>
              </div>
            </footer>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
              <div className="space-y-5">
                {error ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <AlertCircle
                      size={19}
                      className="mt-0.5 shrink-0 text-rose-700"
                    />

                    <p className="text-sm leading-6 text-rose-700">
                      {error}
                    </p>
                  </div>
                ) : null}

                <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      size={21}
                      className="mt-0.5 shrink-0 text-amber-700"
                    />

                    <div>
                      <p className="font-bold text-amber-900">
                        Confirmar finalização?
                      </p>

                      <p className="mt-2 text-sm leading-6 text-amber-800">
                        O agendamento será marcado como atendido e os registros
                        clínicos e financeiros serão criados.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Resumo do atendimento
                    </p>
                  </div>

                  <div className="space-y-5 p-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Cliente
                      </p>

                      <p className="mt-1 text-base font-bold text-slate-950">
                        {currentAppointment.cliente.nome}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Procedimento
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {procedimentoFinal}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Valor
                      </p>

                      <p className="mt-1 text-base font-bold text-violet-700">
                        {formatCurrency(valorFinal)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Evolução clínica
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {evolucao}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
                  <div className="flex items-start gap-3">
                    <RotateCcw
                      size={20}
                      className="mt-0.5 shrink-0 text-violet-700"
                    />

                    <p className="text-sm leading-6 text-violet-800">
                      Depois da confirmação, você poderá agendar o retorno ou
                      voltar diretamente para a agenda.
                    </p>
                  </div>
                </section>
              </div>
            </div>

            <footer className="shrink-0 border-t border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-5">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmando(false);
                    setError(null);
                  }}
                  disabled={isPending}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Voltar e editar
                </button>

                <button
                  type="button"
                  onClick={handleFinalizarConfirmado}
                  disabled={isPending}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 size={18} />

                  {isPending
                    ? "Finalizando atendimento..."
                    : "Confirmar finalização"}
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}