"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Activity,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  MessageCircle,
  Phone,
  PlayCircle,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import { iniciarAtendimento } from "@/actions/agendamento.actions";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

type AppointmentDetails = {
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
  appointment: AppointmentDetails | null;
  onClose: () => void;
  onWhatsApp: (appointment: AppointmentDetails) => void;
  onFinalizar: (appointment: AppointmentDetails) => void;
  onReagendar: (appointment: AppointmentDetails) => void;
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

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function addMinutes(value: Date | string, minutes: number) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);

  return date;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "CL";

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function statusClass(status: string) {
  if (status === "Confirmado") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "Em atendimento") {
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }

  if (status === "Atendido") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "Faltou") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "Cancelado") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-violet-200 bg-violet-50 text-violet-700";
}

export default function AppointmentDetailsModal({
  open,
  appointment,
  onClose,
  onWhatsApp,
  onFinalizar,
  onReagendar,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useLockBodyScroll(open);

  useEffect(() => {
    setError(null);
  }, [open, appointment?.id]);

  if (!open || !appointment) return null;

  const currentAppointment = appointment;

  const endDate = addMinutes(
    currentAppointment.data,
    currentAppointment.duracao,
  );

  const message = buildWhatsAppMessage({
    template: "reminder",
    clientName: currentAppointment.cliente.nome,
    procedure: currentAppointment.procedimento,
    appointmentDate: currentAppointment.data,
  });

  const whatsappUrl = buildWhatsAppUrl(
    currentAppointment.cliente.whatsapp ||
      currentAppointment.cliente.telefone,
    message,
  );

  const phone =
    currentAppointment.cliente.whatsapp ||
    currentAppointment.cliente.telefone ||
    "Não informado";

  const atendimentoFinalizado = currentAppointment.status === "Atendido";
  const atendimentoCancelado = currentAppointment.status === "Cancelado";
  const atendimentoEmAndamento =
    currentAppointment.status === "Em atendimento";

  function handleIniciar() {
    setError(null);

    if (atendimentoFinalizado) {
      setError("Este atendimento já foi finalizado.");
      return;
    }

    if (atendimentoCancelado) {
      setError("Não é possível iniciar um atendimento cancelado.");
      return;
    }

    const appointmentId = currentAppointment.id;

    startTransition(async () => {
      try {
        await iniciarAtendimento(appointmentId);
        window.location.reload();
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Não foi possível iniciar o atendimento.",
        );
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[100] h-[100dvh] overflow-hidden">
      <button
        type="button"
        aria-label="Fechar detalhes do atendimento"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-details-title"
        className="absolute inset-y-0 right-0 flex h-[100dvh] w-full max-w-[540px] flex-col overflow-hidden border-l border-slate-200 bg-slate-50 shadow-2xl shadow-slate-950/20"
      >
        <header className="relative shrink-0 overflow-hidden border-b border-slate-200 bg-white px-5 py-5 sm:px-6 sm:py-6">
          <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-violet-100 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-12 h-36 w-36 rounded-full bg-rose-100 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-base font-bold text-white shadow-lg shadow-violet-600/20">
                {getInitials(currentAppointment.cliente.nome)}
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                      currentAppointment.status,
                    )}`}
                  >
                    {currentAppointment.status}
                  </span>

                  {atendimentoEmAndamento ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                      <span className="size-1.5 animate-pulse rounded-full bg-cyan-500" />
                      Em andamento
                    </span>
                  ) : null}
                </div>

                <h2
                  id="appointment-details-title"
                  className="truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
                >
                  {currentAppointment.cliente.nome}
                </h2>

                <p className="mt-1 truncate text-sm font-medium text-slate-500">
                  {currentAppointment.procedimento}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          <div className="space-y-5">
            {error ? (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
                <AlertCircle size={19} className="mt-0.5 shrink-0" />

                <div>
                  <p className="text-sm font-semibold">
                    Não foi possível continuar
                  </p>

                  <p className="mt-1 text-sm leading-6 text-rose-600">
                    {error}
                  </p>
                </div>
              </div>
            ) : null}

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2">
                  <CalendarClock size={17} className="text-violet-600" />

                  <h3 className="text-sm font-bold text-slate-900">
                    Atendimento
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-slate-100">
                <div className="bg-white p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Data e horário
                  </p>

                  <p className="mt-2 text-sm font-bold capitalize text-slate-900">
                    {formatDateTime(currentAppointment.data)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatTime(currentAppointment.data)} até{" "}
                    {formatTime(endDate)}
                  </p>
                </div>

                <div className="bg-white p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Duração
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {currentAppointment.duracao} minutos
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Agenda ocupada até {formatTime(endDate)}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <Sparkles size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Procedimento
                    </p>

                    <p className="mt-1 text-base font-bold text-slate-950">
                      {currentAppointment.procedimento}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-violet-700">
                      {formatCurrency(currentAppointment.valor)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                  <UserRound size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Cliente
                  </p>

                  <p className="mt-1 truncate text-base font-bold text-slate-950">
                    {currentAppointment.cliente.nome}
                  </p>

                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <Phone size={14} />
                    {phone}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                  style={{
                    backgroundColor:
                      currentAppointment.profissional?.cor || "#7c3aed",
                  }}
                >
                  <UserRound size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Profissional responsável
                  </p>

                  <p className="mt-1 truncate text-base font-bold text-slate-950">
                    {currentAppointment.profissional?.nome || "Não definida"}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {currentAppointment.profissional?.area ||
                      "Área não informada"}
                  </p>
                </div>
              </div>
            </section>

            {currentAppointment.observacoes ? (
              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Observações do agendamento
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-900">
                  {currentAppointment.observacoes}
                </p>
              </section>
            ) : null}

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Fluxo do atendimento
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Escolha a próxima ação para esta cliente.
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                <Button
                  type="button"
                  onClick={handleIniciar}
                  disabled={
                    isPending ||
                    atendimentoFinalizado ||
                    atendimentoCancelado ||
                    atendimentoEmAndamento
                  }
                  className="h-12 justify-start rounded-xl bg-violet-600 px-4 text-white shadow-sm shadow-violet-600/20 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <PlayCircle size={18} />

                  {isPending
                    ? "Iniciando atendimento..."
                    : atendimentoEmAndamento
                      ? "Atendimento em andamento"
                      : atendimentoFinalizado
                        ? "Atendimento finalizado"
                        : "Iniciar atendimento"}
                </Button>

                <Button
                  type="button"
                  onClick={() => onFinalizar(currentAppointment)}
                  disabled={atendimentoFinalizado || atendimentoCancelado}
                  className="h-12 justify-start rounded-xl bg-emerald-600 px-4 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 size={18} />

                  {atendimentoFinalizado
                    ? "Atendimento finalizado"
                    : "Finalizar atendimento"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onReagendar(currentAppointment)}
                  className="h-12 justify-start rounded-xl border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                >
                  <CalendarClock size={18} />
                  Reagendar ou criar retorno
                </Button>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Ações rápidas
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button
                  asChild
                  variant="outline"
                  className="h-auto min-h-20 flex-col gap-2 rounded-2xl border-slate-200 bg-slate-50 px-3 py-4 text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                >
                  <a href={`/clientes/${currentAppointment.clienteId}`}>
                    <UserRound size={19} />
                    <span className="text-xs font-semibold">
                      Ficha completa
                    </span>
                  </a>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onWhatsApp(currentAppointment)}
                  className="h-auto min-h-20 flex-col gap-2 rounded-2xl border-slate-200 bg-slate-50 px-3 py-4 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <MessageCircle size={19} />
                  <span className="text-xs font-semibold">
                    Criar mensagem
                  </span>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="h-auto min-h-20 flex-col gap-2 rounded-2xl border-slate-200 bg-slate-50 px-3 py-4 text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                >
                  <a
                    href={`/clientes/${currentAppointment.clienteId}#anamnese`}
                  >
                    <ClipboardList size={19} />
                    <span className="text-xs font-semibold">Anamnese</span>
                  </a>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="h-auto min-h-20 flex-col gap-2 rounded-2xl border-slate-200 bg-slate-50 px-3 py-4 text-slate-700 hover:bg-violet-50 hover:text-violet-700"
                >
                  <a
                    href={`/clientes/${currentAppointment.clienteId}#evolucao`}
                  >
                    <Activity size={19} />
                    <span className="text-xs font-semibold">Evolução</span>
                  </a>
                </Button>
              </div>
            </section>
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              asChild
              className="h-11 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <WhatsAppLink href={whatsappUrl}>
                <ExternalLink size={16} />
                Abrir WhatsApp
              </WhatsAppLink>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Fechar detalhes
            </Button>
          </div>
        </footer>
      </aside>
    </div>
  );
}