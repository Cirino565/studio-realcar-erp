"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageCircle,
  Plus,
  UserRound,
  UsersRound,
  X,
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

const START_HOUR = 9;
const SLOT_MINUTES = 30;
const MINUTE_HEIGHT = 1.5;
const SAO_PAULO_TIMEZONE = "America/Sao_Paulo";

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
  })
    .format(date)
    .replace(".", "")
    .slice(0, 3);
}

function formatDateHeading(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateCompact(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getSaoPauloTimeParts(value: Date | string) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: SAO_PAULO_TIMEZONE,
  }).formatToParts(new Date(value));

  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);

  return { hour, minute };
}

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: SAO_PAULO_TIMEZONE,
  }).format(new Date(value));
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function appointmentEnd(appointment: AgendamentoAgenda) {
  return addMinutes(new Date(appointment.data), appointment.duracao);
}

function getEndHour(date: Date) {
  if (date.getDay() === 6) return 17;
  return 19;
}

function getPalette(color: string, index: number) {
  const normalized = (color || "").toLowerCase();

  if (
    normalized.includes("rose") ||
    normalized.includes("red") ||
    normalized.includes("pink") ||
    normalized.includes("vermelho") ||
    index % 2 === 1
  ) {
    return {
      solid: "#be123c",
      soft: "rgba(190, 18, 60, 0.10)",
      border: "rgba(244, 63, 94, 0.42)",
    };
  }

  if (normalized.includes("blue") || normalized.includes("azul")) {
    return {
      solid: "#2563eb",
      soft: "rgba(37, 99, 235, 0.10)",
      border: "rgba(59, 130, 246, 0.42)",
    };
  }

  if (normalized.includes("teal") || normalized.includes("green")) {
    return {
      solid: "#0f766e",
      soft: "rgba(15, 118, 110, 0.10)",
      border: "rgba(20, 184, 166, 0.42)",
    };
  }

  return {
    solid: "#7c3aed",
    soft: "rgba(124, 58, 237, 0.10)",
    border: "rgba(139, 92, 246, 0.42)",
  };
}

function agendaHref(date: Date, profissionalFiltro: string) {
  const data = formatDateInput(date);
  const profissional =
    profissionalFiltro !== "todas" ? `&profissional=${profissionalFiltro}` : "";

  return `/agenda?data=${data}${profissional}`;
}

function getAppointmentNote(appointment: AgendamentoAgenda) {
  const note = appointment.observacoes?.split("\n").find(Boolean)?.trim();
  if (note) return note;

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
  const selectedDateInput = formatDateInput(selectedDate);
  const endHour = getEndHour(selectedDate);
  const totalMinutes = Math.max(0, (endHour - START_HOUR) * 60);
  const gridHeight = totalMinutes * MINUTE_HEIGHT;
  const isSunday = selectedDate.getDay() === 0;

  const [hiddenProfessionalIds, setHiddenProfessionalIds] = useState<number[]>([]);
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [selectedDate]);

  const slots = useMemo(() => {
    if (isSunday) return [];

    return Array.from(
      { length: totalMinutes / SLOT_MINUTES + 1 },
      (_, index) => {
        const total = START_HOUR * 60 + index * SLOT_MINUTES;
        const hour = Math.floor(total / 60);
        const minute = total % 60;

        return {
          label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
          offset: index * SLOT_MINUTES * MINUTE_HEIGHT,
        };
      },
    );
  }, [isSunday, totalMinutes]);

  const visibleProfessionals = useMemo(() => {
    const result = profissionais.filter(
      (profissional) => !hiddenProfessionalIds.includes(profissional.id),
    );

    return result.length > 0 ? result : profissionais;
  }, [hiddenProfessionalIds, profissionais]);

  const appointmentsByProfessional = useMemo(() => {
    return visibleProfessionals.map((profissional, index) => ({
      profissional,
      index,
      appointments: agendamentos
        .filter((appointment) => appointment.profissionalId === profissional.id)
        .sort(
          (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
        ),
    }));
  }, [agendamentos, visibleProfessionals]);

  const shouldEnableHorizontalScroll = visibleProfessionals.length > 2;
  const gridMinWidth =
    visibleProfessionals.length <= 2
      ? "100%"
      : `${58 + visibleProfessionals.length * 220}px`;

  function minutesFromStart(value: Date | string) {
    const { hour, minute } = getSaoPauloTimeParts(value);
    return hour * 60 + minute - START_HOUR * 60;
  }

  function goToDate(date: Date) {
    onDateChange(date);
    window.location.href = agendaHref(date, profissionalFiltro);
  }

  function handleDateInputChange(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return;
    goToDate(new Date(year, month - 1, day));
  }

  function abrirNovo(profissionalId: number, hora = "09:00") {
    onNovoHorario({
      data: selectedDateInput,
      hora,
      profissionalId,
    });
  }

  function abrirNovoPadrao() {
    const profissional = visibleProfessionals[0] || profissionais[0];
    if (profissional) abrirNovo(profissional.id);
  }

  function selecionarFiltroProfissional(value: string) {
    setHiddenProfessionalIds([]);
    onProfissionalFiltroChange(value);
    setShowVisibilityPanel(false);
  }

  function toggleProfessional(profissionalId: number) {
    setHiddenProfessionalIds((current) => {
      const isHidden = current.includes(profissionalId);

      if (isHidden) {
        return current.filter((id) => id !== profissionalId);
      }

      if (profissionais.length - current.length <= 1) return current;
      return [...current, profissionalId];
    });
  }

  const currentTimeLine = useMemo(() => {
    if (!isSameDay(selectedDate, today) || isSunday) return null;

    const current = new Date();
    const minutes = current.getHours() * 60 + current.getMinutes() - START_HOUR * 60;

    if (minutes < 0 || minutes > totalMinutes) return null;
    return minutes * MINUTE_HEIGHT;
  }, [isSunday, selectedDate, today, totalMinutes]);

  return (
    <section className="relative w-full max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between lg:px-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => goToDate(today)}
              className="h-9 rounded-lg border border-violet-200 bg-violet-600 px-3 text-sm font-semibold text-white transition hover:bg-violet-700 dark:border-violet-500/40"
            >
              Hoje
            </button>

            <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => goToDate(addDays(selectedDate, -1))}
                className="flex h-9 w-9 items-center justify-center border-r border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Dia anterior"
              >
                <ChevronLeft size={17} />
              </button>

              <button
                type="button"
                onClick={() => goToDate(addDays(selectedDate, 1))}
                className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Próximo dia"
              >
                <ChevronRight size={17} />
              </button>
            </div>

            <label className="relative flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
              <CalendarDays size={16} className="text-violet-600 dark:text-violet-300" />
              <span className="hidden sm:inline">{formatDateCompact(selectedDate)}</span>
              <input
                type="date"
                value={selectedDateInput}
                onChange={(event) => handleDateInputChange(event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Selecionar data"
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowVisibilityPanel((current) => !current)}
                className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <UsersRound size={16} />
                <span className="hidden sm:inline">Agendas</span>
                <ChevronDown size={14} />
              </button>

              {showVisibilityPanel ? (
                <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Profissionais
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowVisibilityPanel(false)}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => selecionarFiltroProfissional("todas")}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span>Todas as agendas</span>
                    {profissionalFiltro === "todas" ? (
                      <Check size={15} className="text-violet-600" />
                    ) : null}
                  </button>

                  {todosProfissionais.map((profissional) => {
                    const active = profissionalFiltro === String(profissional.id);
                    const hidden = hiddenProfessionalIds.includes(profissional.id);

                    return (
                      <div
                        key={profissional.id}
                        className="flex items-center rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <button
                          type="button"
                          onClick={() => selecionarFiltroProfissional(String(profissional.id))}
                          className="min-w-0 flex-1 px-3 py-2 text-left text-sm"
                        >
                          <span className="block truncate">{profissional.nome}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleProfessional(profissional.id)}
                          className="p-2 text-slate-400 hover:text-violet-600"
                          title={hidden ? "Mostrar agenda" : "Ocultar agenda"}
                        >
                          {hidden ? <X size={14} /> : <Check size={14} />}
                        </button>

                        {active ? <Check size={14} className="mr-2 text-violet-600" /> : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={abrirNovoPadrao}
              disabled={!visibleProfessionals[0] && !profissionais[0]}
              className="flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Novo agendamento</span>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 px-2 py-2 dark:border-slate-800 sm:px-3">
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              const active = isSameDay(day, selectedDate);
              const todayItem = isSameDay(day, today);

              return (
                <a
                  key={formatDateInput(day)}
                  href={agendaHref(day, profissionalFiltro)}
                  className={`min-w-0 rounded-lg border px-1 py-2 text-center transition sm:px-2 ${
                    active
                      ? "border-violet-600 bg-violet-600 text-white shadow-sm"
                      : todayItem
                        ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200"
                        : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-950"
                  }`}
                >
                  <span className="block truncate text-[0.62rem] font-bold uppercase tracking-wide sm:text-[0.68rem]">
                    {formatWeekday(day)}
                  </span>
                  <span className="mt-1 block text-sm font-bold sm:text-base">
                    {String(day.getDate()).padStart(2, "0")}
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-800 sm:px-4">
          <p className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-200">
            {formatDateHeading(selectedDate)}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {isSunday
              ? "Clínica fechada aos domingos"
              : selectedDate.getDay() === 6
                ? "Atendimento das 09:00 às 17:00"
                : "Atendimento das 09:00 às 19:00"}
          </p>
        </div>
      </div>

      {isSunday ? (
        <div className="flex min-h-[360px] items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <CalendarDays size={22} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              Domingo sem atendimento
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Selecione outro dia no calendário para visualizar ou criar agendamentos.
            </p>
          </div>
        </div>
      ) : (
        <div
          className={
            shouldEnableHorizontalScroll
              ? "w-full max-w-full overflow-x-auto overflow-y-hidden"
              : "w-full max-w-full overflow-hidden"
          }
        >
          <div
            className="relative w-full min-w-0"
            style={{
              display: "grid",
              minWidth: gridMinWidth,
              gridTemplateColumns: `58px repeat(${Math.max(
                visibleProfessionals.length,
                1,
              )}, minmax(0, 1fr))`,
            }}
          >
            <div className="sticky left-0 z-30 flex h-12 items-center justify-center border-b border-r border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900">
              <Clock3 size={16} />
            </div>

            {appointmentsByProfessional.map(({ profissional, index }) => {
              const palette = getPalette(profissional.cor, index);

              return (
                <div
                  key={profissional.id}
                  className="h-12 border-b border-r border-slate-200 bg-slate-50 px-2 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex h-full min-w-0 items-center justify-center gap-2">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: palette.solid }}
                    >
                      <UserRound size={14} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-100 sm:text-sm">
                        {profissional.nome}
                      </p>
                      {profissional.area ? (
                        <p className="hidden truncate text-[0.64rem] text-slate-400 sm:block">
                          {profissional.area}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}

            <div
              className="sticky left-0 z-20 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              style={{ height: gridHeight }}
            >
              {slots.map((slot) => (
                <div
                  key={slot.label}
                  className="absolute left-0 right-0 border-t border-slate-200 pr-2 pt-1 text-right text-[0.65rem] font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400"
                  style={{ top: slot.offset }}
                >
                  {slot.label}
                </div>
              ))}
            </div>

            {appointmentsByProfessional.map(
              ({ profissional, appointments, index }) => {
                const palette = getPalette(profissional.cor, index);

                return (
                  <div
                    key={`grid-${profissional.id}`}
                    className="relative border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
                    style={{ height: gridHeight }}
                  >
                    {slots.slice(0, -1).map((slot) => (
                      <button
                        key={`${profissional.id}-${slot.label}`}
                        type="button"
                        onClick={() => abrirNovo(profissional.id, slot.label)}
                        className="absolute left-0 right-0 z-0 border-t border-slate-200 transition hover:bg-violet-50/80 dark:border-slate-800 dark:hover:bg-violet-500/10"
                        style={{
                          top: slot.offset,
                          height: SLOT_MINUTES * MINUTE_HEIGHT,
                        }}
                        title={`Criar agendamento às ${slot.label}`}
                      >
                        <span className="sr-only">Criar agendamento às {slot.label}</span>
                      </button>
                    ))}

                    {currentTimeLine !== null ? (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                        style={{ top: currentTimeLine }}
                      >
                        <span className="h-2 w-2 -translate-x-1 rounded-full bg-rose-500" />
                        <span className="h-px flex-1 bg-rose-500" />
                      </div>
                    ) : null}

                    {appointments.map((appointment) => {
                      const startMinutes = minutesFromStart(appointment.data);
                      const endMinutes = minutesFromStart(appointmentEnd(appointment));

                      if (endMinutes <= 0 || startMinutes >= totalMinutes) return null;

                      const top = Math.max(0, startMinutes * MINUTE_HEIGHT + 2);
                      const visibleEnd = Math.min(totalMinutes, endMinutes);
                      const visibleStart = Math.max(0, startMinutes);
                      const height = Math.max(
                        40,
                        (visibleEnd - visibleStart) * MINUTE_HEIGHT - 4,
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
                          className="absolute left-1 right-1 z-10 cursor-pointer overflow-hidden rounded-md border text-left shadow-sm transition hover:-translate-y-px hover:shadow-md sm:left-1.5 sm:right-1.5"
                          style={{
                            top,
                            height,
                            backgroundColor: palette.soft,
                            borderColor: palette.border,
                          }}
                        >
                          <div
                            className="absolute bottom-0 left-0 top-0 w-1"
                            style={{ backgroundColor: palette.solid }}
                          />

                          <div className="flex h-full min-w-0 flex-col px-2 py-1.5 pl-3">
                            <div className="flex min-w-0 items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p
                                  className="text-[0.64rem] font-extrabold leading-tight sm:text-[0.7rem]"
                                  style={{ color: palette.solid }}
                                >
                                  {formatTime(appointment.data)} - {formatTime(appointmentEnd(appointment))}
                                </p>
                                <p className="mt-0.5 truncate text-[0.72rem] font-extrabold uppercase leading-tight text-slate-900 dark:text-white sm:text-xs">
                                  {appointment.cliente.nome}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onMessage(appointment);
                                }}
                                className="hidden shrink-0 rounded-md border border-slate-200 bg-white/80 p-1 text-slate-500 transition hover:text-violet-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 sm:block"
                                aria-label="Criar mensagem"
                              >
                                <MessageCircle size={12} />
                              </button>
                            </div>

                            {height >= 52 ? (
                              <p className="mt-1 line-clamp-1 text-[0.66rem] font-semibold text-slate-600 dark:text-slate-300 sm:text-[0.72rem]">
                                {appointment.procedimento}
                              </p>
                            ) : null}

                            {height >= 82 ? (
                              <p className="mt-1 line-clamp-1 text-[0.62rem] text-slate-500 dark:text-slate-400">
                                {note}
                              </p>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}
    </section>
  );
}
