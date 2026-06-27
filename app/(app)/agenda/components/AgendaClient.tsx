"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  CalendarClock,
  CircleDollarSign,
  MessageCircle,
  Plus,
  UsersRound,
} from "lucide-react";

import AgendaCalendar, { type NovoHorarioPayload } from "./AgendaCalendar";
import AgendaHeader from "./AgendaHeader";
import AppointmentDetailsModal from "./AppointmentDetailsModal";
import AppointmentMessageModal from "./AppointmentMessageModal";
import FinalizarAtendimentoModal from "./FinalizarAtendimentoModal";
import NovoAgendamentoModal from "./NovoAgendamentoModal";

type ClienteAgenda = {
  id: number;
  nome: string;
  telefone: string;
  whatsapp: string | null;
};

type ProfissionalAgenda = {
  id: number;
  nome: string;
  area: string | null;
  cor: string;
  status: string;
};

type OpcaoAuxiliar = {
  id: number;
  nome: string;
};

type ServicoAgenda = {
  id: number;
  nome: string;
  categoria: string | null;
  duracaoPadrao: number;
  valorPadrao: number;
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


type MensagemAgendamento = {
  id: number;
  procedimento: string;
  data: Date | string;
  cliente: {
    nome: string;
    telefone?: string | null;
    whatsapp?: string | null;
  };
};
type FinalizarAgendamento = {
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
  profissional: {
    nome: string;
    area: string | null;
  } | null;
};


type Props = {
  clientes: ClienteAgenda[];
  agendamentos: AgendamentoAgenda[];
  profissionais: ProfissionalAgenda[];
  origensCliente: OpcaoAuxiliar[];
  servicos: ServicoAgenda[];
  initialSelectedDate?: string;
  initialProfissionalFiltro?: string;
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(first: Date, second: Date) {
  return startOfDay(first).getTime() === startOfDay(second).getTime();
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function AgendaClient({
  clientes,
  agendamentos,
  profissionais,
  origensCliente,
  servicos,
  initialSelectedDate,
  initialProfissionalFiltro = "todas",
}: Props) {
  const [selectedDate, setSelectedDate] = useState(() => {
    if (!initialSelectedDate) return new Date();
    const [year, month, day] = initialSelectedDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  });
  const [profissionalFiltro, setProfissionalFiltro] = useState(initialProfissionalFiltro);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalPayload, setModalPayload] = useState<NovoHorarioPayload | null>(null);
  const [detailsAppointment, setDetailsAppointment] =
    useState<AgendamentoAgenda | null>(null);
  const [messageAppointment, setMessageAppointment] =
    useState<MensagemAgendamento | null>(null);
  const [finishAppointment, setFinishAppointment] =
    useState<FinalizarAgendamento | null>(null);

  const profissionaisVisiveis = useMemo(() => {
    if (profissionalFiltro === "todas") return profissionais;

    return profissionais.filter(
      (profissional) => profissional.id === Number(profissionalFiltro)
    );
  }, [profissionalFiltro, profissionais]);

  const agendamentosFiltrados = useMemo(() => {
    return agendamentos.filter((appointment) => {
      const mesmaData = isSameDay(new Date(appointment.data), selectedDate);
      const mesmoProfissional =
        profissionalFiltro === "todas" ||
        appointment.profissionalId === Number(profissionalFiltro);

      return mesmaData && mesmoProfissional;
    });
  }, [agendamentos, profissionalFiltro, selectedDate]);

  const metrics = useMemo(() => {
    const today = new Date();
    const todaysAppointments = agendamentos.filter((appointment) =>
      isSameDay(new Date(appointment.data), today)
    );
    const selectedDayAppointments = agendamentos.filter((appointment) =>
      isSameDay(new Date(appointment.data), selectedDate)
    );
    const confirmed = selectedDayAppointments.filter(
      (appointment) => appointment.status === "Confirmado"
    ).length;
    const uniqueClients = new Set(
      selectedDayAppointments.map((appointment) => appointment.cliente.nome)
    );
    const expectedRevenue = selectedDayAppointments.reduce(
      (total, appointment) => total + (appointment.valor || 0),
      0
    );

    return [
      {
        label: "Hoje",
        value: todaysAppointments.length,
        detail: "atendimentos no dia atual",
        icon: CalendarCheck,
      },
      {
        label: "Selecionado",
        value: selectedDayAppointments.length,
        detail: "horários preenchidos",
        icon: CalendarClock,
      },
      {
        label: "Clientes",
        value: uniqueClients.size,
        detail: "pessoas no dia",
        icon: UsersRound,
      },
      {
        label: "Receita prevista",
        value: expectedRevenue.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
        detail: `${confirmed} confirmados`,
        icon: CircleDollarSign,
      },
    ];
  }, [agendamentos, selectedDate]);

  function abrirNovoAgendamento(payload?: NovoHorarioPayload) {
    const primeiroProfissionalId = profissionais[0]?.id;

    setModalPayload(
      payload ?? {
        data: formatDateInput(selectedDate),
        hora: "09:00",
        profissionalId:
          profissionalFiltro !== "todas"
            ? Number(profissionalFiltro)
            : primeiroProfissionalId,
      }
    );
    setModalAberto(true);
  }

  return (
    <>
      <div className="app-mobile-safe space-y-3 lg:space-y-5">
        <AgendaHeader />

        <section className="mobile-safe-card rounded-3xl border border-white/[0.08] bg-white/[0.04] p-3 shadow-lg shadow-black/10 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Agenda
              </p>
              <h1 className="truncate text-base font-semibold text-white">
                Painel do dia
              </h1>
            </div>

            <a
              href={`/agenda/novo?data=${formatDateInput(selectedDate)}${profissionalFiltro !== "todas" ? `&profissionalId=${profissionalFiltro}` : ""}`}
              data-mobile-action="true"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 text-xs font-semibold text-white shadow-lg shadow-violet-950/25 active:scale-[0.98]"
            >
              <Plus size={13} />
              Novo
            </a>
          </div>
        </section>

        <section className="hidden gap-3 lg:grid lg:grid-cols-[1.15fr_repeat(3,minmax(0,1fr))]">
          <div className="premium-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Visão do dia
                </p>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  Agenda organizada para operação rápida
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Clique em um horário para agendar e toque em um atendimento para abrir a ficha do cliente, WhatsApp e anamnese.
                </p>
              </div>
              <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-3 text-violet-200">
                <MessageCircle size={18} />
              </div>
            </div>
          </div>

          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <div key={metric.label} className="premium-card-soft p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                      {metric.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-3 text-violet-200">
                    <Icon size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <AgendaCalendar
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          profissionalFiltro={profissionalFiltro}
          onProfissionalFiltroChange={setProfissionalFiltro}
          profissionais={profissionaisVisiveis}
          todosProfissionais={profissionais}
          agendamentos={agendamentosFiltrados}
          onNovoHorario={abrirNovoAgendamento}
          onSelectAppointment={setDetailsAppointment}
          onMessage={setMessageAppointment}
        />
      </div>

      {modalAberto ? (
        <NovoAgendamentoModal
          open={modalAberto}
          onClose={() => setModalAberto(false)}
          clientes={clientes}
          profissionais={profissionais}
          origensCliente={origensCliente}
          servicos={servicos}
          initialPayload={modalPayload}
        />
      ) : null}

      <AppointmentDetailsModal
        open={Boolean(detailsAppointment)}
        appointment={detailsAppointment}
        onClose={() => setDetailsAppointment(null)}
        onWhatsApp={(appointment) => {
          setDetailsAppointment(null);
          setMessageAppointment(appointment);
        }}
        onFinalizar={(appointment) => {
          setDetailsAppointment(null);
          setFinishAppointment(appointment);
        }}
      />

      <AppointmentMessageModal
        open={Boolean(messageAppointment)}
        appointment={messageAppointment}
        onClose={() => setMessageAppointment(null)}
      />

      <FinalizarAtendimentoModal
        open={Boolean(finishAppointment)}
        appointment={finishAppointment}
        onClose={() => setFinishAppointment(null)}
      />
    </>
  );
}
