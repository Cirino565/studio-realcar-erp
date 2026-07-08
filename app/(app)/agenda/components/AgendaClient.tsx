"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

import AgendaCalendar, { type NovoHorarioPayload } from "./AgendaCalendar";
import AgendaHeader from "./AgendaHeader";
import AppointmentDetailsModal from "./AppointmentDetailsModal";
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

type OrigemClienteAgenda = {
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

type NovoAgendamentoPayload = NovoHorarioPayload & {
  clienteId?: number;
  procedimento?: string;
  duracao?: number;
  valor?: number;
  status?: string;
  observacoes?: string;
};

type Props = {
  clientes: ClienteAgenda[];
  agendamentos: AgendamentoAgenda[];
  profissionais: ProfissionalAgenda[];
  origensCliente: OrigemClienteAgenda[];
  servicos: ServicoAgenda[];
  initialDate: string;
  initialProfissionalFiltro: string;
};

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toTimeInput(value: Date | string) {
  const date = new Date(value);
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${hour}:${minute}`;
}

function formatarDataCurta(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function AgendaClient({
  clientes,
  agendamentos,
  profissionais,
  origensCliente,
  servicos,
  initialDate,
  initialProfissionalFiltro,
}: Props) {
  const [selectedDate, setSelectedDate] = useState(() =>
    parseLocalDate(initialDate),
  );

  const [profissionalFiltro, setProfissionalFiltro] = useState(
    initialProfissionalFiltro || "todas",
  );

  const [novoHorario, setNovoHorario] =
    useState<NovoAgendamentoPayload | null>(null);

  const [selectedAppointment, setSelectedAppointment] =
    useState<AgendamentoAgenda | null>(null);

  const [finishAppointment, setFinishAppointment] =
    useState<AgendamentoAgenda | null>(null);

  const profissionaisVisiveis = useMemo(() => {
    if (profissionalFiltro === "todas") {
      return profissionais;
    }

    return profissionais.filter(
      (profissional) => String(profissional.id) === String(profissionalFiltro),
    );
  }, [profissionais, profissionalFiltro]);

  function handleDateChange(date: Date) {
    setSelectedDate(date);
  }

  function handleProfissionalFiltroChange(value: string) {
    setProfissionalFiltro(value);

    const dataAtual = toDateInput(selectedDate);
    const profissional = value !== "todas" ? `&profissional=${value}` : "";

    window.history.replaceState(
      null,
      "",
      `/agenda?data=${dataAtual}${profissional}`,
    );
  }

  function abrirNovoHorario(payload: NovoHorarioPayload) {
    setNovoHorario(payload);
  }

  function abrirWhatsApp(appointment: AgendamentoAgenda) {
    const url = buildWhatsAppUrl(
      appointment.cliente.whatsapp || appointment.cliente.telefone,
      buildWhatsAppMessage({
        template: "confirmation",
        clientName: appointment.cliente.nome,
        procedure: appointment.procedimento,
        appointmentDate: appointment.data,
      }),
    );

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function abrirFinalizacao(appointment: AgendamentoAgenda) {
    setSelectedAppointment(null);
    setFinishAppointment(appointment);
  }

  function abrirReagendamento(appointment: AgendamentoAgenda) {
    const dataBase = new Date(appointment.data);
    const dataRetorno = new Date(dataBase);

    dataRetorno.setDate(dataRetorno.getDate() + 30);

    setSelectedAppointment(null);
    setFinishAppointment(null);

    setNovoHorario({
      data: toDateInput(dataRetorno),
      hora: toTimeInput(dataBase),
      profissionalId: appointment.profissionalId || undefined,
      clienteId: appointment.clienteId,
      procedimento: `Retorno - ${appointment.procedimento}`,
      duracao: appointment.duracao || 60,
      valor: 0,
      status: "Agendado",
      observacoes: `Retorno referente ao atendimento de ${formatarDataCurta(
        appointment.data,
      )}.`,
    });
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-6 lg:space-y-8 lg:overflow-visible lg:pb-0">
      <div className="hidden lg:block">
        <AgendaHeader />
      </div>

      <div className="w-full max-w-full min-w-0">
        {profissionais.length === 0 ? (
          <section className="premium-card mx-0 p-4 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-100">
                  <CalendarDays size={14} />
                  Agenda
                </div>

                <h1 className="mt-4 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Nenhuma profissional ativa cadastrada
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Cadastre uma profissional ativa nas configurações para a agenda
                  exibir os horários.
                </p>
              </div>

              <Button asChild className="w-full sm:w-auto">
                <a href="/agenda/novo">
                  <Plus size={16} />
                  Novo agendamento
                </a>
              </Button>
            </div>
          </section>
        ) : (
          <AgendaCalendar
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
            profissionalFiltro={profissionalFiltro}
            onProfissionalFiltroChange={handleProfissionalFiltroChange}
            profissionais={profissionaisVisiveis}
            todosProfissionais={profissionais}
            agendamentos={agendamentos}
            onNovoHorario={abrirNovoHorario}
            onSelectAppointment={setSelectedAppointment}
            onMessage={abrirWhatsApp}
          />
        )}
      </div>

      <NovoAgendamentoModal
        open={Boolean(novoHorario)}
        onClose={() => setNovoHorario(null)}
        clientes={clientes}
        profissionais={profissionais}
        origensCliente={origensCliente}
        servicos={servicos}
        initialPayload={novoHorario}
      />

      <AppointmentDetailsModal
        open={Boolean(selectedAppointment)}
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onWhatsApp={abrirWhatsApp}
        onFinalizar={abrirFinalizacao}
        onReagendar={abrirReagendamento}
      />

      <FinalizarAtendimentoModal
        open={Boolean(finishAppointment)}
        appointment={finishAppointment}
        onClose={() => setFinishAppointment(null)}
        onAgendarRetorno={abrirReagendamento}
      />
    </div>
  );
}