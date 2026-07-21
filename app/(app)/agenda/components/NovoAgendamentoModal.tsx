/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Search,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";

import {
  atualizarAgendamento,
  atualizarBloqueioAgenda,
  buscarDisponibilidadeAgenda,
  criarAgendamento,
  criarBloqueioAgenda,
  excluirBloqueioAgenda,
  type HorarioDisponivelAgenda,
} from "@/actions/agendamento.actions";

import type { NovoHorarioPayload } from "./AgendaCalendar";

type Cliente = {
  id: number;
  nome: string;
  telefone: string;
  whatsapp: string | null;
};

type Profissional = {
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

type NovoAgendamentoPayload = NovoHorarioPayload & {
  agendamentoId?: number;
  bloqueioId?: number;
  modo?: "novo" | "retorno" | "edicao" | "edicao_bloqueio";
  tipoAtendimento?: "agendamento" | "bloqueio";
  motivoBloqueio?: string;
  clienteId?: number;
  procedimento?: string;
  duracao?: number;
  valor?: number;
  status?: string;
  observacoes?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  clientes: Cliente[];
  profissionais: Profissional[];
  origensCliente: OpcaoAuxiliar[];
  servicos: ServicoAgenda[];
  initialPayload: NovoAgendamentoPayload | null;
};

function useLockBodyScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const html = document.documentElement;
    const body = document.body;

    const originalHtmlOverflow = html.style.overflow;
    const originalHtmlOverflowX = html.style.overflowX;
    const originalBodyOverflow = body.style.overflow;
    const originalBodyOverflowX = body.style.overflowX;
    const originalPosition = body.style.position;
    const originalTop = body.style.top;
    const originalWidth = body.style.width;

    html.style.overflow = "hidden";
    html.style.overflowX = "hidden";
    body.style.overflow = "hidden";
    body.style.overflowX = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      html.style.overflow = originalHtmlOverflow;
      html.style.overflowX = originalHtmlOverflowX;
      body.style.overflow = originalBodyOverflow;
      body.style.overflowX = originalBodyOverflowX;
      body.style.position = originalPosition;
      body.style.top = originalTop;
      body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizarTexto(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function maskPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCurrencyInput(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(".", ",");
  const parts = normalized.split(",");

  if (parts.length <= 1) return normalized;

  return `${parts[0]},${parts[1].slice(0, 2)}`;
}

function parseCurrency(value: string) {
  const parsed = Number(value.replace(".", "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function valorParaInput(value?: number) {
  if (!value || value <= 0) return "";
  return value.toFixed(2).replace(".", ",");
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getHojeInput() {
  const hoje = new Date();
  const year = hoje.getFullYear();
  const month = String(hoje.getMonth() + 1).padStart(2, "0");
  const day = String(hoje.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function telefoneCliente(cliente: Cliente) {
  return cliente.whatsapp || cliente.telefone || "Não informado";
}

function fieldClassName() {
  return "h-10 w-full min-w-0 border-0 border-b border-slate-300 bg-transparent px-0 text-[15px] font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-600 focus:ring-0 dark:border-slate-600 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-400";
}

function labelClassName() {
  return "mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400";
}

export default function NovoAgendamentoModal({
  open,
  onClose,
  clientes,
  profissionais,
  origensCliente,
  servicos,
  initialPayload,
}: Props) {
  const [tipoAtendimento, setTipoAtendimento] = useState<"agendamento" | "bloqueio">("agendamento");
  const [tipoCliente, setTipoCliente] = useState<"existente" | "novo">("existente");
  const [clienteId, setClienteId] = useState("");
  const [clienteBloqueado, setClienteBloqueado] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [novoClienteWhatsapp, setNovoClienteWhatsapp] = useState("");
  const [novoClienteOrigem, setNovoClienteOrigem] = useState("");
  const [profissionalId, setProfissionalId] = useState("");
  const [procedimento, setProcedimento] = useState("");
  const [servicoSelecionadoId, setServicoSelecionadoId] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("09:00");
  const [duracao, setDuracao] = useState("60");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState("Agendado");
  const [observacoes, setObservacoes] = useState("");
  const [motivoBloqueio, setMotivoBloqueio] = useState("Almoço");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mostrarMaisCampos, setMostrarMaisCampos] = useState(false);
  const [horarios, setHorarios] = useState<HorarioDisponivelAgenda[]>([]);
  const [isLoadingHorarios, startHorariosTransition] = useTransition();

  useLockBodyScroll(open);

  const modoEdicao = Boolean(
    initialPayload?.modo === "edicao" && initialPayload?.agendamentoId,
  );

  const modoEdicaoBloqueio = Boolean(
    initialPayload?.modo === "edicao_bloqueio" && initialPayload?.bloqueioId,
  );

  const modoRetorno = Boolean(
    !modoEdicao &&
      (initialPayload?.modo === "retorno" || initialPayload?.clienteId),
  );

  const agendamentoDiretoAgenda = Boolean(
    !modoEdicao &&
      !modoEdicaoBloqueio &&
      initialPayload?.profissionalId &&
      initialPayload?.data &&
      initialPayload?.hora,
  );

  useEffect(() => {
    if (!open) return;

    const temClientePreSelecionado = Boolean(initialPayload?.clienteId);
    const deveBloquearCliente = Boolean(temClientePreSelecionado && !modoEdicao);

    setErro("");
    setTipoAtendimento(initialPayload?.tipoAtendimento || (modoEdicaoBloqueio ? "bloqueio" : "agendamento"));
    setTipoCliente("existente");
    setClienteBloqueado(deveBloquearCliente);
    setClienteId(initialPayload?.clienteId ? String(initialPayload.clienteId) : "");
    setBuscaCliente("");
    setNovoClienteNome("");
    setNovoClienteWhatsapp("");
    setNovoClienteOrigem("");

    setProfissionalId(
      initialPayload?.profissionalId
        ? String(initialPayload.profissionalId)
        : profissionais[0]?.id
          ? String(profissionais[0].id)
          : "",
    );

    setData(initialPayload?.data || getHojeInput());
    setHora(initialPayload?.hora || "09:00");
    setDuracao(String(initialPayload?.duracao || 60));
    setValor(valorParaInput(initialPayload?.valor));
    setStatus(initialPayload?.status || "Agendado");
    setObservacoes(initialPayload?.observacoes || "");
    setMotivoBloqueio(initialPayload?.motivoBloqueio || "Almoço");
    setMostrarMaisCampos(Boolean(initialPayload?.observacoes || modoEdicao));

    if (initialPayload?.procedimento) {
      const servicoCorrespondente = servicos.find(
        (item) => normalizarTexto(item.nome) === normalizarTexto(initialPayload.procedimento),
      );

      if (servicoCorrespondente) {
        setServicoSelecionadoId(String(servicoCorrespondente.id));
      } else {
        setServicoSelecionadoId("outro");
      }

      setProcedimento(initialPayload.procedimento);
    } else {
      setServicoSelecionadoId("");
      setProcedimento("");
    }
  }, [open, initialPayload, profissionais, servicos, modoEdicao, modoEdicaoBloqueio]);

  useEffect(() => {
    if (!open || !profissionalId || !data) {
      setHorarios([]);
      return;
    }

    startHorariosTransition(async () => {
      try {
        const resultado = await buscarDisponibilidadeAgenda({
          profissionalId: Number(profissionalId),
          data,
          duracao: Number(duracao) || 60,
          ignoreId: modoEdicao ? initialPayload?.agendamentoId : undefined,
          ignoreBloqueioId: modoEdicaoBloqueio ? initialPayload?.bloqueioId : undefined,
        });

        setHorarios(resultado);
      } catch {
        setHorarios([]);
      }
    });
  }, [
    open,
    profissionalId,
    data,
    duracao,
    modoEdicao,
    modoEdicaoBloqueio,
    initialPayload?.agendamentoId,
    initialPayload?.bloqueioId,
  ]);

  const clienteSelecionado = useMemo(() => {
    if (!clienteId) return null;
    return clientes.find((cliente) => String(cliente.id) === String(clienteId)) || null;
  }, [clienteId, clientes]);

  const clientesFiltrados = useMemo(() => {
    const query = normalizarTexto(buscaCliente);
    const digits = onlyDigits(buscaCliente);

    if (query.length < 2 && digits.length < 2) {
      return [];
    }

    return clientes
      .filter((cliente) => {
        return (
          normalizarTexto(cliente.nome).includes(query) ||
          onlyDigits(cliente.telefone).includes(digits) ||
          onlyDigits(cliente.whatsapp || "").includes(digits)
        );
      })
      .slice(0, 6);
  }, [buscaCliente, clientes]);

  const horariosDisponiveis = horarios.filter((item) => item.disponivel);
  const horariosOcupados = horarios.filter((item) => !item.disponivel).slice(0, 5);
  const total = parseCurrency(valor);

  function selecionarServico(value: string) {
    setServicoSelecionadoId(value);
    setErro("");

    if (value === "outro") {
      setProcedimento("");
      return;
    }

    const servico = servicos.find((item) => item.id === Number(value));

    if (!servico) {
      setProcedimento("");
      return;
    }

    setProcedimento(servico.nome);
    setDuracao(String(servico.duracaoPadrao));
    setValor(
      servico.valorPadrao > 0
        ? servico.valorPadrao.toFixed(2).replace(".", ",")
        : "",
    );
  }

  function iniciarNovoCliente() {
    setTipoCliente("novo");

    if (buscaCliente && !onlyDigits(buscaCliente)) {
      setNovoClienteNome(buscaCliente.trim());
    }

    setClienteId("");
    setErro("");
  }

  function voltarParaBuscaCliente() {
    setTipoCliente("existente");
    setNovoClienteNome("");
    setNovoClienteWhatsapp("");
    setNovoClienteOrigem("");
    setErro("");
  }

  if (!open) return null;

  async function salvar() {
    setErro("");

    if (!profissionalId && profissionais.length > 0) {
      setErro("Selecione a profissional da agenda.");
      return;
    }

    if (!data || !hora) {
      setErro("Preencha data e horário.");
      return;
    }

    const dataCompleta = `${data}T${hora}:00`;
    const duracaoNumerica = Number(duracao) || 60;

    if (tipoAtendimento === "bloqueio") {
      if (!motivoBloqueio.trim()) {
        setErro("Informe o motivo do bloqueio.");
        return;
      }

      setSalvando(true);

      try {
        const payloadBloqueio = {
          profissionalId: Number(profissionalId),
          data: dataCompleta,
          duracao: duracaoNumerica,
          motivo: motivoBloqueio,
          observacoes,
        };

        if (modoEdicaoBloqueio && initialPayload?.bloqueioId) {
          await atualizarBloqueioAgenda({
            id: initialPayload.bloqueioId,
            ...payloadBloqueio,
          });
        } else {
          await criarBloqueioAgenda(payloadBloqueio);
        }

        setSalvando(false);
        onClose();
        window.location.reload();
      } catch (error) {
        setSalvando(false);
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o bloqueio.",
        );
      }

      return;
    }

    if (!procedimento) {
      setErro("Selecione ou informe o procedimento.");
      return;
    }

    if (tipoCliente === "existente" && !clienteId) {
      setErro("Selecione um cliente cadastrado ou adicione um novo cliente.");
      return;
    }

    if (tipoCliente === "novo" && !novoClienteNome.trim()) {
      setErro("Informe o nome do novo cliente.");
      return;
    }

    setSalvando(true);

    try {
      const payload = {
        clienteId: tipoCliente === "existente" ? Number(clienteId) : undefined,
        novoCliente:
          tipoCliente === "novo"
            ? {
                nome: novoClienteNome,
                whatsapp: novoClienteWhatsapp,
                telefone: novoClienteWhatsapp,
                origem: novoClienteOrigem,
                procedimentoInteresse: procedimento,
              }
            : undefined,
        profissionalId: profissionalId ? Number(profissionalId) : undefined,
        procedimento,
        data: dataCompleta,
        duracao: duracaoNumerica,
        valor: parseCurrency(valor),
        status,
        observacoes,
      };

      if (modoEdicao && initialPayload?.agendamentoId) {
        await atualizarAgendamento({
          id: initialPayload.agendamentoId,
          ...payload,
        });
      } else {
        await criarAgendamento(payload);
      }

      setSalvando(false);
      onClose();
      window.location.reload();
    } catch (error) {
      setSalvando(false);
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o agendamento.",
      );
    }
  }

  async function excluirBloqueioAtual() {
    if (!modoEdicaoBloqueio || !initialPayload?.bloqueioId) return;

    const confirmou = window.confirm(
      `Excluir o bloqueio "${motivoBloqueio}"? Esta ação remove o horário bloqueado da agenda.`,
    );

    if (!confirmou) return;

    setSalvando(true);
    setErro("");

    try {
      await excluirBloqueioAgenda(initialPayload.bloqueioId);
      setSalvando(false);
      onClose();
      window.location.reload();
    } catch (error) {
      setSalvando(false);
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o bloqueio.",
      );
    }
  }


  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-slate-950/45 p-2 backdrop-blur-[2px] sm:p-4"
    >
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-[620px] flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-2xl shadow-slate-950/30 dark:border-slate-700 dark:bg-slate-900 sm:max-h-[calc(100dvh-2rem)]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-800 dark:text-white">
              {modoEdicaoBloqueio
                ? "Editando Bloqueio"
                : tipoAtendimento === "bloqueio"
                  ? "Criando Bloqueio"
                  : modoEdicao
                    ? "Editando Atendimento"
                    : modoRetorno
                      ? "Criando Retorno"
                      : "Criando Atendimento"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex shrink-0 items-center justify-center gap-6 border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900/80">
          {(["agendamento", "bloqueio"] as const).map((tipo) => {
            const active = tipoAtendimento === tipo;
            const locked = modoEdicao || modoEdicaoBloqueio;

            return (
              <button
                key={tipo}
                type="button"
                disabled={locked && !active}
                onClick={() => {
                  if (locked) return;
                  setTipoAtendimento(tipo);
                  setErro("");
                }}
                className={`inline-flex items-center gap-2 text-sm font-medium transition ${
                  active
                    ? "text-violet-700 dark:text-violet-300"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span
                  className={`flex size-5 items-center justify-center rounded-full border-2 ${
                    active
                      ? "border-violet-600"
                      : "border-slate-400 dark:border-slate-500"
                  }`}
                >
                  {active ? <span className="size-2.5 rounded-full bg-violet-600" /> : null}
                </span>
                {tipo === "agendamento" ? "Agendamento" : "Bloqueio"}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {erro ? (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <label className="min-w-0">
              <span className={labelClassName()}>Data</span>
              <div className="relative">
                <input
                  type="date"
                  value={data}
                  disabled={agendamentoDiretoAgenda}
                  onChange={(event) => {
                    setData(event.target.value);
                    setErro("");
                  }}
                  className={`${fieldClassName()} pr-7 disabled:cursor-not-allowed disabled:opacity-70`}
                />
                <CalendarDays
                  size={17}
                  className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </label>

            <label className="min-w-0">
              <span className={labelClassName()}>Hora início</span>
              <div className="relative">
                {agendamentoDiretoAgenda ? (
                  <input
                    value={hora}
                    readOnly
                    className={`${fieldClassName()} cursor-not-allowed pr-7 opacity-80`}
                  />
                ) : (
                  <select
                    value={hora}
                    onChange={(event) => {
                      setHora(event.target.value);
                      setErro("");
                    }}
                    className={`${fieldClassName()} appearance-none pr-7`}
                  >
                    <option value="">Selecione</option>
                    {horariosDisponiveis.map((item) => (
                      <option key={item.hora} value={item.hora}>
                        {item.hora}
                      </option>
                    ))}
                  </select>
                )}
                <Clock3
                  size={18}
                  className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </label>

            <label className="col-span-2 min-w-0">
              <span className={labelClassName()}>Profissional</span>
              <div className="relative">
                <select
                  value={profissionalId}
                  disabled={agendamentoDiretoAgenda}
                  onChange={(event) => {
                    setProfissionalId(event.target.value);
                    setErro("");
                  }}
                  className={`${fieldClassName()} appearance-none pr-7 disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  <option value="">Selecione</option>
                  {profissionais.map((profissional) => (
                    <option key={profissional.id} value={profissional.id}>
                      {profissional.nome}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </label>
          </div>

          {tipoAtendimento === "agendamento" ? (
            <>
          <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <span className={labelClassName()}>Cliente</span>

              {!clienteBloqueado && tipoCliente === "existente" && !clienteSelecionado ? (
                <button
                  type="button"
                  onClick={iniciarNovoCliente}
                  className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-emerald-600 hover:text-emerald-700"
                >
                  <UserPlus size={14} />
                  Adicionar cliente
                </button>
              ) : null}
            </div>

            {tipoCliente === "novo" ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/30 dark:bg-emerald-950/20">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-200">
                    <UserPlus size={16} />
                    Novo cliente
                  </div>

                  <button
                    type="button"
                    onClick={voltarParaBuscaCliente}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    Voltar à busca
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className={labelClassName()}>Nome</span>
                    <input
                      value={novoClienteNome}
                      onChange={(event) => {
                        setNovoClienteNome(event.target.value);
                        setErro("");
                      }}
                      placeholder="Nome completo"
                      className={fieldClassName()}
                    />
                  </label>

                  <label>
                    <span className={labelClassName()}>WhatsApp</span>
                    <input
                      value={novoClienteWhatsapp}
                      onChange={(event) =>
                        setNovoClienteWhatsapp(maskPhone(event.target.value))
                      }
                      placeholder="(11) 99999-9999"
                      className={fieldClassName()}
                    />
                  </label>

                  <label>
                    <span className={labelClassName()}>Origem</span>
                    <div className="relative">
                      <select
                        value={novoClienteOrigem}
                        onChange={(event) =>
                          setNovoClienteOrigem(event.target.value)
                        }
                        className={`${fieldClassName()} appearance-none pr-7`}
                      >
                        <option value="">Selecione</option>
                        {origensCliente.map((origem) => (
                          <option key={origem.id} value={origem.nome}>
                            {origem.nome}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={15}
                        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                    </div>
                  </label>
                </div>

                <p className="mt-3 text-[11px] leading-4 text-slate-500">
                  O cliente será criado automaticamente ao salvar este atendimento.
                </p>
              </div>
            ) : clienteSelecionado ? (
              <div className="flex items-center justify-between gap-3 border-b border-violet-300 pb-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                    <UserRound size={15} />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800 dark:text-white">
                      {clienteSelecionado.nome}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {telefoneCliente(clienteSelecionado)}
                    </p>
                  </div>
                </div>

                {!clienteBloqueado ? (
                  <button
                    type="button"
                    onClick={() => {
                      setClienteId("");
                      setBuscaCliente("");
                    }}
                    className="text-xs font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-300"
                  >
                    Trocar
                  </button>
                ) : (
                  <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
                )}
              </div>
            ) : (
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-violet-600"
                />
                <input
                  value={buscaCliente}
                  onChange={(event) => {
                    setBuscaCliente(event.target.value);
                    setErro("");
                  }}
                  placeholder="Digite para buscar..."
                  className={`${fieldClassName()} pl-6`}
                />

                {(normalizarTexto(buscaCliente).length >= 2 ||
                  onlyDigits(buscaCliente).length >= 2) ? (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    {clientesFiltrados.length > 0 ? (
                      <>
                        {clientesFiltrados.map((cliente) => (
                          <button
                            key={cliente.id}
                            type="button"
                            onClick={() => {
                              setClienteId(String(cliente.id));
                              setTipoCliente("existente");
                              setBuscaCliente("");
                              setErro("");
                            }}
                            className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition last:border-b-0 hover:bg-violet-50 dark:border-slate-800 dark:hover:bg-violet-500/10"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                                {cliente.nome}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {telefoneCliente(cliente)}
                              </p>
                            </div>
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={iniciarNovoCliente}
                          className="flex w-full items-center justify-center gap-2 bg-emerald-600 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-emerald-700"
                        >
                          <UserPlus size={14} />
                          Adicionar novo cliente
                        </button>
                      </>
                    ) : (
                      <div className="p-3">
                        <p className="mb-2 text-center text-xs text-slate-500">
                          Nenhum cliente encontrado.
                        </p>
                        <button
                          type="button"
                          onClick={iniciarNovoCliente}
                          className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-700"
                        >
                          <UserPlus size={14} />
                          Adicionar cliente
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="grid grid-cols-[1fr_auto] items-end gap-4">
              <label className="min-w-0">
                <span className={labelClassName()}>Serviço</span>
                <div className="relative">
                  <select
                    value={servicoSelecionadoId}
                    onChange={(event) => selecionarServico(event.target.value)}
                    className={`${fieldClassName()} appearance-none pr-7`}
                  >
                    <option value="">Digite para buscar ou selecione um serviço...</option>
                    {servicos.map((servico) => (
                      <option key={servico.id} value={servico.id}>
                        {servico.nome}
                      </option>
                    ))}
                    <option value="outro">Outro procedimento</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </label>

              <div className="pb-2 text-right">
                <span className="block text-[11px] text-slate-500">Total</span>
                <strong className="whitespace-nowrap text-base text-slate-800 dark:text-white">
                  {formatCurrency(total)}
                </strong>
              </div>
            </div>

            {servicoSelecionadoId === "outro" ? (
              <label className="mt-3 block">
                <span className={labelClassName()}>Nome do procedimento</span>
                <input
                  value={procedimento}
                  onChange={(event) => {
                    setProcedimento(event.target.value);
                    setErro("");
                  }}
                  placeholder="Informe o procedimento"
                  className={fieldClassName()}
                />
              </label>
            ) : null}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClassName()}>
                  Duração baseada no serviço
                </span>
                <div className="relative">
                  <select
                    value={duracao}
                    onChange={(event) => {
                      setDuracao(event.target.value);
                      setErro("");
                    }}
                    className={`${fieldClassName()} appearance-none pr-7`}
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h30</option>
                    <option value="120">2 horas</option>
                    <option value="150">2h30</option>
                    <option value="180">3 horas</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </label>

              <label>
                <span className={labelClassName()}>Valor previsto</span>
                <input
                  value={valor}
                  onChange={(event) =>
                    setValor(formatCurrencyInput(event.target.value))
                  }
                  placeholder="0,00"
                  className={fieldClassName()}
                />
              </label>
            </div>

            {!agendamentoDiretoAgenda && horariosOcupados.length > 0 ? (
              <details className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                <summary className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Ver horários ocupados
                  {isLoadingHorarios ? " · atualizando..." : ""}
                </summary>

                <div className="mt-2 space-y-1">
                  {horariosOcupados.map((item) => (
                    <div
                      key={item.hora}
                      className="flex items-center justify-between gap-3 text-xs text-slate-500"
                    >
                      <span>{item.hora}</span>
                      <span className="truncate">{item.motivo}</span>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

            <button
              type="button"
              onClick={() => setMostrarMaisCampos((value) => !value)}
              className="mt-5 flex w-full items-center justify-center gap-2 border border-violet-300 px-3 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 dark:border-violet-500/50 dark:text-violet-300 dark:hover:bg-violet-500/10"
            >
              Mais campos
              <ChevronDown
                size={16}
                className={`transition ${mostrarMaisCampos ? "rotate-180" : ""}`}
              />
            </button>

            {mostrarMaisCampos ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label>
                  <span className={labelClassName()}>Status</span>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                      className={`${fieldClassName()} appearance-none pr-7`}
                    >
                      <option>Agendado</option>
                      <option>Confirmado</option>
                      <option>Em atendimento</option>
                      <option>Atendido</option>
                      <option>Faltou</option>
                      <option>Cancelado</option>
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                  </div>
                </label>

                <label className="sm:col-span-2">
                  <span className={labelClassName()}>Observações</span>
                  <textarea
                    value={observacoes}
                    onChange={(event) => setObservacoes(event.target.value)}
                    placeholder="Sinal, preferências, restrições ou outras observações..."
                    rows={3}
                    className="w-full resize-y border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-[15px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-600 focus:ring-0 dark:border-slate-600 dark:text-white dark:focus:border-violet-400"
                  />
                </label>
              </div>
            ) : null}
          </div>
            </>
          ) : (
            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
              <div className="mb-4 flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/50">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-800">
                  <Ban size={17} />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                    Horário indisponível
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    O período ficará bloqueado para novos agendamentos desta profissional.
                  </p>
                </div>
              </div>

              <label className="block">
                <span className={labelClassName()}>Motivo do bloqueio</span>
                <div className="relative">
                  <select
                    value={motivoBloqueio}
                    onChange={(event) => setMotivoBloqueio(event.target.value)}
                    className={`${fieldClassName()} appearance-none pr-7`}
                  >
                    <option>Almoço</option>
                    <option>Folga</option>
                    <option>Reunião</option>
                    <option>Treinamento</option>
                    <option>Compromisso pessoal</option>
                    <option>Ausência</option>
                    <option>Manutenção</option>
                    <option>Outro</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </label>

              <label className="mt-4 block">
                <span className={labelClassName()}>Duração</span>
                <div className="relative">
                  <select
                    value={duracao}
                    onChange={(event) => setDuracao(event.target.value)}
                    className={`${fieldClassName()} appearance-none pr-7`}
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h30</option>
                    <option value="120">2 horas</option>
                    <option value="150">2h30</option>
                    <option value="180">3 horas</option>
                    <option value="240">4 horas</option>
                    <option value="480">Dia inteiro</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </label>

              <label className="mt-4 block">
                <span className={labelClassName()}>Observação</span>
                <textarea
                  value={observacoes}
                  onChange={(event) => setObservacoes(event.target.value)}
                  placeholder="Opcional. Ex.: retorno às 14h, compromisso externo..."
                  rows={3}
                  className="w-full resize-y border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-[15px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-600 focus:ring-0 dark:border-slate-600 dark:text-white dark:focus:border-violet-400"
                />
              </label>

              {modoEdicaoBloqueio ? (
                <button
                  type="button"
                  onClick={excluirBloqueioAtual}
                  disabled={salvando}
                  className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-rose-300 bg-rose-50 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-500/40 dark:bg-rose-950/30 dark:text-rose-300"
                >
                  <Trash2 size={16} />
                  Excluir bloqueio
                </button>
              ) : null}
            </div>
          )}

        </div>

        <footer className="grid shrink-0 grid-cols-2 gap-3 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="h-10 rounded-md border border-violet-400 bg-white text-sm font-bold uppercase text-violet-700 transition hover:bg-violet-50 disabled:opacity-50 dark:bg-transparent dark:text-violet-300"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="h-10 rounded-md bg-violet-700 text-sm font-bold uppercase text-white shadow-sm transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando
              ? "Salvando..."
              : modoEdicaoBloqueio || tipoAtendimento === "bloqueio"
                ? "Salvar bloqueio"
                : modoEdicao
                  ? "Salvar alterações"
                  : "Salvar"}
          </button>
        </footer>
      </div>
    </div>
  );
}
