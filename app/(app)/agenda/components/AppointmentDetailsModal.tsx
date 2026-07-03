"use client";

import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  MessageCircle,
  Phone,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

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
};

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

function addMinutes(value: Date | string, minutes: number) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  return date;
}

function statusClass(status: string) {
  if (status === "Confirmado") return "border-emerald-300/20 bg-emerald-400/10 text-emerald-200";
  if (status === "Atendido") return "border-blue-300/20 bg-blue-400/10 text-blue-200";
  if (status === "Faltou") return "border-amber-300/20 bg-amber-400/10 text-amber-200";
  if (status === "Cancelado") return "border-rose-300/20 bg-rose-400/10 text-rose-200";

  return "border-violet-300/20 bg-violet-400/10 text-violet-200";
}

export default function AppointmentDetailsModal({ open, appointment, onClose, onWhatsApp, onFinalizar }: Props) {
  if (!open || !appointment) return null;

  const endDate = addMinutes(appointment.data, appointment.duracao);
  const message = buildWhatsAppMessage({
    template: "reminder",
    clientName: appointment.cliente.nome,
    procedure: appointment.procedimento,
    appointmentDate: appointment.data,
  });
  const whatsappUrl = buildWhatsAppUrl(appointment.cliente.whatsapp || appointment.cliente.telefone, message);
  const phone = appointment.cliente.whatsapp || appointment.cliente.telefone || "Não informado";

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <button
        type="button"
        aria-label="Fechar painel de atendimento"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
      />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-white/[0.10] bg-[#111827]/95 shadow-2xl shadow-black/50 backdrop-blur-2xl">
        <div className="relative overflow-hidden border-b border-white/[0.08] p-5 sm:p-6">
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute -bottom-12 left-10 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-200">
                <Sparkles size={13} />
                Atendimento selecionado
              </div>
              <h2 className="truncate text-2xl font-semibold tracking-tight text-white">
                {appointment.cliente.nome}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Acesso rápido à ficha, anamnese, evolução e WhatsApp do cliente.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 text-slate-300 hover:bg-white/[0.08] hover:text-white"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 scrollbar-premium sm:p-6">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-300/25 bg-violet-400/12 text-violet-100">
                  <UserRound size={20} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-white">{appointment.cliente.nome}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                    <Phone size={12} />
                    {phone}
                  </p>
                </div>
              </div>

              <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(appointment.status)}`}>
                {appointment.status}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
              <p className="text-xs font-medium text-slate-500">Data e horário</p>
              <p className="mt-1 text-sm font-semibold text-white">{formatDateTime(appointment.data)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {formatTime(appointment.data)} - {formatTime(endDate)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
              <p className="text-xs font-medium text-slate-500">Duração</p>
              <p className="mt-1 text-sm font-semibold text-white">{appointment.duracao} minutos</p>
              <p className="mt-1 text-xs text-slate-500">Bloqueado até {formatTime(endDate)}</p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 sm:col-span-2">
              <p className="text-xs font-medium text-slate-500">Procedimento</p>
              <p className="mt-1 text-base font-semibold text-white">{appointment.procedimento}</p>
              <p className="mt-1 text-xs text-slate-500">
                Valor previsto: {appointment.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 sm:col-span-2">
              <p className="text-xs font-medium text-slate-500">Profissional</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {appointment.profissional?.nome || "Não definida"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {appointment.profissional?.area || "Área não informada"}
              </p>
            </div>
          </div>

          {appointment.observacoes ? (
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4">
              <p className="text-xs font-medium text-slate-500">Observações do agendamento</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{appointment.observacoes}</p>
            </div>
          ) : null}

          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Ações rápidas
            </p>

            <div className="mt-4 grid gap-3">
              <Button
                type="button"
                className="h-12 justify-start bg-emerald-600 text-white hover:bg-emerald-500"
                onClick={() => onFinalizar(appointment)}
                disabled={appointment.status === "Atendido"}
              >
                <CheckCircle2 size={17} />
                {appointment.status === "Atendido" ? "Atendimento finalizado" : "Finalizar atendimento"}
              </Button>

              <Button asChild className="h-12 justify-start">
                <a href={`/clientes/${appointment.clienteId}`}>
                  <UserRound size={17} />
                  Abrir ficha completa
                </a>
              </Button>

              <Button type="button" variant="outline" onClick={() => onWhatsApp(appointment)} className="h-12 justify-start">
                <MessageCircle size={17} />
                Gerar mensagem manual
              </Button>

              <Button asChild variant="outline" className="h-12 justify-start">
                <a href={`/clientes/${appointment.clienteId}#anamnese`}>
                  <ClipboardList size={17} />
                  Abrir anamnese
                </a>
              </Button>

              <Button asChild variant="outline" className="h-12 justify-start">
                <a href={`/clientes/${appointment.clienteId}#evolucao`}>
                  <Activity size={17} />
                  Registrar evolução
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" className="h-11">
              <WhatsAppLink href={whatsappUrl}>
                <ExternalLink size={16} />
                Abrir WhatsApp
              </WhatsAppLink>
            </Button>
            <Button type="button" variant="ghost" className="h-11" onClick={onClose}>
              Fechar painel
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
