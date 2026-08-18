/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { KitVendaOption, ProdutoVendaOption } from "@/lib/vendas.types";

import AgendaCalendar, { type NovoHorarioPayload } from "./AgendaCalendar";
import AppointmentDetailsModal, {
  type AppointmentDetails,
  type ClienteAtendimentoDetalhes,
} from "./AppointmentDetailsModal";
import AppointmentMessageModal from "./AppointmentMessageModal";
import FinalizarAtendimentoModal, {
  type AtendimentoFinalizadoPayload,
  type FormaPagamentoFinalizacao,
} from "./FinalizarAtendimentoModal";
import NovoAgendamentoModal from "./NovoAgendamentoModal";

type ClienteAgenda = {
  id: number;
  nome: string;
  telefone: string;
  whatsapp: string | null;
  areaEstetica: boolean;
  areaCilios: boolean;
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
  custoPadrao: number;
};

type AgendamentoAgenda = AppointmentDetails;

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

type NovoAgendamentoPayload = NovoHorarioPayload & {
  agendamentoId?: number;
  bloqueioId?: number;
  modo?: "novo" | "retorno" | "edicao" | "edicao_bloqueio";
  tipoAtendimento?: "agendamento" | "bloqueio";
  motivoBloqueio?: string;
  serieId?: string | null;
  recorrenciaTipo?: string | null;
  recorrenciaIndice?: number | null;
  recorrenciaTotal?: number | null;
  clienteId?: number;
  procedimento?: string;
  duracao?: number;
  valor?: number;
  status?: string;
  observacoes?: string;
  sinalPago?: boolean;
  naturezaAtendimento?: "PROCEDIMENTO" | "RETORNO";
  agendamentoOrigemId?: number | null;
};

type Props = {
  clientes: ClienteAgenda[];
  agendamentos: AgendamentoAgenda[];
  bloqueios: BloqueioAgenda[];
  profissionais: ProfissionalAgenda[];
  origensCliente: OrigemClienteAgenda[];
  servicos: ServicoAgenda[];
  produtos: ProdutoVendaOption[];
  kits: KitVendaOption[];
  formasPagamento: FormaPagamentoFinalizacao[];
  podeAutorizarEstoqueNegativo: boolean;
  areaPadraoAgendamento: "estetica" | "cilios" | null;
  initialDate: string;
  initialProfissionalFiltro: string;
  initialClienteId?: string | null;
  initialAgendamentoId?: string | null;
  initialView: "day" | "week";
  horarioAtendimento?: string | null;
  podeEditarCliente: boolean;
  podeRegistrarEvolucao: boolean;
  driveConfigurado?: boolean;
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

function toSaoPauloDateInput(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(new Date(value));

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) return "";

  return `${year}-${month}-${day}`;
}

function toTimeInput(value: Date | string) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).formatToParts(new Date(value));

  const hour = parts.find((part) => part.type === "hour")?.value || "00";
  const minute = parts.find((part) => part.type === "minute")?.value || "00";

  return `${hour}:${minute}`;
}

function formatarDataCurta(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default function AgendaClient({
  clientes,
  agendamentos,
  bloqueios,
  profissionais,
  origensCliente,
  servicos,
  produtos,
  kits,
  formasPagamento,
  podeAutorizarEstoqueNegativo,
  areaPadraoAgendamento,
  initialDate,
  initialProfissionalFiltro,
  initialClienteId,
  initialAgendamentoId,
  initialView,
  horarioAtendimento,
  podeEditarCliente,
  podeRegistrarEvolucao,
  driveConfigurado,
}: Props) {
  const [selectedDate, setSelectedDate] = useState(() =>
    parseLocalDate(initialDate),
  );

  const [profissionalFiltro, setProfissionalFiltro] = useState(
    initialProfissionalFiltro || "todas",
  );

  const [novoHorario, setNovoHorario] =
    useState<NovoAgendamentoPayload | null>(() =>
      initialClienteId
        ? {
            clienteId: Number(initialClienteId),
            data: initialDate,
            hora: "09:00",
            status: "Agendado",
          }
        : null,
    );

  const [agendamentosAtuais, setAgendamentosAtuais] =
    useState<AgendamentoAgenda[]>(agendamentos);

  useEffect(() => {
    setAgendamentosAtuais(agendamentos);
  }, [agendamentos]);

  const [selectedAppointment, setSelectedAppointment] =
    useState<AgendamentoAgenda | null>(null);

  const [messageAppointment, setMessageAppointment] =
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
    const view = initialView === "week" ? "&view=week" : "";

    window.history.replaceState(
      null,
      "",
      `/agenda?data=${dataAtual}${profissional}${view}`,
    );
  }

  function abrirNovoHorario(payload: NovoHorarioPayload) {
    setNovoHorario({
      ...payload,
      modo: "novo",
      tipoAtendimento: "agendamento",
    });
  }

  function abrirEdicaoBloqueio(bloqueio: BloqueioAgenda) {
    setNovoHorario({
      bloqueioId: bloqueio.id,
      modo: "edicao_bloqueio",
      tipoAtendimento: "bloqueio",
      data: toSaoPauloDateInput(bloqueio.data),
      hora: toTimeInput(bloqueio.data),
      profissionalId: bloqueio.profissionalId,
      duracao: bloqueio.duracao || 60,
      motivoBloqueio: bloqueio.motivo,
      serieId: bloqueio.serieId,
      recorrenciaTipo: bloqueio.recorrenciaTipo,
      recorrenciaIndice: bloqueio.recorrenciaIndice,
      recorrenciaTotal: bloqueio.recorrenciaTotal,
      observacoes: bloqueio.observacoes || "",
    });
  }

  function abrirWhatsApp(appointment: AgendamentoAgenda) {
    setSelectedAppointment(null);
    setMessageAppointment(appointment);
  }

  function abrirEdicao(appointment: AgendamentoAgenda) {
    setSelectedAppointment(null);

    setNovoHorario({
      agendamentoId: appointment.id,
      modo: "edicao",
      data: toSaoPauloDateInput(appointment.data),
      hora: toTimeInput(appointment.data),
      profissionalId: appointment.profissionalId || undefined,
      clienteId: appointment.clienteId,
      procedimento: appointment.procedimento,
      duracao: appointment.duracao || 60,
      valor: appointment.valor || 0,
      status: appointment.status,
      sinalPago: appointment.sinalPago,
      naturezaAtendimento: appointment.naturezaAtendimento,
      agendamentoOrigemId: appointment.agendamentoOrigemId,
      serieId: appointment.serieId,
      recorrenciaTipo: appointment.recorrenciaTipo,
      recorrenciaIndice: appointment.recorrenciaIndice,
      recorrenciaTotal: appointment.recorrenciaTotal,
      observacoes: appointment.observacoes || "",
    });
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
      modo: "retorno",
      data: toSaoPauloDateInput(dataRetorno),
      hora: toTimeInput(dataBase),
      profissionalId: appointment.profissionalId || undefined,
      clienteId: appointment.clienteId,
      procedimento: appointment.procedimento,
      duracao: appointment.duracao || 60,
      valor: 0,
      status: "Agendado",
      sinalPago: false,
      naturezaAtendimento: "RETORNO",
      agendamentoOrigemId: appointment.id,
      observacoes: `Retorno referente ao atendimento de ${formatarDataCurta(
        appointment.data,
      )}.`,
    });
  }

  function atualizarClienteNoFluxo(cliente: ClienteAtendimentoDetalhes) {
    setAgendamentosAtuais((atuais) =>
      atuais.map((item) =>
        item.clienteId === cliente.id
          ? { ...item, cliente: { ...item.cliente, ...cliente } }
          : item,
      ),
    );

    setSelectedAppointment((atual) =>
      atual && atual.clienteId === cliente.id
        ? { ...atual, cliente: { ...atual.cliente, ...cliente } }
        : atual,
    );
  }

  function marcarEvolucaoConcluida(agendamentoId: number) {
    const atualizado = {
      evolucaoStatus: "CONCLUIDA",
      evolucaoPendenteDesde: null,
      evolucaoRegistradaEm: new Date().toISOString(),
    };

    setAgendamentosAtuais((atuais) =>
      atuais.map((item) =>
        item.id === agendamentoId ? { ...item, ...atualizado } : item,
      ),
    );

    setSelectedAppointment((atual) =>
      atual?.id === agendamentoId ? { ...atual, ...atualizado } : atual,
    );
  }

  function marcarAtendimentoFinalizado(payload: AtendimentoFinalizadoPayload) {
    const atualizado = {
      status: "Atendido",
      statusAntesAtendimento: null,
      procedimento: payload.procedimento,
      valor: payload.valor,
      evolucaoStatus: payload.evolucaoRegistrada ? "CONCLUIDA" : "PENDENTE",
      evolucaoPendenteDesde: payload.evolucaoRegistrada
        ? null
        : payload.dataAtendimento,
      evolucaoRegistradaEm: payload.evolucaoRegistrada
        ? payload.dataAtendimento
        : null,
      updatedAt: payload.dataAtendimento,
    };

    setAgendamentosAtuais((atuais) =>
      atuais.map((item) =>
        item.id === payload.agendamentoId ? { ...item, ...atualizado } : item,
      ),
    );

    setSelectedAppointment((atual) =>
      atual?.id === payload.agendamentoId
        ? { ...atual, ...atualizado }
        : atual,
    );

  }

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-6 lg:overflow-visible lg:pb-0">
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
                  Cadastre uma profissional ativa nas configurações para a
                  agenda exibir os horários.
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
            agendamentos={agendamentosAtuais}
            focusAgendamentoId={initialAgendamentoId}
            bloqueios={bloqueios}
            onNovoHorario={abrirNovoHorario}
            onSelectAppointment={setSelectedAppointment}
            onSelectBlock={abrirEdicaoBloqueio}
            onMessage={abrirWhatsApp}
            horarioAtendimento={horarioAtendimento}
            viewMode={initialView}
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
        areaPadraoAgendamento={areaPadraoAgendamento}
        initialPayload={novoHorario}
      />

      <AppointmentDetailsModal
        open={Boolean(selectedAppointment)}
        appointment={selectedAppointment}
        podeEditarCliente={podeEditarCliente}
        podeRegistrarEvolucao={podeRegistrarEvolucao}
        onClose={() => setSelectedAppointment(null)}
        onWhatsApp={abrirWhatsApp}
        onEditar={abrirEdicao}
        onFinalizar={abrirFinalizacao}
        onReagendar={abrirReagendamento}
        onClienteUpdated={atualizarClienteNoFluxo}
        onEvolucaoRegistrada={marcarEvolucaoConcluida}
      />

      <AppointmentMessageModal
        open={Boolean(messageAppointment)}
        appointment={messageAppointment}
        onClose={() => setMessageAppointment(null)}
      />

      <FinalizarAtendimentoModal
        open={Boolean(finishAppointment)}
        appointment={finishAppointment}
        servicos={servicos}
        produtos={produtos}
        kits={kits}
        formasPagamento={formasPagamento}
        podeAutorizarEstoqueNegativo={podeAutorizarEstoqueNegativo}
        driveConfigurado={driveConfigurado}
        onClose={() => setFinishAppointment(null)}
        onAgendarRetorno={abrirReagendamento}
        onFinalizado={marcarAtendimentoFinalizado}
      />
    </div>
  );
}