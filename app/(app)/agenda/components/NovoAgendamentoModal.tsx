/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Repeat2,
  RotateCcw,
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
  excluirSerieBloqueioAgenda,
  type HorarioDisponivelAgenda,
} from "@/actions/agendamento.actions";

import { formatarDuracao, interpretarDuracao } from "@/lib/duracao";

import type { NovoHorarioPayload } from "./AgendaCalendar";

type Cliente = {
  id: number;
  nome: string;
  telefone: string;
  whatsapp: string | null;
  areaEstetica: boolean;
  areaCilios: boolean;
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
  open: boolean;
  onClose: () => void;
  clientes: Cliente[];
  profissionais: Profissional[];
  origensCliente: OpcaoAuxiliar[];
  servicos: ServicoAgenda[];
  areaPadraoAgendamento: "estetica" | "cilios" | null;
  intervaloEntreAtendimentos: number;
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

function mensagemErroSeguro(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  const mensagem = error.message?.trim();

  if (
    !mensagem ||
    mensagem.includes("An error occurred in the Server Components render") ||
    mensagem.includes("A digest property is included")
  ) {
    return fallback;
  }

  return mensagem;
}

export default function NovoAgendamentoModal({
  open,
  onClose,
  clientes,
  profissionais,
  origensCliente,
  servicos,
  areaPadraoAgendamento,
  intervaloEntreAtendimentos,
  initialPayload,
}: Props) {
  const [tipoAtendimento, setTipoAtendimento] = useState<"agendamento" | "bloqueio">("agendamento");
  const [naturezaAtendimento, setNaturezaAtendimento] = useState<
    "PROCEDIMENTO" | "RETORNO"
  >("PROCEDIMENTO");
  const [agendamentoOrigemId, setAgendamentoOrigemId] = useState("");
  const [tipoCliente, setTipoCliente] = useState<"existente" | "novo">("existente");
  const [clienteId, setClienteId] = useState("");
  const [clienteBloqueado, setClienteBloqueado] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [novoClienteWhatsapp, setNovoClienteWhatsapp] = useState("");
  const [novoClienteOrigem, setNovoClienteOrigem] = useState("");
  const [areaEstetica, setAreaEstetica] = useState(false);
  const [areaCilios, setAreaCilios] = useState(false);
  const [profissionalId, setProfissionalId] = useState("");
  const [procedimento, setProcedimento] = useState("");
  const [servicoSelecionadoId, setServicoSelecionadoId] = useState("");
  const [buscaServico, setBuscaServico] = useState("");
  const [mostrarListaServicos, setMostrarListaServicos] = useState(false);
  const servicoComboboxRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("09:00");
  const [excecaoHorario, setExcecaoHorario] = useState(false);
  const [permitirEncaixeSemIntervalo, setPermitirEncaixeSemIntervalo] =
    useState(false);

  const quantidadeOpcoesAvancadasAtivas =
    Number(excecaoHorario) +
    Number(
      tipoAtendimento === "agendamento" &&
        intervaloEntreAtendimentos > 0 &&
        permitirEncaixeSemIntervalo,
    );
  const [duracao, setDuracao] = useState("1 hora");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState("Agendado");
  const [observacoes, setObservacoes] = useState("");
  const [sinalPago, setSinalPago] = useState(false);
  const [motivoBloqueio, setMotivoBloqueio] = useState("Almoço");
  const [recorrenciaTipo, setRecorrenciaTipo] = useState<
    "nenhuma" | "semanal" | "quinzenal" | "mensal" | "personalizada"
  >("nenhuma");
  const [recorrenciaIntervalo, setRecorrenciaIntervalo] = useState("1");
  const [recorrenciaUnidade, setRecorrenciaUnidade] = useState<
    "dias" | "semanas" | "meses"
  >("semanas");
  const [recorrenciaOcorrencias, setRecorrenciaOcorrencias] = useState("4");
  // Bloqueio por período: em vez de "repetir a cada 1 dia, N vezes", a
  // pessoa escolhe só a data final e o sistema calcula os dias sozinho.
  const [bloqueioAteData, setBloqueioAteData] = useState("");
  const [erro, setErro] = useState("");
  const [erroTitulo, setErroTitulo] = useState("Verifique os dados");
  const [erroAcaoHorario, setErroAcaoHorario] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [avisoSucesso, setAvisoSucesso] = useState<string | null>(null);
  const router = useRouter();
  const [mostrarMaisCampos, setMostrarMaisCampos] = useState(false);
  const [horarios, setHorarios] = useState<HorarioDisponivelAgenda[]>([]);
  const [disponibilidadeVersao, setDisponibilidadeVersao] = useState(0);
  const [isLoadingHorarios, startHorariosTransition] = useTransition();
  const conteudoScrollRef = useRef<HTMLDivElement>(null);
  const modalInicializadoRef = useRef(false);

  useLockBodyScroll(open);

  const modoEdicao = Boolean(
    initialPayload?.modo === "edicao" && initialPayload?.agendamentoId,
  );

  const modoEdicaoBloqueio = Boolean(
    initialPayload?.modo === "edicao_bloqueio" && initialPayload?.bloqueioId,
  );

  const modoRetorno = Boolean(
    initialPayload?.modo === "retorno" ||
      initialPayload?.naturezaAtendimento === "RETORNO",
  );

  const areaAutomaticaAtiva =
    !modoEdicao && !modoEdicaoBloqueio ? areaPadraoAgendamento : null;

  useEffect(() => {
    if (!open) {
      modalInicializadoRef.current = false;
      return;
    }

    if (modalInicializadoRef.current) return;
    modalInicializadoRef.current = true;

    const temClientePreSelecionado = Boolean(initialPayload?.clienteId);
    const deveBloquearCliente = Boolean(temClientePreSelecionado && !modoEdicao);
    const naturezaInicial =
      initialPayload?.naturezaAtendimento === "RETORNO" ||
      initialPayload?.modo === "retorno"
        ? "RETORNO"
        : "PROCEDIMENTO";

    setErro("");
    setErroTitulo("Verifique os dados");
    setErroAcaoHorario(false);
    setTipoAtendimento(initialPayload?.tipoAtendimento || (modoEdicaoBloqueio ? "bloqueio" : "agendamento"));
    setNaturezaAtendimento(naturezaInicial);
    setAgendamentoOrigemId(
      initialPayload?.agendamentoOrigemId
        ? String(initialPayload.agendamentoOrigemId)
        : "",
    );
    setTipoCliente("existente");
    setClienteBloqueado(deveBloquearCliente);
    setClienteId(initialPayload?.clienteId ? String(initialPayload.clienteId) : "");
    setBuscaCliente("");
    setNovoClienteNome("");
    setNovoClienteWhatsapp("");
    setNovoClienteOrigem("");

    const clienteInicial = initialPayload?.clienteId
      ? clientes.find(
          (cliente) => String(cliente.id) === String(initialPayload.clienteId),
        )
      : null;
    setAreaEstetica(
      Boolean(clienteInicial?.areaEstetica) || areaAutomaticaAtiva === "estetica",
    );
    setAreaCilios(
      Boolean(clienteInicial?.areaCilios) || areaAutomaticaAtiva === "cilios",
    );

    setProfissionalId(
      initialPayload?.profissionalId
        ? String(initialPayload.profissionalId)
        : profissionais[0]?.id
          ? String(profissionais[0].id)
          : "",
    );

    setData(initialPayload?.data || getHojeInput());
    setHora(initialPayload?.hora || "09:00");
    setExcecaoHorario(false);
    setPermitirEncaixeSemIntervalo(false);
    setSucesso(false);
    setAvisoSucesso(null);
    setDuracao(formatarDuracao(initialPayload?.duracao || 60));
    setValor(
      naturezaInicial === "RETORNO"
        ? ""
        : valorParaInput(initialPayload?.valor),
    );
    setStatus(initialPayload?.status || "Agendado");
    setObservacoes(initialPayload?.observacoes || "");
    setSinalPago(
      naturezaInicial === "RETORNO"
        ? false
        : Boolean(initialPayload?.sinalPago),
    );
    setMotivoBloqueio(initialPayload?.motivoBloqueio || "Almoço");
    setRecorrenciaTipo("nenhuma");
    setBloqueioAteData("");
    setRecorrenciaIntervalo("1");
    setRecorrenciaUnidade("semanas");
    setRecorrenciaOcorrencias("4");
    setMostrarMaisCampos(Boolean(initialPayload?.observacoes || modoEdicao));

    if (initialPayload?.procedimento) {
      const servicoCorrespondente = servicos.find(
        (item) => normalizarTexto(item.nome) === normalizarTexto(initialPayload.procedimento),
      );

      if (servicoCorrespondente) {
        setServicoSelecionadoId(String(servicoCorrespondente.id));
        setProcedimento(servicoCorrespondente.nome);
        setBuscaServico(servicoCorrespondente.nome);
      } else {
        setServicoSelecionadoId("");
        setProcedimento("");
        setBuscaServico(initialPayload.procedimento);
      }
    } else {
      setServicoSelecionadoId("");
      setProcedimento("");
      setBuscaServico("");
    }

    setMostrarListaServicos(false);
  }, [
    open,
    initialPayload,
    profissionais,
    servicos,
    clientes,
    areaPadraoAgendamento,
    areaAutomaticaAtiva,
    modoEdicao,
    modoEdicaoBloqueio,
  ]);

  useEffect(() => {
    if (!mostrarListaServicos) return;

    function fecharListaAoClicarFora(event: PointerEvent) {
      if (
        servicoComboboxRef.current &&
        !servicoComboboxRef.current.contains(event.target as Node)
      ) {
        setMostrarListaServicos(false);
      }
    }

    document.addEventListener("pointerdown", fecharListaAoClicarFora);

    return () => {
      document.removeEventListener("pointerdown", fecharListaAoClicarFora);
    };
  }, [mostrarListaServicos]);

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
          duracao: interpretarDuracao(duracao),
          ignoreId: modoEdicao ? initialPayload?.agendamentoId : undefined,
          ignoreBloqueioId: modoEdicaoBloqueio ? initialPayload?.bloqueioId : undefined,
          permitirEncaixeSemIntervalo:
            tipoAtendimento === "bloqueio"
              ? true
              : permitirEncaixeSemIntervalo,
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
    tipoAtendimento,
    permitirEncaixeSemIntervalo,
    initialPayload?.agendamentoId,
    initialPayload?.bloqueioId,
    disponibilidadeVersao,
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

    const buscarPorNome = query.length >= 2;
    const buscarPorTelefone = digits.length >= 2;

    return clientes
      .filter((cliente) => {
        const nomeCorresponde =
          buscarPorNome && normalizarTexto(cliente.nome).includes(query);
        const telefoneCorresponde =
          buscarPorTelefone &&
          (onlyDigits(cliente.telefone).includes(digits) ||
            onlyDigits(cliente.whatsapp || "").includes(digits));

        return nomeCorresponde || telefoneCorresponde;
      })
      .sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR", {
          sensitivity: "base",
          numeric: true,
        }),
      )
      .slice(0, 8);
  }, [buscaCliente, clientes]);

  const servicosFiltrados = useMemo(() => {
    const query = normalizarTexto(buscaServico);
    const lista = query
      ? servicos.filter((servico) => {
          return (
            normalizarTexto(servico.nome).includes(query) ||
            normalizarTexto(servico.categoria).includes(query)
          );
        })
      : servicos;

    return [...lista].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR", {
        sensitivity: "base",
        numeric: true,
      }),
    );
  }, [buscaServico, servicos]);

  const servicoSelecionado = useMemo(() => {
    if (!servicoSelecionadoId) return null;

    return (
      servicos.find(
        (servico) => String(servico.id) === String(servicoSelecionadoId),
      ) || null
    );
  }, [servicoSelecionadoId, servicos]);

  const horariosDisponiveis = horarios.filter((item) => item.disponivel);
  const horariosOcupados = horarios.filter((item) => !item.disponivel).slice(0, 8);
  const horarioSelecionadoNaDisponibilidade = hora
    ? horarios.find((item) => item.hora === hora)
    : undefined;
  const horarioSelecionadoForaDaLista = Boolean(
    hora && !horariosDisponiveis.some((item) => item.hora === hora),
  );
  const total = parseCurrency(valor);

  function selecionarServico(servico: ServicoAgenda) {
    setServicoSelecionadoId(String(servico.id));
    setBuscaServico(servico.nome);
    setProcedimento(servico.nome);
    setMostrarListaServicos(false);
    setDuracao(formatarDuracao(servico.duracaoPadrao));
    setValor(
      naturezaAtendimento === "RETORNO"
        ? ""
        : servico.valorPadrao > 0
          ? servico.valorPadrao.toFixed(2).replace(".", ",")
          : "",
    );
    setErro("");
  }

  function alterarBuscaServico(value: string) {
    setBuscaServico(value);
    setMostrarListaServicos(true);
    setErro("");

    if (
      !servicoSelecionado ||
      normalizarTexto(value) !== normalizarTexto(servicoSelecionado.nome)
    ) {
      setServicoSelecionadoId("");
      setProcedimento("");
    }
  }

  function alterarNaturezaAtendimento(
    novaNatureza: "PROCEDIMENTO" | "RETORNO",
  ) {
    setNaturezaAtendimento(novaNatureza);
    setErro("");

    if (novaNatureza === "RETORNO") {
      setTipoCliente("existente");
      setValor("");
      setSinalPago(false);
      setRecorrenciaTipo("nenhuma");
      setBloqueioAteData("");
      return;
    }

    setAgendamentoOrigemId("");
    setValor(
      servicoSelecionado && servicoSelecionado.valorPadrao > 0
        ? servicoSelecionado.valorPadrao.toFixed(2).replace(".", ",")
        : "",
    );
  }

  function aplicarAreasPadrao() {
    setAreaEstetica(areaAutomaticaAtiva === "estetica");
    setAreaCilios(areaAutomaticaAtiva === "cilios");
  }

  function selecionarCliente(cliente: Cliente) {
    setClienteId(String(cliente.id));
    setTipoCliente("existente");
    setBuscaCliente("");
    setAreaEstetica(
      cliente.areaEstetica || areaAutomaticaAtiva === "estetica",
    );
    setAreaCilios(
      cliente.areaCilios || areaAutomaticaAtiva === "cilios",
    );
    setErro("");
  }

  function iniciarNovoCliente() {
    setTipoCliente("novo");
    aplicarAreasPadrao();

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
    aplicarAreasPadrao();
    setErro("");
  }

  if (!open) return null;

  function direcionarParaOutroHorario() {
    setHora("");
    setDisponibilidadeVersao((versao) => versao + 1);

    requestAnimationFrame(() => {
      conteudoScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      document.getElementById("novo-agendamento-hora")?.focus();
    });
  }

  async function salvar() {
    setErro("");
    setErroTitulo("Verifique os dados");
    setErroAcaoHorario(false);

    if (!profissionalId && profissionais.length > 0) {
      setErro("Selecione a profissional da agenda.");
      return;
    }

    if (!data || !hora) {
      setErro("Preencha data e horário.");
      return;
    }

    const horarioSelecionado = horarios.find((item) => item.hora === hora);

    if (horarioSelecionado && !horarioSelecionado.disponivel) {
      if (horarioSelecionado.tipo === "intervalo") {
        setErroTitulo("Intervalo entre atendimentos");
        setErro(
          `${horarioSelecionado.motivo || `Este horário está dentro do intervalo padrão de ${intervaloEntreAtendimentos} minutos entre compromissos.`} Ative “Permitir encaixe sem intervalo” se quiser usar este horário excepcionalmente.`,
        );
      } else {
        setErroTitulo("Horário indisponível");
        setErro(
          `O horário ${hora} está ocupado por ${horarioSelecionado.motivo || "outro compromisso"}. Escolha outro horário disponível.`,
        );
      }
      setErroAcaoHorario(true);
      direcionarParaOutroHorario();
      return;
    }

    const dataCompleta = `${data}T${hora}:00`;
    const duracaoNumerica = interpretarDuracao(duracao);
    const recorrencia = {
      tipo: recorrenciaTipo,
      intervalo: Math.max(1, Number(recorrenciaIntervalo) || 1),
      unidade: recorrenciaUnidade,
      ocorrencias: Math.min(52, Math.max(2, Number(recorrenciaOcorrencias) || 4)),
    } as const;

    if (tipoAtendimento === "bloqueio") {
      if (!motivoBloqueio.trim()) {
        setErro("Informe o motivo do bloqueio.");
        return;
      }

      // Bloqueio por período: converte "de 3 a 8" na repetição diária que o
      // servidor já sabe criar (a cada 1 dia, N ocorrências).
      let recorrenciaBloqueio: typeof recorrencia | { tipo: "nenhuma" } =
        recorrencia;

      if (!modoEdicaoBloqueio && bloqueioAteData) {
        const diaInicial = new Date(`${data}T12:00:00`);
        const diaFinal = new Date(`${bloqueioAteData}T12:00:00`);

        if (Number.isNaN(diaFinal.getTime())) {
          setErro("Data final do bloqueio inválida.");
          return;
        }

        if (diaFinal < diaInicial) {
          setErro("A data final do bloqueio deve ser igual ou depois da inicial.");
          return;
        }

        const totalDias =
          Math.round(
            (diaFinal.getTime() - diaInicial.getTime()) / (24 * 60 * 60 * 1000),
          ) + 1;

        if (totalDias > 60) {
          setErro("O período do bloqueio não pode passar de 60 dias.");
          return;
        }

        recorrenciaBloqueio =
          totalDias > 1
            ? {
                tipo: "personalizada" as const,
                intervalo: 1,
                unidade: "dias" as const,
                ocorrencias: totalDias,
              }
            : { tipo: "nenhuma" as const };
      }

      setSalvando(true);

      try {
        const payloadBloqueio = {
          profissionalId: Number(profissionalId),
          data: dataCompleta,
          duracao: duracaoNumerica,
          motivo: motivoBloqueio,
          observacoes,
          recorrencia: modoEdicaoBloqueio
            ? { tipo: "nenhuma" as const }
            : recorrenciaBloqueio,
        };

        const resultadoBloqueio =
          modoEdicaoBloqueio && initialPayload?.bloqueioId
            ? await atualizarBloqueioAgenda({
                id: initialPayload.bloqueioId,
                ...payloadBloqueio,
              })
            : await criarBloqueioAgenda(payloadBloqueio);

        if (!resultadoBloqueio.ok) {
          setSalvando(false);
          setErroTitulo(resultadoBloqueio.titulo);
          setErro(resultadoBloqueio.mensagem);
          setErroAcaoHorario(resultadoBloqueio.campo === "hora");

          if (resultadoBloqueio.campo === "hora") {
            direcionarParaOutroHorario();
          }

          return;
        }

        // Sem isto, salvar fechava e recarregava a pagina na hora - dava a
        // impressao de que nada tinha acontecido, ja que o reload demora um
        // instante para comecar.
        setSalvando(false);
        setSucesso(true);
        setAvisoSucesso(resultadoBloqueio.aviso || null);
        router.refresh();

        setTimeout(
          () => {
            onClose();
          },
          resultadoBloqueio.aviso ? 4000 : 1400,
        );
      } catch (error) {
        setSalvando(false);
        setErroTitulo("Não foi possível salvar o bloqueio");
        setErro(
          mensagemErroSeguro(
            error,
            "Ocorreu um erro inesperado ao salvar o bloqueio. Revise os dados e tente novamente.",
          ),
        );
      }

      return;
    }

    if (!servicoSelecionadoId || !procedimento) {
      setErro("Digite e selecione um procedimento cadastrado na lista.");
      return;
    }

    if (naturezaAtendimento === "RETORNO" && tipoCliente !== "existente") {
      setErro("O retorno deve ser vinculado a um cliente já cadastrado.");
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
        valor:
          naturezaAtendimento === "RETORNO"
            ? 0
            : parseCurrency(valor),
        status,
        observacoes,
        sinalPago:
          naturezaAtendimento === "RETORNO" ? false : sinalPago,
        naturezaAtendimento,
        agendamentoOrigemId:
          naturezaAtendimento === "RETORNO" && agendamentoOrigemId
            ? Number(agendamentoOrigemId)
            : undefined,
        areaEstetica,
        areaCilios,
        recorrencia:
          modoEdicao || naturezaAtendimento === "RETORNO"
            ? { tipo: "nenhuma" as const }
            : recorrencia,
        excecaoHorarioFuncionamento: excecaoHorario,
        permitirEncaixeSemIntervalo,
      };

      const resultado =
        modoEdicao && initialPayload?.agendamentoId
          ? await atualizarAgendamento({
              id: initialPayload.agendamentoId,
              ...payload,
            })
          : await criarAgendamento(payload);

      if (!resultado.ok) {
        setSalvando(false);
        setErroTitulo(resultado.titulo);
        setErro(resultado.mensagem);
        setErroAcaoHorario(resultado.campo === "hora");

        if (resultado.campo === "hora") {
          direcionarParaOutroHorario();
        }

        return;
      }

      // Sem isto, salvar fechava e recarregava a pagina na hora - dava a
      // impressao de que nada tinha acontecido, ja que o reload demora um
      // instante para comecar.
      setSalvando(false);
      setSucesso(true);
      router.refresh();

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (error) {
      setSalvando(false);
      setErroTitulo("Não foi possível salvar o agendamento");
      setErroAcaoHorario(false);
      setErro(
        mensagemErroSeguro(
          error,
          "Ocorreu um erro inesperado ao salvar. Nenhum agendamento foi criado. Revise os dados e tente novamente.",
        ),
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
      setSucesso(true);
      router.refresh();

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (error) {
      setSalvando(false);
      setErroTitulo("Não foi possível excluir o bloqueio");
      setErro(
        mensagemErroSeguro(
          error,
          "Ocorreu um erro inesperado ao excluir o bloqueio.",
        ),
      );
    }
  }


  async function excluirSerieBloqueioAtual(escopo: "seguintes" | "toda") {
    if (!modoEdicaoBloqueio || !initialPayload?.bloqueioId || !initialPayload?.serieId) {
      return;
    }

    const mensagem =
      escopo === "toda"
        ? "Excluir toda a série de bloqueios recorrentes?"
        : "Excluir este bloqueio e todas as próximas ocorrências da série?";

    if (!window.confirm(mensagem)) return;

    setSalvando(true);
    setErro("");

    try {
      await excluirSerieBloqueioAgenda({
        id: initialPayload.bloqueioId,
        escopo,
      });
      setSalvando(false);
      setSucesso(true);
      router.refresh();

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (error) {
      setSalvando(false);
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a série de bloqueios.",
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
                    : naturezaAtendimento === "RETORNO" || modoRetorno
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

        <div
          ref={conteudoScrollRef}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
        >
          {erro ? (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">{erroTitulo}</p>
                <p className="mt-1 leading-5">{erro}</p>
                {erroAcaoHorario ? (
                  <button
                    type="button"
                    onClick={direcionarParaOutroHorario}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/50 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-900/40"
                  >
                    <Clock3 size={14} />
                    Escolher outro horário
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <label className="min-w-0">
              <span className={labelClassName()}>Data</span>
              <div className="relative">
                <input
                  type="date"
                  value={data}
                  onChange={(event) => {
                    setData(event.target.value);
                    setHora("");
                    setErro("");
                    setErroAcaoHorario(false);
                  }}
                  className={`${fieldClassName()} pr-7`}
                />
                <CalendarDays
                  size={17}
                  className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </label>

            <label className="min-w-0">
              <span className={labelClassName()}>Hora início</span>
              {excecaoHorario ? (
                <div className="relative">
                  <input
                    type="time"
                    id="novo-agendamento-hora"
                    value={hora}
                    onChange={(event) => {
                      setHora(event.target.value);
                      setErro("");
                      setErroAcaoHorario(false);
                    }}
                    className={`${fieldClassName()} pr-7`}
                  />
                  <Clock3
                    size={18}
                    className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              ) : (
                <div className="relative">
                  <select
                    id="novo-agendamento-hora"
                    value={hora}
                    onChange={(event) => {
                      setHora(event.target.value);
                      setErro("");
                      setErroAcaoHorario(false);
                    }}
                    className={`${fieldClassName()} appearance-none pr-7`}
                    aria-busy={isLoadingHorarios}
                  >
                    <option value="">
                      {isLoadingHorarios
                        ? "Carregando horários..."
                        : horariosDisponiveis.length > 0
                          ? "Selecione"
                          : "Nenhum horário livre"}
                    </option>
                    {horarioSelecionadoForaDaLista ? (
                      <option
                        value={hora}
                        disabled={Boolean(
                          horarioSelecionadoNaDisponibilidade &&
                            !horarioSelecionadoNaDisponibilidade.disponivel,
                        )}
                      >
                        {hora}
                        {horarioSelecionadoNaDisponibilidade &&
                        !horarioSelecionadoNaDisponibilidade.disponivel
                          ? " · indisponível"
                          : " · horário selecionado"}
                      </option>
                    ) : null}
                    {horariosDisponiveis.map((item) => (
                      <option key={item.hora} value={item.hora}>
                        {item.hora}
                        {item.encaixe ? " · encaixe" : ""}
                      </option>
                    ))}
                  </select>
                  <Clock3
                    size={18}
                    className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              )}
            </label>

            <label className="col-span-2 min-w-0">
              <span className={labelClassName()}>Profissional</span>
              <div className="relative">
                <select
                  value={profissionalId}
                  onChange={(event) => {
                    setProfissionalId(event.target.value);
                    setHora("");
                    setErro("");
                    setErroAcaoHorario(false);
                  }}
                  className={`${fieldClassName()} appearance-none pr-7`}
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

          <details className="group mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/40">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-sm font-bold text-slate-700 outline-none transition hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-2">
                <Clock3 size={16} className="shrink-0 text-amber-600 dark:text-amber-300" />
                <span>Opções avançadas</span>
              </span>

              <span className="flex shrink-0 items-center gap-2">
                {quantidadeOpcoesAvancadasAtivas > 0 ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
                    {quantidadeOpcoesAvancadasAtivas}{" "}
                    {quantidadeOpcoesAvancadasAtivas === 1 ? "ativa" : "ativas"}
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400">
                    Opcional
                  </span>
                )}

                <ChevronDown
                  size={16}
                  className="text-slate-400 transition-transform group-open:rotate-180"
                />
              </span>
            </summary>

            <div className="space-y-2.5 border-t border-slate-200 p-3 dark:border-slate-700">
              <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm dark:border-amber-400/20 dark:bg-amber-400/10">
                <span className="min-w-0">
                  <span className="block font-bold text-amber-950 dark:text-amber-100">
                    Atendimento fora do horário
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-amber-800/80 dark:text-amber-100/70">
                    Use somente para uma exceção pontual fora do horário normal da clínica.
                  </span>
                </span>

                <input
                  type="checkbox"
                  checked={excecaoHorario}
                  onChange={(event) => {
                    setExcecaoHorario(event.target.checked);
                    setHora("");
                    setErro("");
                    setErroAcaoHorario(false);
                  }}
                  className="mt-0.5 size-5 shrink-0 accent-amber-600"
                />
              </label>

              {tipoAtendimento === "agendamento" &&
              intervaloEntreAtendimentos > 0 ? (
                <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm dark:border-amber-400/20 dark:bg-amber-400/10">
                  <span className="min-w-0">
                    <span className="block font-bold text-amber-950 dark:text-amber-100">
                      Permitir encaixe sem intervalo de{" "}
                      {intervaloEntreAtendimentos} min
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-amber-800/80 dark:text-amber-100/70">
                      O padrão reserva {intervaloEntreAtendimentos} minutos entre
                      compromissos. Ative somente para um encaixe excepcional.
                      Sobreposição real continua bloqueada.
                    </span>
                  </span>

                  <input
                    type="checkbox"
                    checked={permitirEncaixeSemIntervalo}
                    onChange={(event) => {
                      setPermitirEncaixeSemIntervalo(event.target.checked);
                      setHora("");
                      setErro("");
                      setErroAcaoHorario(false);
                    }}
                    className="mt-0.5 size-5 shrink-0 accent-amber-600"
                  />
                </label>
              ) : null}
            </div>
          </details>

          {horarioSelecionadoNaDisponibilidade?.encaixe ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
              Encaixe selecionado: este horário não terá o intervalo padrão de{" "}
              {intervaloEntreAtendimentos} minutos entre compromissos.
            </div>
          ) : null}

          {initialPayload?.hora && !modoEdicao && !modoEdicaoBloqueio ? (
            <p className="mt-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
              O horário clicado foi preenchido como sugestão. Você pode alterar
              a data, o horário e a profissional antes de salvar.
            </p>
          ) : null}

          {tipoAtendimento === "agendamento" ? (
            <>
          <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40">
            <span className={labelClassName()}>Tipo do atendimento</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => alterarNaturezaAtendimento("PROCEDIMENTO")}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${
                  naturezaAtendimento === "PROCEDIMENTO"
                    ? "border-violet-500 bg-violet-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                <CalendarDays size={16} />
                Procedimento
              </button>
              <button
                type="button"
                onClick={() => alterarNaturezaAtendimento("RETORNO")}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition ${
                  naturezaAtendimento === "RETORNO"
                    ? "border-cyan-500 bg-cyan-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                <RotateCcw size={16} />
                Retorno
              </button>
            </div>
            {naturezaAtendimento === "RETORNO" ? (
              <p className="mt-2.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs leading-5 text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200">
                Use o procedimento original. O retorno será salvo separadamente, com valor zero, sem sinal e sem receita de serviço.
              </p>
            ) : null}
          </section>

          <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <span className={labelClassName()}>Cliente</span>

              {!clienteBloqueado &&
              naturezaAtendimento === "PROCEDIMENTO" &&
              tipoCliente === "existente" &&
              !clienteSelecionado ? (
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
                      aplicarAreasPadrao();
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
                  placeholder="Nome, telefone ou WhatsApp"
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
                            onClick={() => selecionarCliente(cliente)}
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

                        {naturezaAtendimento === "PROCEDIMENTO" ? (
                          <button
                            type="button"
                            onClick={iniciarNovoCliente}
                            className="flex w-full items-center justify-center gap-2 bg-emerald-600 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-emerald-700"
                          >
                            <UserPlus size={14} />
                            Adicionar novo cliente
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <div className="p-3">
                        <p className="mb-2 text-center text-xs text-slate-500">
                          Nenhum cliente encontrado.
                        </p>
                        {naturezaAtendimento === "PROCEDIMENTO" ? (
                          <button
                            type="button"
                            onClick={iniciarNovoCliente}
                            className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-emerald-700"
                          >
                            <UserPlus size={14} />
                            Adicionar cliente
                          </button>
                        ) : (
                          <p className="text-center text-[11px] font-medium text-cyan-700 dark:text-cyan-300">
                            O retorno precisa de um cliente já cadastrado.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                Área da cliente
              </span>
              {areaAutomaticaAtiva ? (
                <span className="text-[11px] font-medium text-violet-700 dark:text-violet-300">
                  Padrão automático: {areaAutomaticaAtiva === "estetica" ? "Estética" : "Cílios"}
                </span>
              ) : null}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={areaEstetica}
                  disabled={areaAutomaticaAtiva === "estetica"}
                  onChange={(event) => setAreaEstetica(event.target.checked)}
                  className="size-4 accent-violet-600 disabled:cursor-not-allowed"
                />
                Estética
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={areaCilios}
                  disabled={areaAutomaticaAtiva === "cilios"}
                  onChange={(event) => setAreaCilios(event.target.checked)}
                  className="size-4 accent-violet-600 disabled:cursor-not-allowed"
                />
                Cílios
              </label>
            </div>

            <p className="mt-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
              Ao salvar, as áreas marcadas serão acrescentadas ao cadastro da cliente. Áreas já cadastradas não serão removidas nesta tela.
            </p>
          </div>

          <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div className="grid grid-cols-[1fr_auto] items-end gap-4">
              <label className="min-w-0">
                <span className={labelClassName()}>Procedimento</span>
                <div ref={servicoComboboxRef} className="relative">
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={buscaServico}
                      onFocus={() => setMostrarListaServicos(true)}
                      onChange={(event) => alterarBuscaServico(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          setMostrarListaServicos(false);
                          event.currentTarget.blur();
                        }
                      }}
                      placeholder="Digite para buscar um procedimento"
                      autoComplete="off"
                      role="combobox"
                      aria-expanded={mostrarListaServicos}
                      aria-controls="lista-procedimentos-agenda"
                      className={`${fieldClassName()} pl-6 pr-7`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setMostrarListaServicos((atual) => !atual)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-violet-600 dark:hover:text-violet-400"
                      aria-label="Mostrar procedimentos"
                    >
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${mostrarListaServicos ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>

                  {mostrarListaServicos ? (
                    <div
                      id="lista-procedimentos-agenda"
                      role="listbox"
                      className="absolute z-50 mt-2 max-h-64 w-full overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                    >
                      {servicosFiltrados.length > 0 ? (
                        servicosFiltrados.map((servico) => {
                          const selecionado =
                            String(servico.id) === String(servicoSelecionadoId);

                          return (
                            <button
                              key={servico.id}
                              type="button"
                              role="option"
                              aria-selected={selecionado}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => selecionarServico(servico)}
                              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                                selecionado
                                  ? "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                              }`}
                            >
                              <span className="min-w-0">
                                <strong className="block truncate text-sm font-semibold">
                                  {servico.nome}
                                </strong>
                                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                                  {servico.categoria || "Sem categoria"} · {formatarDuracao(servico.duracaoPadrao)}
                                </span>
                              </span>

                              <span className="shrink-0 text-xs font-semibold">
                                {servico.valorPadrao > 0
                                  ? formatCurrency(servico.valorPadrao)
                                  : "Sem valor"}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                          Nenhum procedimento cadastrado encontrado.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {servicoSelecionado ? (
                  <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={13} />
                    Procedimento selecionado
                  </span>
                ) : buscaServico ? (
                  <span className="mt-1.5 block text-xs text-amber-600 dark:text-amber-400">
                    Selecione uma opção da lista para continuar.
                  </span>
                ) : null}
              </label>

              <div className="pb-2 text-right">
                <span className="block text-[11px] text-slate-500">Total</span>
                <strong className="whitespace-nowrap text-base text-slate-800 dark:text-white">
                  {formatCurrency(total)}
                </strong>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClassName()}>
                  Duração baseada no procedimento
                </span>
                <div className="relative">
                  <input
                    value={duracao}
                    onChange={(event) => {
                      setDuracao(event.target.value);
                      setErro("");
                    }}
                    onBlur={() => setDuracao(formatarDuracao(interpretarDuracao(duracao)))}
                    onFocus={(event) => event.currentTarget.select()}
                    inputMode="decimal"
                    placeholder="Ex: 6 horas"
                    aria-label="Duração do atendimento"
                    className={fieldClassName()}
                  />
                </div>
                <span className="mt-1.5 block text-[11px] text-slate-500 dark:text-slate-400">
                  Preenchida pelo cadastro do procedimento. A alteração vale somente para este atendimento.
                </span>
              </label>

              <label>
                <span className={labelClassName()}>
                  {naturezaAtendimento === "RETORNO"
                    ? "Valor do retorno"
                    : "Valor previsto"}
                </span>
                <input
                  value={valor}
                  disabled={naturezaAtendimento === "RETORNO"}
                  onChange={(event) =>
                    setValor(formatCurrencyInput(event.target.value))
                  }
                  placeholder="0,00"
                  className={`${fieldClassName()} disabled:cursor-not-allowed disabled:opacity-70`}
                />
                {naturezaAtendimento === "RETORNO" ? (
                  <span className="mt-1.5 block text-[11px] font-medium text-cyan-700 dark:text-cyan-300">
                    R$ 0,00, não gera receita de serviço.
                  </span>
                ) : null}
              </label>
            </div>

            {naturezaAtendimento === "PROCEDIMENTO" ? (
              <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <span>
                  <span className="block text-sm font-bold text-emerald-800 dark:text-emerald-200">
                    Pagou sinal
                  </span>
                  <span className="mt-0.5 block text-xs text-emerald-700/80 dark:text-emerald-300/80">
                    Exibe um marcador visível diretamente na agenda.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={sinalPago}
                  onChange={(event) => setSinalPago(event.target.checked)}
                  className="size-5 shrink-0 accent-emerald-600"
                />
              </label>
            ) : null}

            {!modoEdicao && naturezaAtendimento === "PROCEDIMENTO" ? (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <Repeat2 size={16} className="text-violet-600 dark:text-violet-300" />
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                    Repetição
                  </span>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className={labelClassName()}>Repetir</span>
                    <div className="relative">
                      <select
                        value={recorrenciaTipo}
                        onChange={(event) =>
                          setRecorrenciaTipo(
                            event.target.value as typeof recorrenciaTipo,
                          )
                        }
                        className={`${fieldClassName()} appearance-none pr-7`}
                      >
                        <option value="nenhuma">Não repetir</option>
                        <option value="semanal">Semanal</option>
                        <option value="quinzenal">Quinzenal</option>
                        <option value="mensal">Mensal</option>
                        <option value="personalizada">Personalizado</option>
                      </select>
                      <ChevronDown
                        size={15}
                        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                    </div>
                  </label>

                  {recorrenciaTipo !== "nenhuma" ? (
                    <label>
                      <span className={labelClassName()}>Quantidade de ocorrências</span>
                      <input
                        type="number"
                        min={2}
                        max={52}
                        value={recorrenciaOcorrencias}
                        onChange={(event) =>
                          setRecorrenciaOcorrencias(event.target.value)
                        }
                        className={fieldClassName()}
                      />
                    </label>
                  ) : null}

                  {recorrenciaTipo === "personalizada" ? (
                    <>
                      <label>
                        <span className={labelClassName()}>A cada</span>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          value={recorrenciaIntervalo}
                          onChange={(event) =>
                            setRecorrenciaIntervalo(event.target.value)
                          }
                          className={fieldClassName()}
                        />
                      </label>

                      <label>
                        <span className={labelClassName()}>Unidade</span>
                        <div className="relative">
                          <select
                            value={recorrenciaUnidade}
                            onChange={(event) =>
                              setRecorrenciaUnidade(
                                event.target.value as typeof recorrenciaUnidade,
                              )
                            }
                            className={`${fieldClassName()} appearance-none pr-7`}
                          >
                            <option value="dias">dia(s)</option>
                            <option value="semanas">semana(s)</option>
                            <option value="meses">mês(es)</option>
                          </select>
                          <ChevronDown
                            size={15}
                            className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                          />
                        </div>
                      </label>
                    </>
                  ) : null}
                </div>

                {recorrenciaTipo !== "nenhuma" ? (
                  <p className="mt-3 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                    O sistema valida todos os horários antes de criar a série. Se qualquer ocorrência conflitar com outro atendimento ou bloqueio, nada será criado.
                  </p>
                ) : null}
              </div>
            ) : null}

            {horariosOcupados.length > 0 ? (
              <details className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
                <summary className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Ver horários indisponíveis
                  {isLoadingHorarios ? " · atualizando..." : ""}
                </summary>

                <div className="mt-2 space-y-1">
                  {horariosOcupados.map((item) => (
                    <div
                      key={item.hora}
                      className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs ${
                        item.tipo === "intervalo"
                          ? "bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-100"
                          : "text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <span className="font-bold">{item.hora}</span>
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
                  <input
                    value={duracao}
                    onChange={(event) => setDuracao(event.target.value)}
                    onBlur={() =>
                      setDuracao(formatarDuracao(interpretarDuracao(duracao)))
                    }
                    onFocus={(event) => event.currentTarget.select()}
                    inputMode="decimal"
                    placeholder="Ex: 2 horas"
                    aria-label="Duração do bloqueio"
                    className={fieldClassName()}
                  />
                </div>
              </label>

            {!modoEdicaoBloqueio ? (
              <label className="mt-4 block">
                <span className={labelClassName()}>
                  Bloquear até o dia (opcional)
                </span>
                <input
                  type="date"
                  value={bloqueioAteData}
                  min={data}
                  onChange={(event) => setBloqueioAteData(event.target.value)}
                  className={fieldClassName()}
                />
                <span className="mt-1 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                  {bloqueioAteData && bloqueioAteData !== data
                    ? "O mesmo bloqueio será criado em todos os dias do período, incluindo o primeiro e o último."
                    : "Deixe em branco para bloquear só o dia escolhido acima. Para férias ou viagem, informe o último dia."}
                </span>
              </label>
            ) : null}

            {!modoEdicaoBloqueio && !bloqueioAteData ? (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <Repeat2 size={16} className="text-violet-600 dark:text-violet-300" />
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                    Repetição
                  </span>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className={labelClassName()}>Repetir</span>
                    <div className="relative">
                      <select
                        value={recorrenciaTipo}
                        onChange={(event) =>
                          setRecorrenciaTipo(
                            event.target.value as typeof recorrenciaTipo,
                          )
                        }
                        className={`${fieldClassName()} appearance-none pr-7`}
                      >
                        <option value="nenhuma">Não repetir</option>
                        <option value="semanal">Semanal</option>
                        <option value="quinzenal">Quinzenal</option>
                        <option value="mensal">Mensal</option>
                        <option value="personalizada">Personalizado</option>
                      </select>
                      <ChevronDown
                        size={15}
                        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                    </div>
                  </label>

                  {recorrenciaTipo !== "nenhuma" ? (
                    <label>
                      <span className={labelClassName()}>Quantidade de ocorrências</span>
                      <input
                        type="number"
                        min={2}
                        max={52}
                        value={recorrenciaOcorrencias}
                        onChange={(event) =>
                          setRecorrenciaOcorrencias(event.target.value)
                        }
                        className={fieldClassName()}
                      />
                    </label>
                  ) : null}

                  {recorrenciaTipo === "personalizada" ? (
                    <>
                      <label>
                        <span className={labelClassName()}>A cada</span>
                        <input
                          type="number"
                          min={1}
                          max={90}
                          value={recorrenciaIntervalo}
                          onChange={(event) =>
                            setRecorrenciaIntervalo(event.target.value)
                          }
                          className={fieldClassName()}
                        />
                      </label>

                      <label>
                        <span className={labelClassName()}>Unidade</span>
                        <div className="relative">
                          <select
                            value={recorrenciaUnidade}
                            onChange={(event) =>
                              setRecorrenciaUnidade(
                                event.target.value as typeof recorrenciaUnidade,
                              )
                            }
                            className={`${fieldClassName()} appearance-none pr-7`}
                          >
                            <option value="dias">dia(s)</option>
                            <option value="semanas">semana(s)</option>
                            <option value="meses">mês(es)</option>
                          </select>
                          <ChevronDown
                            size={15}
                            className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500"
                          />
                        </div>
                      </label>
                    </>
                  ) : null}
                </div>

                {recorrenciaTipo !== "nenhuma" ? (
                  <p className="mt-3 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                    O sistema valida todos os horários antes de criar a série. Se qualquer ocorrência conflitar com outro atendimento ou bloqueio, nada será criado.
                  </p>
                ) : null}
              </div>
            ) : null}

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

              {modoEdicaoBloqueio && initialPayload?.serieId ? (
                <div className="mt-5 rounded-md border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-500/30 dark:bg-violet-950/20">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">
                    <Repeat2 size={14} />
                    Bloqueio recorrente
                    {initialPayload.recorrenciaIndice && initialPayload.recorrenciaTotal
                      ? ` ${initialPayload.recorrenciaIndice}/${initialPayload.recorrenciaTotal}`
                      : ""}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-violet-700 dark:text-violet-300">
                    A edição altera somente esta ocorrência. Você também pode remover as próximas ocorrências ou toda a série.
                  </p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => excluirSerieBloqueioAtual("seguintes")}
                      disabled={salvando}
                      className="h-9 rounded-md border border-violet-200 bg-white px-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 dark:bg-slate-900"
                    >
                      Excluir este e próximos
                    </button>
                    <button
                      type="button"
                      onClick={() => excluirSerieBloqueioAtual("toda")}
                      disabled={salvando}
                      className="h-9 rounded-md border border-rose-200 bg-white px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:bg-slate-900"
                    >
                      Excluir série inteira
                    </button>
                  </div>
                </div>
              ) : null}

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

        {sucesso ? (
          <footer className="flex shrink-0 flex-col items-center gap-1.5 border-t border-emerald-200 bg-emerald-50 px-4 py-4 text-center dark:border-emerald-500/30 dark:bg-emerald-950/30 sm:px-5">
            <div className="flex items-center gap-2 text-sm font-bold uppercase text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 size={20} />
              Salvo com sucesso
            </div>

            {avisoSucesso ? (
              <p className="max-w-md text-xs normal-case leading-5 text-emerald-700 dark:text-emerald-300">
                {avisoSucesso}
              </p>
            ) : null}
          </footer>
        ) : (
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
        )}
      </div>
    </div>
  );
}