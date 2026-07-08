"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Search,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";

import {
  buscarDisponibilidadeAgenda,
  criarAgendamento,
  type HorarioDisponivelAgenda,
} from "@/actions/agendamento.actions";
import { Button } from "@/components/ui/button";

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
  if (!value || value <= 0) {
    return "";
  }

  return String(value).replace(".", ",");
}

function getHojeInput() {
  const hoje = new Date();
  const year = hoje.getFullYear();
  const month = String(hoje.getMonth() + 1).padStart(2, "0");
  const day = String(hoje.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
  const [tipoCliente, setTipoCliente] = useState<"existente" | "novo">(
    "existente",
  );
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
  const [salvando, setSalvando] = useState(false);
  const [horarios, setHorarios] = useState<HorarioDisponivelAgenda[]>([]);
  const [isLoadingHorarios, startHorariosTransition] = useTransition();

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) {
      return;
    }

    const temClientePreSelecionado = Boolean(initialPayload?.clienteId);

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
        });

        setHorarios(resultado);
      } catch {
        setHorarios([]);
      }
    });
  }, [open, profissionalId, data, duracao]);

  const clienteSelecionado = useMemo(() => {
    if (!clienteId) return null;

    return clientes.find((cliente) => String(cliente.id) === String(clienteId));
  }, [clienteId, clientes]);

  const clientesFiltrados = useMemo(() => {
    const query = buscaCliente.trim().toLowerCase();

    if (!query) return clientes.slice(0, 5);

    return clientes
      .filter((cliente) => {
        return (
          cliente.nome.toLowerCase().includes(query) ||
          cliente.telefone.includes(query) ||
          (cliente.whatsapp || "").includes(query)
        );
      })
      .slice(0, 8);
  }, [buscaCliente, clientes]);

  const modoRetorno = Boolean(initialPayload?.clienteId);

  const horariosDisponiveis = horarios.filter((item) => item.disponivel);
  const horariosOcupados = horarios.filter((item) => !item.disponivel).slice(0, 5);

  function selecionarServico(value: string) {
    setServicoSelecionadoId(value);

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
        ? String(servico.valorPadrao).replace(".", ",")
        : "",
    );
  }

  if (!open) return null;

  async function salvar() {
    if (!profissionalId && profissionais.length > 0) {
      alert("Selecione a profissional da agenda.");
      return;
    }

    if (!procedimento || !data || !hora) {
      alert("Preencha procedimento, data e horário.");
      return;
    }

    if (tipoCliente === "existente" && !clienteId) {
      alert("Selecione um cliente cadastrado.");
      return;
    }

    if (tipoCliente === "novo" && !novoClienteNome.trim()) {
      alert("Informe o nome do novo cliente.");
      return;
    }

    setSalvando(true);

    const dataCompleta = `${data}T${hora}:00`;

    try {
      await criarAgendamento({
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
      });

      setSalvando(false);
      onClose();
      window.location.reload();
    } catch (error) {
      setSalvando(false);
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o agendamento.",
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex h-[100dvh] w-screen max-w-[100vw] items-stretch justify-center overflow-hidden bg-slate-950/80 px-0 py-0 backdrop-blur-xl sm:items-center sm:px-4 sm:py-4"
      style={{ touchAction: "pan-y" }}
    >
      <div className="my-0 flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-none border border-white/[0.10] bg-[#111827] shadow-2xl shadow-black/50 sm:my-auto sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.08] bg-white/[0.035] p-4 sm:gap-6 sm:p-6">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {modoRetorno ? "Agendar retorno" : "Criar agendamento"}
            </h2>

            <p className="mt-1.5 text-xs leading-5 text-slate-400 sm:text-sm">
              {modoRetorno
                ? "Cliente já selecionada. Escolha data, horário e procedimento."
                : "Selecione a cliente, veja horários livres e salve o atendimento."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 text-slate-300 hover:bg-white/[0.08] hover:text-white"
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 pb-24 scrollbar-premium sm:p-6 sm:pb-6">
          {clienteBloqueado && clienteSelecionado ? (
            <div className="mb-3 rounded-2xl border border-violet-300/20 bg-violet-400/10 p-3 sm:mb-5 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200/80">
                    Cliente selecionada
                  </p>

                  <p className="mt-1 truncate text-base font-semibold text-white">
                    {clienteSelecionado.nome}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-400">
                    {clienteSelecionado.whatsapp ||
                      clienteSelecionado.telefone ||
                      "Sem telefone"}
                  </p>
                </div>

                <CheckCircle2 className="shrink-0 text-violet-200" size={20} />
              </div>
            </div>
          ) : null}

          <div className="grid min-w-0 gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:gap-5">
            {!clienteBloqueado ? (
              <section className="min-w-0 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] p-3 sm:p-5">
                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setTipoCliente("existente")}
                    className={`flex min-w-0 items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      tipoCliente === "existente"
                        ? "border-violet-300/40 bg-violet-500/15 text-white"
                        : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                    }`}
                  >
                    <UsersRound size={16} className="shrink-0" />
                    <span className="truncate">Cliente cadastrado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoCliente("novo")}
                    className={`flex min-w-0 items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      tipoCliente === "novo"
                        ? "border-violet-300/40 bg-violet-500/15 text-white"
                        : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                    }`}
                  >
                    <UserPlus size={16} className="shrink-0" />
                    <span className="truncate">Novo cliente</span>
                  </button>
                </div>

                {tipoCliente === "existente" ? (
                  <div className="space-y-3">
                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Buscar cliente
                      </span>

                      <div className="relative min-w-0">
                        <Search
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                          size={16}
                        />

                        <input
                          value={buscaCliente}
                          onChange={(event) =>
                            setBuscaCliente(event.target.value)
                          }
                          placeholder="Nome ou WhatsApp"
                          className="premium-input w-full min-w-0 pl-11"
                        />
                      </div>
                    </label>

                    <div className="max-h-[260px] space-y-2 overflow-x-hidden overflow-y-auto overscroll-contain pr-1">
                      {clientesFiltrados.map((cliente) => {
                        const active = clienteId === String(cliente.id);

                        return (
                          <button
                            key={cliente.id}
                            type="button"
                            onClick={() => setClienteId(String(cliente.id))}
                            className={`w-full rounded-2xl border p-3 text-left transition ${
                              active
                                ? "border-violet-300/40 bg-violet-500/15"
                                : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05]"
                            }`}
                          >
                            <p className="truncate text-sm font-semibold text-white">
                              {cliente.nome}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {cliente.whatsapp ||
                                cliente.telefone ||
                                "Sem telefone"}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-2 sm:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Nome do cliente
                      </span>

                      <input
                        value={novoClienteNome}
                        onChange={(event) =>
                          setNovoClienteNome(event.target.value)
                        }
                        placeholder="Ex.: Jully Oliveira"
                        className="premium-input w-full"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        WhatsApp
                      </span>

                      <input
                        value={novoClienteWhatsapp}
                        onChange={(event) =>
                          setNovoClienteWhatsapp(maskPhone(event.target.value))
                        }
                        placeholder="(11) 99999-9999"
                        className="premium-input w-full"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Origem
                      </span>

                      <select
                        value={novoClienteOrigem}
                        onChange={(event) =>
                          setNovoClienteOrigem(event.target.value)
                        }
                        className="premium-input w-full"
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
              </section>
            ) : null}

            <section className="min-w-0 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] p-3 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Profissional
                  </span>

                  <select
                    value={profissionalId}
                    onChange={(event) => setProfissionalId(event.target.value)}
                    className="premium-input w-full"
                  >
                    <option value="">Selecione</option>

                    {profissionais.map((profissional) => (
                      <option key={profissional.id} value={profissional.id}>
                        {profissional.nome}{" "}
                        {profissional.area ? `· ${profissional.area}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Data
                  </span>

                  <input
                    type="date"
                    value={data}
                    onChange={(event) => setData(event.target.value)}
                    className="premium-input w-full"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Duração
                  </span>

                  <select
                    value={duracao}
                    onChange={(event) => setDuracao(event.target.value)}
                    className="premium-input w-full"
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

                <div className="sm:col-span-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Horários disponíveis
                    </span>

                    {isLoadingHorarios ? (
                      <span className="text-xs text-slate-500">Carregando...</span>
                    ) : null}
                  </div>

                  <div className="grid max-h-[190px] grid-cols-3 gap-2 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-4">
                    {horariosDisponiveis.map((item) => (
                      <button
                        key={item.hora}
                        type="button"
                        onClick={() => setHora(item.hora)}
                        className={`rounded-xl border px-2 py-2 text-center text-xs font-semibold transition ${
                          hora === item.hora
                            ? "border-violet-300/50 bg-violet-500/20 text-white"
                            : "border-white/[0.08] bg-white/[0.035] text-slate-300 hover:bg-white/[0.07]"
                        }`}
                      >
                        {item.hora}
                      </button>
                    ))}

                    {!isLoadingHorarios && horariosDisponiveis.length === 0 ? (
                      <div className="col-span-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 text-xs leading-5 text-slate-400 sm:col-span-4">
                        Selecione profissional e data para ver horários livres.
                      </div>
                    ) : null}
                  </div>

                  {horariosOcupados.length > 0 ? (
                    <details className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-slate-400">
                        Ver horários ocupados
                      </summary>

                      <div className="mt-3 space-y-2">
                        {horariosOcupados.map((item) => (
                          <div
                            key={item.hora}
                            className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-slate-400"
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

                <label className="block space-y-2 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Procedimento / serviço
                  </span>

                  <select
                    value={servicoSelecionadoId}
                    onChange={(event) => selecionarServico(event.target.value)}
                    className="premium-input w-full"
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
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Nome do procedimento
                  </span>

                  <input
                    value={procedimento}
                    onChange={(event) => {
                      setProcedimento(event.target.value);
                      setServicoSelecionadoId("outro");
                    }}
                    placeholder="Ex.: Retorno - Limpeza de pele"
                    className="premium-input w-full"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Valor previsto
                  </span>

                  <input
                    value={valor}
                    onChange={(event) =>
                      setValor(formatCurrencyInput(event.target.value))
                    }
                    placeholder="0,00"
                    className="premium-input w-full"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Status
                  </span>

                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="premium-input w-full"
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
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Observações
                  </span>

                  <textarea
                    value={observacoes}
                    onChange={(event) => setObservacoes(event.target.value)}
                    placeholder="Preferências, restrições, sinal, comanda ou observações do atendimento."
                    className="premium-input h-24 w-full resize-none"
                  />
                </label>
              </div>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/[0.08] bg-white/[0.02] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:p-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={salvando}
            className="h-11"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="h-11"
          >
            {salvando
              ? "Salvando..."
              : modoRetorno
                ? "Salvar retorno"
                : "Salvar atendimento"}
          </Button>
        </div>
      </div>
    </div>
  );
}