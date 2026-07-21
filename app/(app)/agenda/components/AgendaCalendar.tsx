"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Ban,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Plus,
  Repeat2,
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
  serieId?: string | null;
  recorrenciaTipo?: string | null;
  recorrenciaIntervalo?: number | null;
  recorrenciaIndice?: number | null;
  recorrenciaTotal?: number | null;
  createdAt?: string;
  updatedAt?: string;
  cliente: {
    nome: string;
    telefone?: string | null;
    whatsapp?: string | null;
  };
  profissional: ProfissionalAgenda | null;
};

type BloqueioAgenda = {
  id: number;
  profissionalId: number;
  data: string;
  duracao: number;
  motivo: string;
  observacoes: string | null;
  status: string;
  serieId?: string | null;
  recorrenciaTipo?: string | null;
  recorrenciaIntervalo?: number | null;
  recorrenciaIndice?: number | null;
  recorrenciaTotal?: number | null;
  createdAt?: string;
  updatedAt?: string;
  profissional: ProfissionalAgenda;
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
  bloqueios: BloqueioAgenda[];
  onNovoHorario: (payload: NovoHorarioPayload) => void;
  onSelectAppointment: (appointment: AgendamentoAgenda) => void;
  onSelectBlock: (bloqueio: BloqueioAgenda) => void;
  onMessage: (appointment: AgendamentoAgenda) => void;
  horarioAtendimento?: string | null;
  viewMode: "day" | "week";
};

const START_HOUR = 9;
const SLOT_MINUTES = 30;
const MINUTE_HEIGHT = 1.5;
const SAO_PAULO_TIMEZONE = "America/Sao_Paulo";


type AlmocoVisualConfig = {
  ativo: boolean;
  inicio: string;
  fim: string;
  dias: number[];
};

const ALMOCO_VISUAL_PADRAO: AlmocoVisualConfig = {
  ativo: true,
  inicio: "12:00",
  fim: "13:00",
  dias: [1, 2, 3, 4, 5, 6],
};

function parseAlmocoVisual(value?: string | null): AlmocoVisualConfig {
  if (!value) return { ...ALMOCO_VISUAL_PADRAO, dias: [...ALMOCO_VISUAL_PADRAO.dias] };

  const horario = value.match(/ALMOCO=(\d{2}:\d{2})-(\d{2}:\d{2})/i);
  const ativo = value.match(/ALMOCO_ATIVO=(0|1)/i);
  const dias = value.match(/ALMOCO_DIAS=([0-6](?:,[0-6])*)/i);

  return {
    ativo: ativo ? ativo[1] === "1" : ALMOCO_VISUAL_PADRAO.ativo,
    inicio: horario?.[1] || ALMOCO_VISUAL_PADRAO.inicio,
    fim: horario?.[2] || ALMOCO_VISUAL_PADRAO.fim,
    dias: dias ? dias[1].split(",").map(Number) : [...ALMOCO_VISUAL_PADRAO.dias],
  };
}

function minutosHorario(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

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

function formatMonthYear(date: Date) {
  const value = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatSelectedDateTitle(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
  }).format(date);

  return `${day} de ${month.charAt(0).toUpperCase() + month.slice(1)}`;
}

function getCalendarDays(viewDate: Date) {
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const firstVisible = new Date(firstDay);
  firstVisible.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => addDays(firstVisible, index));
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

function blockEnd(bloqueio: BloqueioAgenda) {
  return addMinutes(new Date(bloqueio.data), bloqueio.duracao);
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
      gradientEnd: "#e11d48",
      soft: "rgba(190, 18, 60, 0.10)",
      border: "rgba(244, 63, 94, 0.42)",
    };
  }

  if (normalized.includes("blue") || normalized.includes("azul")) {
    return {
      solid: "#2563eb",
      gradientEnd: "#4f46e5",
      soft: "rgba(37, 99, 235, 0.10)",
      border: "rgba(59, 130, 246, 0.42)",
    };
  }

  if (normalized.includes("teal") || normalized.includes("green")) {
    return {
      solid: "#0f766e",
      gradientEnd: "#0d9488",
      soft: "rgba(15, 118, 110, 0.10)",
      border: "rgba(20, 184, 166, 0.42)",
    };
  }

  return {
    solid: "#7c3aed",
    gradientEnd: "#a21caf",
    soft: "rgba(124, 58, 237, 0.10)",
    border: "rgba(139, 92, 246, 0.42)",
  };
}

function getStatusPalette(status: string) {
  const normalized = (status || "Agendado").toLowerCase();

  if (normalized === "confirmado") {
    return {
      solid: "#059669",
      gradientEnd: "#10b981",
      soft: "rgba(5, 150, 105, 0.10)",
      border: "rgba(16, 185, 129, 0.38)",
    };
  }

  if (normalized === "em atendimento") {
    return {
      solid: "#0891b2",
      gradientEnd: "#06b6d4",
      soft: "rgba(8, 145, 178, 0.10)",
      border: "rgba(6, 182, 212, 0.40)",
    };
  }

  if (normalized === "atendido") {
    return {
      solid: "#2563eb",
      gradientEnd: "#3b82f6",
      soft: "rgba(37, 99, 235, 0.10)",
      border: "rgba(59, 130, 246, 0.40)",
    };
  }

  if (normalized === "faltou") {
    return {
      solid: "#d97706",
      gradientEnd: "#f59e0b",
      soft: "rgba(217, 119, 6, 0.10)",
      border: "rgba(245, 158, 11, 0.42)",
    };
  }

  if (normalized === "cancelado") {
    return {
      solid: "#64748b",
      gradientEnd: "#94a3b8",
      soft: "rgba(100, 116, 139, 0.10)",
      border: "rgba(148, 163, 184, 0.45)",
    };
  }

  return {
    solid: "#7c3aed",
    gradientEnd: "#a21caf",
    soft: "rgba(124, 58, 237, 0.10)",
    border: "rgba(139, 92, 246, 0.42)",
  };
}

function agendaHref(
  date: Date,
  profissionalFiltro: string,
  viewMode: "day" | "week" = "day",
) {
  const data = formatDateInput(date);
  const profissional =
    profissionalFiltro !== "todas" ? `&profissional=${profissionalFiltro}` : "";
  const view = viewMode === "week" ? "&view=week" : "";

  return `/agenda?data=${data}${profissional}${view}`;
}

function formatSaoPauloDateKey(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: SAO_PAULO_TIMEZONE,
  }).formatToParts(new Date(value));

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
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
  bloqueios,
  onNovoHorario,
  onSelectAppointment,
  onSelectBlock,
  onMessage,
  horarioAtendimento,
  viewMode,
}: Props) {
  const today = new Date();
  const selectedDateInput = formatDateInput(selectedDate);
  const endHour = getEndHour(selectedDate);
  const totalMinutes = Math.max(0, (endHour - START_HOUR) * 60);
  const gridHeight = totalMinutes * MINUTE_HEIGHT;
  const isSunday = selectedDate.getDay() === 0;
  const almocoVisual = useMemo(
    () => parseAlmocoVisual(horarioAtendimento),
    [horarioAtendimento],
  );
  const almocoRange = useMemo(() => {
    const diaSemana = selectedDate.getDay();

    if (
      isSunday ||
      !almocoVisual.ativo ||
      !almocoVisual.dias.includes(diaSemana)
    ) {
      return null;
    }

    const inicio = minutosHorario(almocoVisual.inicio) - START_HOUR * 60;
    const fim = minutosHorario(almocoVisual.fim) - START_HOUR * 60;
    const visibleStart = Math.max(0, inicio);
    const visibleEnd = Math.min(totalMinutes, fim);

    if (visibleEnd <= visibleStart) return null;

    return {
      top: visibleStart * MINUTE_HEIGHT,
      height: (visibleEnd - visibleStart) * MINUTE_HEIGHT,
      label: `${almocoVisual.inicio} às ${almocoVisual.fim}`,
    };
  }, [almocoVisual, isSunday, selectedDate, totalMinutes]);

  const [hiddenProfessionalIds, setHiddenProfessionalIds] = useState<number[]>([]);
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(
    () => new Date(selectedDate),
  );
  const [calendarDraftDate, setCalendarDraftDate] = useState(
    () => new Date(selectedDate),
  );

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [selectedDate]);

  const calendarDays = useMemo(
    () => getCalendarDays(calendarViewDate),
    [calendarViewDate],
  );

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
      blocks: bloqueios
        .filter((bloqueio) => bloqueio.profissionalId === profissional.id)
        .sort(
          (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
        ),
    }));
  }, [agendamentos, bloqueios, visibleProfessionals]);

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
    window.location.href = agendaHref(date, profissionalFiltro, viewMode);
  }

  function openCalendar() {
    const selected = new Date(selectedDate);
    setCalendarDraftDate(selected);
    setCalendarViewDate(new Date(selected.getFullYear(), selected.getMonth(), 1));
    setCalendarOpen(true);
  }

  function closeCalendar() {
    setCalendarOpen(false);
  }

  function changeCalendarMonth(amount: number) {
    setCalendarViewDate((current) =>
      new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  }

  function confirmCalendarDate() {
    const next = new Date(calendarDraftDate);
    setCalendarOpen(false);
    goToDate(next);
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

  const weeklyOverview = useMemo(() => {
    const visibleIds = new Set(visibleProfessionals.map((item) => item.id));

    return weekDays.map((day) => {
      const dateKey = formatDateInput(day);
      const items: Array<
        | { kind: "appointment"; minute: number; appointment: AgendamentoAgenda }
        | { kind: "block"; minute: number; bloqueio: BloqueioAgenda }
        | { kind: "lunch"; minute: number }
      > = [];

      agendamentos.forEach((appointment) => {
        if (
          appointment.profissionalId &&
          visibleIds.has(appointment.profissionalId) &&
          formatSaoPauloDateKey(appointment.data) === dateKey
        ) {
          const time = getSaoPauloTimeParts(appointment.data);
          items.push({
            kind: "appointment",
            minute: time.hour * 60 + time.minute,
            appointment,
          });
        }
      });

      bloqueios.forEach((bloqueio) => {
        if (
          visibleIds.has(bloqueio.profissionalId) &&
          formatSaoPauloDateKey(bloqueio.data) === dateKey
        ) {
          const time = getSaoPauloTimeParts(bloqueio.data);
          items.push({
            kind: "block",
            minute: time.hour * 60 + time.minute,
            bloqueio,
          });
        }
      });

      if (
        day.getDay() !== 0 &&
        almocoVisual.ativo &&
        almocoVisual.dias.includes(day.getDay())
      ) {
        items.push({
          kind: "lunch",
          minute: minutosHorario(almocoVisual.inicio),
        });
      }

      items.sort((a, b) => a.minute - b.minute);

      return { day, dateKey, items };
    });
  }, [
    agendamentos,
    almocoVisual,
    bloqueios,
    visibleProfessionals,
    weekDays,
  ]);

  const currentTimeLine = useMemo(() => {
    if (!isSameDay(selectedDate, today) || isSunday) return null;

    const current = new Date();
    const minutes = current.getHours() * 60 + current.getMinutes() - START_HOUR * 60;

    if (minutes < 0 || minutes > totalMinutes) return null;
    return minutes * MINUTE_HEIGHT;
  }, [isSunday, selectedDate, today, totalMinutes]);

  return (
    <>
      <section className="relative w-full max-w-full overflow-hidden border border-slate-300 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:rounded-xl">
      <div className="border-b border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex min-h-14 flex-col gap-2 px-2 py-2 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-4 lg:px-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="hidden overflow-hidden rounded-md border border-violet-300 bg-white sm:flex dark:border-violet-500/50 dark:bg-slate-950">
              <a
                href={agendaHref(selectedDate, profissionalFiltro, "day")}
                className={`flex h-9 items-center px-3 text-xs font-extrabold uppercase tracking-wide transition ${
                  viewMode === "day"
                    ? "bg-violet-700 text-white"
                    : "text-violet-700 hover:bg-violet-50 dark:text-violet-200 dark:hover:bg-violet-500/10"
                }`}
              >
                Dia
              </a>
              <a
                href={agendaHref(selectedDate, profissionalFiltro, "week")}
                className={`flex h-9 items-center border-l border-violet-200 px-3 text-xs font-extrabold uppercase tracking-wide transition dark:border-violet-500/40 ${
                  viewMode === "week"
                    ? "bg-violet-700 text-white"
                    : "text-violet-700 hover:bg-violet-50 dark:text-violet-200 dark:hover:bg-violet-500/10"
                }`}
              >
                Semana
              </a>
            </div>

            <div className="flex overflow-hidden rounded-md border border-violet-300 bg-white dark:border-violet-500/50 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => goToDate(addDays(selectedDate, viewMode === "week" ? -7 : -1))}
                className="flex h-9 w-9 items-center justify-center border-r border-violet-200 text-violet-700 transition hover:bg-violet-50 dark:border-violet-500/40 dark:text-violet-200 dark:hover:bg-violet-500/10"
                aria-label="Dia anterior"
              >
                <ChevronLeft size={17} />
              </button>

              <button
                type="button"
                onClick={() => goToDate(today)}
                className="h-9 border-r border-violet-200 px-3 text-xs font-extrabold uppercase tracking-wide text-violet-700 transition hover:bg-violet-50 dark:border-violet-500/40 dark:text-violet-200 dark:hover:bg-violet-500/10"
              >
                Hoje
              </button>

              <button
                type="button"
                onClick={() => goToDate(addDays(selectedDate, viewMode === "week" ? 7 : 1))}
                className="flex h-9 w-9 items-center justify-center text-violet-700 transition hover:bg-violet-50 dark:text-violet-200 dark:hover:bg-violet-500/10"
                aria-label="Próximo dia"
              >
                <ChevronRight size={17} />
              </button>
            </div>

            <button
              type="button"
              onClick={openCalendar}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-violet-700 transition hover:bg-violet-50 dark:text-violet-200 dark:hover:bg-violet-500/10"
              title={formatDateCompact(selectedDate)}
              aria-label="Abrir calendário"
            >
              <CalendarDays size={19} />
            </button>
          </div>

          <div className="order-3 min-w-0 overflow-x-auto lg:order-none lg:overflow-visible">
            <div className="mx-auto flex w-fit min-w-max items-center justify-center gap-1">
              {weekDays.map((day) => {
                const active = isSameDay(day, selectedDate);
                const todayItem = isSameDay(day, today);

                return (
                  <a
                    key={formatDateInput(day)}
                    href={agendaHref(day, profissionalFiltro, viewMode)}
                    className={`flex h-9 w-[82px] flex-none items-center justify-center gap-1 rounded-md border px-2 text-center text-xs font-semibold transition ${
                      active
                        ? "border-violet-700 bg-violet-700 text-white shadow-sm"
                        : todayItem
                          ? "border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-500/50 dark:bg-violet-500/10 dark:text-violet-100"
                          : "border-violet-200 bg-white text-violet-700 hover:border-violet-300 hover:bg-violet-50 dark:border-violet-500/40 dark:bg-slate-950 dark:text-violet-200 dark:hover:bg-violet-500/10"
                    }`}
                  >
                    <span className="capitalize">{formatWeekday(day)}</span>
                    <span className="font-extrabold">{String(day.getDate()).padStart(2, "0")}</span>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowVisibilityPanel((current) => !current)}
                className="flex h-9 items-center gap-2 rounded-md px-2.5 text-violet-700 transition hover:bg-violet-50 dark:text-violet-200 dark:hover:bg-violet-500/10"
                title="Selecionar agendas"
              >
                <UsersRound size={18} />
                <span className="hidden text-xs font-bold sm:inline">Agendas</span>
                <ChevronDown size={13} />
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
              className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-700 text-white shadow-md shadow-violet-700/25 transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11"
              title="Novo agendamento"
            >
              <Plus size={21} />
              <span className="sr-only">Novo agendamento</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === "week" ? (
        <div className="w-full overflow-x-auto border-t border-slate-300 dark:border-slate-700">
          <div className="grid min-w-[1180px] grid-cols-7 bg-slate-200 dark:bg-slate-800">
            {weeklyOverview.map(({ day, dateKey, items }) => {
              const sunday = day.getDay() === 0;
              const active = isSameDay(day, selectedDate);
              const appointmentCount = items.filter(
                (item) => item.kind === "appointment",
              ).length;

              return (
                <section
                  key={dateKey}
                  className="min-h-[560px] border-r border-slate-300 bg-white last:border-r-0 dark:border-slate-700 dark:bg-slate-950"
                >
                  <a
                    href={agendaHref(day, profissionalFiltro, "day")}
                    className={`flex h-16 items-center justify-between border-b px-3 transition ${
                      active
                        ? "border-violet-300 bg-violet-50 dark:border-violet-500/40 dark:bg-violet-500/10"
                        : "border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                    }`}
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        {formatWeekday(day)}
                      </p>
                      <p className="mt-0.5 text-lg font-extrabold text-slate-900 dark:text-white">
                        {String(day.getDate()).padStart(2, "0")}
                      </p>
                    </div>
                    {!sunday ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        {appointmentCount}
                      </span>
                    ) : null}
                  </a>

                  <div className="space-y-2 p-2">
                    {sunday ? (
                      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-xs font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-900">
                        Fechado
                      </div>
                    ) : (
                      <>
                        {items.map((item, itemIndex) => {
                          if (item.kind === "lunch") {
                            return (
                              <div
                                key={`lunch-${dateKey}-${itemIndex}`}
                                className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-2 py-1.5 text-[10px] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                              >
                                {almocoVisual.inicio}–{almocoVisual.fim} · Almoço
                              </div>
                            );
                          }

                          if (item.kind === "block") {
                            const bloqueio = item.bloqueio;
                            return (
                              <button
                                key={`block-${bloqueio.id}`}
                                type="button"
                                onClick={() => onSelectBlock(bloqueio)}
                                className="w-full rounded-md border border-slate-300 bg-slate-100 p-2 text-left transition hover:border-slate-400 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                              >
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                  <Ban size={11} />
                                  {formatTime(bloqueio.data)}–{formatTime(blockEnd(bloqueio))}
                                </div>
                                <p className="mt-1 truncate text-xs font-extrabold uppercase text-slate-700 dark:text-slate-200">
                                  {bloqueio.motivo}
                                </p>
                                <div className="mt-1 flex min-w-0 items-center justify-between gap-2 text-[10px] text-slate-500">
                                  <span className="truncate">{bloqueio.profissional.nome}</span>
                                  {bloqueio.serieId ? (
                                    <span className="inline-flex shrink-0 items-center gap-1" title="Bloqueio recorrente">
                                      <Repeat2 size={10} />
                                      {bloqueio.recorrenciaIndice && bloqueio.recorrenciaTotal
                                        ? `${bloqueio.recorrenciaIndice}/${bloqueio.recorrenciaTotal}`
                                        : ""}
                                    </span>
                                  ) : null}
                                </div>
                              </button>
                            );
                          }

                          const appointment = item.appointment;
                          const palette = getStatusPalette(appointment.status);
                          const professionalIndex = Math.max(
                            0,
                            visibleProfessionals.findIndex(
                              (professional) => professional.id === appointment.profissionalId,
                            ),
                          );
                          const professionalPalette = getPalette(
                            appointment.profissional?.cor || "violet",
                            professionalIndex,
                          );

                          return (
                            <button
                              key={`appointment-${appointment.id}`}
                              type="button"
                              onClick={() => onSelectAppointment(appointment)}
                              className="w-full overflow-hidden rounded-md border p-2 text-left shadow-sm transition hover:-translate-y-px hover:shadow-md"
                              style={{
                                borderColor: palette.border,
                                background: palette.soft,
                                borderLeftWidth: 4,
                                borderLeftColor: palette.solid,
                              }}
                            >
                              <p
                                className="text-[10px] font-extrabold"
                                style={{ color: palette.solid }}
                              >
                                {formatTime(appointment.data)}–{formatTime(appointmentEnd(appointment))}
                              </p>
                              <p className="mt-1 truncate text-xs font-extrabold uppercase text-slate-900 dark:text-white">
                                {appointment.cliente.nome}
                              </p>
                              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-600 dark:text-slate-300">
                                {appointment.procedimento}
                              </p>
                              <span
                                className="mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white"
                                style={{ backgroundColor: palette.solid }}
                              >
                                {appointment.status}
                              </span>
                              <div className="mt-1 flex min-w-0 items-center justify-between gap-2 text-[10px] font-semibold text-slate-400">
                                <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                                  <span
                                    className="size-1.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: professionalPalette.solid }}
                                  />
                                  <span className="truncate">
                                    {appointment.profissional?.nome || "Sem profissional"}
                                  </span>
                                </span>
                                {appointment.serieId ? (
                                  <span className="inline-flex shrink-0 items-center gap-1" title="Agendamento recorrente">
                                    <Repeat2 size={10} />
                                    {appointment.recorrenciaIndice && appointment.recorrenciaTotal
                                      ? `${appointment.recorrenciaIndice}/${appointment.recorrenciaTotal}`
                                      : ""}
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}

                        {items.length === 0 ? (
                          <div className="rounded-md border border-dashed border-slate-200 px-2 py-5 text-center text-[11px] text-slate-400 dark:border-slate-800">
                            Nenhum atendimento
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => {
                            const profissional = visibleProfessionals[0] || profissionais[0];
                            if (!profissional) return;
                            onNovoHorario({
                              data: dateKey,
                              hora: "09:00",
                              profissionalId: profissional.id,
                            });
                          }}
                          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-violet-300 px-2 py-2 text-[11px] font-bold text-violet-700 transition hover:bg-violet-50 dark:border-violet-500/40 dark:text-violet-300 dark:hover:bg-violet-500/10"
                        >
                          <Plus size={13} />
                          Novo
                        </button>
                      </>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : isSunday ? (
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
            <div className="sticky left-0 z-30 flex h-11 items-center justify-center border-b border-r border-slate-300 bg-white text-violet-700 dark:border-slate-700 dark:bg-slate-900 dark:text-violet-200">
              <UsersRound size={17} />
            </div>

            {appointmentsByProfessional.map(({ profissional, index }) => {
              const palette = getPalette(profissional.cor, index);

              return (
                <div
                  key={profissional.id}
                  className="h-11 border-b border-r border-slate-300 bg-white px-2 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex h-full min-w-0 items-center justify-center gap-2">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
                      style={{ backgroundColor: palette.solid }}
                    >
                      <UserRound size={14} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100 sm:text-sm">
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
              className="sticky left-0 z-20 border-r border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950"
              style={{ height: gridHeight }}
            >
              {slots.map((slot) => (
                <div
                  key={slot.label}
                  className="absolute left-0 right-0 border-t border-slate-300 pr-2 pt-1 text-right text-[0.66rem] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400"
                  style={{ top: slot.offset }}
                >
                  {slot.label}
                </div>
              ))}
            </div>

            {appointmentsByProfessional.map(
              ({ profissional, appointments, blocks, index }) => {
                const palette = getPalette(profissional.cor, index);

                return (
                  <div
                    key={`grid-${profissional.id}`}
                    className="relative border-r border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950"
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

                    {almocoRange ? (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-[1] border-y border-amber-200/80 bg-amber-50/75 dark:border-amber-500/20 dark:bg-amber-400/[0.06]"
                        style={{
                          top: almocoRange.top,
                          height: almocoRange.height,
                        }}
                      >
                        {index === 0 && almocoRange.height >= 44 ? (
                          <div className="flex h-full items-start justify-center pt-2">
                            <span className="rounded-full border border-amber-300/70 bg-white/85 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-amber-700 shadow-sm dark:border-amber-500/30 dark:bg-slate-900/80 dark:text-amber-200">
                              Almoço · {almocoRange.label}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {currentTimeLine !== null ? (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                        style={{ top: currentTimeLine }}
                      >
                        <span className="h-2 w-2 -translate-x-1 rounded-full bg-rose-500" />
                        <span className="h-px flex-1 bg-rose-500" />
                      </div>
                    ) : null}

                    {blocks.map((bloqueio) => {
                      const startMinutes = minutesFromStart(bloqueio.data);
                      const endMinutes = minutesFromStart(blockEnd(bloqueio));

                      if (endMinutes <= 0 || startMinutes >= totalMinutes) return null;

                      const top = Math.max(0, startMinutes * MINUTE_HEIGHT + 2);
                      const visibleEnd = Math.min(totalMinutes, endMinutes);
                      const visibleStart = Math.max(0, startMinutes);
                      const height = Math.max(
                        40,
                        (visibleEnd - visibleStart) * MINUTE_HEIGHT - 4,
                      );

                      return (
                        <article
                          key={`block-${bloqueio.id}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelectBlock(bloqueio)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              onSelectBlock(bloqueio);
                            }
                          }}
                          className="absolute left-0.5 right-0.5 z-10 cursor-pointer overflow-hidden rounded-sm border border-slate-400/80 bg-slate-200 text-left shadow-sm transition hover:bg-slate-300 dark:border-slate-500 dark:bg-slate-700 dark:hover:bg-slate-600"
                          style={{
                            top,
                            height,
                            backgroundImage:
                              "repeating-linear-gradient(135deg, rgba(100,116,139,.12) 0, rgba(100,116,139,.12) 6px, rgba(255,255,255,.18) 6px, rgba(255,255,255,.18) 12px)",
                          }}
                        >
                          <div className="flex h-full min-w-0 flex-col px-2.5 py-1.5">
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-800">
                                <Ban size={11} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[0.64rem] font-extrabold leading-tight text-slate-700 dark:text-slate-100 sm:text-[0.7rem]">
                                  {formatTime(bloqueio.data)} - {formatTime(blockEnd(bloqueio))}
                                </p>
                                <p className="mt-0.5 truncate text-[0.72rem] font-extrabold uppercase leading-tight text-slate-900 dark:text-white sm:text-xs">
                                  {bloqueio.motivo}
                                </p>
                              </div>
                              {bloqueio.serieId ? (
                                <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-400/60 bg-white/50 px-1.5 py-1 text-[9px] font-bold text-slate-600 dark:bg-slate-800/70 dark:text-slate-200">
                                  <Repeat2 size={10} />
                                  {bloqueio.recorrenciaIndice && bloqueio.recorrenciaTotal
                                    ? `${bloqueio.recorrenciaIndice}/${bloqueio.recorrenciaTotal}`
                                    : ""}
                                </span>
                              ) : null}
                            </div>

                            {height >= 62 ? (
                              <p className="mt-1 line-clamp-1 text-[0.66rem] font-semibold text-slate-600 dark:text-slate-300">
                                {bloqueio.observacoes || "Horário indisponível"}
                              </p>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}

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
                      const statusPalette = getStatusPalette(appointment.status);

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
                          className="absolute left-0.5 right-0.5 z-10 cursor-pointer overflow-hidden rounded-sm border border-white/20 text-left shadow-sm transition hover:brightness-105 hover:shadow-md sm:left-0.5 sm:right-0.5"
                          style={{
                            top,
                            height,
                            background: `linear-gradient(135deg, ${statusPalette.solid}, ${statusPalette.gradientEnd})`,
                            boxShadow: `inset 3px 0 0 ${palette.solid}`,
                          }}
                        >
                          <div className="flex h-full min-w-0 flex-col px-2.5 py-1.5">
                            <div className="flex min-w-0 items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p
                                  className="text-[0.64rem] font-extrabold leading-tight text-white/95 sm:text-[0.7rem]"
                                >
                                  {formatTime(appointment.data)} - {formatTime(appointmentEnd(appointment))}
                                </p>
                                <p className="mt-0.5 truncate text-[0.72rem] font-extrabold uppercase leading-tight text-white sm:text-xs">
                                  {appointment.cliente.nome}
                                </p>
                              </div>

                              {appointment.serieId ? (
                                <span
                                  className="hidden shrink-0 items-center gap-1 rounded-md border border-white/30 bg-white/15 px-1.5 py-1 text-[10px] font-bold text-white sm:inline-flex"
                                  title="Agendamento recorrente"
                                >
                                  <Repeat2 size={11} />
                                  {appointment.recorrenciaIndice && appointment.recorrenciaTotal
                                    ? `${appointment.recorrenciaIndice}/${appointment.recorrenciaTotal}`
                                    : ""}
                                </span>
                              ) : null}

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onMessage(appointment);
                                }}
                                className="hidden shrink-0 rounded-md border border-white/30 bg-white/15 p-1 text-white transition hover:bg-white/25 sm:block"
                                aria-label="Criar mensagem"
                              >
                                <MessageCircle size={12} />
                              </button>
                            </div>

                            {height >= 52 ? (
                              <p className="mt-1 line-clamp-1 text-[0.66rem] font-semibold text-white/95 sm:text-[0.72rem]">
                                {appointment.procedimento}
                              </p>
                            ) : null}

                            {height >= 82 ? (
                              <p className="mt-1 line-clamp-1 text-[0.62rem] font-medium text-white/85">
                                {appointment.status}
                                {note !== appointment.status ? ` · ${note}` : ""}
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

      {calendarOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[1px]">
              <button
                type="button"
                aria-label="Fechar calendário"
                onClick={closeCalendar}
                className="absolute inset-0"
              />

              <div
                role="dialog"
                aria-modal="true"
                aria-label="Selecionar data"
                className="relative z-10 w-full max-w-[340px] overflow-hidden rounded-xl bg-white shadow-2xl shadow-slate-950/30 dark:bg-slate-900"
              >
                <div className="bg-gradient-to-br from-violet-700 to-fuchsia-600 px-6 pb-5 pt-4 text-white">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-violet-100">
                    Data
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {formatSelectedDateTitle(calendarDraftDate)}
                  </p>
                </div>

                <div className="px-5 pb-4 pt-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-100">
                      {formatMonthYear(calendarViewDate)}
                    </p>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => changeCalendarMonth(-1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-violet-500/10 dark:hover:text-violet-200"
                        aria-label="Mês anterior"
                      >
                        <ChevronLeft size={20} />
                      </button>

                      <button
                        type="button"
                        onClick={() => changeCalendarMonth(1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 dark:text-slate-300 dark:hover:bg-violet-500/10 dark:hover:text-violet-200"
                        aria-label="Próximo mês"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-7 text-center">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                      (label) => (
                        <span
                          key={label}
                          className="py-2 text-[0.68rem] font-semibold text-slate-500 dark:text-slate-400"
                        >
                          {label}
                        </span>
                      ),
                    )}
                  </div>

                  <div className="grid grid-cols-7 gap-y-1 text-center">
                    {calendarDays.map((day) => {
                      const inCurrentMonth =
                        day.getMonth() === calendarViewDate.getMonth();
                      const selected = isSameDay(day, calendarDraftDate);
                      const todayDay = isSameDay(day, today);

                      return (
                        <button
                          key={formatDateInput(day)}
                          type="button"
                          onClick={() => {
                            setCalendarDraftDate(new Date(day));
                            if (!inCurrentMonth) {
                              setCalendarViewDate(
                                new Date(day.getFullYear(), day.getMonth(), 1),
                              );
                            }
                          }}
                          className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition ${
                            selected
                              ? "bg-violet-700 text-white shadow-md shadow-violet-700/25"
                              : todayDay
                                ? "ring-1 ring-violet-400 text-violet-700 hover:bg-violet-50 dark:text-violet-200"
                                : inCurrentMonth
                                  ? "text-slate-700 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-200 dark:hover:bg-violet-500/10"
                                  : "text-slate-300 hover:bg-slate-50 dark:text-slate-600 dark:hover:bg-slate-800"
                          }`}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        const currentToday = new Date();
                        setCalendarDraftDate(currentToday);
                        setCalendarViewDate(
                          new Date(
                            currentToday.getFullYear(),
                            currentToday.getMonth(),
                            1,
                          ),
                        );
                      }}
                      className="px-2 py-2 text-xs font-bold uppercase tracking-wide text-violet-700 transition hover:text-violet-900 dark:text-violet-300"
                    >
                      Hoje
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={closeCalendar}
                        className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide text-violet-700 transition hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={confirmCalendarDate}
                        className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide text-violet-700 transition hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
