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

export default function AgendaClient({
  clientes,
  agendamentos,
  profissionais,
  origensCliente,
  servicos,
  initialDate,
  initialProfissionalFiltro,
}: Props) {
  const [selectedDate, setSelectedDate] = useState(() => parseLocalDate(initialDate));
  const [profissionalFiltro, setProfissionalFiltro] = useState(initialProfissionalFiltro || "todas");
  const [novoHorario, setNovoHorario] = useState<NovoHorarioPayload | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AgendamentoAgenda | null>(null);
  const [finishAppointment, setFinishAppointment] = useState<AgendamentoAgenda | null>(null);

  const profissionaisVisiveis = useMemo(() => {
    if (profissionalFiltro === "todas") return profissionais;

    return profissionais.filter((profissional) => String(profissional.id) === String(profissionalFiltro));
  }, [profissionais, profissionalFiltro]);

  function handleDateChange(date: Date) {
    setSelectedDate(date);
  }

  function handleProfissionalFiltroChange(value: string) {
    setProfissionalFiltro(value);

    const data = value !== "todas" ? `&profissional=${value}` : "";
    window.history.replaceState(null, "", `/agenda?data=${initialDate}${data}`);
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
      })
    );

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function abrirFinalizacao(appointment: AgendamentoAgenda) {
    setSelectedAppointment(null);
    setFinishAppointment(appointment);
  }

  return (
    <div className="space-y-4 lg:space-y-8">
      <AgendaHeader />

      {profissionais.length === 0 ? (
        <section className="premium-card p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-100">
                <CalendarDays size={14} />
                Agenda
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                Nenhuma profissional ativa cadastrada
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Cadastre uma profissional ativa nas configurações para a agenda exibir os horários.
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
      />

      <FinalizarAtendimentoModal
        open={Boolean(finishAppointment)}
        appointment={finishAppointment}
        onClose={() => setFinishAppointment(null)}
      />
    </div>
  );
}
