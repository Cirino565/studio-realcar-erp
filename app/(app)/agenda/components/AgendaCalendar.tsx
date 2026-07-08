"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
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

const START_HOUR = 6;
const END_HOUR = 21;
const SLOT_MINUTES = 30;
const MINUTE_HEIGHT = 0.86;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

const slots = Array.from(
  { length: TOTAL_MINUTES / SLOT_MINUTES + 1 },
  (_, index) => {
    const totalMinutes = START_HOUR * 60 + index * SLOT_MINUTES;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    return {
      hour,
      minute,
      label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(
        2,
        "0",
      )}`,
      offset: index * SLOT_MINUTES * MINUTE_HEIGHT,
    };
  },
);

const gridHeight = TOTAL_MINUTES * MINUTE_HEIGHT;

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
    weekday: "long",
    day: "2-digit",
    month: "long",
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

function minutesFromStart(value: Date | string) {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes() - START_HOUR * 60;
}

function appointmentEnd(appointment: AgendamentoAgenda) {
  return addMinutes(new Date(appointment.data), appointment.duracao);
}

function agendaHref(date: Date, profissionalFiltro: string) {
  const data = formatDateInput(date);
  const profissional =
    profissionalFiltro !== "todas" ? `&profissional=${profissionalFiltro}` : "";

  return `/agenda?data=${data}${profissional}`;
}

function statusClass(status: string) {
  if (status === "Confirmado") {
    return "border-emerald-200/40 bg-emerald-50/15 text-emerald-50";
  }

  if (status === "Em atendimento") {
    return "border-amber-200/40 bg-amber-50/15 text-amber-50";
  }

  if (status === "Atendido") {
    return "border-sky-200/40 bg-sky-50/15 text-sky-50";
  }

  if (status === "Faltou") {
    return "border-orange-200/40 bg-orange-50/15 text-orange-50";
  }

  if (status === "Cancelado") {
    return "border-white/25 bg-white/10 text-white/75 line-through";
  }

  return "border-white/25 bg-white/10 text-white";
}

function getColorClasses(color: string) {
  const normalizedColor = color.toLowerCase();

  if (
    normalizedColor.includes("rose") ||
    normalizedColor.includes("pink") ||
    normalizedColor.includes("red")
  ) {
    return {
      avatar: "border-rose-200/40 bg-rose-600 text-white",
      header: "border-rose-300/25 bg-rose-500/10 text-rose-100",
      event:
        "border-rose-200/35 bg-gradient-to-br from-rose-600 via-rose-600 to-red-700 text-white shadow-rose-950/35",
      eventSoft:
        "border-rose-300/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15",
      dot: "bg-rose-100",
      line: "bg-rose-400/60",
    };
  }

  if (
    normalizedColor.includes("emerald") ||
    normalizedColor.includes("green") ||
    normalizedColor.includes("teal")
  ) {
    return {
      avatar: "border-emerald-200/40 bg-emerald-600 text-white",
      header: "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
      event:
        "border-emerald-200/35 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-emerald-950/35",
      eventSoft:
        "border-emerald-300/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15",
      dot: "bg-emerald-100",
      line: "bg-emerald-400/60",
    };
  }

  return {
    avatar: "border-violet-200/40 bg-violet-600 text-white",
    header: "border-violet-300/25 bg-violet-500/10 text-violet-100",
    event:
      "border-violet-200/35 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-purple-700 text-white shadow-violet-950/35",
    eventSoft:
      "border-violet-300/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15",
    dot: "bg-violet-100",
    line: "bg-violet-400/60",
  };
}

function getAppointmentNote(appointment: AgendamentoAgenda) {
  const note = appointment.observacoes?.split("\n").find(Boolean)?.trim();

  if (note) {
    return note;
  }

  if (appointment.valor > 0) {
    return appointment.valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return appointment.status;
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
  const today = new Date();
  const weekDays = getWeekDays(selectedDate);
  const selectedDateInput = formatDateInput(selectedDate);
  const [hiddenProfessionalIds, setHiddenProfessionalIds] = useState<number[]>([]);

  const visibleProfessionals = useMemo(() => {
    const result = profissionais.filter(
      (profissional) => !hiddenProfessionalIds.includes(profissional.id),
    );

    return result.length > 0 ? result : profissionais;
  }, [hiddenProfessionalIds, profissionais]);

  const appointmentsByProfessional = useMemo(() => {
    return visibleProfessionals.map((profissional) => {
      const appointments = agendamentos
        .filter((appointment) => appointment.profissionalId === profissional.id)
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      const total = appointments.reduce(
        (sum, appointment) => sum + (appointment.valor || 0),
        0,
      );

      return {
        profissional,
        appointments,
        total,
      };
    });
  }, [agendamentos, visibleProfessionals]);

  const gridMinWidth =
    visibleProfessionals.length <= 2
      ? "100%"
      : `${52 + visibleProfessionals.length * 148}px`;

  function goToDate(date: Date) {
    onDateChange(date);
    window.location.href = agendaHref(date, profissionalFiltro);
  }

  function handleDateInputChange(value: string) {
    const [year, month, day] = value.split("-").map(Number);

    if (!year || !month || !day) {
      return;
    }

    goToDate(new Date(year, month - 1, day));
  }

  function abrirNovo(profissionalId: number, hora = "09:00") {
    onNovoHorario({
      data: selectedDateInput,
      hora,
      profissionalId,
    });
  }

  function toggleProfessional(profissionalId: number) {
    setHiddenProfessionalIds((current) => {
      const isHidden = current.includes(profissionalId);

      if (isHidden) {
        return current.filter((id) => id !== profissionalId);
      }

      if (profissionais.length - current.length <= 1) {
        return current;
      }

      return [...current, profissionalId];
    });
  }

  return (
    <div className="premium-card relative w-full max-w-[100vw] overflow-hidden sm:max-w-full">
      <div className="border-b border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
        <div className="flex flex-col gap-2.5 p-2.5 sm:gap-3 sm:p-4 xl:p-5">
          <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="hidden min-w-0 items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:flex">
                <CalendarDays size={13} />
                Agenda profissional
              </div>

              <h2 className="truncate text-base font-semibold capitalize tracking-tight text-white sm:mt-1 sm:text-xl xl:text-2xl">
                {formatLongDate(selectedDate)}
              </h2>
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <div className="grid h-10 grid-cols-2 rounded-2xl border border-white/[0.10] bg-white/[0.035] p-1 text-xs font-semibold">
                <button
                  type="button"
                  className="rounded-xl bg-violet-600 px-3 py-2 text-white shadow-lg shadow-violet-950/20"
                >
                  Dia
                </button>
                <button
                  type="button"
                  className="rounded-xl px-3 py-2 text-slate-400"
                  title="Visão semanal será a próxima etapa"
                >
                  Semana
                </button>
              </div>

              <select
                value={profissionalFiltro}
                onChange={(event) => onProfissionalFiltroChange(event.target.value)}
                className="premium-input h-10 min-w-0 rounded-2xl px-3 py-2 text-xs sm:min-w-[170px] sm:text-sm"
              >
                <option value="todas">Todas as agendas</option>
                {todosProfissionais.map((profissional) => (
                  <option key={profissional.id} value={profissional.id}>
                    {profissional.nome}
                  </option>
                ))}
              </select>

              <a
                href={agendaHref(addDays(selectedDate, -1), profissionalFiltro)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.04] text-slate-100 transition active:scale-[0.98]"
                aria-label="Dia anterior"
              >
                <ChevronLeft size={16} />
              </a>

              <button
                type="button"
                onClick={() => goToDate(today)}
                className={`h-10 rounded-2xl px-4 text-xs font-semibold transition active:scale-[0.98] sm:text-sm ${
                  isSameDay(selectedDate, today)
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-950/25"
                    : "border border-white/[0.10] bg-white/[0.04] text-slate-100"
                }`}
              >
                Hoje
              </button>

              <a
                href={agendaHref(addDays(selectedDate, 1), profissionalFiltro)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.04] text-slate-100 transition active:scale-[0.98]"
                aria-label="Próximo dia"
              >
                <ChevronRight size={16} />
              </a>

              <label className="relative flex h-10 min-w-[132px] items-center justify-center overflow-hidden rounded-2xl border border-white/[0.10] bg-white/[0.04] px-3 text-center text-xs font-semibold text-slate-100 sm:min-w-[150px] sm:text-sm">
                <span className="pointer-events-none truncate">
                  {selectedDateInput.split("-").reverse().join("/")}
                </span>
                <input
                  type="date"
                  value={selectedDateInput}
                  onChange={(event) => handleDateInputChange(event.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Selecionar data"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  const profissional = visibleProfessionals[0] || profissionais[0];

                  if (profissional) {
                    abrirNovo(profissional.id);
                  }
                }}
                className="hidden h-10 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-xs font-semibold text-white shadow-lg shadow-violet-950/25 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex sm:text-sm"
                disabled={!visibleProfessionals[0] && !profissionais[0]}
              >
                <Plus size={15} />
                Novo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {weekDays.map((day) => {
              const active = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);

              return (
                <a
                  key={day.toISOString()}
                  href={agendaHref(day, profissionalFiltro)}
                  className={`min-w-0 rounded-xl border px-1 py-1.5 text-center transition sm:rounded-2xl sm:px-3 sm:py-2 ${
                    active
                      ? "border-violet-300/35 bg-violet-500/20 text-white shadow-lg shadow-violet-950/10"
                      : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/[0.14] hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="block truncate text-[0.6rem] font-semibold uppercase tracking-[0.10em] sm:text-[0.65rem]">
                    {formatShortWeekDay(day).slice(0, 3)}
                  </span>
                  <span className="mt-1 block text-xs font-semibold leading-none sm:text-base">
                    {day.getDate()}
                  </span>
                  <span
                    className={`mt-1 hidden text-[0.65rem] sm:block ${
                      isToday ? "text-violet-200" : "text-slate-500"
                    }`}
                  >
                    {isToday
                      ? "Hoje"
                      : day.toLocaleDateString("pt-BR", { month: "short" })}
                  </span>
                </a>
              );
            })}
          </div>

          {profissionais.length > 1 ? (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-premium sm:gap-2">
              {profissionais.map((profissional) => {
                const hidden = hiddenProfessionalIds.includes(profissional.id);
                const color = getColorClasses(profissional.cor);

                return (
                  <button
                    key={profissional.id}
                    type="button"
                    onClick={() => toggleProfessional(profissional.id)}
                    className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border px-2 text-[0.68rem] font-semibold transition sm:h-auto sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-2 sm:text-xs ${
                      hidden
                        ? "border-white/[0.08] bg-white/[0.025] text-slate-500"
                        : color.eventSoft
                    }`}
                    title={hidden ? "Mostrar agenda" : "Ocultar agenda"}
                  >
                    {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    {profissional.nome}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="max-w-full overflow-x-auto overflow-y-hidden scrollbar-premium">
        <div
          className="relative w-full min-w-0"
          style={{
            display: "grid",
            minWidth: gridMinWidth,
            gridTemplateColumns: `46px repeat(${Math.max(
              visibleProfessionals.length,
              1,
            )}, minmax(0, 1fr))`,
          }}
        >
          <div className="sticky left-0 z-30 border-b border-r border-white/[0.08] bg-[#12192a] px-1 py-2 text-center text-[0.56rem] font-semibold uppercase tracking-[0.10em] text-slate-500 sm:px-2 sm:py-3 sm:text-[0.65rem] xl:px-3">
            Hora
          </div>

          {appointmentsByProfessional.map(({ profissional, appointments, total }) => {
            const color = getColorClasses(profissional.cor);

            return (
              <div
                key={profissional.id}
                className="border-b border-r border-white/[0.08] bg-[#12192a] px-1.5 py-1.5 sm:px-2 sm:py-2 xl:px-3"
              >
                <div
                  className={`rounded-xl border px-2 py-2 sm:rounded-2xl sm:px-3 sm:py-2.5 ${color.header}`}
                >
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
                      <div
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full border shadow-lg shadow-black/20 sm:size-9 ${color.avatar}`}
                      >
                        <UserRound size={15} className="sm:hidden" />
                        <UserRound size={17} className="hidden sm:block" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-white sm:text-sm">
                          {profissional.nome}
                        </p>
                        <p className="hidden truncate text-[0.68rem] text-slate-400 sm:block">
                          {profissional.area || "Agenda ativa"}
                        </p>
                      </div>
                    </div>

                    <div className="hidden shrink-0 text-right md:block">
                      <p className="text-xs font-semibold text-white">
                        {appointments.length} atend.
                      </p>
                      <p className="text-[0.65rem] text-slate-400">
                        {total.toLocaleString("pt-BR", {
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

          <div
            className="sticky left-0 z-20 border-r border-white/[0.08] bg-[#0f1728]"
            style={{ height: gridHeight }}
          >
            {slots.map((slot) => (
              <div
                key={slot.label}
                className="absolute left-0 right-0 border-t border-white/[0.06] px-1 pt-1 text-right text-[0.65rem] font-medium text-slate-500 xl:px-2 xl:text-[0.72rem]"
                style={{ top: slot.offset }}
              >
                {slot.label}
              </div>
            ))}
          </div>

          {appointmentsByProfessional.map(({ profissional, appointments }) => {
            const color = getColorClasses(profissional.cor);

            return (
              <div
                key={`grid-${profissional.id}`}
                className="relative border-r border-white/[0.08] bg-white/[0.01]"
                style={{ height: gridHeight }}
              >
                {slots.slice(0, -1).map((slot) => (
                  <button
                    key={`${profissional.id}-${slot.label}`}
                    type="button"
                    onClick={() => abrirNovo(profissional.id, slot.label)}
                    className="absolute left-0 right-0 z-0 border-t border-white/[0.05] px-1 text-left text-[0.65rem] text-transparent transition hover:bg-violet-500/5 hover:text-violet-200"
                    style={{
                      top: slot.offset,
                      height: SLOT_MINUTES * MINUTE_HEIGHT,
                    }}
                    title={`Agendar ${slot.label}`}
                  >
                    <span className="sr-only">Agendar {slot.label}</span>
                  </button>
                ))}

                {appointments.map((appointment) => {
                  const startMinutes = minutesFromStart(appointment.data);
                  const endMinutes = minutesFromStart(appointmentEnd(appointment));
                  const top = Math.max(0, startMinutes * MINUTE_HEIGHT + 3);
                  const height = Math.max(
                    40,
                    Math.min(TOTAL_MINUTES, endMinutes) * MINUTE_HEIGHT -
                      Math.max(0, startMinutes) * MINUTE_HEIGHT -
                      6,
                  );
                  const note = getAppointmentNote(appointment);

                  return (
                    <article
                      key={appointment.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectAppointment(appointment)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          onSelectAppointment(appointment);
                        }
                      }}
                      className={`absolute left-1 right-1 z-10 cursor-pointer overflow-hidden rounded-lg border p-1.5 text-left shadow-lg transition hover:scale-[1.005] hover:brightness-110 sm:left-1.5 sm:right-1.5 sm:rounded-xl sm:p-2 xl:left-2 xl:right-2 xl:rounded-2xl xl:p-3 ${color.event}`}
                      style={{ top, height }}
                    >
                      <div
                        className={`absolute left-0 top-0 h-full w-1 ${color.line}`}
                      />

                      <div className="relative flex h-full min-w-0 flex-col">
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="flex items-center gap-1 text-[0.58rem] font-bold leading-tight text-white/95 sm:gap-1.5 sm:text-[0.65rem] xl:text-[0.72rem]">
                              <Clock3 size={10} className="shrink-0 sm:size-3" />
                              {formatTime(appointment.data)} -{" "}
                              {formatTime(appointmentEnd(appointment))}
                            </p>

                            <p className="mt-0.5 truncate text-[0.68rem] font-extrabold uppercase leading-tight tracking-tight text-white sm:mt-1 sm:text-xs xl:text-sm">
                              {appointment.cliente.nome}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onMessage(appointment);
                            }}
                            className="hidden shrink-0 rounded-lg border border-white/20 bg-white/12 p-1.5 text-white transition hover:bg-white/20 sm:block"
                            aria-label="Gerar mensagem de WhatsApp"
                          >
                            <MessageCircle size={13} />
                          </button>
                        </div>

                        <p className="mt-0.5 line-clamp-2 text-[0.62rem] font-semibold leading-snug text-white/90 sm:mt-1 sm:text-[0.68rem] xl:text-xs">
                          {appointment.procedimento}
                        </p>

                        {height > 74 ? (
                          <p className="mt-0.5 line-clamp-2 text-[0.6rem] leading-snug text-white/75 sm:mt-1 sm:text-[0.65rem] xl:text-[0.72rem]">
                            {note}
                          </p>
                        ) : null}

                        {height > 94 ? (
                          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.08em] ${statusClass(
                                appointment.status,
                              )}`}
                            >
                              {appointment.status}
                            </span>

                            <span className="text-[0.62rem] font-semibold text-white/75">
                              {appointment.duracao} min
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          const profissional = visibleProfessionals[0] || profissionais[0];

          if (profissional) {
            abrirNovo(profissional.id);
          }
        }}
        className="absolute bottom-4 right-4 z-40 inline-flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-2xl shadow-violet-950/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:hidden"
        disabled={!visibleProfessionals[0] && !profissionais[0]}
        aria-label="Novo agendamento"
      >
        <Plus size={22} />
      </button>

      <div className="hidden flex-col gap-2 border-t border-white/[0.08] bg-white/[0.02] px-3 py-3 text-xs text-slate-500 sm:flex sm:flex-row sm:items-center sm:justify-between xl:px-5">
        <span>
          Arraste para o lado no celular para comparar profissionais e horários.
        </span>

        <span>
          Horários exibidos de {String(START_HOUR).padStart(2, "0")}:00 às{" "}
          {String(END_HOUR).padStart(2, "0")}:00
        </span>
      </div>
    </div>
  );
}