"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
  registrarObservacaoLead,
  verificarTelefoneLead,
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
  MarketingLead,
  MarketingProfissional,
  MarketingResumo,
  MarketingServico,
} from "../types";
import { CAMPANHA_CANAIS, CAMPANHA_STATUS, LEAD_ETAPAS } from "../types";

type Props = {
  leads: MarketingLead[];
  campanhas: MarketingCampanha[];
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

function calcularResumo(leads: MarketingLead[], campanhas: MarketingCampanha[]): MarketingResumo {
  const leadsConvertidos = leads.filter((lead) => lead.etapa === "Convertido").length;
  const leadsPerdidos = leads.filter((lead) => lead.etapa === "Perdido").length;
  const leadsAtivos = leads.filter((lead) => lead.etapa !== "Convertido" && lead.etapa !== "Perdido").length;
  const avaliacoesAgendadas = leads.filter((lead) => lead.agendamentoId && lead.etapa !== "Perdido").length;
  const pipelineTotal = leads.reduce((acc, lead) => acc + lead.valorPrevisto, 0);
  const pipelineAtivo = leads
    .filter((lead) => lead.etapa !== "Perdido" && lead.etapa !== "Convertido")
    .reduce((acc, lead) => acc + lead.valorPrevisto, 0);
  const investimentoTotal = campanhas.reduce((acc, campanha) => acc + campanha.investimento, 0);
  const leadsAtribuidos = leads.filter((lead) => lead.campanhaId).length;
  const receitaRastreada = leads.reduce((acc, lead) => acc + lead.receitaRastreada, 0);

  return {
    totalLeads: leads.length,
    leadsAtivos,
    leadsConvertidos,
    leadsPerdidos,
    avaliacoesAgendadas,
    pipelineTotal,
    pipelineAtivo,
    ticketMedioPrevisto: leads.length > 0 ? pipelineTotal / leads.length : 0,
    campanhasAtivas: campanhas.filter((campanha) => campanha.status === "Ativa").length,
    investimentoTotal,
    custoPorLead: leadsAtribuidos > 0 ? investimentoTotal / leadsAtribuidos : 0,
    taxaConversao: leads.length > 0 ? (leadsConvertidos / leads.length) * 100 : 0,
    receitaRastreada,
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
  profissionais,
  servicos,
  podeGerenciarMarketing,
  podeGerenciarAgenda,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabKey>("pipeline");
  const [leadModal, setLeadModal] = useState(false);
  const [leadEditando, setLeadEditando] = useState<MarketingLead | null>(null);
  const [conflitoTelefone, setConflitoTelefone] = useState<ConflitoTelefoneLead | null>(null);
  const [campanhaModal, setCampanhaModal] = useState(false);
  const [mensagemModal, setMensagemModal] = useState<MarketingLead | null>(null);
  const [detalhesModal, setDetalhesModal] = useState<MarketingLead | null>(null);
  const [agendamentoModal, setAgendamentoModal] = useState<MarketingLead | null>(null);
  const [busca, setBusca] = useState("");
  const [etapaFiltro, setEtapaFiltro] = useState("todas");
  const [origemFiltro, setOrigemFiltro] = useState("todas");
  const [erro, setErro] = useState<string | null>(null);

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

  const origens = useMemo(() => {
    const valores = new Set(leads.map((lead) => lead.origem).filter((item): item is string => Boolean(item)));
    return Array.from(valores).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [leads]);

  const leadsFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca.trim());

    return leads.filter((lead) => {
      const textoBusca = normalizarTexto(
        `${lead.nome} ${lead.telefone || ""} ${lead.origem || ""} ${lead.interesse || ""} ${lead.campanha?.nome || ""} ${lead.observacoes || ""}`,
      );
      const matchesBusca = !termo || textoBusca.includes(termo);
      const matchesEtapa = etapaFiltro === "todas" || lead.etapa === etapaFiltro;
      const matchesOrigem = origemFiltro === "todas" || lead.origem === origemFiltro;
      return matchesBusca && matchesEtapa && matchesOrigem;
    });
  }, [busca, etapaFiltro, leads, origemFiltro]);

  const leadsPorEtapa = useMemo(() => {
    return LEAD_ETAPAS.map((etapa) => ({
      ...etapa,
      leads: leadsFiltrados.filter((lead) => lead.etapa === etapa.value),
    }));
  }, [leadsFiltrados]);

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

  function salvarCampanha(dados: CampanhaFormData) {
    executar(async () => {
      await criarCampanha(dados);
      setCampanhaModal(false);
    });
  }

  function alterarEtapa(id: number, etapa: LeadEtapa) {
    if (etapa === "Perdido") {
      const motivo = window.prompt("Qual foi o motivo da perda desta oportunidade?");
      if (!motivo?.trim()) return;
      executar(async () => {
        await marcarLeadPerdido(id, motivo);
      });
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
    if (!window.confirm("Deseja excluir esta campanha? Os leads permanecerão no CRM, apenas sem vínculo com a campanha.")) return;
    executar(async () => {
      await excluirCampanha(id);
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ResumoCard title="Leads ativos" value={String(resumo.leadsAtivos)} detail={`${resumo.totalLeads} oportunidade(s) no total`} icon={UsersRound} />
          <ResumoCard title="Avaliações vinculadas" value={String(resumo.avaliacoesAgendadas)} detail="Agendamentos originados pelo CRM" icon={CalendarClock} />
          <ResumoCard title="Convertidos" value={String(resumo.leadsConvertidos)} detail={`${resumo.leadsPerdidos} perdido(s)`} icon={UserCheck} />
          <ResumoCard title="Campanhas ativas" value={String(resumo.campanhasAtivas)} detail={`Investimento: ${formatarMoeda(resumo.investimentoTotal)}`} icon={Megaphone} />
        </section>

        <section className="premium-card-soft p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.9fr] xl:min-w-0 xl:flex-1">
              <label className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar lead, telefone, campanha ou interesse"
                  className="premium-input h-11 w-full pl-11"
                />
              </label>

              <label className="relative">
                <Filter className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <select value={etapaFiltro} onChange={(event) => setEtapaFiltro(event.target.value)} className="premium-input h-11 w-full bg-[#1d2437] pl-11">
                  <option value="todas">Todas as etapas</option>
                  {LEAD_ETAPAS.map((etapa) => <option key={etapa.value} value={etapa.value}>{etapa.label}</option>)}
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
          <section className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
            {leadsPorEtapa.map((etapa) => (
              <PipelineColumn
                key={etapa.value}
                etapa={etapa.value}
                label={etapa.label}
                description={etapa.description}
                leads={etapa.leads}
                onEtapaChange={alterarEtapa}
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
        ) : null}

        {tab === "campanhas" ? (
          <CampanhasView campanhas={campanhas} leads={leads} onDelete={removerCampanha} isPending={isPending} podeGerenciar={podeGerenciarMarketing} />
        ) : null}

        {tab === "mensagens" ? <TemplatesView /> : null}
      </div>

      <LeadModal
        open={leadModal}
        lead={leadEditando}
        campanhas={campanhas}
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
      <CampanhaModal open={campanhaModal} onClose={() => setCampanhaModal(false)} onSubmit={salvarCampanha} disabled={isPending} />
      <MarketingMessageModal lead={mensagemModal} onClose={() => setMensagemModal(null)} onUpdated={() => router.refresh()} podeGerenciar={podeGerenciarMarketing} />
      <LeadDetailsModal
        lead={detalhesModal}
        onClose={() => setDetalhesModal(null)}
        onEdit={editarLead}
        onSchedule={setAgendamentoModal}
        onDelete={removerLead}
        onUpdated={() => router.refresh()}
        podeGerenciarMarketing={podeGerenciarMarketing}
        podeGerenciarAgenda={podeGerenciarAgenda}
      />
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
  onMessage: (lead: MarketingLead) => void;
  onDetails: (lead: MarketingLead) => void;
  onSchedule: (lead: MarketingLead) => void;
  onConvert: (id: number) => void;
  isPending: boolean;
  podeGerenciarMarketing: boolean;
  podeGerenciarAgenda: boolean;
}) {
  const atrasado = followUpAtrasado(lead);

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
        {lead.agendamento ? (
          <div className="rounded-xl border border-cyan-300/10 bg-cyan-400/8 px-2.5 py-2 text-cyan-100">
            <p className="font-semibold">{formatarDataHora(lead.agendamento.data)}</p>
            <p className="mt-0.5 truncate text-[11px] text-cyan-200/70">{lead.agendamento.procedimento} · {lead.agendamento.profissional?.nome || "Profissional não informado"}</p>
          </div>
        ) : null}
        {lead.receitaRastreada > 0 ? <p className="text-emerald-300">Receita rastreada: <strong>{formatarMoeda(lead.receitaRastreada)}</strong></p> : null}
      </div>

      {podeGerenciarMarketing ? (
        <div className="mt-4 grid gap-2">
          <select
            value={currentEtapa}
            onChange={(event) => onEtapaChange(lead.id, event.target.value as LeadEtapa)}
            disabled={isPending}
            className="h-10 rounded-2xl border border-white/[0.10] bg-[#171d2d] px-3 text-xs font-medium text-slate-100 outline-none focus:border-violet-400/40"
          >
            {LEAD_ETAPAS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onMessage(lead)} className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/15">WhatsApp</button>
            <button type="button" onClick={() => onDetails(lead)} className="rounded-2xl border border-white/[0.10] bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.10]">Detalhes</button>
            {podeGerenciarAgenda && isLeadAberto(lead) ? (
              <button type="button" onClick={() => onSchedule(lead)} className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/15">{lead.agendamento ? "Reagendar" : "Agendar"}</button>
            ) : null}
            {lead.etapa !== "Convertido" ? (
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
  onDelete,
  isPending,
  podeGerenciar,
}: {
  campanhas: MarketingCampanha[];
  leads: MarketingLead[];
  onDelete: (id: number) => void;
  isPending: boolean;
  podeGerenciar: boolean;
}) {
  const totalLeads = leads.filter((lead) => lead.campanhaId).length;
  const investimento = campanhas.reduce((acc, campanha) => acc + campanha.investimento, 0);
  const receita = leads.reduce((acc, lead) => acc + lead.receitaRastreada, 0);

  return (
    <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
      <div className="premium-card-soft p-5">
        <h2 className="text-lg font-semibold text-white">Performance comercial</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">Os indicadores abaixo usam vínculos reais entre lead e campanha. A receita rastreada considera pagamentos dos agendamentos diretamente vinculados ao lead.</p>
        <div className="mt-5 grid gap-3">
          <CampaignInsight label="Campanhas cadastradas" value={String(campanhas.length)} />
          <CampaignInsight label="Leads atribuídos" value={String(totalLeads)} />
          <CampaignInsight label="Investimento total" value={formatarMoeda(investimento)} />
          <CampaignInsight label="Receita rastreada" value={formatarMoeda(receita)} />
          <CampaignInsight label="Custo médio por lead" value={formatarMoeda(totalLeads > 0 ? investimento / totalLeads : 0)} />
        </div>
      </div>

      <div className="premium-table overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-white/[0.10] bg-white/[0.045] text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Campanha</th><th className="px-5 py-4">Canal</th><th className="px-5 py-4">Leads</th><th className="px-5 py-4">Convertidos</th><th className="px-5 py-4">Conversão</th><th className="px-5 py-4">Investimento</th><th className="px-5 py-4">Receita rastreada</th><th className="px-5 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.08]">
            {campanhas.length === 0 ? <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500">Nenhuma campanha cadastrada.</td></tr> : campanhas.map((campanha) => {
              const vinculados = leads.filter((lead) => lead.campanhaId === campanha.id);
              const convertidos = vinculados.filter((lead) => lead.etapa === "Convertido").length;
              const receitaCampanha = vinculados.reduce((acc, lead) => acc + lead.receitaRastreada, 0);
              return (
                <tr key={campanha.id} className="text-slate-300 hover:bg-white/[0.035]">
                  <td className="px-5 py-4"><p className="font-semibold text-white">{campanha.nome}</p><p className="mt-1 text-xs text-slate-500">{campanha.status}</p></td>
                  <td className="px-5 py-4">{campanha.canal}</td>
                  <td className="px-5 py-4">{vinculados.length}</td>
                  <td className="px-5 py-4">{convertidos}</td>
                  <td className="px-5 py-4">{vinculados.length ? `${((convertidos / vinculados.length) * 100).toFixed(1)}%` : "0,0%"}</td>
                  <td className="px-5 py-4">{formatarMoeda(campanha.investimento)}</td>
                  <td className="px-5 py-4 text-emerald-300">{formatarMoeda(receitaCampanha)}</td>
                  <td className="px-5 py-4 text-right">{podeGerenciar ? <button type="button" onClick={() => onDelete(campanha.id)} disabled={isPending} className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-400/15 disabled:opacity-50"><Trash2 className="size-3.5" />Excluir</button> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CampaignInsight({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.10] bg-white/[0.055] px-4 py-3"><span className="text-sm text-slate-400">{label}</span><strong className="text-sm text-white">{value}</strong></div>;
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

function LeadModal({
  open,
  lead,
  campanhas,
  onClose,
  onSubmit,
  disabled,
}: {
  open: boolean;
  lead: MarketingLead | null;
  campanhas: MarketingCampanha[];
  onClose: () => void;
  onSubmit: (dados: LeadFormData) => void;
  disabled: boolean;
}) {
  const [form, setForm] = useState<LeadFormData>({ nome: "", telefone: "", origem: "Instagram", interesse: "", etapa: "Novo", valorPrevisto: 0, observacoes: "", campanhaId: null });

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
    } : { nome: "", telefone: "", origem: "Instagram", interesse: "", etapa: "Novo", valorPrevisto: 0, observacoes: "", campanhaId: null });
  }, [open, lead]);

  if (!open) return null;

  return (
    <Modal title={lead ? "Editar lead" : "Novo lead"} description={lead ? "Atualize os dados comerciais sem perder o histórico." : "Cadastre uma oportunidade e acompanhe todo o ciclo comercial."} onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="grid gap-4">
        <Input label="Nome" value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Telefone / WhatsApp" value={form.telefone} onChange={(value) => setForm((prev) => ({ ...prev, telefone: value }))} />
          <Select label="Origem" value={form.origem} onChange={(value) => setForm((prev) => ({ ...prev, origem: value }))} options={CAMPANHA_CANAIS.map((item) => item)} />
        </div>
        <label className="grid gap-2 text-sm font-medium text-slate-300">
          Campanha vinculada
          <select value={form.campanhaId || ""} onChange={(event) => setForm((prev) => ({ ...prev, campanhaId: event.target.value ? Number(event.target.value) : null }))} className="premium-input w-full bg-[#1d2437]">
            <option value="">Sem campanha específica</option>
            {campanhas.map((campanha) => <option key={campanha.id} value={campanha.id}>{campanha.nome} · {campanha.canal}</option>)}
          </select>
        </label>
        <Input label="Interesse" value={form.interesse} onChange={(value) => setForm((prev) => ({ ...prev, interesse: value }))} placeholder="Ex: Limpeza de pele, avaliação, pacote" />
        <div className="grid gap-4 sm:grid-cols-2">
          {!lead ? <Select label="Etapa inicial" value={form.etapa} onChange={(value) => setForm((prev) => ({ ...prev, etapa: value as LeadEtapa }))} options={LEAD_ETAPAS.filter((item) => ["Novo", "Contato"].includes(item.value)).map((item) => item.value)} /> : <div />}
          <Input label="Valor previsto" type="number" step="0.01" value={String(form.valorPrevisto)} onChange={(value) => setForm((prev) => ({ ...prev, valorPrevisto: Number(value || 0) }))} />
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

function CampanhaModal({ open, onClose, onSubmit, disabled }: { open: boolean; onClose: () => void; onSubmit: (dados: CampanhaFormData) => void; disabled: boolean }) {
  const [form, setForm] = useState<CampanhaFormData>({ nome: "", canal: "Instagram", investimento: 0, leads: 0, status: "Ativa", inicio: "", fim: "" });
  useEffect(() => { if (open) setForm({ nome: "", canal: "Instagram", investimento: 0, leads: 0, status: "Ativa", inicio: "", fim: "" }); }, [open]);
  if (!open) return null;

  return (
    <Modal title="Nova campanha" description="Crie a campanha e vincule os leads reais a ela no CRM." onClose={onClose}>
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="grid gap-4">
        <Input label="Nome da campanha" value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} required />
        <div className="grid gap-4 sm:grid-cols-2"><Select label="Canal" value={form.canal} onChange={(value) => setForm((prev) => ({ ...prev, canal: value }))} options={CAMPANHA_CANAIS.map((item) => item)} /><Select label="Status" value={form.status} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} options={CAMPANHA_STATUS.map((item) => item)} /></div>
        <Input label="Investimento" type="number" step="0.01" value={String(form.investimento)} onChange={(value) => setForm((prev) => ({ ...prev, investimento: Number(value || 0) }))} />
        <div className="grid gap-4 sm:grid-cols-2"><Input label="Início" type="date" value={form.inicio} onChange={(value) => setForm((prev) => ({ ...prev, inicio: value }))} /><Input label="Fim" type="date" value={form.fim} onChange={(value) => setForm((prev) => ({ ...prev, fim: value }))} /></div>
        <p className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 text-xs leading-5 text-slate-400">A quantidade de leads e a conversão deixam de ser digitadas manualmente. O sistema calcula pelos leads realmente vinculados à campanha.</p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={disabled}>{disabled ? "Salvando..." : "Salvar campanha"}</Button></div>
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
  podeGerenciarMarketing,
  podeGerenciarAgenda,
}: {
  lead: MarketingLead | null;
  onClose: () => void;
  onEdit: (lead: MarketingLead) => void;
  onSchedule: (lead: MarketingLead) => void;
  onDelete: (id: number) => void;
  onUpdated: () => void;
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
              <Detail label="Valor previsto" value={formatarMoeda(lead.valorPrevisto)} />
              <Detail label="Último contato" value={lead.ultimoContatoEm ? formatarDataHora(lead.ultimoContatoEm) : "Ainda não registrado"} />
              <Detail label="Próximo contato" value={lead.proximoContatoEm ? formatarData(lead.proximoContatoEm) : "Não programado"} />
            </div>
            {lead.observacoes ? <div className="mt-4 rounded-2xl bg-black/10 p-3 text-sm leading-6 text-slate-300">{lead.observacoes}</div> : null}
            {lead.motivoPerda ? <div className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/8 p-3 text-sm text-rose-100"><strong>Motivo da perda:</strong> {lead.motivoPerda}</div> : null}
            {lead.ignorarVinculoTelefone ? <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100"><strong>Telefone compartilhado:</strong> este lead foi confirmado como uma pessoa diferente. O CRM não reutilizará automaticamente outro cliente apenas por este número.</div> : null}
          </section>

          <section className="rounded-3xl border border-white/[0.10] bg-white/[0.055] p-4">
            <h4 className="flex items-center gap-2 font-semibold text-white"><Link2 className="size-4 text-cyan-300" />Vínculos</h4>
            <div className="mt-3 grid gap-2">
              {lead.cliente ? <Link href={`/clientes/${lead.cliente.id}`} className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.08]"><span>Cliente: {lead.cliente.nome}</span><ExternalLink className="size-4" /></Link> : <p className="rounded-2xl border border-dashed border-white/[0.10] p-3 text-xs text-slate-500">Ainda não há cliente vinculado.</p>}
              {lead.agendamento ? <Link href="/agenda" className="rounded-2xl border border-cyan-300/10 bg-cyan-400/8 px-3 py-3 text-sm text-cyan-100 hover:bg-cyan-400/12"><div className="flex items-center justify-between"><strong>{formatarDataHora(lead.agendamento.data)}</strong><ExternalLink className="size-4" /></div><p className="mt-1 text-xs text-cyan-200/70">{lead.agendamento.procedimento} · {lead.agendamento.status}</p></Link> : null}
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
        const primeiro = resultado.find((item) => item.disponivel)?.hora || "";
        setHora((atual) => resultado.some((item) => item.hora === atual && item.disponivel) ? atual : primeiro);
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
        <label className="grid gap-2 text-sm font-medium text-slate-300">Horário disponível<select value={hora} onChange={(event) => setHora(event.target.value)} disabled={loadingHorarios || disponiveis.length === 0} className="premium-input w-full bg-[#1d2437]"><option value="">{loadingHorarios ? "Carregando horários..." : disponiveis.length ? "Selecione" : "Nenhum horário disponível"}</option>{disponiveis.map((item) => <option key={item.hora} value={item.hora}>{item.hora}</option>)}</select></label>
        {ocupados.length ? <div className="rounded-2xl border border-white/[0.08] bg-black/10 p-3"><p className="text-xs font-semibold text-slate-300">Alguns horários ocupados</p><div className="mt-2 space-y-1 text-xs text-slate-500">{ocupados.map((item) => <p key={item.hora}>{item.hora}: {item.motivo || "indisponível"}</p>)}</div></div> : null}
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/8 p-3 text-xs leading-5 text-cyan-100">Ao salvar, o sistema reutiliza um cliente existente pelo telefone ou cria o cadastro necessário, gera o agendamento real e move o lead para Avaliação.</div>
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
