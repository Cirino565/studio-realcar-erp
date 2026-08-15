/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  MessageCircle,
  Pencil,
  Phone,
  Repeat2,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  cancelarSerieAgendamento,
  excluirAgendamento,
} from "@/actions/agendamento.actions";
import RegistrarEvolucaoPendenteModal from "@/components/atendimento/RegistrarEvolucaoPendenteModal";
import { Button } from "@/components/ui/button";
import {
  getReadableTextColor,
  normalizeAgendaColor,
  withAlpha,
} from "@/lib/color-contrast";

import AnamneseAtendimentoModal from "./AnamneseAtendimentoModal";
import ClienteQuickEditModal from "./ClienteQuickEditModal";

export type ClienteAtendimentoDetalhes = {
  id: number;
  nome: string;
  telefone: string;
  whatsapp: string | null;
  cpf: string | null;
  nascimento: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  enderecoOriginal: string | null;
  observacoes: string | null;
};

export type AppointmentDetails = {
  id: number;
  clienteId: number;
  profissionalId: number | null;
  procedimento: string;
  data: string;
  duracao: number;
  valor: number;
  observacoes: string | null;
  sinalPago: boolean;
  naturezaAtendimento?: "PROCEDIMENTO" | "RETORNO";
  agendamentoOrigemId?: number | null;
  status: string;
  statusAntesAtendimento?: string | null;
  evolucaoStatus?: string | null;
  evolucaoPendenteDesde?: string | null;
  evolucaoRegistradaEm?: string | null;
  evolucaoRegistradaPor?: string | null;
  serieId?: string | null;
  recorrenciaTipo?: string | null;
  recorrenciaIntervalo?: number | null;
  recorrenciaIndice?: number | null;
  recorrenciaTotal?: number | null;
  createdAt?: string;
  updatedAt?: string;
  cliente: ClienteAtendimentoDetalhes;
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
  podeEditarCliente: boolean;
  podeRegistrarEvolucao: boolean;
  onClose: () => void;
  onWhatsApp: (appointment: AppointmentDetails) => void;
  onEditar: (appointment: AppointmentDetails) => void;
  onFinalizar: (appointment: AppointmentDetails) => void;
  onReagendar: (appointment: AppointmentDetails) => void;
  onClienteUpdated: (cliente: ClienteAtendimentoDetalhes) => void;
  onEvolucaoRegistrada: (agendamentoId: number) => void;
};

function useLockBodyScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);
}

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function addMinutes(value: Date | string, minutes: number) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  return date;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CL";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function statusClass(status: string) {
  if (status === "Confirmado") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Em atendimento") return "border-cyan-200 bg-cyan-50 text-cyan-700";
  if (status === "Atendido") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "Faltou") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "Cancelado") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-violet-200 bg-violet-50 text-violet-700";
}

function cadastroPendente(cliente: ClienteAtendimentoDetalhes) {
  const pendencias: string[] = [];
  if (!cliente.nascimento) pendencias.push("nascimento");
  if (!cliente.cpf) pendencias.push("CPF");
  if (!cliente.cep || !cliente.logradouro || !cliente.cidade || !cliente.estado) {
    pendencias.push("endereço");
  }
  return pendencias;
}

export default function AppointmentDetailsModal({
  open,
  appointment,
  podeEditarCliente,
  podeRegistrarEvolucao,
  onClose,
  onWhatsApp,
  onEditar,
  onFinalizar,
  onReagendar,
  onClienteUpdated,
  onEvolucaoRegistrada,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isManagingSeries, setIsManagingSeries] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [abrindoAnamnese, setAbrindoAnamnese] = useState(false);
  const [registrandoEvolucao, setRegistrandoEvolucao] = useState(false);

  useLockBodyScroll(open);

  useEffect(() => {
    setError(null);
    setIsDeleting(false);
    setIsManagingSeries(false);
    setEditandoCliente(false);
    setAbrindoAnamnese(false);
    setRegistrandoEvolucao(false);
  }, [open, appointment?.id]);

  if (!open || !appointment) return null;

  const currentAppointment = appointment;
  const professionalColor = normalizeAgendaColor(
    currentAppointment.profissional?.cor,
    "#7c3aed",
  );
  const professionalTextColor = getReadableTextColor(professionalColor);
  const endDate = addMinutes(currentAppointment.data, currentAppointment.duracao);
  const phone =
    currentAppointment.cliente.whatsapp ||
    currentAppointment.cliente.telefone ||
    "Não informado";

  const atendimentoFinalizado = currentAppointment.status === "Atendido";
  const atendimentoCancelado = currentAppointment.status === "Cancelado";
  const atendimentoEmAndamento = currentAppointment.status === "Em atendimento";
  const evolucaoPendente = currentAppointment.evolucaoStatus === "PENDENTE";
  const pendenciasCadastro = cadastroPendente(currentAppointment.cliente);
  const podeGerenciarAgendamento = !atendimentoFinalizado && !atendimentoEmAndamento;


  async function handleExcluir() {
    setError(null);

    if (!podeGerenciarAgendamento) {
      setError("Atendimentos em andamento ou finalizados não podem ser excluídos diretamente.");
      return;
    }

    if (!window.confirm(`Excluir o agendamento de ${currentAppointment.cliente.nome}?`)) return;

    setIsDeleting(true);

    try {
      await excluirAgendamento(currentAppointment.id);
      onClose();
      window.location.reload();
    } catch (error) {
      setIsDeleting(false);
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o agendamento.",
      );
    }
  }

  async function handleCancelarSerie(escopo: "seguintes" | "toda") {
    setError(null);
    if (!currentAppointment.serieId) return;

    const mensagem =
      escopo === "toda"
        ? "Cancelar todos os agendamentos pendentes desta série?"
        : "Cancelar este agendamento e as próximas ocorrências pendentes?";

    if (!window.confirm(mensagem)) return;

    setIsManagingSeries(true);

    try {
      await cancelarSerieAgendamento({ id: currentAppointment.id, escopo });
      onClose();
      window.location.reload();
    } catch (error) {
      setIsManagingSeries(false);
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a série recorrente.",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-[100] h-[100dvh] overflow-hidden">
      <button
        type="button"
        aria-label="Fechar detalhes do atendimento"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-details-title"
        className="absolute inset-y-0 right-0 flex h-[100dvh] w-full max-w-[560px] flex-col overflow-hidden border-l border-slate-200 bg-slate-50 shadow-2xl shadow-slate-950/20 lg:inset-y-auto lg:right-4 lg:top-1/2 lg:h-auto lg:max-h-[88vh] lg:-translate-y-1/2 lg:rounded-3xl lg:border"
      >
        <header className="relative shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-xs font-bold text-white shadow-sm">
                {getInitials(currentAppointment.cliente.nome)}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass(currentAppointment.status)}`}>
                    {currentAppointment.status}
                  </span>
                  {currentAppointment.naturezaAtendimento === "RETORNO" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700">
                      <CalendarClock size={11} /> Retorno
                    </span>
                  ) : null}
                  {currentAppointment.sinalPago ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                      <BadgeCheck size={11} /> Sinal pago
                    </span>
                  ) : null}
                  {evolucaoPendente ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      <AlertTriangle size={11} /> Evolução pendente
                    </span>
                  ) : null}
                </div>
                <h2 id="appointment-details-title" className="mt-1 truncate text-base font-bold text-slate-950">
                  {currentAppointment.cliente.nome}
                </h2>
                <p className="truncate text-xs text-slate-500">{currentAppointment.procedimento}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Fechar"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4">
          <div className="space-y-3">
            {error ? (
              <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => podeEditarCliente && setEditandoCliente(true)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40 disabled:cursor-default"
              disabled={!podeEditarCliente}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <UserRound size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">1. Cliente</p>
                    {podeEditarCliente ? <ChevronRight size={16} className="text-slate-400" /> : null}
                  </div>
                  <p className="mt-0.5 truncate text-sm font-bold text-slate-950">{currentAppointment.cliente.nome}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Phone size={12} />{phone}</p>
                  {pendenciasCadastro.length > 0 ? (
                    <p className="mt-2 text-[11px] font-semibold text-amber-700">
                      Completar: {pendenciasCadastro.join(", ")}
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] font-semibold text-emerald-700">Cadastro essencial completo</p>
                  )}
                </div>
              </div>
            </button>

            {/* Atalho para a ficha completa: o bloco acima abre so a edicao
                rapida, entao sem isso nao havia como ver o historico da
                cliente sem sair da agenda e procurar na lista. */}
            <Link
              href={`/clientes/${currentAppointment.cliente.id}`}
              className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/40 hover:text-violet-800"
            >
              <span className="flex items-center gap-2">
                <ExternalLink size={16} />
                Ver ficha e histórico
              </span>
              <ChevronRight size={16} className="text-slate-400" />
            </Link>

            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setAbrindoAnamnese(true)}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-bold text-violet-800 hover:bg-violet-100"
                >
                  <span className="flex items-center gap-2"><ClipboardList size={17} />2. Abrir anamnese</span>
                  <span className="text-[10px] font-semibold text-violet-600">abre sobre o atendimento</span>
                </button>

                {!atendimentoFinalizado && !atendimentoCancelado ? (
                  <button
                    type="button"
                    onClick={() => onFinalizar(currentAppointment)}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2"><CheckCircle2 size={17} />3. Finalizar atendimento</span>
                    <ChevronRight size={16} />
                  </button>
                ) : null}

                {atendimentoFinalizado ? (
                  <div className={`rounded-xl border p-3 ${evolucaoPendente ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-xs font-bold ${evolucaoPendente ? "text-amber-900" : "text-emerald-900"}`}>
                          3. Evolução clínica
                        </p>
                        <p className={`mt-1 text-[11px] ${evolucaoPendente ? "text-amber-700" : "text-emerald-700"}`}>
                          {evolucaoPendente
                            ? "Atendimento encerrado. O registro clínico ainda precisa ser concluído."
                            : "Evolução registrada para este atendimento."}
                        </p>
                      </div>
                      {evolucaoPendente ? <AlertTriangle size={18} className="shrink-0 text-amber-700" /> : <CheckCircle2 size={18} className="shrink-0 text-emerald-700" />}
                    </div>
                    {evolucaoPendente ? (
                      <button
                        type="button"
                        onClick={() => setRegistrandoEvolucao(true)}
                        disabled={!podeRegistrarEvolucao}
                        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-3 text-xs font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                      >
                        <Activity size={15} /> {podeRegistrarEvolucao ? "Registrar evolução agora" : "Sem permissão clínica"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Data e horário</p>
                  <p className="mt-1 text-sm font-bold capitalize text-slate-900">{formatDateTime(currentAppointment.data)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatTime(currentAppointment.data)} até {formatTime(endDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {currentAppointment.naturezaAtendimento === "RETORNO"
                      ? "Retorno do procedimento"
                      : "Procedimento"}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{currentAppointment.procedimento}</p>
                  <p className="mt-0.5 text-xs font-bold text-violet-700">
                    {currentAppointment.naturezaAtendimento === "RETORNO"
                      ? "Sem cobrança"
                      : formatCurrency(currentAppointment.valor)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    backgroundColor: professionalColor,
                    borderColor: withAlpha(professionalColor, 0.36),
                    color: professionalTextColor,
                  }}
                >
                  <UserRound size={16} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{currentAppointment.profissional?.nome || "Não definida"}</p>
                  <p className="truncate text-xs text-slate-500">{currentAppointment.profissional?.area || "Área não informada"}</p>
                </div>
              </div>
            </section>

            {currentAppointment.observacoes ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Observações do agendamento</p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5 text-amber-900">{currentAppointment.observacoes}</p>
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Ações complementares</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => onWhatsApp(currentAppointment)} className="h-10 rounded-xl border-emerald-200 text-xs text-emerald-700 hover:bg-emerald-50">
                  <MessageCircle size={15} /> Mensagem
                </Button>
                <Button type="button" variant="outline" onClick={() => onReagendar(currentAppointment)} className="h-10 rounded-xl border-slate-200 text-xs text-slate-700 hover:bg-slate-50">
                  <CalendarClock size={15} /> Retorno
                </Button>
                <Button type="button" variant="outline" onClick={() => onEditar(currentAppointment)} disabled={!podeGerenciarAgendamento || isDeleting} className="h-10 rounded-xl border-slate-200 text-xs text-slate-700 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50">
                  <Pencil size={15} /> Editar agenda
                </Button>
                <Button type="button" variant="outline" onClick={handleExcluir} disabled={!podeGerenciarAgendamento || isDeleting} className="h-10 rounded-xl border-rose-200 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                  <Trash2 size={15} /> {isDeleting ? "Excluindo" : "Excluir"}
                </Button>
              </div>

              {currentAppointment.serieId && podeGerenciarAgendamento ? (
                <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-violet-800"><Repeat2 size={14} />Série recorrente</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => handleCancelarSerie("seguintes")} disabled={isManagingSeries} className="h-9 rounded-lg border border-violet-200 bg-white px-2 text-[10px] font-bold text-violet-700 disabled:opacity-50">Cancelar próximos</button>
                    <button type="button" onClick={() => handleCancelarSerie("toda")} disabled={isManagingSeries} className="h-9 rounded-lg border border-rose-200 bg-white px-2 text-[10px] font-bold text-rose-700 disabled:opacity-50">Cancelar série</button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </aside>

      <ClienteQuickEditModal
        open={editandoCliente}
        cliente={currentAppointment.cliente}
        onClose={() => setEditandoCliente(false)}
        onSaved={onClienteUpdated}
      />

      <AnamneseAtendimentoModal
        open={abrindoAnamnese}
        clienteId={currentAppointment.clienteId}
        clienteNome={currentAppointment.cliente.nome}
        procedimento={currentAppointment.procedimento}
        onClose={() => setAbrindoAnamnese(false)}
      />

      <RegistrarEvolucaoPendenteModal
        open={registrandoEvolucao}
        item={{
          id: currentAppointment.id,
          clienteId: currentAppointment.clienteId,
          cliente: currentAppointment.cliente.nome,
          procedimento: currentAppointment.procedimento,
          profissional: currentAppointment.profissional?.nome || null,
          data: currentAppointment.data,
          pendenteDesde:
            currentAppointment.evolucaoPendenteDesde ||
            currentAppointment.updatedAt ||
            currentAppointment.data,
        }}
        onClose={() => setRegistrandoEvolucao(false)}
        onSaved={(agendamentoId) => {
          setRegistrandoEvolucao(false);
          onEvolucaoRegistrada(agendamentoId);
        }}
      />
    </div>
  );
}