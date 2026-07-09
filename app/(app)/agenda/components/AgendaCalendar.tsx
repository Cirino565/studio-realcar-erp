"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
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
const END_HOUR = 19;
const SLOT_MINUTES = 30;
const MINUTE_HEIGHT = 1.72;
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

function formatMonthName(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(value);
}

function formatDateTitle(value: Date, today: Date) {
  const dateText = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);

  if (isSameDay(value, today)) {
    return `Hoje, ${dateText}`;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
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

function getDateStripDays(date: Date) {
  return Array.from({ length: 35 }, (_, index) => addDays(date, index - 10));
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

function getColorClasses(color: string, index: number) {
  const normalizedColor = (color || "").toLowerCase();

  if (
    index % 2 === 1 ||
    normalizedColor.includes("rose") ||
    normalizedColor.includes("pink") ||
    normalizedColor.includes("red") ||
    normalizedColor.includes("vermelho")
  ) {
    return {
      avatar: "bg-red-600 text-white",
      event:
        "border-red-400 bg-gradient-to-br from-red-500 via-rose-500 to-red-600 text-white shadow-red-500/25",
      line: "bg-red-300",
      badge: "bg-white/20 text-white",
    };
  }

  return {
    avatar: "bg-violet-600 text-white",
    event:
      "border-fuchsia-400 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-purple-600 text-white shadow-purple-500/25",
    line: "bg-fuchsia-300",
    badge: "bg-white/20 text-white",
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
  const stripDays = getDateStripDays(selectedDate);
  const selectedDateInput = formatDateInput(selectedDate);
  const activeDayRef = useRef<HTMLAnchorElement | null>(null);
  const [hiddenProfessionalIds, setHiddenProfessionalIds] = useState<number[]>([]);
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);

  useEffect(() => {
    activeDayRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedDateInput]);

  const visibleProfessionals = useMemo(() => {
    const result = profissionais.filter(
      (profissional) => !hiddenProfessionalIds.includes(profissional.id),
    );

    return result.length > 0 ? result : profissionais;
  }, [hiddenProfessionalIds, profissionais]);

  const appointmentsByProfessional = useMemo(() => {
    return visibleProfessionals.map((profissional, index) => {
      const appointments = agendamentos
        .filter((appointment) => appointment.profissionalId === profissional.id)
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

      return {
        profissional,
        appointments,
        index,
      };
    });
  }, [agendamentos, visibleProfessionals]);

  const shouldEnableHorizontalScroll = visibleProfessionals.length > 2;

  const gridMinWidth =
    visibleProfessionals.length <= 2
      ? "100%"
      : `${36 + visibleProfessionals.length * 160}px`;

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

  function abrirNovoPadrao() {
    const profissional = visibleProfessionals[0] || profissionais[0];

    if (profissional) {
      abrirNovo(profissional.id);
    }
  }

  function selecionarFiltroProfissional(value: string) {
    setHiddenProfessionalIds([]);
    onProfissionalFiltroChange(value);
    setShowVisibilityPanel(false);
  }

  return (
    <section className="relative w-full max-w-full overflow-visible bg-white text-slate-900 shadow-xl shadow-slate-950/10 sm:overflow-hidden sm:rounded-[1.5rem]">
      <div className="border-b border-slate-200 bg-white">
        <div className="px-2 pt-1 text-center text-[0.68rem] font-medium capitalize leading-none text-slate-400 sm:px-4">
          {formatMonthName(selectedDate)}
        </div>

        <div className="flex max-w-full gap-1 overflow-x-auto px-1 pb-1 scrollbar-premium sm:px-3">
          {stripDays.map((day) => {
            const active = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);

            return (
              <a
                key={day.toISOString()}
                ref={active ? activeDayRef : null}
                href={agendaHref(day, profissionalFiltro)}
                className="min-w-[48px] shrink-0 rounded-xl px-1 py-1 text-center transition"
              >
                <span className="block truncate text-[0.68rem] font-medium text-slate-500 sm:text-xs">
                  {formatShortWeekDay(day).slice(0, 3)}
                </span>

                <span
                  className={`mx-auto mt-1 flex h-9 w-9 items-center justify-center rounded-lg text-lg font-semibold leading-none sm:h-10 sm:w-10 ${
                    active
                      ? "bg-red-600 text-white shadow-lg shadow-red-500/20"
                      : isToday
                        ? "bg-purple-50 text-purple-700"
                        : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {String(day.getDate()).padStart(2, "0")}
                </span>
              </a>
            );
          })}
        </div>

        <label className="relative block cursor-pointer border-t border-slate-100 py-2 text-center text-sm font-semibold capitalize text-purple-700 sm:text-base">
          <span className="pointer-events-none">
            {formatDateTitle(selectedDate, today)}
          </span>

          <input
            type="date"
            value={selectedDateInput}
            onChange={(event) => handleDateInputChange(event.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Selecionar data"
          />
        </label>
      </div>

      <div
        className={
          shouldEnableHorizontalScroll
            ? "w-full max-w-full overflow-x-auto overflow-y-hidden"
            : "w-full max-w-full overflow-visible"
        }
      >
        <div
          className="relative w-full min-w-0"
          style={{
            display: "grid",
            minWidth: gridMinWidth,
            gridTemplateColumns: `36px repeat(${Math.max(
              visibleProfessionals.length,
              1,
            )}, minmax(0, 1fr))`,
          }}
        >
          <div className="relative z-30 border-b border-r border-slate-200 bg-[#eef0f6]">
            <button
              type="button"
              onClick={() => setShowVisibilityPanel((current) => !current)}
              className="flex h-full min-h-[38px] w-full items-center justify-center text-purple-700"
              aria-label="Mostrar ou ocultar agendas"
            >
              <UsersRound size={18} />
            </button>

            {showVisibilityPanel ? (
              <div className="absolute left-1 top-10 z-50 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-950/20">
                <div className="flex items-center justify-between px-2 pb-2">
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Agendas
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowVisibilityPanel(false)}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Fechar seletor"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => selecionarFiltroProfissional("todas")}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-slate-100 ${
                      profissionalFiltro === "todas"
                        ? "text-purple-700"
                        : "text-slate-700"
                    }`}
                  >
                    <span>Todas as agendas</span>

                    {profissionalFiltro === "todas" ? (
                      <Check size={15} className="text-purple-700" />
                    ) : null}
                  </button>

                  {todosProfissionais.map((profissional) => {
                    const active = profissionalFiltro === String(profissional.id);
                    const hidden = hiddenProfessionalIds.includes(profissional.id);

                    return (
                      <div
                        key={profissional.id}
                        className="flex items-center gap-1 rounded-xl hover:bg-slate-100"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            selecionarFiltroProfissional(String(profissional.id))
                          }
                          className={`min-w-0 flex-1 px-3 py-2 text-left text-sm font-medium ${
                            active ? "text-purple-700" : "text-slate-700"
                          }`}
                        >
                          <span className="block truncate">{profissional.nome}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleProfessional(profissional.id)}
                          className="shrink-0 rounded-lg px-2 py-2 text-slate-400 hover:text-purple-700"
                          title={hidden ? "Mostrar agenda" : "Ocultar agenda"}
                        >
                          {hidden ? <X size={14} /> : <Check size={14} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {appointmentsByProfessional.map(({ profissional, index }) => {
            const color = getColorClasses(profissional.cor, index);

            return (
              <div
                key={profissional.id}
                className="min-w-0 border-b border-r border-slate-200 bg-[#eef0f6]"
              >
                <button
                  type="button"
                  onClick={() => setShowVisibilityPanel((current) => !current)}
                  className="flex h-[38px] w-full min-w-0 items-center justify-center gap-1 px-1 text-xs font-medium text-slate-700"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${color.avatar}`}
                  >
                    <UserRound size={14} />
                  </span>

                  <span className="min-w-0 truncate">{profissional.nome}</span>

                  <ChevronDown size={13} className="shrink-0 text-slate-500" />
                </button>
              </div>
            );
          })}

          <div
            className="relative border-r border-slate-200 bg-white"
            style={{ height: gridHeight }}
          >
            {slots.map((slot) => (
              <div
                key={slot.label}
                className="absolute left-0 right-0 border-t border-slate-200 pr-1 pt-1 text-right text-[0.68rem] font-medium text-slate-500 sm:text-xs"
                style={{ top: slot.offset }}
              >
                {slot.label}
              </div>
            ))}
          </div>

          {appointmentsByProfessional.map(({ profissional, appointments, index }) => {
            const color = getColorClasses(profissional.cor, index);

            return (
              <div
                key={`grid-${profissional.id}`}
                className="relative border-r border-slate-100 bg-white"
                style={{ height: gridHeight }}
              >
                {slots.slice(0, -1).map((slot) => (
                  <button
                    key={`${profissional.id}-${slot.label}`}
                    type="button"
                    onClick={() => abrirNovo(profissional.id, slot.label)}
                    className="absolute left-0 right-0 z-0 border-t border-slate-200 text-transparent transition hover:bg-purple-50"
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

                  if (endMinutes <= 0 || startMinutes >= TOTAL_MINUTES) {
                    return null;
                  }

                  const top = Math.max(0, startMinutes * MINUTE_HEIGHT + 3);
                  const height = Math.max(
                    52,
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
                      className={`absolute left-1 right-1 z-10 cursor-pointer overflow-hidden rounded-lg border p-1.5 text-left shadow-lg transition hover:brightness-105 sm:left-1.5 sm:right-1.5 sm:rounded-xl sm:p-2 ${color.event}`}
                      style={{ top, height }}
                    >
                      <div className={`absolute left-0 top-0 h-full w-1 ${color.line}`} />

                      <div className="relative flex h-full min-w-0 flex-col">
                        <div className="flex min-w-0 items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="flex items-center gap-1 text-[0.64rem] font-bold leading-tight text-white sm:text-xs">
                              <Clock3 size={11} className="shrink-0" />
                              {formatTime(appointment.data)} -{" "}
                              {formatTime(appointmentEnd(appointment))}
                            </p>

                            <p className="mt-1 line-clamp-2 text-[0.72rem] font-semibold uppercase leading-tight text-white sm:text-sm">
                              {appointment.cliente.nome}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onMessage(appointment);
                            }}
                            className="hidden shrink-0 rounded-lg bg-white/15 p-1.5 text-white transition hover:bg-white/25 sm:block"
                            aria-label="Gerar mensagem de WhatsApp"
                          >
                            <MessageCircle size={13} />
                          </button>
                        </div>

                        <p className="mt-1 line-clamp-2 text-[0.68rem] font-medium leading-snug text-white/95 sm:text-xs">
                          {appointment.procedimento}
                        </p>

                        {height > 76 ? (
                          <p className="mt-1 line-clamp-2 text-[0.64rem] leading-snug text-white/85 sm:text-[0.72rem]">
                            {note}
                          </p>
                        ) : null}

                        {height > 112 ? (
                          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.08em] ${color.badge}`}
                            >
                              {appointment.status}
                            </span>

                            <span className="text-[0.62rem] font-semibold text-white/80">
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
        onClick={() => goToDate(today)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+96px)] left-1/2 z-[60] -translate-x-1/2 rounded-md bg-purple-700 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-purple-900/25 active:scale-[0.98] sm:absolute sm:bottom-5"
      >
        Hoje
      </button>

      <button
        type="button"
        onClick={abrirNovoPadrao}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+92px)] right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-purple-700 text-white shadow-2xl shadow-purple-900/35 active:scale-[0.98] sm:absolute sm:bottom-5 sm:right-5"
        disabled={!visibleProfessionals[0] && !profissionais[0]}
        aria-label="Novo agendamento"
      >
        <Plus size={26} />
      </button>
    </section>
  );
}