"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Search, UserPlus, UsersRound, X } from "lucide-react";

import { criarAgendamento } from "@/actions/agendamento.actions";
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

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTipoCliente(initialPayload?.clienteId ? "existente" : "existente");
    setClienteId(initialPayload?.clienteId ? String(initialPayload.clienteId) : "");
    setBuscaCliente("");
    setNovoClienteNome("");
    setNovoClienteWhatsapp("");
    setNovoClienteOrigem("");

    setProfissionalId(
      initialPayload?.profissionalId
        ? String(initialPayload.profissionalId)
        : "",
    );

    setData(initialPayload?.data || "");
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
  }, [open, initialPayload]);

  const clientesFiltrados = useMemo(() => {
    const query = buscaCliente.trim().toLowerCase();

    if (!query) return clientes.slice(0, 8);

    return clientes
      .filter((cliente) => {
        return (
          cliente.nome.toLowerCase().includes(query) ||
          cliente.telefone.includes(query) ||
          (cliente.whatsapp || "").includes(query)
        );
      })
      .slice(0, 12);
  }, [buscaCliente, clientes]);

  function selecionarServico(value: string) {
    setServicoSelecionadoId(value);

    if (value === "outro") {
      setProcedimento("Outro");
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
    <div className="fixed inset-0 z-[100] flex h-[100dvh] items-stretch justify-center overflow-hidden bg-slate-950/80 px-0 py-0 backdrop-blur-xl sm:items-center sm:px-4 sm:py-4">
      <div className="my-0 flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-none border border-white/[0.10] bg-[#111827] shadow-2xl shadow-black/50 sm:my-auto sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.08] bg-white/[0.035] p-4 sm:gap-6 sm:p-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-200">
              <CalendarPlus size={14} />
              Novo atendimento
            </div>

            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Criar agendamento
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Escolha cliente cadastrado ou cadastre um novo cliente durante o
              agendamento.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 text-slate-300 hover:bg-white/[0.08] hover:text-white"
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 scrollbar-premium sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setTipoCliente("existente")}
                  className={`flex flex-1 items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    tipoCliente === "existente"
                      ? "border-violet-300/40 bg-violet-500/15 text-white"
                      : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                  }`}
                >
                  <UsersRound size={16} />
                  Cliente cadastrado
                </button>

                <button
                  type="button"
                  onClick={() => setTipoCliente("novo")}
                  className={`flex flex-1 items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    tipoCliente === "novo"
                      ? "border-violet-300/40 bg-violet-500/15 text-white"
                      : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                  }`}
                >
                  <UserPlus size={16} />
                  Novo cliente
                </button>
              </div>

              {tipoCliente === "existente" ? (
                <div className="space-y-4">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Buscar cliente
                    </span>

                    <div className="relative">
                      <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                        size={16}
                      />

                      <input
                        value={buscaCliente}
                        onChange={(event) => setBuscaCliente(event.target.value)}
                        placeholder="Digite nome, telefone ou WhatsApp"
                        className="premium-input w-full pl-11"
                      />
                    </div>
                  </label>

                  <div className="max-h-72 space-y-2 overflow-y-auto overscroll-contain pr-1">
                    {clientesFiltrados.map((cliente) => {
                      const active = clienteId === String(cliente.id);

                      return (
                        <button
                          key={cliente.id}
                          type="button"
                          onClick={() => setClienteId(String(cliente.id))}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            active
                              ? "border-violet-300/40 bg-violet-500/15"
                              : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05]"
                          }`}
                        >
                          <p className="font-semibold text-white">
                            {cliente.nome}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {cliente.whatsapp ||
                              cliente.telefone ||
                              "Sem telefone"}
                          </p>
                        </button>
                      );
                    })}

                    {clientesFiltrados.length === 0 ? (
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-sm text-slate-400">
                        Nenhum cliente encontrado. Use a opção Novo cliente.
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Nome do cliente
                    </span>

                    <input
                      value={novoClienteNome}
                      onChange={(event) => setNovoClienteNome(event.target.value)}
                      placeholder="Ex.: Jully Oliveira"
                      className="premium-input w-full"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
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

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
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

            <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
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

                <label className="space-y-2 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
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

                  <p className="text-xs text-slate-500">
                    A duração padrão do serviço bloqueia automaticamente a agenda
                    no período correto.
                  </p>
                </label>

                {servicoSelecionadoId === "outro" ? (
                  <label className="space-y-2 sm:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Nome do procedimento
                    </span>

                    <input
                      value={procedimento === "Outro" ? "" : procedimento}
                      onChange={(event) => setProcedimento(event.target.value)}
                      placeholder="Digite o nome do procedimento"
                      className="premium-input w-full"
                    />
                  </label>
                ) : null}

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Data
                  </span>

                  <input
                    type="date"
                    value={data}
                    onChange={(event) => setData(event.target.value)}
                    className="premium-input w-full"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Horário
                  </span>

                  <input
                    type="time"
                    value={hora}
                    onChange={(event) => setHora(event.target.value)}
                    className="premium-input w-full"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Duração
                  </span>

                  <select
                    value={duracao}
                    onChange={(event) => setDuracao(event.target.value)}
                    className="premium-input w-full"
                  >
                    <option value="30">30 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="60">1 hora</option>
                    <option value="90">1h30</option>
                    <option value="120">2 horas</option>
                    <option value="150">2h30</option>
                    <option value="180">3 horas</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
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

                <label className="space-y-2 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
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

                <label className="space-y-2 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Observações
                  </span>

                  <textarea
                    value={observacoes}
                    onChange={(event) => setObservacoes(event.target.value)}
                    placeholder="Preferências, restrições, sinal, comanda ou observações do atendimento."
                    className="premium-input h-28 w-full resize-none"
                  />
                </label>
              </div>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-white/[0.08] bg-white/[0.02] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:p-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={salvando}
          >
            Cancelar
          </Button>

          <Button type="button" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar atendimento"}
          </Button>
        </div>
      </div>
    </div>
  );
}