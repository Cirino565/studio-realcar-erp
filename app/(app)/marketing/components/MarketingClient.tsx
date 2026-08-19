"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import ProcedimentoSearchSelect from "@/components/clientes/ProcedimentoSearchSelect";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Copy,
  DollarSign,
  ExternalLink,
  FileText,
  Filter,
  History,
  Link2,
  Megaphone,
  Hash,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";

import { buscarDisponibilidadeAgenda } from "@/actions/agendamento.actions";
import {
  agendarAvaliacaoLead,
  atualizarCampanha,
  atualizarChamouWhatsapp,
  atualizarEtapaLead,
  atualizarLead,
  converterLeadEmCliente,
  criarCampanha,
  criarLead,
  definirProximoContatoLead,
  excluirCampanha,
  excluirLead,
  marcarLeadPerdido,
  registrarContatoLead,
  registrarCustoCampanha,
  registrarObservacaoLead,
  registrarResultadoContatoLead,
  verificarTelefoneLead,
  vincularClienteCampanha,
  vincularLeadAOutroCliente,
  vincularReceitaCampanha,
} from "@/actions/marketing.actions";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";
import { formatarData, formatarDataHora, formatarMoeda } from "@/lib/format";
import {
  buildMarketingWhatsAppMessage,
  buildWhatsAppUrl,
  WHATSAPP_MARKETING_TEMPLATE_OPTIONS,
  type WhatsAppMarketingTemplateType,
} from "@/lib/whatsapp";
import type {
  CampanhaFormData,
  LeadEtapa,
  LeadFormData,
  MarketingCampanha,
  MarketingClienteOption,
  MarketingContaOption,
  MarketingLead,
  MarketingProfissional,
  MarketingReceitaOption,
  MarketingResumo,
  MarketingServico,
} from "../types";
import { CAMPANHA_CANAIS, CAMPANHA_STATUS, LEAD_ETAPAS } from "../types";

type Props = {
  leads: MarketingLead[];
  campanhas: MarketingCampanha[];
  procedimentosInteresse: string[];
  clientes: MarketingClienteOption[];
  contas: MarketingContaOption[];
  receitasSemCampanha: MarketingReceitaOption[];
  profissionais: MarketingProfissional[];
  servicos: MarketingServico[];
  podeGerenciarMarketing: boolean;
  podeGerenciarAgenda: boolean;
};

type TabKey = "pipeline" | "campanhas" | "mensagens";

type ConflitoTelefoneLead = {
  dados: LeadFormData;
  clienteExistente: {
    id: number;
    nome: string;
    telefone: string;
    whatsapp: string | null;
  } | null;
  leadAtivo: {
    id: number;
    nome: string;
    telefone: string | null;
    etapa: string;
  } | null;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "pipeline", label: "Pipeline" },
  { key: "campanhas", label: "Campanhas" },
  { key: "mensagens", label: "Mensagens" },
];

function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function somenteDigitos(value: string) {
  return value.replace(/\D/g, "");
}

// Formata o telefone enquanto a pessoa digita: "11991234567" vira
// "(11) 99123-4567". Segue o mesmo padrao ja usado na importacao de
// clientes, so que de forma progressiva a cada tecla.
function formatarTelefoneDigitado(valorDigitado: string) {
  const digitos = somenteDigitos(valorDigitado).slice(0, 11);

  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

// Mascara de valor em reais: os digitos digitados sao sempre lidos como
// centavos, entao "15000" vira "150,00" - o mesmo padrao de aplicativo de
// banco. Funciona bem mesmo colando um valor, sem depender da posicao do
// cursor.
function digitosParaReais(valorDigitado: string) {
  const digitos = somenteDigitos(valorDigitado).slice(0, 9);
  return Number(digitos || "0") / 100;
}

function formatarReaisExibicao(valor: number) {
  return (valor || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ValorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-300">
      {label}
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
          R$
        </span>
        <input
          inputMode="numeric"
          value={formatarReaisExibicao(value)}
          onChange={(event) => onChange(digitosParaReais(event.target.value))}
          className="premium-input w-full pl-10"
        />
      </div>
    </label>
  );
}

// Busca tolerante: casa por texto (sem acento, sem caixa) e tambem por
// telefone ignorando pontuacao, para "(11) 94641-3388" e "11946413388"
// darem o mesmo resultado.
function filtrarPorBusca<T>(
  itens: T[],
  busca: string,
  obterTexto: (item: T) => string,
  obterTelefones: (item: T) => string = () => "",
) {
  const termo = normalizarTexto(busca).trim();
  const termoDigitos = somenteDigitos(busca);

  if (!termo && !termoDigitos) return itens;

  return itens.filter((item) => {
    if (termo && normalizarTexto(obterTexto(item)).includes(termo)) {
      return true;
    }

    if (termoDigitos.length >= 3) {
      const digitos = somenteDigitos(obterTelefones(item));
      if (digitos && digitos.includes(termoDigitos)) return true;
    }

    return false;
  });
}

function AvisoBusca({
  encontrados,
  exibidos,
  total,
  rotulo,
}: {
  encontrados: number;
  exibidos: number;
  total: number;
  rotulo: string;
}) {
  if (encontrados === 0) {
    return (
      <p className="text-xs leading-5 text-amber-200">
        Nenhum {rotulo} encontrado com esse termo. Tente parte do nome ou
        apenas os numeros do telefone.
      </p>
    );
  }

  if (encontrados > exibidos) {
    return (
      <p className="text-xs leading-5 text-slate-400">
        Mostrando {exibidos} de {encontrados} resultados. Digite mais letras
        para refinar.
      </p>
    );
  }

  return (
    <p className="text-xs leading-5 text-slate-400">
      {encontrados} de {total} exibidos.
    </p>
  );
}

function hojeInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function dataInput(value?: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dataFuturaEmDiasInput(dias: number) {
  const hoje = dataInput(new Date());
  const base = new Date(`${hoje}T12:00:00-03:00`);
  const alvo = new Date(
    base.getTime() + dias * 24 * 60 * 60 * 1000,
  );

  return dataInput(alvo);
}

type FilaContatoTipo = "atrasado" | "novo" | "hoje" | "sem_data";

type FilaContatoItem = {
  lead: MarketingLead;
  tipo: FilaContatoTipo;
  prioridade: number;
  label: string;
  detalhe: string;
  ordem: number;
};

function hojeSaoPauloInput() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function montarFilaContatoHoje(leads: MarketingLead[]): FilaContatoItem[] {
  const hoje = hojeSaoPauloInput();

  const itens = leads.flatMap<FilaContatoItem>((lead) => {
    if (lead.etapa !== "Novo" && lead.etapa !== "Aguardando resposta") {
      return [];
    }

    const dataProximoContato = lead.proximoContatoEm
      ? dataInput(lead.proximoContatoEm)
      : null;

    // Se existe uma data futura, o CRM respeita o combinado e nao incomoda
    // hoje. O lead reaparece automaticamente quando chegar o dia.
    if (dataProximoContato && dataProximoContato > hoje) {
      return [];
    }

    if (dataProximoContato && dataProximoContato < hoje) {
      return [{
        lead,
        tipo: "atrasado",
        prioridade: 0,
        label: "Atrasado",
        detalhe: `Retorno previsto para ${formatarData(lead.proximoContatoEm)}`,
        ordem: new Date(lead.proximoContatoEm!).getTime(),
      }];
    }

    if (lead.etapa === "Novo" && !dataProximoContato) {
      return [{
        lead,
        tipo: "novo",
        prioridade: 1,
        label: "Novo lead",
        detalhe: "Ainda precisa do primeiro acompanhamento",
        ordem: new Date(lead.createdAt).getTime(),
      }];
    }

    if (dataProximoContato === hoje) {
      return [{
        lead,
        tipo: "hoje",
        prioridade: 2,
        label: "Retorno hoje",
        detalhe: "Follow-up programado para hoje",
        ordem: new Date(lead.proximoContatoEm!).getTime(),
      }];
    }

    // Um lead em Aguardando resposta sem proxima data e um ponto cego.
    // Ele fica visivel ate que seja agendado um retorno, agendado,
    // convertido ou perdido.
    return [{
      lead,
      tipo: "sem_data",
      prioridade: 3,
      label: "Sem retorno",
      detalhe: "Aguardando resposta sem próximo contato programado",
      ordem: new Date(lead.createdAt).getTime(),
    }];
  });

  return itens.sort((a, b) => {
    if (a.prioridade !== b.prioridade) {
      return a.prioridade - b.prioridade;
    }

    return a.ordem - b.ordem;
  });
}

function contarTentativasSemResposta(lead: MarketingLead) {
  return lead.interacoes.filter((interacao) => {
    const descricao = normalizarTexto(interacao.descricao || "");

    return (
      interacao.tipo === "Tentativa sem resposta" ||
      descricao.includes("resultado do contato: nao respondeu")
    );
  }).length;
}

function calcularResumo(leads: MarketingLead[], campanhas: MarketingCampanha[]): MarketingResumo {
  const leadsConvertidos = leads.filter((lead) => lead.etapa === "Convertido").length;
  const leadsPerdidos = leads.filter((lead) => lead.etapa === "Perdido").length;
  const leadsAtivos = leads.filter((lead) => lead.etapa !== "Convertido" && lead.etapa !== "Perdido").length;

  // Agora este numero representa trabalho real para hoje:
  // atrasados + novos + retornos de hoje + aguardando sem data.
  // Follow-up futuro nao entra antes da hora.
  const leadsPendentesDeAcao = montarFilaContatoHoje(leads).length;
  const avaliacoesAgendadas = leads.filter((lead) => lead.agendamentoId && lead.etapa !== "Perdido").length;
  const pipelineTotal = leads.reduce((acc, lead) => acc + lead.valorPrevisto, 0);
  const pipelineAtivo = leads
    .filter((lead) => lead.etapa !== "Perdido" && lead.etapa !== "Convertido")
    .reduce((acc, lead) => acc + lead.valorPrevisto, 0);
  const investimentoTotal = campanhas.reduce((acc, campanha) => acc + campanha.investimento, 0);
  const custoRealTotal = campanhas.reduce((acc, campanha) => acc + campanha.metricas.custoReal, 0);
  const clientesAtribuidos = campanhas.reduce((acc, campanha) => acc + campanha.metricas.clientes, 0);
  const receitaRastreada = campanhas.reduce((acc, campanha) => acc + campanha.metricas.receitaBruta, 0);
  const receitaLiquida = campanhas.reduce((acc, campanha) => acc + campanha.metricas.receitaLiquida, 0);

  // So entram nessa conta os leads que vieram de clique de anuncio (tem
  // codigo de atendimento) - e exatamente o universo que a pergunta "quantos
  // codigos gerados viram conversa de verdade" precisa medir.
  const leadsComCodigo = leads.filter((lead) => Boolean(lead.codigoAtendimento));
  const leadsChamaramWhatsapp = leadsComCodigo.filter(
    (lead) => lead.chamouWhatsapp === "Chamou",
  ).length;

  return {
    totalLeads: leads.length,
    leadsAtivos,
    leadsPendentesDeAcao,
    leadsConvertidos,
    leadsPerdidos,
    avaliacoesAgendadas,
    pipelineTotal,
    pipelineAtivo,
    ticketMedioPrevisto: leads.length > 0 ? pipelineTotal / leads.length : 0,
    campanhasAtivas: campanhas.filter((campanha) => campanha.status === "Ativa").length,
    investimentoTotal,
    custoRealTotal,
    custoPorCliente: clientesAtribuidos > 0 ? custoRealTotal / clientesAtribuidos : 0,
    taxaConversao: leads.length > 0 ? (leadsConvertidos / leads.length) * 100 : 0,
    receitaRastreada,
    receitaLiquida,
    resultadoMarketing: receitaLiquida - custoRealTotal,
    leadsComCodigo: leadsComCodigo.length,
    leadsChamaramWhatsapp,
    taxaChamouWhatsapp:
      leadsComCodigo.length > 0
        ? (leadsChamaramWhatsapp / leadsComCodigo.length) * 100
        : null,
  };
}

function getOrigemLabel(value?: string | null) {
  return value?.trim() || "Origem não informada";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "SR";
}

function isLeadAberto(lead: MarketingLead) {
  return lead.etapa !== "Convertido" && lead.etapa !== "Perdido";
}

function followUpAtrasado(lead: MarketingLead) {
  if (!lead.proximoContatoEm || !isLeadAberto(lead)) return false;
  const limite = new Date();
  limite.setHours(23, 59, 59, 999);
  return new Date(lead.proximoContatoEm) < limite;
}

function gerarCsv(leads: MarketingLead[]) {
  const header = [
    "Nome",
    "Telefone",
    "Origem",
    "Campanha",
    "Interesse",
    "Etapa",
    "Valor previsto",
    "Receita rastreada",
    "Último contato",
    "Próximo contato",
    "Criado em",
    "Observações",
  ];
  const rows = leads.map((lead) => [
    lead.nome,
    lead.telefone || "",
    lead.origem || "",
    lead.campanha?.nome || "",
    lead.interesse || "",
    lead.etapa,
    String(lead.valorPrevisto).replace(".", ","),
    String(lead.receitaRastreada).replace(".", ","),
    lead.ultimoContatoEm ? formatarDataHora(lead.ultimoContatoEm) : "",
    lead.proximoContatoEm ? formatarData(lead.proximoContatoEm) : "",
    formatarData(lead.createdAt),
    lead.observacoes || "",
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
    .join("\n");
}

function baixarCsv(leads: MarketingLead[]) {
  const blob = new Blob([gerarCsv(leads)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "crm-comercial-studio-realcar.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function MarketingClient({
  leads,
  campanhas,
  procedimentosInteresse,
  clientes,
  contas,
  receitasSemCampanha,
  profissionais,
  servicos,
  podeGerenciarMarketing,
  podeGerenciarAgenda,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabKey>("pipeline");
  const [pipelineModo, setPipelineModo] =
    useState<"ativos" | "encerrados">("ativos");
  const [filaHojeAberta, setFilaHojeAberta] = useState(false);
  const [leadModal, setLeadModal] = useState(false);
  const [leadEditando, setLeadEditando] = useState<MarketingLead | null>(null);
  const [conflitoTelefone, setConflitoTelefone] = useState<ConflitoTelefoneLead | null>(null);
  const [campanhaModal, setCampanhaModal] = useState(false);
  const [campanhaEditando, setCampanhaEditando] = useState<MarketingCampanha | null>(null);
  const [leadTrocandoCliente, setLeadTrocandoCliente] = useState<MarketingLead | null>(null);
  const [mensagemModal, setMensagemModal] = useState<MarketingLead | null>(null);
  const [detalhesModal, setDetalhesModal] = useState<MarketingLead | null>(null);
  const [agendamentoModal, setAgendamentoModal] = useState<MarketingLead | null>(null);
  const [leadPerdaModal, setLeadPerdaModal] =
    useState<MarketingLead | null>(null);
  const [busca, setBusca] = useState("");
  const [etapaFiltro, setEtapaFiltro] = useState("todas");
  const [origemFiltro, setOrigemFiltro] = useState("todas");
  const [erro, setErro] = useState<string | null>(null);
  const [leadAcaoRapidaId, setLeadAcaoRapidaId] =
    useState<number | null>(null);

  useEffect(() => {
    if (detalhesModal) {
      const atualizado = leads.find((lead) => lead.id === detalhesModal.id);
      if (atualizado && atualizado !== detalhesModal) setDetalhesModal(atualizado);
    }
    if (mensagemModal) {
      const atualizado = leads.find((lead) => lead.id === mensagemModal.id);
      if (atualizado && atualizado !== mensagemModal) setMensagemModal(atualizado);
    }
    if (agendamentoModal) {
      const atualizado = leads.find((lead) => lead.id === agendamentoModal.id);
      if (atualizado && atualizado !== agendamentoModal) setAgendamentoModal(atualizado);
    }
  }, [leads, detalhesModal, mensagemModal, agendamentoModal]);

  const resumo = useMemo(() => calcularResumo(leads, campanhas), [campanhas, leads]);

  const resumoMotivosPerda = useMemo(() => {
    const perdidos = leads.filter(
      (lead) => lead.etapa === "Perdido",
    );

    const contagem = new Map<string, number>();

    for (const lead of perdidos) {
      const motivo =
        lead.motivoPerda?.trim() ||
        "Sem motivo informado";

      contagem.set(
        motivo,
        (contagem.get(motivo) || 0) + 1,
      );
    }

    const itens = Array.from(contagem.entries())
      .map(([motivo, quantidade]) => ({
        motivo,
        quantidade,
        percentual:
          perdidos.length > 0
            ? (quantidade / perdidos.length) * 100
            : 0,
      }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    return {
      total: perdidos.length,
      itens,
    };
  }, [leads]);

  const filaContatoHoje = useMemo(
    () => montarFilaContatoHoje(leads),
    [leads],
  );

  const resumoFilaHoje = useMemo(() => {
    return {
      atrasados: filaContatoHoje.filter((item) => item.tipo === "atrasado").length,
      novos: filaContatoHoje.filter((item) => item.tipo === "novo").length,
      hoje: filaContatoHoje.filter((item) => item.tipo === "hoje").length,
      semData: filaContatoHoje.filter((item) => item.tipo === "sem_data").length,
    };
  }, [filaContatoHoje]);

  const origens = useMemo(() => {
    const valores = new Set(leads.map((lead) => lead.origem).filter((item): item is string => Boolean(item)));
    return Array.from(valores).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [leads]);

  const buscaGlobalAtiva =
    busca.trim().length > 0;

  const etapasPipelineVisiveis = useMemo(() => {
    // Enquanto existe uma busca, ela ignora a separacao operacional
    // Ativos / Encerrados. A pesquisa precisa localizar qualquer lead.
    if (buscaGlobalAtiva) {
      return LEAD_ETAPAS;
    }

    return LEAD_ETAPAS.filter((etapa) => {
      const encerrada =
        etapa.value === "Convertido" ||
        etapa.value === "Perdido";

      return pipelineModo === "encerrados"
        ? encerrada
        : !encerrada;
    });
  }, [buscaGlobalAtiva, pipelineModo]);

  const leadsFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca.trim());

    return leads.filter((lead) => {
      const textoBusca = normalizarTexto(
        `${lead.nome} ${lead.telefone || ""} ${lead.origem || ""} ${lead.interesse || ""} ${lead.campanha?.nome || ""} ${lead.observacoes || ""} ${lead.codigoAtendimento || ""}`,
      );
      const matchesBusca = !termo || textoBusca.includes(termo);
      const matchesEtapa =
        etapaFiltro === "todas" ||
        lead.etapa === etapaFiltro;
      const matchesOrigem =
        origemFiltro === "todas" ||
        lead.origem === origemFiltro;

      const encerrado =
        lead.etapa === "Convertido" ||
        lead.etapa === "Perdido";

      const matchesModo =
        termo.length > 0
          ? true
          : pipelineModo === "encerrados"
            ? encerrado
            : !encerrado;

      return (
        matchesBusca &&
        matchesEtapa &&
        matchesOrigem &&
        matchesModo
      );
    });
  }, [
    busca,
    etapaFiltro,
    leads,
    origemFiltro,
    pipelineModo,
  ]);

  const leadsPorEtapa = useMemo(() => {
    const resultado = etapasPipelineVisiveis.map(
      (etapa) => ({
        ...etapa,
        leads: leadsFiltrados.filter(
          (lead) => lead.etapa === etapa.value,
        ),
      }),
    );

    // Na busca global nao faz sentido mostrar quatro colunas vazias.
    // Exibe apenas as etapas onde existe algum resultado.
    return buscaGlobalAtiva
      ? resultado.filter(
          (etapa) => etapa.leads.length > 0,
        )
      : resultado;
  }, [
    buscaGlobalAtiva,
    etapasPipelineVisiveis,
    leadsFiltrados,
  ]);

  function executar(tarefa: () => Promise<void>) {
    setErro(null);
    startTransition(async () => {
      try {
        await tarefa();
        router.refresh();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
      }
    });
  }

  function salvarLead(dados: LeadFormData) {
    executar(async () => {
      if (leadEditando) {
        await atualizarLead({ ...dados, id: leadEditando.id });
        setLeadModal(false);
        setLeadEditando(null);
        return;
      }

      const verificacao = await verificarTelefoneLead(dados.telefone);
      if (verificacao.clienteExistente || verificacao.leadAtivo) {
        setConflitoTelefone({
          dados,
          clienteExistente: verificacao.clienteExistente,
          leadAtivo: verificacao.leadAtivo,
        });
        return;
      }

      await criarLead(dados);
      setLeadModal(false);
      setLeadEditando(null);
    });
  }

  function resolverConflitoTelefone(resolucao: "vincular" | "pessoa_diferente") {
    const conflito = conflitoTelefone;
    if (!conflito) return;

    executar(async () => {
      await criarLead({
        ...conflito.dados,
        resolucaoTelefone: resolucao,
        clienteIdVinculo: resolucao === "vincular" ? conflito.clienteExistente?.id || null : null,
      });
      setConflitoTelefone(null);
      setLeadModal(false);
      setLeadEditando(null);
    });
  }

  function editarLead(lead: MarketingLead) {
    setDetalhesModal(null);
    setLeadEditando(lead);
    setLeadModal(true);
  }

  function confirmarTrocaCliente(clienteId: number) {
    if (!leadTrocandoCliente) return;

    executar(async () => {
      await vincularLeadAOutroCliente(leadTrocandoCliente.id, clienteId);
      setLeadTrocandoCliente(null);
    });
  }

  function abrirEdicaoCampanha(campanha: MarketingCampanha) {
    setCampanhaEditando(campanha);
    setCampanhaModal(true);
  }

  function salvarCampanha(dados: CampanhaFormData) {
    executar(async () => {
      if (campanhaEditando) {
        await atualizarCampanha({ ...dados, id: campanhaEditando.id });
      } else {
        await criarCampanha(dados);
      }
      setCampanhaModal(false);
    });
  }

  function alterarChamouWhatsapp(id: number, valor: "Chamou" | "Não chamou" | "A verificar") {
    executar(async () => {
      await atualizarChamouWhatsapp(id, valor);
    });
  }

  function alterarEtapa(id: number, etapa: LeadEtapa) {
    if (etapa === "Perdido") {
      const lead = leads.find(
        (item) => item.id === id,
      );

      if (!lead) {
        setErro("Lead não encontrado.");
        return;
      }

      setLeadPerdaModal(lead);
      return;
    }

    if (etapa === "Convertido") {
      const confirmar = window.confirm(
        "Marcar como convertido? O sistema irá vincular o lead a um cliente existente pelo telefone ou criar o cliente sem duplicar cadastro.",
      );
      if (!confirmar) return;
    }

    executar(async () => {
      await atualizarEtapaLead(id, etapa);
    });
  }

  function confirmarPerdaLead(
    motivo: string,
    detalhe?: string,
  ) {
    const lead = leadPerdaModal;

    if (!lead) return;

    executar(async () => {
      await marcarLeadPerdido(
        lead.id,
        motivo,
      );

      if (detalhe?.trim()) {
        await registrarObservacaoLead(
          lead.id,
          `Detalhe da perda: ${detalhe.trim()}`,
        );
      }

      setLeadPerdaModal(null);
    });
  }

  function converterLead(id: number) {
    if (!window.confirm("Converter este lead em cliente? Cadastros existentes serão reutilizados quando o telefone coincidir.")) return;
    executar(async () => {
      await converterLeadEmCliente(id);
    });
  }

  function removerLead(id: number) {
    if (!window.confirm("Deseja excluir este lead? O cliente e o agendamento vinculados não serão excluídos.")) return;
    executar(async () => {
      await excluirLead(id);
      if (detalhesModal?.id === id) setDetalhesModal(null);
    });
  }

  function removerCampanha(id: number) {
    if (!window.confirm("Excluir esta campanha sem vínculos? Campanhas com clientes, leads, receitas ou custos devem ser pausadas ou finalizadas.")) return;
    executar(async () => {
      await excluirCampanha(id);
    });
  }
  function programarRetornoRapido(
    lead: MarketingLead,
    dias: number,
  ) {
    setErro(null);
    setLeadAcaoRapidaId(lead.id);

    startTransition(async () => {
      try {
        const dataRetorno = dataFuturaEmDiasInput(dias);

        // Grava primeiro a data escolhida.
        // Se o lead estiver em Novo, a automacao de mudanca de etapa
        // encontrara essa data e nao criara outro D+2.
        await definirProximoContatoLead(
          lead.id,
          dataRetorno,
        );

        if (lead.etapa === "Novo") {
          await atualizarEtapaLead(
            lead.id,
            "Aguardando resposta",
          );
        }

        router.refresh();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível programar o retorno.",
        );
      } finally {
        setLeadAcaoRapidaId(null);
      }
    });
  }

  function registrarResultadoRapido(
    lead: MarketingLead,
    resultado: string,
    dias: number,
    houveResposta: boolean,
  ) {
    setErro(null);
    setLeadAcaoRapidaId(lead.id);

    startTransition(async () => {
      try {
        await registrarResultadoContatoLead({
          leadId: lead.id,
          resultado,
          proximoContato: dataFuturaEmDiasInput(dias),
          houveResposta,
        });

        router.refresh();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível registrar o resultado do contato.",
        );
      } finally {
        setLeadAcaoRapidaId(null);
      }
    });
  }

  function encerrarSemRespostaRapido(lead: MarketingLead) {
    const tentativas = contarTentativasSemResposta(lead);

    if (tentativas < 3) return;

    const confirmar = window.confirm(
      `Este lead já teve ${tentativas} tentativa(s) sem resposta. Encerrar como Perdido por "Sem resposta"?`,
    );

    if (!confirmar) return;

    executar(async () => {
      await marcarLeadPerdido(lead.id, "Sem resposta");
    });
  }

  return (
    <>
      <div className="space-y-6 pb-20 lg:pb-0">
        <section className="premium-card relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-16 -top-20 size-72 rounded-full bg-fuchsia-500/16 blur-3xl" />
          <div className="absolute -bottom-24 left-16 size-72 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.06] px-3 py-1 text-xs font-medium text-violet-200">
                <Target className="size-3.5" />
                CRM comercial integrado
              </div>
              <h1 className="premium-title">Marketing & Comercial</h1>
              <p className="premium-subtitle">
                Acompanhe o lead desde a entrada até o contato, avaliação, agendamento e conversão, com histórico e vínculo real com clientes e agenda.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[34rem]">
              <HeroMetric label="Pipeline ativo" value={formatarMoeda(resumo.pipelineAtivo)} icon={TrendingUp} />
              <HeroMetric label="Conversão" value={`${resumo.taxaConversao.toFixed(1)}%`} icon={Target} />
              <HeroMetric label="Receita rastreada" value={formatarMoeda(resumo.receitaRastreada)} icon={DollarSign} />
            </div>
          </div>
        </section>

        {erro ? (
          <section className="flex items-start gap-3 rounded-3xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div className="flex-1">{erro}</div>
            <button type="button" onClick={() => setErro(null)} className="rounded-xl p-1 hover:bg-white/10" aria-label="Fechar aviso">
              <X className="size-4" />
            </button>
          </section>
        ) : null}

        {/* Fila operacional calculada automaticamente com os dados que o CRM
            ja possui. Follow-up futuro so aparece no dia correto. */}
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => setFilaHojeAberta((aberta) => !aberta)}
            className={`flex w-full flex-col gap-3 rounded-3xl border p-4 text-left transition sm:flex-row sm:items-center sm:justify-between sm:p-5 ${
              resumo.leadsPendentesDeAcao > 0
                ? "border-amber-300 bg-amber-50 hover:bg-amber-100"
                : "border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                  resumo.leadsPendentesDeAcao > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                <Target className="size-5" />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">
                  Com quem falar hoje
                </p>

                {resumo.leadsPendentesDeAcao > 0 ? (
                  <p className="mt-0.5 text-sm font-medium text-slate-700">
                    {resumoFilaHoje.atrasados > 0
                      ? `${resumoFilaHoje.atrasados} atrasado(s) · `
                      : ""}
                    {resumoFilaHoje.novos > 0
                      ? `${resumoFilaHoje.novos} novo(s) · `
                      : ""}
                    {resumoFilaHoje.hoje > 0
                      ? `${resumoFilaHoje.hoje} retorno(s) hoje · `
                      : ""}
                    {resumoFilaHoje.semData > 0
                      ? `${resumoFilaHoje.semData} sem retorno agendado`
                      : ""}
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm font-medium text-emerald-800">
                    Nenhum contato pendente para hoje.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <span
                className={`text-xs font-semibold ${
                  resumo.leadsPendentesDeAcao > 0
                    ? "text-amber-800"
                    : "text-emerald-800"
                }`}
              >
                {filaHojeAberta ? "Fechar fila" : "Ver fila"}
              </span>

              <span
                className={`text-3xl font-bold ${
                  resumo.leadsPendentesDeAcao > 0
                    ? "text-amber-950"
                    : "text-emerald-950"
                }`}
              >
                {resumo.leadsPendentesDeAcao}
              </span>
            </div>
          </button>

          {filaHojeAberta ? (
            <div className="rounded-3xl border border-white/[0.10] bg-white/[0.045] p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Fila automática de hoje
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    A ordem é: atrasados, novos leads, retornos de hoje e contatos sem próxima data.
                  </p>
                </div>

                <span className="rounded-full border border-white/[0.10] bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-300">
                  {filaContatoHoje.length}
                </span>
              </div>

              {filaContatoHoje.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-emerald-300/20 bg-emerald-400/[0.06] p-6 text-center">
                  <CheckCircle2 className="mx-auto size-7 text-emerald-300" />
                  <p className="mt-3 text-sm font-semibold text-emerald-950">
                    Tudo em dia.
                  </p>
                  <p className="mt-1 text-xs text-emerald-200/60">
                    O CRM não encontrou nenhum contato que precise de ação hoje.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {filaContatoHoje.map((item, index) => {
                    const tentativasSemResposta =
                      contarTentativasSemResposta(item.lead);

                    const badgeClass =
                      item.tipo === "atrasado"
                        ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
                        : item.tipo === "novo"
                          ? "border-violet-300/20 bg-violet-400/10 text-violet-200"
                          : item.tipo === "hoje"
                            ? "border-amber-300/20 bg-amber-400/10 text-amber-200"
                            : "border-slate-300/15 bg-white/[0.06] text-slate-300";

                    return (
                      <article
                        key={item.lead.id}
                        className="rounded-2xl border border-white/[0.08] bg-[#20283b]/72 p-3 sm:p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <button
                            type="button"
                            onClick={() => setDetalhesModal(item.lead)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-xs font-black text-slate-300">
                                {index + 1}
                              </span>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="truncate text-sm font-bold text-white">
                                    {item.lead.nome}
                                  </h3>

                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}
                                  >
                                    {item.label}
                                  </span>
                                </div>

                                <p className="mt-1 text-xs text-slate-400">
                                  {item.detalhe}
                                </p>

                                <p className="mt-1 truncate text-[11px] text-slate-500">
                                  {item.lead.interesse || "Interesse não informado"}
                                  {" · "}
                                  {item.lead.etapa}
                                </p>

                                {tentativasSemResposta > 0 ? (
                                  <span
                                    className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${
                                      tentativasSemResposta >= 3
                                        ? "border-rose-300 bg-rose-50 text-rose-800"
                                        : "border-slate-200 bg-slate-50 text-slate-600"
                                    }`}
                                  >
                                    {tentativasSemResposta} tentativa(s) sem resposta
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </button>

                          <div className="grid gap-2 sm:min-w-[21rem]">
                            <div
                              className={`grid gap-2 ${
                                podeGerenciarAgenda
                                  ? "grid-cols-3"
                                  : "grid-cols-2"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setMensagemModal(item.lead)}
                                className="rounded-xl border border-emerald-300 bg-emerald-50 px-2 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                              >
                                WhatsApp
                              </button>

                              {podeGerenciarAgenda ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAgendamentoModal(item.lead)
                                  }
                                  className="rounded-xl border border-cyan-300 bg-cyan-50 px-2 py-2 text-xs font-bold text-cyan-800 transition hover:bg-cyan-200"
                                >
                                  Agendar
                                </button>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => setDetalhesModal(item.lead)}
                                className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                              >
                                Detalhes
                              </button>
                            </div>

                            <div>
                              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                                Resultado do contato
                              </p>

                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    registrarResultadoRapido(
                                      item.lead,
                                      "Não respondeu. Novo retorno programado para o dia seguinte.",
                                      1,
                                      false,
                                    )
                                  }
                                  disabled={isPending}
                                  className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Não respondeu
                                  <span className="ml-1 font-medium text-slate-500">
                                    +1d
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    registrarResultadoRapido(
                                      item.lead,
                                      "Cliente está pesquisando preços antes de decidir.",
                                      2,
                                      true,
                                    )
                                  }
                                  disabled={isPending}
                                  className="rounded-xl border border-violet-200 bg-violet-50 px-2 py-2 text-[11px] font-bold text-violet-800 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Pesquisando preço
                                  <span className="ml-1 font-medium text-violet-600">
                                    +2d
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    registrarResultadoRapido(
                                      item.lead,
                                      "Cliente informou que vai pensar antes de decidir.",
                                      2,
                                      true,
                                    )
                                  }
                                  disabled={isPending}
                                  className="rounded-xl border border-blue-200 bg-blue-50 px-2 py-2 text-[11px] font-bold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Vai pensar
                                  <span className="ml-1 font-medium text-blue-600">
                                    +2d
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    registrarResultadoRapido(
                                      item.lead,
                                      "Cliente pediu mais tempo antes de um novo contato.",
                                      3,
                                      true,
                                    )
                                  }
                                  disabled={isPending}
                                  className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-2 text-[11px] font-bold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Mais tempo
                                  <span className="ml-1 font-medium text-amber-700">
                                    +3d
                                  </span>
                                </button>
                              </div>

                              {tentativasSemResposta >= 3 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    encerrarSemRespostaRapido(item.lead)
                                  }
                                  disabled={isPending}
                                  className="mt-2 w-full rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Encerrar como sem resposta
                                </button>
                              ) : null}
                            </div>

                            {leadAcaoRapidaId === item.lead.id && isPending ? (
                              <p className="text-[11px] font-semibold text-violet-700">
                                Salvando resultado...
                              </p>
                            ) : (
                              <p className="text-[11px] leading-4 text-slate-500">
                                O CRM registra o motivo e programa sozinho quando este lead deve voltar para sua fila.
                              </p>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <ResumoCard title="Leads ativos" value={String(resumo.leadsAtivos)} detail={`${resumo.totalLeads} oportunidade(s) no total`} icon={UsersRound} />
          <ResumoCard title="Avaliações vinculadas" value={String(resumo.avaliacoesAgendadas)} detail="Agendamentos originados pelo CRM" icon={CalendarClock} />
          <ResumoCard title="Convertidos" value={String(resumo.leadsConvertidos)} detail={`${resumo.leadsPerdidos} perdido(s)`} icon={UserCheck} />
          <ResumoCard title="Campanhas ativas" value={String(resumo.campanhasAtivas)} detail={`Custo real: ${formatarMoeda(resumo.custoRealTotal)}`} icon={Megaphone} />
          <ResumoCard
            title="Chamou no WhatsApp"
            value={
              resumo.taxaChamouWhatsapp === null
                ? "—"
                : `${resumo.taxaChamouWhatsapp.toFixed(0)}%`
            }
            detail={
              resumo.leadsComCodigo === 0
                ? "Nenhum lead de anúncio ainda"
                : `${resumo.leadsChamaramWhatsapp} de ${resumo.leadsComCodigo} código(s) confirmados`
            }
            icon={MessageCircle}
          />
        </section>

        {tab === "pipeline" &&
        pipelineModo === "encerrados" &&
        resumoMotivosPerda.total > 0 ? (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-700">
                  Motivos de perda
                </p>

                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  Por que estamos perdendo oportunidades?
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  Baseado nos {resumoMotivosPerda.total} lead(s) encerrados como perdidos.
                </p>
              </div>

              <span className="w-fit rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm font-bold text-rose-800">
                {resumoMotivosPerda.total} perdido(s)
              </span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {resumoMotivosPerda.itens.map(
                (item, index) => (
                  <div
                    key={item.motivo}
                    className="rounded-2xl border border-rose-100 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-xs font-black text-rose-700">
                        {index + 1}
                      </span>

                      <span className="text-sm font-black text-rose-800">
                        {item.percentual.toFixed(0)}%
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm font-bold text-slate-800">
                      {item.motivo}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.quantidade} oportunidade(s)
                    </p>
                  </div>
                ),
              )}
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              A partir de agora, usar os motivos padronizados deixará este relatório cada vez mais confiável.
            </p>
          </section>
        ) : null}

        <section className="premium-card-soft p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.9fr] xl:min-w-0 xl:flex-1">
              <label className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={busca}
                  onChange={(event) => {
                    setBusca(event.target.value);
                    setEtapaFiltro("todas");
                  }}
                  placeholder="Buscar em todos os leads, ativos ou encerrados"
                  className="premium-input h-11 w-full pl-11"
                />
              </label>

              <label className="relative">
                <Filter className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <select value={etapaFiltro} onChange={(event) => setEtapaFiltro(event.target.value)} className="premium-input h-11 w-full bg-[#1d2437] pl-11">
                  <option value="todas">
                    {pipelineModo === "ativos"
                      ? "Todas as etapas ativas"
                      : "Todos os encerrados"}
                  </option>
                  {etapasPipelineVisiveis.map((etapa) => (
                    <option
                      key={etapa.value}
                      value={etapa.value}
                    >
                      {etapa.label}
                    </option>
                  ))}
                </select>
              </label>

              <select value={origemFiltro} onChange={(event) => setOrigemFiltro(event.target.value)} className="premium-input h-11 w-full bg-[#1d2437]">
                <option value="todas">Todas as origens</option>
                {origens.map((origem) => <option key={origem} value={origem}>{origem}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => baixarCsv(leadsFiltrados)} disabled={leadsFiltrados.length === 0}>Exportar CSV</Button>
              {podeGerenciarMarketing ? (
                <>
                  <Button type="button" variant="outline" onClick={() => setCampanhaModal(true)}><Megaphone className="size-4" /> Campanha</Button>
                  <Button type="button" onClick={() => { setLeadEditando(null); setLeadModal(true); }}><Plus className="size-4" /> Novo lead</Button>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <section className="flex gap-2 overflow-x-auto rounded-3xl border border-white/[0.10] bg-white/[0.055] p-2 scrollbar-premium">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`min-w-fit rounded-2xl px-4 py-2 text-sm font-semibold transition ${tab === item.key ? "bg-white/[0.14] text-white shadow-lg shadow-black/10" : "text-slate-400 hover:bg-white/[0.08] hover:text-slate-100"}`}
            >
              {item.label}
            </button>
          ))}
        </section>

        {tab === "pipeline" ? (
          <>
            <section className="grid grid-cols-2 gap-2 rounded-3xl border border-white/[0.10] bg-white/[0.045] p-2">
              <button
                type="button"
                onClick={() => {
                  setPipelineModo("ativos");
                  setEtapaFiltro("todas");
                }}
                className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  pipelineModo === "ativos"
                    ? "bg-violet-100 text-violet-950 shadow-sm ring-1 ring-violet-300"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>
                  <span className="block text-sm font-bold">
                    Ativos
                  </span>
                  <span className="mt-0.5 block text-[0.68rem] text-slate-600">
                    Trabalho que ainda precisa de ação
                  </span>
                </span>

                <span
                  className={`flex min-w-9 items-center justify-center rounded-full px-2.5 py-1 text-sm font-black ${
                    pipelineModo === "ativos"
                      ? "bg-violet-200 text-violet-900"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {resumo.leadsAtivos}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPipelineModo("encerrados");
                  setEtapaFiltro("todas");
                }}
                className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  pipelineModo === "encerrados"
                    ? "bg-emerald-100 text-emerald-950 shadow-sm ring-1 ring-emerald-300"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>
                  <span className="block text-sm font-bold">
                    Encerrados
                  </span>
                  <span className="mt-0.5 block text-[0.68rem] text-slate-600">
                    Convertidos e oportunidades perdidas
                  </span>
                </span>

                <span
                  className={`flex min-w-9 items-center justify-center rounded-full px-2.5 py-1 text-sm font-black ${
                    pipelineModo === "encerrados"
                      ? "bg-emerald-200 text-emerald-900"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {resumo.leadsConvertidos + resumo.leadsPerdidos}
                </span>
              </button>
            </section>

            <section
              className={`grid gap-4 ${
                buscaGlobalAtiva
                  ? "xl:grid-cols-3"
                  : pipelineModo === "ativos"
                    ? "xl:grid-cols-3"
                    : "xl:grid-cols-2"
              }`}
            >
              {leadsPorEtapa.map((etapa) => (
              <PipelineColumn
                key={etapa.value}
                etapa={etapa.value}
                label={etapa.label}
                description={etapa.description}
                leads={etapa.leads}
                onEtapaChange={alterarEtapa}
                onChamouWhatsappChange={alterarChamouWhatsapp}
                onMessage={setMensagemModal}
                onDetails={setDetalhesModal}
                onSchedule={setAgendamentoModal}
                onConvert={converterLead}
                isPending={isPending}
                podeGerenciarMarketing={podeGerenciarMarketing}
                podeGerenciarAgenda={podeGerenciarAgenda}
              />
            ))}
            </section>
          </>
        ) : null}

        {tab === "campanhas" ? (
          <CampanhasView campanhas={campanhas} leads={leads} clientes={clientes} contas={contas} receitasSemCampanha={receitasSemCampanha} onDelete={removerCampanha} onEditar={abrirEdicaoCampanha} isPending={isPending} podeGerenciar={podeGerenciarMarketing} />
        ) : null}

        {tab === "mensagens" ? <TemplatesView /> : null}
      </div>

      <PerdaLeadModal
        lead={leadPerdaModal}
        disabled={isPending}
        onClose={() => setLeadPerdaModal(null)}
        onSubmit={confirmarPerdaLead}
      />

      <LeadModal
        open={leadModal}
        lead={leadEditando}
        campanhas={campanhas}
        procedimentosInteresse={procedimentosInteresse}
        onClose={() => { setLeadModal(false); setLeadEditando(null); }}
        onSubmit={salvarLead}
        disabled={isPending}
      />
      <TelefoneDuplicadoModal
        conflito={conflitoTelefone}
        disabled={isPending}
        onCorrigir={() => setConflitoTelefone(null)}
        onVincular={() => resolverConflitoTelefone("vincular")}
        onPessoaDiferente={() => resolverConflitoTelefone("pessoa_diferente")}
      />
      <CampanhaModal open={campanhaModal} campanha={campanhaEditando} onClose={() => { setCampanhaModal(false); setCampanhaEditando(null); }} onSubmit={salvarCampanha} disabled={isPending} />
      <MarketingMessageModal lead={mensagemModal} onClose={() => setMensagemModal(null)} onUpdated={() => router.refresh()} podeGerenciar={podeGerenciarMarketing} />
      <LeadDetailsModal
        lead={detalhesModal}
        onClose={() => setDetalhesModal(null)}
        onEdit={editarLead}
        onSchedule={setAgendamentoModal}
        onDelete={removerLead}
        onUpdated={() => router.refresh()}
        onTrocarCliente={setLeadTrocandoCliente}
        podeGerenciarMarketing={podeGerenciarMarketing}
        podeGerenciarAgenda={podeGerenciarAgenda}
      />
      {/* Nasce DEPOIS do LeadDetailsModal de proposito: os dois usam o mesmo
          Modal compartilhado, com o mesmo z-index. Quem vem depois no JSX
          fica por cima na tela - antes disso ele abria escondido atras do
          modal de detalhes. */}
      <TrocarClienteLeadModal lead={leadTrocandoCliente} clientes={clientes} onClose={() => setLeadTrocandoCliente(null)} onSubmit={confirmarTrocaCliente} disabled={isPending} />
      <AgendarAvaliacaoModal
        lead={agendamentoModal}
        profissionais={profissionais}
        servicos={servicos}
        onClose={() => setAgendamentoModal(null)}
        onSuccess={() => { setAgendamentoModal(null); router.refresh(); }}
      />

      {isPending ? (
        <div className="fixed bottom-24 right-5 z-50 rounded-2xl border border-violet-400/20 bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-2xl shadow-violet-950/40 lg:bottom-5">
          Atualizando CRM...
        </div>
      ) : null}
    </>
  );
}

function HeroMetric({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-3xl border border-white/[0.12] bg-white/[0.075] p-4 shadow-xl shadow-black/10">
      <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-white/[0.08] text-violet-200"><Icon className="size-4" /></div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ResumoCard({ title, value, detail, icon: Icon }: { title: string; value: string; detail: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <article className="premium-card-soft p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-200 ring-1 ring-violet-300/15"><Icon className="size-5" /></div>
      </div>
    </article>
  );
}

function PipelineColumn({
  etapa,
  label,
  description,
  leads,
  onEtapaChange,
  onChamouWhatsappChange,
  onMessage,
  onDetails,
  onSchedule,
  onConvert,
  isPending,
  podeGerenciarMarketing,
  podeGerenciarAgenda,
}: {
  etapa: LeadEtapa;
  label: string;
  description: string;
  leads: MarketingLead[];
  onEtapaChange: (id: number, etapa: LeadEtapa) => void;
  onChamouWhatsappChange: (id: number, valor: "Chamou" | "Não chamou" | "A verificar") => void;
  onMessage: (lead: MarketingLead) => void;
  onDetails: (lead: MarketingLead) => void;
  onSchedule: (lead: MarketingLead) => void;
  onConvert: (id: number) => void;
  isPending: boolean;
  podeGerenciarMarketing: boolean;
  podeGerenciarAgenda: boolean;
}) {
  const total = leads.reduce((acc, lead) => acc + lead.valorPrevisto, 0);

  return (
    <div className="min-h-[20rem] rounded-3xl border border-white/[0.10] bg-white/[0.055] p-4 shadow-xl shadow-black/10">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">{label}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span className="rounded-full border border-white/[0.10] bg-white/[0.07] px-2.5 py-1 text-xs font-semibold text-slate-300">{leads.length}</span>
      </div>
      <div className="mb-4 rounded-2xl border border-white/[0.08] bg-black/10 px-3 py-2 text-xs text-slate-400">Valor previsto: <strong className="text-slate-100">{formatarMoeda(total)}</strong></div>

      <div className="space-y-3">
        {leads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.12] p-4 text-center text-xs text-slate-500">Nenhum lead nesta etapa.</div>
        ) : leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            currentEtapa={etapa}
            onEtapaChange={onEtapaChange}
            onChamouWhatsappChange={onChamouWhatsappChange}
            onMessage={onMessage}
            onDetails={onDetails}
            onSchedule={onSchedule}
            onConvert={onConvert}
            isPending={isPending}
            podeGerenciarMarketing={podeGerenciarMarketing}
            podeGerenciarAgenda={podeGerenciarAgenda}
          />
        ))}
      </div>
    </div>
  );
}

function LeadCard({
  lead,
  currentEtapa,
  onEtapaChange,
  onChamouWhatsappChange,
  onMessage,
  onDetails,
  onSchedule,
  onConvert,
  isPending,
  podeGerenciarMarketing,
  podeGerenciarAgenda,
}: {
  lead: MarketingLead;
  currentEtapa: LeadEtapa;
  onEtapaChange: (id: number, etapa: LeadEtapa) => void;
  onChamouWhatsappChange: (id: number, valor: "Chamou" | "Não chamou" | "A verificar") => void;
  onMessage: (lead: MarketingLead) => void;
  onDetails: (lead: MarketingLead) => void;
  onSchedule: (lead: MarketingLead) => void;
  onConvert: (id: number) => void;
  isPending: boolean;
  podeGerenciarMarketing: boolean;
  podeGerenciarAgenda: boolean;
}) {
  const atrasado = followUpAtrasado(lead);
  const tentativasSemResposta = contarTentativasSemResposta(lead);
  const retornoHoje =
    Boolean(lead.proximoContatoEm) &&
    dataInput(lead.proximoContatoEm) === hojeSaoPauloInput();

  return (
    <article className="rounded-3xl border border-white/[0.10] bg-[#20283b]/88 p-4 shadow-lg shadow-black/10">
      <button type="button" onClick={() => onDetails(lead)} className="w-full text-left">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">{getInitials(lead.nome)}</div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-white">{lead.nome}</h3>
            <p className="mt-1 truncate text-xs text-slate-400">{lead.interesse || "Interesse não informado"}</p>
          </div>
          {atrasado ? <span title="Follow-up pendente" className="rounded-lg bg-amber-400/15 p-1.5 text-amber-200"><Clock3 className="size-3.5" /></span> : null}
        </div>
      </button>

      <div className="mt-4 space-y-2 text-xs text-slate-400">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate">{lead.campanha?.nome || getOrigemLabel(lead.origem)}</span>
          <strong className="shrink-0 text-slate-100">{formatarMoeda(lead.valorPrevisto)}</strong>
        </div>
        {lead.telefone ? <div className="flex items-center gap-2"><Phone className="size-3.5 text-slate-500" /><span>{lead.telefone}</span></div> : null}

        {lead.proximoContatoEm &&
        (lead.etapa === "Novo" || lead.etapa === "Aguardando resposta") ? (
          <div
            className={`flex items-center gap-2 font-semibold ${
              atrasado
                ? "text-rose-200"
                : retornoHoje
                  ? "text-amber-200"
                  : "text-violet-200"
            }`}
          >
            <Clock3 className="size-3.5" />
            <span>
              {atrasado
                ? `Retorno atrasado · ${formatarData(lead.proximoContatoEm)}`
                : retornoHoje
                  ? "Retorno hoje"
                  : `Retorno ${formatarData(lead.proximoContatoEm)}`}
            </span>
          </div>
        ) : null}

        {tentativasSemResposta > 0 && isLeadAberto(lead) ? (
          <div
            className={`rounded-xl border px-2.5 py-2 font-semibold ${
              tentativasSemResposta >= 3
                ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
                : "border-white/[0.08] bg-white/[0.04] text-slate-300"
            }`}
          >
            {tentativasSemResposta} tentativa(s) sem resposta
            {tentativasSemResposta >= 3 ? " · revisar encerramento" : ""}
          </div>
        ) : null}
        {/* So existe em lead que veio de clique de anuncio. Visivel direto
            no cartao para nao precisar abrir Detalhes um por um so pra
            achar o codigo e cruzar com a planilha de rastreamento. */}
        {lead.codigoAtendimento ? (
          <div className="flex items-center gap-2">
            <Hash className="size-3.5 text-slate-500" />
            <span className="font-mono text-[11px] tracking-tight text-slate-300">
              {lead.codigoAtendimento}
            </span>
          </div>
        ) : null}
        {lead.agendamento ? (
          <div className="rounded-xl border border-cyan-300/10 bg-cyan-400/8 px-2.5 py-2 text-cyan-100">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">
                {formatarDataHora(lead.agendamento.data)}
              </p>
              <span className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-100">
                {lead.agendamento.status}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-cyan-900">
              {lead.agendamento.procedimento} · {lead.agendamento.profissional?.nome || "Profissional não informado"}
            </p>
          </div>
        ) : null}
        {lead.receitaRastreada > 0 ? <p className="text-emerald-300">Receita rastreada: <strong>{formatarMoeda(lead.receitaRastreada)}</strong></p> : null}
      </div>

      {podeGerenciarMarketing ? (
        <div className="mt-4 grid gap-2">
          <select
            value={currentEtapa}
            onChange={(event) => {
              const novaEtapa = event.target.value as LeadEtapa;

              // Marcar "Convertido" aqui so movia o cartao de coluna, sem
              // criar o cliente - e os dados ficavam presos no lead. Agora
              // essa escolha dispara a conversao de verdade.
              if (novaEtapa === "Convertido" && !lead.clienteId) {
                onConvert(lead.id);
                return;
              }

              onEtapaChange(lead.id, novaEtapa);
            }}
            disabled={isPending}
            className="h-10 rounded-2xl border border-white/[0.10] bg-[#171d2d] px-3 text-xs font-medium text-slate-100 outline-none focus:border-violet-400/40"
          >
            {LEAD_ETAPAS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>

          {/* So faz sentido perguntar isso para quem veio de clique de
              anuncio - lead criado a mao ja teve conversa de verdade na
              hora do cadastro.
              Texto das opcoes curto de proposito: a primeira versao repetia
              "no WhatsApp" em cada opcao e o texto nao cabia no cartao,
              brigando com a setinha do menu. */}
          {lead.codigoAtendimento ? (
            <label className="grid gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Chamou no WhatsApp?
              </span>
              <select
                value={lead.chamouWhatsapp}
                onChange={(event) =>
                  onChamouWhatsappChange(
                    lead.id,
                    event.target.value as "Chamou" | "Não chamou" | "A verificar",
                  )
                }
                disabled={isPending}
                className={`h-10 w-full rounded-2xl border pl-3 pr-2 text-xs font-medium outline-none focus:border-violet-400/40 ${
                  lead.chamouWhatsapp === "Chamou"
                    ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                    : lead.chamouWhatsapp === "Não chamou"
                      ? "border-rose-300/20 bg-rose-400/10 text-rose-100"
                      : "border-amber-300/20 bg-amber-400/10 text-amber-100"
                }`}
              >
                <option value="A verificar">A verificar</option>
                <option value="Chamou">✓ Chamou</option>
                <option value="Não chamou">✕ Não chamou</option>
              </select>
            </label>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onMessage(lead)} className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/15">WhatsApp</button>
            <button type="button" onClick={() => onDetails(lead)} className="rounded-2xl border border-white/[0.10] bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.10]">Detalhes</button>
            {podeGerenciarAgenda && isLeadAberto(lead) ? (
              <button type="button" onClick={() => onSchedule(lead)} className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/15">{lead.agendamento ? "Reagendar" : "Agendar"}</button>
            ) : null}
            {/* Enquanto o lead nao tiver cliente vinculado, o botao continua
                disponivel - inclusive na coluna Convertido. Antes ele sumia
                ali e o lead ficava sem saida, sem virar cliente. */}
            {!lead.clienteId ? (
              <button type="button" onClick={() => onConvert(lead.id)} disabled={isPending} className="rounded-2xl border border-violet-300/15 bg-violet-400/10 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-400/15 disabled:opacity-50">Converter</button>
            ) : null}
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => onDetails(lead)} className="mt-4 w-full rounded-2xl border border-white/[0.10] bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-200">Ver detalhes</button>
      )}
    </article>
  );
}

function CampanhasView({
  campanhas,
  leads,
  clientes,
  contas,
  receitasSemCampanha,
  onDelete,
  onEditar,
  isPending,
  podeGerenciar,
}: {
  campanhas: MarketingCampanha[];
  leads: MarketingLead[];
  clientes: MarketingClienteOption[];
  contas: MarketingContaOption[];
  receitasSemCampanha: MarketingReceitaOption[];
  onDelete: (id: number) => void;
  onEditar: (campanha: MarketingCampanha) => void;
  isPending: boolean;
  podeGerenciar: boolean;
}) {
  const router = useRouter();
  const [vincular, setVincular] = useState<MarketingCampanha | null>(null);
  const [custo, setCusto] = useState<MarketingCampanha | null>(null);
  const [receita, setReceita] = useState<MarketingCampanha | null>(null);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [pendingLocal, startLocalTransition] = useTransition();
  const totalClientes = campanhas.reduce((acc, campanha) => acc + campanha.metricas.clientes, 0);
  const custoReal = campanhas.reduce((acc, campanha) => acc + campanha.metricas.custoReal, 0);
  const receitaLiquida = campanhas.reduce((acc, campanha) => acc + campanha.metricas.receitaLiquida, 0);

  function executarLocal(tarefa: () => Promise<void>) {
    setErroLocal(null);
    startLocalTransition(async () => {
      try {
        await tarefa();
        router.refresh();
      } catch (error) {
        setErroLocal(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
      }
    });
  }

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CampaignInsight label="Campanhas cadastradas" value={String(campanhas.length)} />
        <CampaignInsight label="Clientes atribuídos" value={String(totalClientes)} />
        <CampaignInsight label="Custo real em Ads" value={formatarMoeda(custoReal)} />
        <CampaignInsight label="Receita líquida atribuída" value={formatarMoeda(receitaLiquida)} />
      </div>

      {erroLocal ? <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-100">{erroLocal}</div> : null}

      <div className="premium-table overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="border-b border-white/[0.10] bg-white/[0.045] text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Campanha</th>
              <th className="px-5 py-4">Clientes</th>
              <th className="px-5 py-4">Leads</th>
              <th className="px-5 py-4">Orçamento</th>
              <th className="px-5 py-4">Custo real</th>
              <th className="px-5 py-4">Receita bruta</th>
              <th className="px-5 py-4">Taxas</th>
              <th className="px-5 py-4">Resultado</th>
              <th className="px-5 py-4">ROAS</th>
              <th className="px-5 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.08]">
            {campanhas.length === 0 ? (
              <tr><td colSpan={10} className="px-5 py-10 text-center text-slate-500">Nenhuma campanha cadastrada.</td></tr>
            ) : campanhas.map((campanha) => {
              const vinculados = leads.filter((lead) => lead.campanhaId === campanha.id);
              return (
                <tr key={campanha.id} className="text-slate-300 hover:bg-white/[0.035]">
                  <td className="px-5 py-4"><p className="font-semibold text-white">{campanha.nome}</p><p className="mt-1 text-xs text-slate-500">{campanha.canal} · {campanha.status}</p></td>
                  <td className="px-5 py-4">{campanha.metricas.clientes}</td>
                  <td className="px-5 py-4">{vinculados.length}</td>
                  <td className="px-5 py-4">{formatarMoeda(campanha.investimento)}</td>
                  <td className="px-5 py-4 text-rose-200">{formatarMoeda(campanha.metricas.custoReal)}</td>
                  <td className="px-5 py-4 text-emerald-200">{formatarMoeda(campanha.metricas.receitaBruta)}</td>
                  <td className="px-5 py-4">{formatarMoeda(campanha.metricas.taxasPagamento)}</td>
                  <td className={`px-5 py-4 font-semibold ${campanha.metricas.resultado >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatarMoeda(campanha.metricas.resultado)}</td>
                  <td className="px-5 py-4">{campanha.metricas.roas === null ? "Sem custo" : `${campanha.metricas.roas.toFixed(2)}x`}</td>
                  <td className="px-5 py-4 text-right">
                    {podeGerenciar ? <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => onEditar(campanha)} disabled={isPending || pendingLocal} className="rounded-xl border border-violet-300/15 bg-violet-400/10 px-3 py-2 text-xs font-semibold text-violet-100">Editar</button>
                      <button type="button" onClick={() => setVincular(campanha)} disabled={isPending || pendingLocal} className="rounded-xl border border-cyan-300/15 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100">Vincular cliente</button>
                      <button type="button" onClick={() => setCusto(campanha)} disabled={isPending || pendingLocal} className="rounded-xl border border-amber-300/15 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100">Lançar custo</button>
                      <button type="button" onClick={() => setReceita(campanha)} disabled={isPending || pendingLocal} className="rounded-xl border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-100">Vincular receita</button>
                      <button type="button" onClick={() => onDelete(campanha.id)} disabled={isPending || pendingLocal} className="inline-flex items-center gap-2 rounded-xl border border-rose-300/15 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200"><Trash2 className="size-3.5" />Excluir</button>
                    </div> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <VincularClienteCampanhaModal
        campanha={vincular}
        clientes={clientes}
        disabled={pendingLocal}
        onClose={() => setVincular(null)}
        onSubmit={(clienteId, vincularReceitasExistentes) => executarLocal(async () => {
          if (!vincular) return;
          await vincularClienteCampanha({ campanhaId: vincular.id, clienteId, vincularReceitasExistentes });
          setVincular(null);
        })}
      />
      <ReceitaCampanhaModal
        campanha={receita}
        receitas={receitasSemCampanha}
        disabled={pendingLocal}
        onClose={() => setReceita(null)}
        onSubmit={(lancamentoId) => executarLocal(async () => {
          if (!receita) return;
          await vincularReceitaCampanha({ campanhaId: receita.id, lancamentoId });
          setReceita(null);
        })}
      />
      <CustoCampanhaModal
        campanha={custo}
        contas={contas}
        disabled={pendingLocal}
        onClose={() => setCusto(null)}
        onSubmit={(dados) => executarLocal(async () => {
          if (!custo) return;
          await registrarCustoCampanha({ campanhaId: custo.id, ...dados });
          setCusto(null);
        })}
      />
    </section>
  );
}

function CampaignInsight({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.10] bg-white/[0.055] px-4 py-3"><span className="text-sm text-slate-400">{label}</span><strong className="text-sm text-white">{value}</strong></div>;
}

function VincularClienteCampanhaModal({ campanha, clientes, disabled, onClose, onSubmit }: {
  campanha: MarketingCampanha | null;
  clientes: MarketingClienteOption[];
  disabled: boolean;
  onClose: () => void;
  onSubmit: (clienteId: number, vincularReceitasExistentes: boolean) => void;
}) {
  const [busca, setBusca] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [retroativo, setRetroativo] = useState(true);
  useEffect(() => { if (campanha) { setBusca(""); setClienteId(""); setRetroativo(true); } }, [campanha]);
  if (!campanha) return null;
  const encontrados = filtrarPorBusca(
    clientes,
    busca,
    (cliente) => `${cliente.nome} ${cliente.telefone} ${cliente.whatsapp || ""}`,
    (cliente) => `${cliente.telefone} ${cliente.whatsapp || ""}`,
  );
  const filtrados = encontrados.slice(0, 300);
  return (
    <Modal title="Vincular cliente à campanha" description={campanha.nome} onClose={onClose}>
      <div className="grid gap-4">
        <Input label="Buscar cliente" value={busca} onChange={setBusca} placeholder="Nome, telefone ou WhatsApp" />
        <label className="grid gap-2 text-sm font-medium text-slate-300">Cliente<select value={clienteId} onChange={(event) => setClienteId(event.target.value)} className="premium-input w-full bg-[#1d2437]"><option value="">Selecione</option>{filtrados.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}{cliente.campanhaAquisicaoId ? " · já possui campanha" : ""}</option>)}</select><AvisoBusca encontrados={encontrados.length} exibidos={filtrados.length} total={clientes.length} rotulo="cliente" /></label>
        <label className="flex items-start gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-400/8 p-4 text-sm text-cyan-100"><input type="checkbox" checked={retroativo} onChange={(event) => setRetroativo(event.target.checked)} className="mt-1" /><span><strong className="block">Vincular receitas existentes sem campanha</strong><span className="mt-1 block text-xs leading-5 text-cyan-100/70">Use para os três clientes já cadastrados. O sistema atribui vendas e entradas existentes que ainda não possuem campanha, sem criar nova receita.</span></span></label>
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="button" disabled={disabled || !clienteId} onClick={() => onSubmit(Number(clienteId), retroativo)}>{disabled ? "Vinculando..." : "Confirmar vínculo"}</Button></div>
      </div>
    </Modal>
  );
}

function TrocarClienteLeadModal({ lead, clientes, disabled, onClose, onSubmit }: {
  lead: MarketingLead | null;
  clientes: MarketingClienteOption[];
  disabled: boolean;
  onClose: () => void;
  onSubmit: (clienteId: number) => void;
}) {
  const [busca, setBusca] = useState("");
  const [clienteId, setClienteId] = useState("");
  useEffect(() => { if (lead) { setBusca(""); setClienteId(""); } }, [lead]);
  if (!lead) return null;

  const encontrados = filtrarPorBusca(
    clientes,
    busca,
    (cliente) => `${cliente.nome} ${cliente.telefone} ${cliente.whatsapp || ""}`,
    (cliente) => `${cliente.telefone} ${cliente.whatsapp || ""}`,
  );
  const filtrados = encontrados.slice(0, 300);

  return (
    <Modal title="Trocar cliente vinculado" description={lead.nome} onClose={onClose}>
      <div className="grid gap-4">
        <p className="rounded-2xl border border-amber-300/15 bg-amber-400/8 p-3 text-xs leading-5 text-amber-100">
          Use quando o lead ficou ligado ao cliente errado - por exemplo, um
          cadastro duplicado criado porque o telefone não bateu com o cliente
          que já existia. O código de atendimento e o GCLID deste lead
          continuam preservados, só o cliente vinculado muda.
        </p>
        <Input label="Buscar cliente" value={busca} onChange={setBusca} placeholder="Nome, telefone ou WhatsApp" />
        <label className="grid gap-2 text-sm font-medium text-slate-300">
          Cliente correto
          <select value={clienteId} onChange={(event) => setClienteId(event.target.value)} className="premium-input w-full bg-[#1d2437]">
            <option value="">Selecione</option>
            {filtrados.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
          </select>
          <AvisoBusca encontrados={encontrados.length} exibidos={filtrados.length} total={clientes.length} rotulo="cliente" />
        </label>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={disabled || !clienteId} onClick={() => onSubmit(Number(clienteId))}>{disabled ? "Vinculando..." : "Confirmar troca"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function ReceitaCampanhaModal({ campanha, receitas, disabled, onClose, onSubmit }: {
  campanha: MarketingCampanha | null;
  receitas: MarketingReceitaOption[];
  disabled: boolean;
  onClose: () => void;
  onSubmit: (lancamentoId: number) => void;
}) {
  const [busca, setBusca] = useState("");
  const [lancamentoId, setLancamentoId] = useState("");
  useEffect(() => {
    if (campanha) {
      setBusca("");
      setLancamentoId("");
    }
  }, [campanha]);
  if (!campanha) return null;
  const encontradas = filtrarPorBusca(
    receitas,
    busca,
    (item) => `${item.descricao} ${item.clienteNome || ""} ${item.valor}`,
  );
  const filtradas = encontradas.slice(0, 300);

  return (
    <Modal title="Vincular receita existente" description={campanha.nome} onClose={onClose}>
      <div className="grid gap-4">
        <Input label="Buscar receita" value={busca} onChange={setBusca} placeholder="Cliente, descrição ou valor" />
        <label className="grid gap-2 text-sm font-medium text-slate-300">
          Receita sem campanha
          <select value={lancamentoId} onChange={(event) => setLancamentoId(event.target.value)} className="premium-input w-full bg-[#1d2437]">
            <option value="">Selecione</option>
            {filtradas.map((item) => (
              <option key={item.id} value={item.id}>
                {formatarData(item.data)} · {item.clienteNome || "Sem cliente vinculado"} · {item.descricao} · {formatarMoeda(item.valor)}
              </option>
            ))}
          </select>
          <AvisoBusca
            encontrados={encontradas.length}
            exibidos={filtradas.length}
            total={receitas.length}
            rotulo="lançamento"
          />
        </label>
        <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/8 p-3 text-xs leading-5 text-emerald-100">O vínculo apenas atribui a receita já existente. Nenhum lançamento novo será criado.</div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={disabled || !lancamentoId} onClick={() => onSubmit(Number(lancamentoId))}>{disabled ? "Vinculando..." : "Vincular receita"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function CustoCampanhaModal({ campanha, contas, disabled, onClose, onSubmit }: {
  campanha: MarketingCampanha | null;
  contas: MarketingContaOption[];
  disabled: boolean;
  onClose: () => void;
  onSubmit: (dados: { descricao: string; valor: number; data: string; contaFinanceiraId: number | null; observacoes?: string }) => void;
}) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeInput());
  const [contaId, setContaId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  useEffect(() => { if (campanha) { setDescricao(`Investimento em Ads · ${campanha.nome}`); setValor(""); setData(hojeInput()); setContaId(contas.find((item) => item.principal)?.id ? String(contas.find((item) => item.principal)?.id) : ""); setObservacoes(""); } }, [campanha, contas]);
  if (!campanha) return null;
  return (
    <Modal title="Lançar custo da campanha" description="O valor será registrado como saída de Marketing no financeiro." onClose={onClose}>
      <div className="grid gap-4">
        <Input label="Descrição" value={descricao} onChange={setDescricao} />
        <div className="grid gap-4 sm:grid-cols-2"><Input label="Valor pago" type="number" min="0.01" step="0.01" value={valor} onChange={setValor} /><Input label="Data" type="date" value={data} onChange={setData} /></div>
        <label className="grid gap-2 text-sm font-medium text-slate-300">Conta financeira<select value={contaId} onChange={(event) => setContaId(event.target.value)} className="premium-input w-full bg-[#1d2437]"><option value="">Selecione a conta</option>{contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}{conta.banco ? ` · ${conta.banco}` : ""}{conta.principal ? " · principal" : ""}</option>)}</select></label>
        <Textarea label="Observações" value={observacoes} onChange={setObservacoes} />
        {contas.length === 0 ? <div className="rounded-2xl border border-rose-300/15 bg-rose-400/8 p-3 text-xs leading-5 text-rose-100">Cadastre primeiro a conta corrente na área Financeiro.</div> : null}
        <div className="rounded-2xl border border-amber-300/15 bg-amber-400/8 p-3 text-xs leading-5 text-amber-100">O orçamento previsto da campanha não substitui o custo real. Registre cada cobrança do Ads apenas uma vez.</div>
        <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="button" disabled={disabled || !descricao.trim() || Number(valor) <= 0 || !contaId} onClick={() => onSubmit({ descricao, valor: Number(valor), data, contaFinanceiraId: contaId ? Number(contaId) : null, observacoes })}>{disabled ? "Salvando..." : "Lançar custo"}</Button></div>
      </div>
    </Modal>
  );
}

function TemplatesView() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {WHATSAPP_MARKETING_TEMPLATE_OPTIONS.map((template) => (
        <article key={template.id} className="premium-card-soft p-5">
          <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/15"><MessageCircle className="size-5" /></div>
          <h2 className="font-semibold text-white">{template.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{template.description}</p>
          <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/10 p-3 text-xs leading-5 text-slate-400">Ao abrir o WhatsApp pelo CRM, o contato fica registrado no histórico do lead.</div>
        </article>
      ))}
    </section>
  );
}

function PerdaLeadModal({
  lead,
  disabled,
  onClose,
  onSubmit,
}: {
  lead: MarketingLead | null;
  disabled: boolean;
  onClose: () => void;
  onSubmit: (
    motivo: string,
    detalhe?: string,
  ) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [outroMotivo, setOutroMotivo] = useState("");
  const [detalhe, setDetalhe] = useState("");

  useEffect(() => {
    if (!lead) return;

    setMotivo("");
    setOutroMotivo("");
    setDetalhe("");
  }, [lead?.id]);

  if (!lead) return null;

  const motivos = [
    {
      value: "Preço",
      description:
        "Valor foi o principal motivo para não fechar.",
    },
    {
      value: "Sem resposta",
      description:
        "Parou de responder e a oportunidade será encerrada.",
    },
    {
      value: "Escolheu concorrente",
      description:
        "Informou que decidiu realizar em outro local.",
    },
    {
      value: "Desistiu",
      description:
        "Desistiu de realizar o procedimento neste momento.",
    },
    {
      value: "Sem interesse",
      description:
        "Não demonstrou interesse em continuar a negociação.",
    },
    {
      value: "Outro",
      description:
        "Use quando nenhum dos motivos acima representar o caso.",
    },
  ];

  const motivoFinal =
    motivo === "Outro"
      ? outroMotivo.trim()
      : motivo;

  return (
    <Modal
      title="Encerrar oportunidade"
      description={`Lead: ${lead.nome}`}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-rose-300/20 bg-rose-400/[0.08] p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-300" />

            <div>
              <p className="text-sm font-bold text-rose-100">
                Marcar como Perdido
              </p>

              <p className="mt-1 text-xs leading-5 text-rose-200/70">
                O lead será removido do funil ativo e ficará disponível em Encerrados. Nenhum histórico será apagado.
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-bold text-slate-200">
            Qual foi o principal motivo?
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {motivos.map((item) => {
              const selecionado =
                motivo === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    setMotivo(item.value)
                  }
                  disabled={disabled}
                  className={`rounded-2xl border p-3 text-left transition ${
                    selecionado
                      ? "border-rose-400/50 bg-rose-400/15 ring-1 ring-rose-400/20"
                      : "border-white/[0.10] bg-white/[0.05] hover:bg-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-bold ${
                        selecionado
                          ? "text-rose-100"
                          : "text-slate-200"
                      }`}
                    >
                      {item.value}
                    </span>

                    {selecionado ? (
                      <CheckCircle2 className="size-4 text-rose-300" />
                    ) : null}
                  </div>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {motivo === "Outro" ? (
          <label className="grid gap-2 text-sm font-medium text-slate-300">
            Motivo
            <input
              value={outroMotivo}
              onChange={(event) =>
                setOutroMotivo(
                  event.target.value,
                )
              }
              placeholder="Ex.: mudou de cidade"
              className="premium-input w-full"
              autoFocus
            />
          </label>
        ) : null}

        <label className="grid gap-2 text-sm font-medium text-slate-300">
          Detalhe adicional
          <textarea
            value={detalhe}
            onChange={(event) =>
              setDetalhe(event.target.value)
            }
            placeholder="Opcional. Ex.: achou o valor acima do orçamento e decidiu pesquisar outras clínicas."
            className="min-h-24 rounded-3xl border border-white/[0.10] bg-[#1d2437] p-4 text-sm text-slate-100 outline-none focus:border-violet-400/40"
          />
          <span className="text-xs leading-5 text-slate-500">
            O detalhe fica no histórico, mas não interfere no relatório do motivo principal.
          </span>
        </label>

        <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={disabled}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={() =>
              onSubmit(
                motivoFinal,
                detalhe,
              )
            }
            disabled={
              disabled ||
              !motivoFinal.trim()
            }
            className="bg-rose-600 text-white hover:bg-rose-700"
          >
            {disabled
              ? "Salvando..."
              : "Confirmar perda"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function LeadModal({
  open,
  lead,
  campanhas,
  procedimentosInteresse,
  onClose,
  onSubmit,
  disabled,
}: {
  open: boolean;
  lead: MarketingLead | null;
  campanhas: MarketingCampanha[];
  procedimentosInteresse: string[];
  onClose: () => void;
  onSubmit: (dados: LeadFormData) => void;
  disabled: boolean;
}) {
  const [form, setForm] = useState<LeadFormData>({ nome: "", telefone: "", origem: "Instagram", interesse: "", etapa: "Novo", valorPrevisto: 0, observacoes: "", campanhaId: null, codigoAtendimento: "" });

  useEffect(() => {
    if (!open) return;
    setForm(lead ? {
      nome: lead.nome,
      telefone: lead.telefone || "",
      origem: lead.origem || "Instagram",
      interesse: lead.interesse || "",
      etapa: lead.etapa as LeadEtapa,
      valorPrevisto: lead.valorPrevisto,
      observacoes: lead.observacoes || "",
      campanhaId: lead.campanhaId || null,
      codigoAtendimento: lead.codigoAtendimento || "",
    } : { nome: "", telefone: "", origem: "Instagram", interesse: "", etapa: "Novo", valorPrevisto: 0, observacoes: "", campanhaId: null, codigoAtendimento: "" });
  }, [open, lead]);

  if (!open) return null;

  return (
    <Modal title={lead ? "Editar lead" : "Novo lead"} description={lead ? "Atualize os dados comerciais sem perder o histórico." : "Cadastre uma oportunidade e acompanhe todo o ciclo comercial."} onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="grid gap-4">
        <Input label="Nome" value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Telefone / WhatsApp" value={form.telefone} onChange={(value) => setForm((prev) => ({ ...prev, telefone: formatarTelefoneDigitado(value) }))} placeholder="(11) 91234-5678" />
          <Select label="Origem" value={form.origem} onChange={(value) => setForm((prev) => ({ ...prev, origem: value }))} options={CAMPANHA_CANAIS.map((item) => item)} />
        </div>
        <label className="grid gap-2 text-sm font-medium text-slate-300">
          Campanha vinculada
          <select value={form.campanhaId || ""} onChange={(event) => setForm((prev) => ({ ...prev, campanhaId: event.target.value ? Number(event.target.value) : null }))} className="premium-input w-full bg-[#1d2437]">
            <option value="">Sem campanha específica</option>
            {campanhas.map((campanha) => <option key={campanha.id} value={campanha.id}>{campanha.nome} · {campanha.canal}</option>)}
          </select>
        </label>
        <Input label="Código de atendimento" value={form.codigoAtendimento} onChange={(value) => setForm((prev) => ({ ...prev, codigoAtendimento: value }))} placeholder="Ex: SR-LIM-GPTPJ" />
        <div className="grid gap-2 text-sm font-medium text-slate-300">
          Interesse
          <ProcedimentoSearchSelect
            name="interesse"
            options={procedimentosInteresse}
            value={form.interesse}
            onChange={(value) => setForm((prev) => ({ ...prev, interesse: value }))}
            placeholder="Digite para buscar um procedimento"
            inputClassName="premium-input w-full min-h-12"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* A etapa inicial deixou de ser escolha: "Contato" nao existe
              mais como etapa propria, entao todo lead novo comeca em
              "Novo" - sem opcao pra confundir. */}
          <div />
          <ValorInput label="Valor previsto" value={form.valorPrevisto} onChange={(value) => setForm((prev) => ({ ...prev, valorPrevisto: value }))} />
        </div>
        <Textarea label="Observações" value={form.observacoes} onChange={(value) => setForm((prev) => ({ ...prev, observacoes: value }))} />
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/8 p-3 text-xs leading-5 text-cyan-100">O CRM compara o telefone com leads ativos e clientes existentes para reduzir cadastros duplicados.</div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={disabled}>{disabled ? "Salvando..." : lead ? "Salvar alterações" : "Salvar lead"}</Button></div>
      </form>
    </Modal>
  );
}

function TelefoneDuplicadoModal({
  conflito,
  disabled,
  onCorrigir,
  onVincular,
  onPessoaDiferente,
}: {
  conflito: ConflitoTelefoneLead | null;
  disabled: boolean;
  onCorrigir: () => void;
  onVincular: () => void;
  onPessoaDiferente: () => void;
}) {
  if (!conflito) return null;

  const { dados, clienteExistente, leadAtivo } = conflito;
  const telefoneEncontrado = clienteExistente?.whatsapp || clienteExistente?.telefone || leadAtivo?.telefone || dados.telefone;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div className="w-full max-w-2xl rounded-t-[2rem] border border-amber-300/20 bg-[#171d2a] p-5 shadow-2xl shadow-black/50 sm:rounded-[2rem] sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-200">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Telefone já cadastrado</h3>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              O CRM encontrou este número em outro cadastro. Confirme a identidade antes de criar o lead para evitar misturar clientes, prontuários, agenda ou financeiro.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.10] bg-white/[0.05] p-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Novo lead informado</span>
            <strong className="mt-2 block text-base text-white">{dados.nome}</strong>
            <span className="mt-1 block text-sm text-slate-400">{dados.telefone || "Telefone não informado"}</span>
          </div>

          <div className="rounded-2xl border border-amber-300/15 bg-amber-400/8 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200/60">Cadastro encontrado</span>
            {clienteExistente ? (
              <>
                <strong className="mt-2 block text-base text-white">Cliente: {clienteExistente.nome}</strong>
                <span className="mt-1 block text-sm text-amber-100/70">{telefoneEncontrado}</span>
              </>
            ) : leadAtivo ? (
              <>
                <strong className="mt-2 block text-base text-white">Lead ativo: {leadAtivo.nome}</strong>
                <span className="mt-1 block text-sm text-amber-100/70">Etapa: {leadAtivo.etapa}</span>
              </>
            ) : null}
            {clienteExistente && leadAtivo ? <span className="mt-2 block text-xs text-amber-100/60">Também existe um lead ativo com este telefone: {leadAtivo.nome} ({leadAtivo.etapa}).</span> : null}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-cyan-300/10 bg-cyan-400/7 p-4 text-sm leading-6 text-cyan-100/80">
          {leadAtivo
            ? `Já existe uma oportunidade ativa com este telefone: ${leadAtivo.nome} (${leadAtivo.etapa}). Corrija os dados ou escolha pessoa diferente somente quando o número for realmente compartilhado.`
            : clienteExistente
              ? "Vincule somente se for realmente a mesma pessoa. Se o número for compartilhado por familiares, casal ou equipe, escolha cadastrar como pessoa diferente."
              : "Confirme os dados antes de continuar."}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {clienteExistente && !leadAtivo ? (
            <Button type="button" onClick={onVincular} disabled={disabled} className="sm:col-span-2">
              <Link2 className="size-4" /> Vincular ao cliente {clienteExistente.nome}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onCorrigir} disabled={disabled}>
            <Pencil className="size-4" /> Corrigir os dados
          </Button>
          <Button type="button" variant="outline" onClick={onPessoaDiferente} disabled={disabled} className="border-amber-300/20 text-amber-100 hover:bg-amber-400/10">
            <UsersRound className="size-4" /> Cadastrar como pessoa diferente
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Converte a data que vem do banco (objeto Date, ou string ISO) para o
 * formato "aaaa-mm-dd" que o <input type="date"> exige. O bug anterior
 * fazia String(dataDoBanco).slice(0,10), que num objeto Date produz algo
 * como "Sat Aug 01" - texto invalido, que quebrava ao salvar de volta.
 */
function paraDataInput(valor: string | Date | null | undefined) {
  if (!valor) return "";

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function CampanhaModal({ open, campanha, onClose, onSubmit, disabled }: { open: boolean; campanha?: MarketingCampanha | null; onClose: () => void; onSubmit: (dados: CampanhaFormData) => void; disabled: boolean }) {
  const [form, setForm] = useState<CampanhaFormData>({ nome: "", canal: "Instagram", utmCampaign: "", investimento: 0, leads: 0, status: "Ativa", inicio: "", fim: "", observacoes: "" });

  useEffect(() => {
    if (!open) return;

    // Editando: carrega o que ja existe. Criando: comeca em branco.
    if (campanha) {
      setForm({
        nome: campanha.nome,
        canal: campanha.canal,
        utmCampaign: campanha.utmCampaign || "",
        investimento: campanha.investimento || 0,
        leads: campanha.leads || 0,
        status: campanha.status,
        inicio: paraDataInput(campanha.inicio),
        fim: paraDataInput(campanha.fim),
        observacoes: campanha.observacoes || "",
      });
      return;
    }

    setForm({ nome: "", canal: "Instagram", utmCampaign: "", investimento: 0, leads: 0, status: "Ativa", inicio: "", fim: "", observacoes: "" });
  }, [open, campanha]);

  if (!open) return null;

  return (
    <Modal title={campanha ? "Editar campanha" : "Nova campanha"} description={campanha ? "Atualize os dados da campanha. O histórico de custos e vínculos é preservado." : "Crie a campanha e vincule os leads reais a ela no CRM."} onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="grid gap-4">
        <Input label="Nome da campanha" value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} required />
        <div className="grid gap-1">
          <Input label="Identificador do anúncio (utm_campaign)" value={form.utmCampaign} onChange={(value) => setForm((prev) => ({ ...prev, utmCampaign: value }))} placeholder="Ex: pesq_limpeza_pele_taboao" />
          <p className="text-xs leading-5 text-slate-400">
            É o que aparece na coluna UTM Campaign da planilha de rastreamento. Com ele preenchido, o lead que chega pelo anúncio já entra vinculado a esta campanha sozinho.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><Select label="Canal" value={form.canal} onChange={(value) => setForm((prev) => ({ ...prev, canal: value }))} options={CAMPANHA_CANAIS.map((item) => item)} /><Select label="Status" value={form.status} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} options={CAMPANHA_STATUS.map((item) => item)} /></div>
        <Input label="Orçamento previsto" type="number" step="0.01" value={String(form.investimento)} onChange={(value) => setForm((prev) => ({ ...prev, investimento: Number(value || 0) }))} />
        <div className="grid gap-4 sm:grid-cols-2"><Input label="Início" type="date" value={form.inicio} onChange={(value) => setForm((prev) => ({ ...prev, inicio: value }))} /><Input label="Fim" type="date" value={form.fim} onChange={(value) => setForm((prev) => ({ ...prev, fim: value }))} /></div>
        <Textarea label="Observações" value={form.observacoes} onChange={(value) => setForm((prev) => ({ ...prev, observacoes: value }))} />
        <p className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 text-xs leading-5 text-slate-400">A quantidade de leads e a conversão deixam de ser digitadas manualmente. O sistema calcula pelos leads realmente vinculados à campanha.</p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={disabled}>{disabled ? "Salvando..." : campanha ? "Salvar alterações" : "Salvar campanha"}</Button></div>
      </form>
    </Modal>
  );
}

function MarketingMessageModal({ lead, onClose, onUpdated, podeGerenciar }: { lead: MarketingLead | null; onClose: () => void; onUpdated: () => void; podeGerenciar: boolean }) {
  const [template, setTemplate] = useState<WhatsAppMarketingTemplateType>("firstContact");
  const [copied, setCopied] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (lead) {
      setTemplate("firstContact");
      setFollowUp(lead.proximoContatoEm ? dataInput(lead.proximoContatoEm) : "");
      setErro(null);
    }
  }, [lead]);

  if (!lead) return null;

  const leadId = lead.id;
  const message = buildMarketingWhatsAppMessage({ template, leadName: lead.nome, interest: lead.interesse });
  const url = buildWhatsAppUrl(lead.telefone, message);

  async function copiarMensagem() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function abrirWhatsapp() {
    if (!url) {
      setErro("O lead não possui telefone válido para WhatsApp.");
      return;
    }

    const abrir = () => window.open(url, "_blank", "noopener,noreferrer");
    if (!podeGerenciar) {
      abrir();
      return;
    }

    startTransition(async () => {
      try {
        await registrarContatoLead(leadId, followUp || null);
        abrir();
        onUpdated();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível registrar o contato.");
      }
    });
  }

  return (
    <Modal title="Mensagem para WhatsApp" description={`Lead: ${lead.nome}`} onClose={onClose}>
      <div className="grid gap-4">
        {erro ? <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-100">{erro}</div> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {WHATSAPP_MARKETING_TEMPLATE_OPTIONS.map((option) => (
            <button key={option.id} type="button" onClick={() => setTemplate(option.id)} className={`rounded-2xl border p-4 text-left transition ${template === option.id ? "border-emerald-300/30 bg-emerald-400/10 text-white" : "border-white/[0.10] bg-white/[0.055] text-slate-300 hover:bg-white/[0.08]"}`}>
              <p className="text-sm font-semibold">{option.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p>
            </button>
          ))}
        </div>
        <textarea value={message} readOnly className="min-h-52 rounded-3xl border border-white/[0.10] bg-[#171d2d] p-4 text-sm leading-6 text-slate-100 outline-none" />
        {podeGerenciar ? <Input label="Próximo contato, opcional" type="date" value={followUp} onChange={setFollowUp} /> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={copiarMensagem}>{copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}{copied ? "Copiado" : "Copiar mensagem"}</Button>
          <Button type="button" onClick={abrirWhatsapp} disabled={pending} className="bg-emerald-500 hover:bg-emerald-400"><MessageCircle className="size-4" />{pending ? "Registrando..." : "Abrir WhatsApp"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function LeadDetailsModal({
  lead,
  onClose,
  onEdit,
  onSchedule,
  onDelete,
  onUpdated,
  onTrocarCliente,
  podeGerenciarMarketing,
  podeGerenciarAgenda,
}: {
  lead: MarketingLead | null;
  onClose: () => void;
  onEdit: (lead: MarketingLead) => void;
  onSchedule: (lead: MarketingLead) => void;
  onDelete: (id: number) => void;
  onUpdated: () => void;
  onTrocarCliente: (lead: MarketingLead) => void;
  podeGerenciarMarketing: boolean;
  podeGerenciarAgenda: boolean;
}) {
  const [followUp, setFollowUp] = useState("");
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (lead) {
      setFollowUp(lead.proximoContatoEm ? dataInput(lead.proximoContatoEm) : "");
      setNota("");
      setErro(null);
    }
  }, [lead]);

  if (!lead) return null;

  const leadId = lead.id;

  function salvarFollowUp() {
    startTransition(async () => {
      try {
        await definirProximoContatoLead(leadId, followUp || null);
        onUpdated();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível salvar o próximo contato.");
      }
    });
  }

  function adicionarNota() {
    startTransition(async () => {
      try {
        await registrarObservacaoLead(leadId, nota);
        setNota("");
        onUpdated();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível registrar a observação.");
      }
    });
  }

  return (
    <Modal title={lead.nome} description={`${lead.interesse || "Interesse não informado"} · ${lead.etapa}`} onClose={onClose} wide>
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          {erro ? <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-100">{erro}</div> : null}
          <section className="rounded-3xl border border-white/[0.10] bg-white/[0.055] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Telefone" value={lead.telefone || "Não informado"} />
              <Detail label="Origem" value={getOrigemLabel(lead.origem)} />
              <Detail label="Campanha" value={lead.campanha?.nome || "Sem campanha"} />
              <Detail label="Código de atendimento" value={lead.codigoAtendimento || "Não informado"} />
              {lead.codigoAtendimento ? (
                <Detail label="Chamou no WhatsApp" value={lead.chamouWhatsapp} />
              ) : null}
              <Detail label="Valor previsto" value={formatarMoeda(lead.valorPrevisto)} />
              <Detail label="Último contato" value={lead.ultimoContatoEm ? formatarDataHora(lead.ultimoContatoEm) : "Ainda não registrado"} />
              <Detail label="Próximo contato" value={lead.proximoContatoEm ? formatarData(lead.proximoContatoEm) : "Não programado"} />
            </div>
            {lead.observacoes ? <div className="mt-4 rounded-2xl bg-black/10 p-3 text-sm leading-6 text-slate-300">{lead.observacoes}</div> : null}
            {lead.motivoPerda ? <div className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/8 p-3 text-sm text-rose-100"><strong>Motivo da perda:</strong> {lead.motivoPerda}</div> : null}
            {lead.ignorarVinculoTelefone ? <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100"><strong>Telefone compartilhado:</strong> este lead foi confirmado como uma pessoa diferente. O CRM não reutilizará automaticamente outro cliente apenas por este número.</div> : null}
          </section>

          <section className="rounded-3xl border border-white/[0.10] bg-white/[0.055] p-4">
            <h4 className="flex items-center gap-2 font-semibold text-white"><Link2 className="size-4 text-cyan-900" />Vínculos</h4>
            <div className="mt-3 grid gap-2">
              {lead.cliente ? <Link href={`/clientes/${lead.cliente.id}`} className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.08]"><span>Cliente: {lead.cliente.nome}</span><ExternalLink className="size-4" /></Link> : <p className="rounded-2xl border border-dashed border-white/[0.10] p-3 text-xs text-slate-500">Ainda não há cliente vinculado.</p>}
              {podeGerenciarMarketing ? (
                <button type="button" onClick={() => onTrocarCliente(lead)} className="mt-2 text-xs font-semibold text-violet-300 hover:text-violet-200">
                  {lead.cliente ? "Trocar cliente vinculado" : "Vincular a um cliente existente"}
                </button>
              ) : null}
              {lead.agendamento ? <Link href="/agenda" className="rounded-2xl border border-cyan-300/10 bg-cyan-400/8 px-3 py-3 text-sm text-cyan-100 hover:bg-cyan-400/12"><div className="flex items-center justify-between"><strong>{formatarDataHora(lead.agendamento.data)}</strong><ExternalLink className="size-4" /></div><p className="mt-1 text-xs text-cyan-900">{lead.agendamento.procedimento} · {lead.agendamento.status}</p></Link> : null}
              {lead.receitaRastreada > 0 ? <div className="rounded-2xl border border-emerald-300/10 bg-emerald-400/8 px-3 py-3 text-sm text-emerald-200">Receita rastreada do agendamento: <strong>{formatarMoeda(lead.receitaRastreada)}</strong></div> : null}
            </div>
          </section>

          {podeGerenciarMarketing && isLeadAberto(lead) ? (
            <section className="rounded-3xl border border-white/[0.10] bg-white/[0.055] p-4">
              <h4 className="font-semibold text-white">Próxima ação</h4>
              <div className="mt-3 grid gap-3"><Input label="Próximo contato" type="date" value={followUp} onChange={setFollowUp} /><Button type="button" variant="outline" onClick={salvarFollowUp} disabled={pending}><Clock3 className="size-4" />Salvar follow-up</Button></div>
            </section>
          ) : null}

          {podeGerenciarMarketing ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => onEdit(lead)}><Pencil className="size-4" />Editar</Button>
              {podeGerenciarAgenda && isLeadAberto(lead) ? <Button type="button" variant="outline" onClick={() => onSchedule(lead)}><CalendarPlus className="size-4" />{lead.agendamento ? "Novo horário" : "Agendar"}</Button> : null}
              <Button type="button" variant="outline" onClick={() => onDelete(leadId)} className="text-rose-200"><Trash2 className="size-4" />Excluir lead</Button>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border border-white/[0.10] bg-white/[0.055] p-4">
            <div className="flex items-center justify-between"><h4 className="flex items-center gap-2 font-semibold text-white"><History className="size-4 text-violet-300" />Histórico comercial</h4><span className="text-xs text-slate-500">Últimos {lead.interacoes.length}</span></div>
            <div className="mt-4 space-y-3">
              {lead.interacoes.length ? lead.interacoes.map((item) => (
                <div key={item.id} className="relative border-l border-white/[0.12] pl-4">
                  <span className="absolute -left-1 top-1 size-2 rounded-full bg-violet-400" />
                  <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-slate-100">{item.tipo}</strong><span className="text-[11px] text-slate-500">{formatarDataHora(item.createdAt)}</span></div>
                  {item.descricao ? <p className="mt-1 text-xs leading-5 text-slate-400">{item.descricao}</p> : null}
                </div>
              )) : <p className="rounded-2xl border border-dashed border-white/[0.10] p-4 text-center text-xs text-slate-500">Ainda não há interações registradas.</p>}
            </div>
          </section>

          {podeGerenciarMarketing ? (
            <section className="rounded-3xl border border-white/[0.10] bg-white/[0.055] p-4">
              <h4 className="flex items-center gap-2 font-semibold text-white"><FileText className="size-4 text-violet-300" />Registrar observação</h4>
              <textarea value={nota} onChange={(event) => setNota(event.target.value)} placeholder="Ex: cliente pediu retorno após conversar com a família..." className="mt-3 min-h-28 w-full rounded-2xl border border-white/[0.10] bg-[#171d2d] p-3 text-sm text-slate-100 outline-none focus:border-violet-400/40" />
              <Button type="button" onClick={adicionarNota} disabled={pending || !nota.trim()} className="mt-3 w-full">Adicionar ao histórico</Button>
            </section>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

function AgendarAvaliacaoModal({
  lead,
  profissionais,
  servicos,
  onClose,
  onSuccess,
}: {
  lead: MarketingLead | null;
  profissionais: MarketingProfissional[];
  servicos: MarketingServico[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const avaliacao = servicos.find((servico) => normalizarTexto(servico.nome) === "avaliacao") || servicos[0];
  const [profissionalId, setProfissionalId] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [data, setData] = useState(hojeInput());
  const [hora, setHora] = useState("");
  const [duracao, setDuracao] = useState("30");
  const [valor, setValor] = useState("0");
  const [sinalPago, setSinalPago] = useState(false);
  const [horarios, setHorarios] = useState<{ hora: string; disponivel: boolean; motivo?: string }[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadingHorarios, startHorariosTransition] = useTransition();

  useEffect(() => {
    if (!lead) return;
    const servicoInicial = avaliacao;
    setProfissionalId(profissionais[0]?.id ? String(profissionais[0].id) : "");
    setServicoId(servicoInicial?.id ? String(servicoInicial.id) : "");
    setData(hojeInput());
    setHora("");
    setDuracao(String(servicoInicial?.duracaoPadrao || 30));
    setValor(String(servicoInicial?.valorPadrao || 0));
    setSinalPago(false);
    setErro(null);
  }, [lead, profissionais, avaliacao]);

  useEffect(() => {
    if (!lead || !profissionalId || !data) {
      setHorarios([]);
      return;
    }

    startHorariosTransition(async () => {
      try {
        const resultado = await buscarDisponibilidadeAgenda({ profissionalId: Number(profissionalId), data, duracao: Number(duracao) || 30 });
        setHorarios(resultado);

        // Mantem o horario somente se ele continuar disponivel.
        // Quando muda data, profissional ou duracao, a pessoa escolhe
        // conscientemente um dos horarios livres exibidos na tela.
        setHora((atual) =>
          resultado.some(
            (item) =>
              item.hora === atual &&
              item.disponivel,
          )
            ? atual
            : "",
        );
      } catch {
        setHorarios([]);
        setHora("");
      }
    });
  }, [lead, profissionalId, data, duracao]);

  if (!lead) return null;

  const leadId = lead.id;
  const servicoSelecionado = servicos.find((servico) => String(servico.id) === servicoId) || avaliacao;
  const disponiveis = horarios.filter((item) => item.disponivel);
  const ocupados = horarios.filter((item) => !item.disponivel).slice(0, 4);

  function escolherServico(id: string) {
    setServicoId(id);
    const servico = servicos.find((item) => String(item.id) === id);
    if (servico) {
      setDuracao(String(servico.duracaoPadrao));
      setValor(String(servico.valorPadrao));
    }
  }

  function salvar() {
    setErro(null);
    if (!profissionalId || !data || !hora || !servicoSelecionado) {
      setErro("Escolha profissional, serviço, data e um horário disponível.");
      return;
    }

    const servicoParaAgendar = servicoSelecionado;

    startTransition(async () => {
      try {
        await agendarAvaliacaoLead({
          leadId,
          profissionalId: Number(profissionalId),
          procedimento: servicoParaAgendar.nome,
          data,
          hora,
          duracao: Number(duracao) || servicoParaAgendar.duracaoPadrao,
          valor: Number(valor) || 0,
          sinalPago,
        });
        onSuccess();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível criar o agendamento.");
      }
    });
  }

  return (
    <Modal title="Agendar pelo CRM" description={`Lead: ${lead.nome}`} onClose={onClose}>
      <div className="grid gap-4">
        {lead.agendamento ? <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/8 p-3 text-sm text-cyan-100"><strong>Agendamento atual:</strong> {formatarDataHora(lead.agendamento.data)}. Se ainda estiver ativo, o mesmo registro será reagendado sem criar duplicidade. Atendimentos já finalizados ou cancelados são preservados e um novo agendamento será criado.</div> : null}
        {erro ? <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-100">{erro}</div> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-300">Profissional<select value={profissionalId} onChange={(event) => setProfissionalId(event.target.value)} className="premium-input w-full bg-[#1d2437]"><option value="">Selecione</option>{profissionais.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-medium text-slate-300">Serviço<select value={servicoId} onChange={(event) => escolherServico(event.target.value)} className="premium-input w-full bg-[#1d2437]"><option value="">Selecione</option>{servicos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3"><Input label="Data" type="date" min={hojeInput()} value={data} onChange={setData} /><Input label="Duração, min" type="number" min="15" step="5" value={duracao} onChange={setDuracao} /><Input label="Valor" type="number" min="0" step="0.01" value={valor} onChange={setValor} /></div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Horários disponíveis
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Escolha um dos horários livres abaixo.
              </p>
            </div>

            {!loadingHorarios && disponiveis.length > 0 ? (
              <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200">
                {disponiveis.length} livre(s)
              </span>
            ) : null}
          </div>

          {loadingHorarios ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm font-medium text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400">
              Consultando agenda...
            </div>
          ) : disponiveis.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {disponiveis.map((item) => {
                const selecionado =
                  hora === item.hora;

                return (
                  <button
                    key={item.hora}
                    type="button"
                    onClick={() =>
                      setHora(item.hora)
                    }
                    className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-bold transition ${
                      selecionado
                        ? "border-violet-500 bg-violet-600 text-white shadow-md shadow-violet-500/20 ring-2 ring-violet-200"
                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800 dark:border-white/[0.10] dark:bg-white/[0.05] dark:text-slate-200 dark:hover:border-violet-400/30 dark:hover:bg-violet-400/10"
                    }`}
                  >
                    {item.hora}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-400/20 dark:bg-amber-400/10">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                Nenhum horário disponível
              </p>

              <p className="mt-1 text-xs text-amber-700 dark:text-amber-200/70">
                Escolha outra data, profissional ou ajuste a duração.
              </p>
            </div>
          )}

          {hora ? (
            <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200">
              <CheckCircle2 className="size-4" />
              Horário selecionado: {hora}
            </div>
          ) : null}
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 transition hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08] dark:hover:bg-emerald-400/[0.12]">
          <span className="min-w-0">
            <span className="block text-sm font-bold text-emerald-900 dark:text-emerald-200">
              Pagou sinal
            </span>
            <span className="mt-0.5 block text-xs leading-5 text-emerald-700 dark:text-emerald-200/70">
              Marque quando o cliente já tiver pago o sinal da reserva. O marcador aparecerá automaticamente na agenda.
            </span>
          </span>

          <input
            type="checkbox"
            checked={sinalPago}
            onChange={(event) => setSinalPago(event.target.checked)}
            className="size-5 shrink-0 accent-emerald-600"
          />
        </label>

        {ocupados.length ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Também indisponíveis
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Horários já ocupados ou bloqueados para esta combinação.
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-slate-300">
                {ocupados.length} indisponível(is)
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {ocupados.map((item) => (
                <span
                  key={item.hora}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-white/[0.10] dark:bg-white/[0.05] dark:text-slate-400"
                >
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {item.hora}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span>{item.motivo || "indisponível"}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/8 p-3 text-xs leading-5 text-cyan-100">
          Ao salvar, o sistema reutiliza um cliente existente pelo telefone ou cria o cadastro necessário, gera o agendamento real e move o lead para Agendado.
          {sinalPago ? " O sinal será marcado como pago na agenda." : ""}
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="button" onClick={salvar} disabled={pending || loadingHorarios || !hora}><CalendarPlus className="size-4" />{pending ? "Agendando..." : "Criar agendamento"}</Button></div>
      </div>
    </Modal>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm font-medium text-slate-200">{value}</p></div>;
}

function Modal({ title, description, children, onClose, wide = false }: { title: string; description: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] border border-white/[0.12] bg-[#171d2a] p-5 shadow-2xl shadow-black/40 scrollbar-premium sm:rounded-[2rem] sm:p-6 ${wide ? "sm:max-w-6xl" : "sm:max-w-3xl"}`}>
        <div className="mb-6 flex items-start justify-between gap-4"><div><h3 className="text-xl font-semibold text-white">{title}</h3><p className="mt-1 text-sm text-slate-400">{description}</p></div><button type="button" onClick={onClose} className="rounded-2xl border border-white/[0.10] bg-white/[0.06] px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/[0.10]">Fechar</button></div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, onChange, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { label: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-sm font-medium text-slate-300">{label}<input {...props} onChange={(event) => onChange(event.target.value)} className="premium-input w-full" /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-sm font-medium text-slate-300">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="premium-input w-full bg-[#1d2437]">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-sm font-medium text-slate-300">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-28 rounded-3xl border border-white/[0.10] bg-[#1d2437] p-4 text-sm text-slate-100 outline-none focus:border-violet-400/40" /></label>;
}