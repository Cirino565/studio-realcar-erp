/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Search,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";

import {
  atualizarAgendamento,
  buscarDisponibilidadeAgenda,
  criarAgendamento,
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
  modo?: "novo" | "retorno" | "edicao";
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
    const originalBodyOverflow = body.style.overflow;
    const originalPosition = body.style.position;
    const originalTop = body.style.top;
    const originalWidth = body.style.width;
    const originalLeft = body.style.left;
    const originalRight = body.style.right;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      html.style.overflow = originalHtmlOverflow;
      body.style.overflow = originalBodyOverflow;
      body.style.position = originalPosition;
      body.style.top = originalTop;
      body.style.width = originalWidth;
      body.style.left = originalLeft;
      body.style.right = originalRight;
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
  return String(value).replace(".", ",");
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

function inputClassName() {
  return "h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-purple-400 dark:focus:bg-slate-900 dark:focus:ring-purple-900/40";
}

function labelClassName() {
  return "text-[0.66rem] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-400";
}

function isDarkThemeActive() {
  if (typeof window === "undefined") return false;

  const html = document.documentElement;
  const body = document.body;

  return (
    html.classList.contains("dark") ||
    body.classList.contains("dark") ||
    html.dataset.theme === "dark" ||
    body.dataset.theme === "dark" ||
    html.getAttribute("data-theme") === "dark" ||
    body.getAttribute("data-theme") === "dark"
  );
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
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [horarios, setHorarios] = useState<HorarioDisponivelAgenda[]>([]);
  const [temaEscuro, setTemaEscuro] = useState(false);
  const [isLoadingHorarios, startHorariosTransition] = useTransition();

  useLockBodyScroll(open);

  const modoEdicao = Boolean(
    initialPayload?.modo === "edicao" && initialPayload?.agendamentoId,
  );

  const modoRetorno = Boolean(
    !modoEdicao &&
      (initialPayload?.modo === "retorno" || initialPayload?.clienteId),
  );

  const agendamentoDiretoAgenda = Boolean(
    !modoEdicao &&
      initialPayload?.profissionalId &&
      initialPayload?.data &&
      initialPayload?.hora,
  );

  useEffect(() => {
    if (!open) return;

    const atualizarTema = () => setTemaEscuro(isDarkThemeActive());
    atualizarTema();

    const observer = new MutationObserver(atualizarTema);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const temClientePreSelecionado = Boolean(initialPayload?.clienteId);

    setErro("");
    setClienteBloqueado(temClientePreSelecionado);
    setTipoCliente("existente");
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

    if (initialPayload?.procedimento) {
      setServicoSelecionadoId("outro");
      setProcedimento(initialPayload.procedimento);
    } else {
      setServicoSelecionadoId("");
      setProcedimento("");
    }
  }, [open, initialPayload, profissionais]);

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
    initialPayload?.agendamentoId,
  ]);

  const clienteSelecionado = useMemo(() => {
    if (!clienteId) return null;
    return clientes.find((cliente) => String(cliente.id) === String(clienteId));
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

  const deveMostrarBusca = tipoCliente === "existente" && !clienteBloqueado;
  const deveMostrarResultados =
    deveMostrarBusca &&
    (normalizarTexto(buscaCliente).length >= 2 || onlyDigits(buscaCliente).length >= 2);

  const horariosDisponiveis = horarios.filter((item) => item.disponivel);
  const horariosOcupados = horarios.filter((item) => !item.disponivel).slice(0, 5);

  const cardInfoStyle = temaEscuro
    ? {
        backgroundColor: "#171827",
        borderColor: "#334155",
        color: "#ffffff",
      }
    : {
        backgroundColor: "#faf5ff",
        borderColor: "#e9d5ff",
        color: "#0f172a",
      };

  const cardInfoSecondaryStyle = temaEscuro ? { color: "#cbd5e1" } : { color: "#64748b" };

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
    setValor(servico.valorPadrao > 0 ? String(servico.valorPadrao).replace(".", ",") : "");
  }

  if (!open) return null;

  async function salvar() {
    setErro("");

    if (!profissionalId && profissionais.length > 0) {
      setErro("Selecione a profissional da agenda.");
      return;
    }

    if (!procedimento || !data || !hora) {
      setErro("Preencha procedimento, data e horário.");
      return;
    }

    if (tipoCliente === "existente" && !clienteId) {
      setErro("Selecione um cliente cadastrado.");
      return;
    }

    if (tipoCliente === "novo" && !novoClienteNome.trim()) {
      setErro("Informe o nome do novo cliente.");
      return;
    }

    setSalvando(true);

    const dataCompleta = `${data}T${hora}:00`;

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
        duracao: Number(duracao) || 60,
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
        error instanceof Error ? error.message : "Não foi possível salvar o agendamento.",
      );
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] h-[100dvh] w-screen max-w-[100vw] overflow-y-auto bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white"
      style={{ touchAction: "pan-y" }}
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col">
        <div className="bg-white px-4 pb-3 pt-4 shadow-sm dark:bg-slate-900 sm:rounded-b-[2rem] sm:px-6 sm:pb-5 sm:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 sm:flex">
                <CalendarPlus size={20} />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                  {modoEdicao
                    ? "Editar agendamento"
                    : modoRetorno
                      ? "Agendar retorno"
                      : "Criar agendamento"}
                </h2>

                <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500 dark:text-slate-300">
                  {modoEdicao
                    ? "Corrija os dados necessários e salve as alterações do agendamento."
                    : modoRetorno
                      ? "Cliente já selecionada. Escolha data, horário e procedimento."
                      : agendamentoDiretoAgenda
                        ? "Horário e profissional definidos diretamente pela agenda."
                        : "Busque a cliente, escolha um horário livre e salve o atendimento."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-2 text-slate-500 shadow-sm hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
              aria-label="Fechar modal"
            >
              <X size={18} />
            </button>
          </div>

          {erro ? (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertCircle className="mt-0.5 shrink-0" size={15} />
              <span>{erro}</span>
            </div>
          ) : null}
        </div>

        <div className="flex-1 space-y-3 px-4 py-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6">
          <section className="rounded-[1.35rem] bg-white p-3 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-700 sm:p-5">
            {clienteBloqueado && clienteSelecionado ? (
              <div className="rounded-2xl border p-3" style={cardInfoStyle}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={labelClassName()}>Cliente selecionada</p>
                    <p className="mt-1 truncate text-base font-bold" style={{ color: cardInfoStyle.color }}>
                      {clienteSelecionado.nome}
                    </p>
                    <p className="mt-1 truncate text-xs" style={cardInfoSecondaryStyle}>
                      {telefoneCliente(clienteSelecionado)}
                    </p>
                  </div>
                  <CheckCircle2
                    className="shrink-0"
                    style={{ color: temaEscuro ? "#c4b5fd" : "#6d28d9" }}
                    size={20}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTipoCliente("existente");
                      setErro("");
                    }}
                    className={`flex min-w-0 items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-center text-xs font-bold transition sm:justify-start sm:text-sm ${
                      tipoCliente === "existente"
                        ? "border-purple-300 bg-purple-50 text-purple-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    <UsersRound size={16} className="shrink-0" />
                    <span className="truncate">Cliente cadastrado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTipoCliente("novo");
                      setErro("");
                    }}
                    className={`flex min-w-0 items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-center text-xs font-bold transition sm:justify-start sm:text-sm ${
                      tipoCliente === "novo"
                        ? "border-purple-300 bg-purple-50 text-purple-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    <UserPlus size={16} className="shrink-0" />
                    <span className="truncate">Novo cliente</span>
                  </button>
                </div>

                {tipoCliente === "existente" ? (
                  <div className="mt-3 space-y-3">
                    <label className="block space-y-2">
                      <span className={labelClassName()}>Buscar cliente</span>
                      <div className="relative min-w-0">
                        <Search
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                          size={16}
                        />
                        <input
                          value={buscaCliente}
                          onChange={(event) => {
                            setBuscaCliente(event.target.value);
                            setErro("");
                          }}
                          placeholder="Digite pelo menos 2 letras ou números"
                          className={`${inputClassName()} pl-11`}
                        />
                      </div>
                    </label>

                    {clienteSelecionado ? (
                      <div className="rounded-2xl border p-3" style={cardInfoStyle}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={labelClassName()}>Selecionado</p>
                            <p className="mt-1 truncate text-sm font-bold" style={{ color: cardInfoStyle.color }}>
                              {clienteSelecionado.nome}
                            </p>
                            <p className="mt-1 truncate text-xs" style={cardInfoSecondaryStyle}>
                              {telefoneCliente(clienteSelecionado)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setClienteId("");
                              setBuscaCliente("");
                            }}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            Trocar
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {deveMostrarResultados ? (
                      <div className="space-y-2">
                        {clientesFiltrados.length > 0 ? (
                          clientesFiltrados.map((cliente) => {
                            const active = clienteId === String(cliente.id);

                            return (
                              <button
                                key={cliente.id}
                                type="button"
                                onClick={() => {
                                  setClienteId(String(cliente.id));
                                  setErro("");
                                }}
                                className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                                  active
                                    ? "border-purple-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                                }`}
                              >
                                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                                  {cliente.nome}
                                </p>
                                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                  {telefoneCliente(cliente)}
                                </p>
                              </button>
                            );
                          })
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-xs leading-5 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Nenhuma cliente encontrada para essa busca.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs leading-5 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        A lista completa não aparece automaticamente. Pesquise pelo nome ou WhatsApp.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 grid gap-3">
                    <label className="block space-y-2">
                      <span className={labelClassName()}>Nome do cliente</span>
                      <input
                        value={novoClienteNome}
                        onChange={(event) => {
                          setNovoClienteNome(event.target.value);
                          setErro("");
                        }}
                        placeholder="Ex.: Jully Oliveira"
                        className={inputClassName()}
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className={labelClassName()}>WhatsApp</span>
                      <input
                        value={novoClienteWhatsapp}
                        onChange={(event) => setNovoClienteWhatsapp(maskPhone(event.target.value))}
                        placeholder="(11) 99999-9999"
                        className={inputClassName()}
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className={labelClassName()}>Origem</span>
                      <select
                        value={novoClienteOrigem}
                        onChange={(event) => setNovoClienteOrigem(event.target.value)}
                        className={inputClassName()}
                      >
                        <option value="">Selecione</option>
                        {origensCliente.map((origem) => (
                          <option key={origem.id} value={origem.nome}>
                            {origem.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="rounded-[1.35rem] bg-white p-3 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-700 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-2 sm:col-span-2">
                <span className={labelClassName()}>Profissional</span>
                <select
                  value={profissionalId}
                  disabled={agendamentoDiretoAgenda}
                  onChange={(event) => {
                    setProfissionalId(event.target.value);
                    setErro("");
                  }}
                  className={
                    agendamentoDiretoAgenda
                      ? "h-11 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      : inputClassName()
                  }
                >
                  <option value="">Selecione</option>
                  {profissionais.map((profissional) => (
                    <option key={profissional.id} value={profissional.id}>
                      {profissional.nome}
                      {profissional.area ? ` · ${profissional.area}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className={labelClassName()}>Data</span>
                <input
                  type="date"
                  value={data}
                  disabled={agendamentoDiretoAgenda}
                  onChange={(event) => {
                    setData(event.target.value);
                    setErro("");
                  }}
                  className={
                    agendamentoDiretoAgenda
                      ? "h-11 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      : inputClassName()
                  }
                />
              </label>

              <label className="block space-y-2">
                <span className={labelClassName()}>Horário</span>
                {agendamentoDiretoAgenda ? (
                  <input
                    value={hora}
                    readOnly
                    className="h-11 w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                ) : (
                  <select
                    value={hora}
                    onChange={(event) => {
                      setHora(event.target.value);
                      setErro("");
                    }}
                    className={inputClassName()}
                  >
                    <option value="">Selecione um horário</option>
                    {horariosDisponiveis.map((item) => (
                      <option key={item.hora} value={item.hora}>
                        {item.hora}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </div>

            {!agendamentoDiretoAgenda ? (
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={labelClassName()}>Horários disponíveis</span>
                  {isLoadingHorarios ? <span className="text-xs text-slate-400">Carregando...</span> : null}
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {horariosDisponiveis.map((item) => (
                    <button
                      key={item.hora}
                      type="button"
                      onClick={() => {
                        setHora(item.hora);
                        setErro("");
                      }}
                      className={`h-10 rounded-2xl border px-2 text-center text-sm font-bold transition ${
                        hora === item.hora
                          ? "border-purple-300 bg-purple-50 text-purple-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      {item.hora}
                    </button>
                  ))}

                  {!isLoadingHorarios && horariosDisponiveis.length === 0 ? (
                    <div className="col-span-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:col-span-4">
                      Selecione profissional e data para ver horários livres.
                    </div>
                  ) : null}
                </div>

                {horariosOcupados.length > 0 ? (
                  <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                    <summary className="cursor-pointer text-xs font-bold text-slate-500 dark:text-slate-300">
                      Ver horários ocupados
                    </summary>

                    <div className="mt-3 space-y-2">
                      {horariosOcupados.map((item) => (
                        <div
                          key={item.hora}
                          className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-300"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 size={12} />
                            {item.hora}
                          </span>
                          <span className="truncate">{item.motivo}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-[1.35rem] bg-white p-3 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-700 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-2 sm:col-span-2">
                <span className={labelClassName()}>Procedimento / serviço</span>
                <select
                  value={servicoSelecionadoId}
                  onChange={(event) => selecionarServico(event.target.value)}
                  className={inputClassName()}
                >
                  <option value="">Selecione um serviço cadastrado</option>
                  {servicos.map((servico) => (
                    <option key={servico.id} value={servico.id}>
                      {servico.nome} · {servico.duracaoPadrao} min
                      {servico.valorPadrao > 0
                        ? ` · ${servico.valorPadrao.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}`
                        : ""}
                    </option>
                  ))}
                  <option value="outro">Outro procedimento</option>
                </select>
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className={labelClassName()}>Duração</span>
                <select
                  value={duracao}
                  onChange={(event) => {
                    setDuracao(event.target.value);
                    setErro("");
                  }}
                  className={inputClassName()}
                >
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 hora</option>
                  <option value="90">1h30</option>
                  <option value="120">2 horas</option>
                  <option value="150">2h30</option>
                  <option value="180">3 horas</option>
                </select>
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className={labelClassName()}>Nome do procedimento</span>
                <input
                  value={procedimento}
                  onChange={(event) => {
                    setProcedimento(event.target.value);
                    setServicoSelecionadoId("outro");
                    setErro("");
                  }}
                  placeholder="Ex.: Retorno - Limpeza de pele"
                  className={inputClassName()}
                />
              </label>

              <label className="block space-y-2">
                <span className={labelClassName()}>Valor previsto</span>
                <input
                  value={valor}
                  onChange={(event) => setValor(formatCurrencyInput(event.target.value))}
                  placeholder="0,00"
                  className={inputClassName()}
                />
              </label>

              <label className="block space-y-2">
                <span className={labelClassName()}>Status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className={inputClassName()}
                >
                  <option>Agendado</option>
                  <option>Confirmado</option>
                  <option>Em atendimento</option>
                  <option>Atendido</option>
                  <option>Faltou</option>
                  <option>Cancelado</option>
                </select>
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className={labelClassName()}>Observações</span>
                <textarea
                  value={observacoes}
                  onChange={(event) => setObservacoes(event.target.value)}
                  placeholder="Preferências, restrições, sinal, comanda ou observações do atendimento."
                  className="min-h-20 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-purple-400 dark:focus:bg-slate-900 dark:focus:ring-purple-900/40"
                />
              </label>
            </div>
          </section>

          <div className="grid gap-2 pb-4 sm:grid-cols-2 sm:pb-0">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="h-12 rounded-2xl bg-gradient-to-r from-purple-700 to-fuchsia-600 px-5 text-sm font-bold text-white shadow-lg shadow-purple-900/20 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:order-2"
            >
              {salvando
                ? "Salvando..."
                : modoEdicao
                  ? "Salvar alterações"
                  : modoRetorno
                    ? "Salvar retorno"
                    : "Salvar atendimento"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:order-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}