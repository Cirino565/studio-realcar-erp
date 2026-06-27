"use client";

import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageCircle,
  Plus,
  UserRound,
} from "lucide-react";

type ProfissionalAgenda = {
  id: number;
  nome: string;
  area: string | null;
  cor: string;
  status: string;
};

type AgendamentoAgenda = {
  id: number;
  clienteId: number;
  profissionalId: number | null;
  procedimento: string;
  data: Date | string;
  duracao: number;
  valor: number;
  observacoes: string | null;
  status: string;
  cliente: {
    nome: string;
    telefone?: string | null;
    whatsapp?: string | null;
  };
  profissional: ProfissionalAgenda | null;
};

export type NovoHorarioPayload = {
  data: string;
  hora: string;
  profissionalId?: number;
};

type Props = {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  profissionalFiltro: string;
  onProfissionalFiltroChange: (value: string) => void;
  profissionais: ProfissionalAgenda[];
  todosProfissionais: ProfissionalAgenda[];
  agendamentos: AgendamentoAgenda[];
  onNovoHorario: (payload: NovoHorarioPayload) => void;
  onSelectAppointment: (appointment: AgendamentoAgenda) => void;
  onMessage: (appointment: AgendamentoAgenda) => void;
};

const slots = Array.from({ length: 24 }, (_, index) => {
  const totalMinutes = 8 * 60 + index * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  return {
    hour,
    minute,
    label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
});

const mobileQuickHours = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const statusOptions = ["Agendado", "Confirmado", "Atendido", "Faltou", "Cancelado"];

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLongDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function formatShortWeekDay(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
    .format(value)
    .replace(".", "");
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);

  return next;
}

function addMinutes(date: Date, minutes: number) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);

  return next;
}

function getWeekDays(date: Date) {
  const first = new Date(date);
  first.setDate(date.getDate() - date.getDay());

  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function slotToDate(baseDate: Date, hour: number, minute: number) {
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hour,
    minute,
    0
  );
}

function isActiveAppointment(appointment: AgendamentoAgenda) {
  return appointment.status !== "Cancelado";
}

function appointmentEnd(appointment: AgendamentoAgenda) {
  return addMinutes(new Date(appointment.data), appointment.duracao);
}

function getColorClasses(color: string) {
  const normalizedColor = color.toLowerCase();

  if (
    normalizedColor.includes("rose") ||
    normalizedColor.includes("pink") ||
    normalizedColor.includes("red")
  ) {
    return {
      avatar: "border-rose-300/30 bg-rose-400/15 text-rose-100",
      card: "border-rose-300/20 bg-gradient-to-br from-rose-500/15 to-fuchsia-500/10 hover:border-rose-300/35",
      dot: "bg-rose-300",
      busy: "border-rose-300/20 bg-rose-400/10 text-rose-200/75",
    };
  }

  return {
    avatar: "border-violet-300/30 bg-violet-400/15 text-violet-100",
    card: "border-violet-300/20 bg-gradient-to-br from-violet-500/15 to-cyan-500/10 hover:border-violet-300/35",
    dot: "bg-violet-300",
    busy: "border-violet-300/20 bg-violet-400/10 text-violet-200/75",
  };
}

function statusClass(status: string) {
  if (status === "Confirmado") return "border-emerald-300/20 bg-emerald-400/10 text-emerald-200";
  if (status === "Atendido") return "border-blue-300/20 bg-blue-400/10 text-blue-200";
  if (status === "Faltou") return "border-amber-300/20 bg-amber-400/10 text-amber-200";
  if (status === "Cancelado") return "border-rose-300/20 bg-rose-400/10 text-rose-200";

  return "border-slate-300/15 bg-white/[0.05] text-slate-300";
}


function agendaHref(date: Date, profissionalFiltro: string) {
  const data = formatDateInput(date);
  const profissional = profissionalFiltro !== "todas" ? `&profissional=${profissionalFiltro}` : "";
  return `/agenda?data=${data}${profissional}`;
}

function novoAgendamentoHref(date: Date, profissionalId?: number, hora = "09:00") {
  const data = formatDateInput(date);
  const profissional = profissionalId ? `&profissionalId=${profissionalId}` : "";
  return `/agenda/novo?data=${data}&hora=${encodeURIComponent(hora)}${profissional}`;
}

function appointmentWhatsAppHref(appointment: AgendamentoAgenda) {
  return buildWhatsAppUrl(
    appointment.cliente.whatsapp || appointment.cliente.telefone,
    buildWhatsAppMessage({
      template: "confirmation",
      clientName: appointment.cliente.nome,
      procedure: appointment.procedimento,
      appointmentDate: appointment.data,
    })
  );
}

export default function AgendaCalendar({
  selectedDate,
  onDateChange,
  profissionalFiltro,
  onProfissionalFiltroChange,
  profissionais,
  todosProfissionais,
  agendamentos,
  onNovoHorario,
  onSelectAppointment,
  onMessage,
}: Props) {
  const weekDays = getWeekDays(selectedDate);
  const today = new Date();
  const selectedDateInput = formatDateInput(selectedDate);

  function handleDateInputChange(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    onDateChange(new Date(year, month - 1, day));
  }

  function appointmentsAtSlot(profissionalId: number, hour: number, minute: number) {
    return agendamentos
      .filter((appointment) => {
        const appointmentDate = new Date(appointment.data);
        return (
          appointment.profissionalId === profissionalId &&
          appointmentDate.getHours() === hour &&
          appointmentDate.getMinutes() === minute
        );
      })
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }

  function blockedAppointmentAtSlot(profissionalId: number, hour: number, minute: number) {
    const slotDate = slotToDate(selectedDate, hour, minute);

    return agendamentos.find((appointment) => {
      if (appointment.profissionalId !== profissionalId || !isActiveAppointment(appointment)) {
        return false;
      }

      const start = new Date(appointment.data);
      const end = appointmentEnd(appointment);

      return slotDate > start && slotDate < end;
    });
  }

  function getProfessionalStats(profissionalId: number) {
    const appointments = agendamentos.filter(
      (appointment) => appointment.profissionalId === profissionalId
    );

    return {
      count: appointments.length,
      total: appointments.reduce((sum, appointment) => sum + (appointment.valor || 0), 0),
    };
  }

  function abrirNovo(profissionalId: number, hora = "09:00") {
    onNovoHorario({
      data: selectedDateInput,
      hora,
      profissionalId,
    });
  }

  return (
    <div className="premium-card min-w-0 overflow-hidden">
      <div className="border-b border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-3 sm:p-5 lg:p-6">
        <div className="min-w-0 space-y-3 lg:space-y-5">
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex min-w-0 items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[0.7rem]">
                <CalendarDays size={12} />
                Agenda profissional
              </div>
              <h2 className="truncate text-base font-semibold capitalize tracking-tight text-white sm:text-2xl">
                {formatLongDate(selectedDate)}
              </h2>
            </div>

            <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[240px_220px_auto_auto_auto] xl:items-end">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500">Profissional</span>
                <select
                  value={profissionalFiltro}
                  onChange={(event) => onProfissionalFiltroChange(event.target.value)}
                  className="premium-input h-10 w-full rounded-xl px-3 py-2 text-sm sm:h-11 sm:rounded-2xl"
                >
                  <option value="todas">Todas as agendas</option>
                  {todosProfissionais.map((profissional) => (
                    <option key={profissional.id} value={profissional.id}>
                      {profissional.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500">Data</span>
                <input
                  type="date"
                  value={selectedDateInput}
                  onChange={(event) => handleDateInputChange(event.target.value)}
                  className="premium-input h-10 w-full rounded-xl px-3 py-2 text-sm sm:h-11 sm:rounded-2xl"
                />
              </label>

              <div className="grid min-w-0 grid-cols-3 gap-2 sm:col-span-2 xl:col-span-3 xl:grid-cols-3">
                <a
                  href={agendaHref(addDays(selectedDate, -1), profissionalFiltro)}
                  onClick={() => onDateChange(addDays(selectedDate, -1))}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/[0.10] bg-white/[0.04] px-2 text-[0.68rem] font-semibold text-slate-100 transition active:scale-[0.98] sm:h-11 sm:rounded-2xl sm:text-sm"
                >
                  <ChevronLeft size={13} />
                  Anterior
                </a>

                <a
                  href={agendaHref(today, profissionalFiltro)}
                  onClick={() => onDateChange(new Date())}
                  className={`flex h-9 items-center justify-center rounded-xl px-2 text-[0.68rem] font-semibold transition active:scale-[0.98] sm:h-11 sm:rounded-2xl sm:text-sm ${
                    isSameDay(selectedDate, today)
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-950/25"
                      : "border border-white/[0.10] bg-white/[0.07] text-slate-100"
                  }`}
                >
                  Hoje
                </a>

                <a
                  href={agendaHref(addDays(selectedDate, 1), profissionalFiltro)}
                  onClick={() => onDateChange(addDays(selectedDate, 1))}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/[0.10] bg-white/[0.04] px-2 text-[0.68rem] font-semibold text-slate-100 transition active:scale-[0.98] sm:h-11 sm:rounded-2xl sm:text-sm"
                >
                  Próximo
                  <ChevronRight size={13} />
                </a>
              </div>
            </div>
          </div>

          <div className="touch-scroll-x flex max-w-full gap-2 overflow-x-auto pb-1 scrollbar-premium lg:hidden">
            {weekDays.map((day) => {
              const active = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);

              return (
                <a
                  key={day.toISOString()}
                  href={agendaHref(day, profissionalFiltro)}
                  onClick={() => onDateChange(day)}
                  className={`min-w-[54px] rounded-2xl border px-2 py-1.5 text-left transition active:scale-[0.98] ${
                    active
                      ? "border-violet-300/35 bg-violet-500/18 text-white"
                      : "border-white/[0.08] bg-white/[0.035] text-slate-400"
                  }`}
                >
                  <span className="block text-[0.55rem] font-semibold uppercase tracking-[0.10em]">
                    {formatShortWeekDay(day)}
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold leading-none">{day.getDate()}</span>
                  <span className={`mt-0.5 block text-[0.55rem] ${isToday ? "text-violet-200" : "text-slate-500"}`}>
                    {isToday ? "Hoje" : day.toLocaleDateString("pt-BR", { month: "short" })}
                  </span>
                </a>
              );
            })}
          </div>

          <div className="hidden grid-cols-7 gap-2 lg:grid">
            {weekDays.map((day) => {
              const active = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);

              return (
                <a
                  key={day.toISOString()}
                  href={agendaHref(day, profissionalFiltro)}
                  onClick={() => onDateChange(day)}
                  className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-violet-300/35 bg-violet-500/14 text-white shadow-lg shadow-violet-950/10"
                      : "border-white/[0.08] bg-white/[0.035] text-slate-400 hover:border-white/[0.14] hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.12em]">
                    {formatShortWeekDay(day)}
                  </span>
                  <span className="mt-1 block text-lg font-semibold leading-none">{day.getDate()}</span>
                  <span className={`mt-1 block text-[0.7rem] ${isToday ? "text-violet-200" : "text-slate-500"}`}>
                    {isToday ? "Hoje" : day.toLocaleDateString("pt-BR", { month: "short" })}
                  </span>
                </a>
              );
            })}
          </div>

          <div className="touch-scroll-x flex max-w-full gap-2 overflow-x-auto pb-1 scrollbar-premium xl:hidden">
            <a
              href={agendaHref(selectedDate, "todas")}
              onClick={() => onProfissionalFiltroChange("todas")}
              className={`min-w-fit rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                profissionalFiltro === "todas"
                  ? "border-violet-300/35 bg-violet-500/18 text-white"
                  : "border-white/[0.10] bg-white/[0.04] text-slate-400"
              }`}
            >
              Todas
            </a>
            {todosProfissionais.map((profissional) => (
              <a
                key={profissional.id}
                href={agendaHref(selectedDate, String(profissional.id))}
                onClick={() => onProfissionalFiltroChange(String(profissional.id))}
                className={`min-w-fit rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
                  profissionalFiltro === String(profissional.id)
                    ? "border-violet-300/35 bg-violet-500/18 text-white"
                    : "border-white/[0.10] bg-white/[0.04] text-slate-400"
                }`}
              >
                {profissional.nome}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden overflow-x-auto scrollbar-premium xl:block">
        <div
          className="min-w-[980px]"
          style={{
            display: "grid",
            gridTemplateColumns: `64px repeat(${Math.max(profissionais.length, 1)}, minmax(320px, 1fr))`,
          }}
        >
          <div className="sticky left-0 z-20 border-b border-r border-white/[0.08] bg-[#12192a] px-3 py-4 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Hora
          </div>

          {profissionais.map((profissional) => {
            const color = getColorClasses(profissional.cor);
            const stats = getProfessionalStats(profissional.id);

            return (
              <div
                key={profissional.id}
                className="border-b border-r border-white/[0.08] bg-[#12192a] p-3.5"
              >
                <div className={`rounded-3xl border p-4 ${color.card}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl border ${color.avatar}`}>
                        <UserRound size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-white">{profissional.nome}</p>
                        <p className="truncate text-xs text-slate-400">{profissional.area || "Agenda ativa"}</p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-white">{stats.count} atend.</p>
                      <p className="text-xs text-slate-400">
                        {stats.total.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {slots.map((slot) => (
            <div key={slot.label} className="contents">
              <div className="sticky left-0 z-10 border-r border-t border-white/[0.06] bg-[#0f1728] px-3 py-2 text-[0.75rem] font-medium text-slate-500">
                {slot.label}
              </div>

              {profissionais.map((profissional) => {
                const appointments = appointmentsAtSlot(profissional.id, slot.hour, slot.minute);
                const blockedAppointment = blockedAppointmentAtSlot(profissional.id, slot.hour, slot.minute);
                const color = getColorClasses(profissional.cor);

                return (
                  <div
                    key={`${profissional.id}-${slot.label}`}
                    className="min-h-[44px] border-r border-t border-white/[0.05] bg-white/[0.012] p-1.5 transition hover:bg-white/[0.02]"
                  >
                    {appointments.length ? (
                      <div className="space-y-2">
                        {appointments.map((appointment) => (
                          <div
                            key={appointment.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectAppointment(appointment)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") onSelectAppointment(appointment);
                            }}
                            className={`w-full cursor-pointer rounded-2xl border p-3 text-left shadow-lg shadow-black/10 transition ${color.card}`}
                          >
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <span className={`size-2 rounded-full ${color.dot}`} />
                                  <p className="text-[0.72rem] font-semibold text-slate-300">
                                    {formatTime(appointment.data)} - {formatTime(appointmentEnd(appointment))}
                                  </p>
                                  <span className="text-[0.72rem] text-slate-500">{appointment.duracao} min</span>
                                </div>
                                <p className="truncate text-sm font-semibold text-white">{appointment.cliente.nome}</p>
                                <p className="mt-1 truncate text-xs text-slate-400">{appointment.procedimento}</p>
                              </div>

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onMessage(appointment);
                                }}
                                className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-2 text-emerald-200 transition hover:bg-emerald-400/20"
                                aria-label="Gerar mensagem de WhatsApp"
                              >
                                <MessageCircle size={14} />
                              </button>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold ${statusClass(appointment.status)}`}>
                                {appointment.status}
                              </span>
                              {appointment.valor > 0 ? (
                                <span className="text-xs font-semibold text-slate-200">
                                  {appointment.valor.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : blockedAppointment ? (
                      <div className={`flex h-full min-h-[34px] items-center justify-center rounded-2xl border px-2 text-center text-[0.68rem] ${color.busy}`}>
                        Ocupado até {formatTime(appointmentEnd(blockedAppointment))}
                      </div>
                    ) : (
                      <a
                        href={novoAgendamentoHref(selectedDate, profissional.id, slot.label)}
                        onClick={() => abrirNovo(profissional.id, slot.label)}
                        className="flex h-full min-h-[34px] w-full items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-transparent text-[0.72rem] font-medium text-slate-600 transition hover:border-violet-300/30 hover:bg-violet-500/10 hover:text-violet-100"
                      >
                        <Plus size={12} />
                        <span className="ml-1.5">Agendar</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0 space-y-3 p-3 pb-28 xl:hidden">
        {profissionais.map((profissional) => {
          const color = getColorClasses(profissional.cor);
          const stats = getProfessionalStats(profissional.id);
          const professionalAppointments = agendamentos
            .filter((appointment) => appointment.profissionalId === profissional.id)
            .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

          return (
            <section key={profissional.id} className="mobile-safe-card rounded-3xl border border-white/[0.08] bg-white/[0.03] p-3">
              <div className={`mb-3 min-w-0 rounded-3xl border p-3 ${color.card}`}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-2xl border ${color.avatar}`}>
                      <UserRound size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{profissional.nome}</p>
                      <p className="truncate text-[0.7rem] text-slate-400">{profissional.area || "Agenda ativa"}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[0.68rem] text-slate-400">{stats.count} atend.</p>
                    <p className="text-xs font-semibold text-white">
                      {stats.total.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <a
                href={novoAgendamentoHref(selectedDate, profissional.id)}
                onClick={() => abrirNovo(profissional.id)}
                data-mobile-action="true"
                className="mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-xs font-semibold text-white shadow-lg shadow-violet-950/25 active:scale-[0.98]"
              >
                <Plus size={14} />
                Novo para {profissional.nome}
              </a>

              {professionalAppointments.length ? (
                <div className="space-y-2">
                  {professionalAppointments.map((appointment) => (
                    <div key={appointment.id} className={`min-w-0 rounded-2xl border p-3 ${color.card}`}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectAppointment(appointment)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") onSelectAppointment(appointment);
                        }}
                        className="cursor-pointer"
                      >
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[0.7rem] font-semibold text-slate-400">
                              {formatTime(appointment.data)} - {formatTime(appointmentEnd(appointment))} · {appointment.duracao} min
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold text-white">{appointment.cliente.nome}</p>
                            <p className="mt-1 truncate text-xs text-slate-400">{appointment.procedimento}</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold ${statusClass(appointment.status)}`}>
                            {appointment.status}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          {appointment.valor > 0 ? (
                            <span className="text-xs font-semibold text-slate-200">
                              {appointment.valor.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Sem valor informado</span>
                          )}
                          <span className="text-[0.68rem] font-semibold text-violet-200">Abrir detalhes</span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/[0.08] pt-3">
                        <a
                          href={`/clientes/${appointment.clienteId}`}
                          className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-3 py-2 text-center text-xs font-semibold text-slate-100 active:scale-[0.98]"
                        >
                          Detalhes
                        </a>
                        <a
                          href={appointmentWhatsAppHref(appointment)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 active:scale-[0.98]"
                        >
                          <MessageCircle size={14} />
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Clock3 size={15} />
                    Nenhum atendimento para esta profissional.
                  </div>
                </div>
              )}

              <div className="mt-3 border-t border-white/[0.08] pt-3">
                <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Horários rápidos
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {mobileQuickHours.map((hour) => (
                    <a
                      key={`${profissional.id}-${hour}`}
                      href={novoAgendamentoHref(selectedDate, profissional.id, hour)}
                      onClick={() => abrirNovo(profissional.id, hour)}
                      data-mobile-action="true"
                      className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-2 text-center text-[0.68rem] font-semibold text-slate-300 active:scale-[0.98]"
                    >
                      {hour}
                    </a>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="hidden border-t border-white/[0.08] bg-white/[0.02] px-4 py-3 text-xs text-slate-500 sm:block sm:px-6">
        Status disponíveis: {statusOptions.join(" · ")}
      </div>
    </div>
  );
}
