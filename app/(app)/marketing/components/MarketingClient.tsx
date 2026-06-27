"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  DollarSign,
  Filter,
  Megaphone,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
  UserCheck,
  UsersRound,
} from "lucide-react";

import {
  atualizarEtapaLead,
  converterLeadEmCliente,
  criarCampanha,
  criarLead,
  excluirCampanha,
  excluirLead,
} from "@/actions/marketing.actions";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";
import { formatarData, formatarMoeda } from "@/lib/format";
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
  MarketingResumo,
} from "../types";
import { CAMPANHA_CANAIS, CAMPANHA_STATUS, LEAD_ETAPAS } from "../types";

type Props = {
  leads: MarketingLead[];
  campanhas: MarketingCampanha[];
};

type TabKey = "pipeline" | "campanhas" | "mensagens";

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

function calcularResumo(leads: MarketingLead[], campanhas: MarketingCampanha[]): MarketingResumo {
  const leadsConvertidos = leads.filter((lead) => lead.etapa === "Convertido").length;
  const leadsPerdidos = leads.filter((lead) => lead.etapa === "Perdido").length;
  const leadsAtivos = leads.filter((lead) => lead.etapa !== "Convertido" && lead.etapa !== "Perdido").length;
  const pipelineTotal = leads.reduce((acc, lead) => acc + lead.valorPrevisto, 0);
  const pipelineAtivo = leads
    .filter((lead) => lead.etapa !== "Perdido")
    .reduce((acc, lead) => acc + lead.valorPrevisto, 0);
  const investimentoTotal = campanhas.reduce((acc, campanha) => acc + campanha.investimento, 0);
  const leadsCampanhas = campanhas.reduce((acc, campanha) => acc + campanha.leads, 0);

  return {
    totalLeads: leads.length,
    leadsAtivos,
    leadsConvertidos,
    leadsPerdidos,
    pipelineTotal,
    pipelineAtivo,
    ticketMedioPrevisto: leads.length > 0 ? pipelineTotal / leads.length : 0,
    campanhasAtivas: campanhas.filter((campanha) => campanha.status === "Ativa").length,
    investimentoTotal,
    custoPorLead: leadsCampanhas > 0 ? investimentoTotal / leadsCampanhas : 0,
    taxaConversao: leads.length > 0 ? (leadsConvertidos / leads.length) * 100 : 0,
  };
}

function getOrigemLabel(value?: string | null) {
  return value?.trim() || "Origem não informada";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "SR";
}

function gerarCsv(leads: MarketingLead[]) {
  const header = ["Nome", "Telefone", "Origem", "Interesse", "Etapa", "Valor previsto", "Criado em", "Observações"];
  const rows = leads.map((lead) => [
    lead.nome,
    lead.telefone || "",
    lead.origem || "",
    lead.interesse || "",
    lead.etapa,
    String(lead.valorPrevisto).replace(".", ","),
    new Date(lead.createdAt).toLocaleDateString("pt-BR"),
    lead.observacoes || "",
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";"))
    .join("\n");
}

function baixarCsv(leads: MarketingLead[]) {
  const blob = new Blob([gerarCsv(leads)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "marketing-leads-studio-realcar.csv";
  anchor.click();

  URL.revokeObjectURL(url);
}

export default function MarketingClient({ leads, campanhas }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabKey>("pipeline");
  const [leadModal, setLeadModal] = useState(false);
  const [campanhaModal, setCampanhaModal] = useState(false);
  const [mensagemModal, setMensagemModal] = useState<MarketingLead | null>(null);
  const [busca, setBusca] = useState("");
  const [etapaFiltro, setEtapaFiltro] = useState("todas");
  const [origemFiltro, setOrigemFiltro] = useState("todas");

  const resumo = useMemo(() => calcularResumo(leads, campanhas), [campanhas, leads]);

  const origens = useMemo(() => {
    const valores = new Set(leads.map((lead) => lead.origem).filter((item): item is string => Boolean(item)));
    return Array.from(valores).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [leads]);

  const leadsFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca.trim());

    return leads.filter((lead) => {
      const textoBusca = normalizarTexto(`${lead.nome} ${lead.telefone || ""} ${lead.origem || ""} ${lead.interesse || ""} ${lead.observacoes || ""}`);
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

  async function salvarLead(dados: LeadFormData) {
    startTransition(async () => {
      await criarLead(dados);
      router.refresh();
      setLeadModal(false);
    });
  }

  async function salvarCampanha(dados: CampanhaFormData) {
    startTransition(async () => {
      await criarCampanha(dados);
      router.refresh();
      setCampanhaModal(false);
    });
  }

  function alterarEtapa(id: number, etapa: LeadEtapa) {
    startTransition(async () => {
      await atualizarEtapaLead(id, etapa);
      router.refresh();
    });
  }

  function converterLead(id: number) {
    startTransition(async () => {
      await converterLeadEmCliente(id);
      router.refresh();
    });
  }

  function removerLead(id: number) {
    if (!confirm("Deseja excluir este lead?")) return;

    startTransition(async () => {
      await excluirLead(id);
      router.refresh();
    });
  }

  function removerCampanha(id: number) {
    if (!confirm("Deseja excluir esta campanha?")) return;

    startTransition(async () => {
      await excluirCampanha(id);
      router.refresh();
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
                <Megaphone className="size-3.5" />
                Captação e relacionamento comercial
              </div>
              <h1 className="premium-title">Marketing</h1>
              <p className="premium-subtitle">
                Controle leads, campanhas e mensagens comerciais para transformar interessados em clientes ativos sem depender de automação paga neste momento.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[34rem]">
              <HeroMetric label="Pipeline ativo" value={formatarMoeda(resumo.pipelineAtivo)} icon={TrendingUp} />
              <HeroMetric label="Conversão" value={`${resumo.taxaConversao.toFixed(1)}%`} icon={Target} />
              <HeroMetric label="Custo por lead" value={formatarMoeda(resumo.custoPorLead)} icon={DollarSign} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ResumoCard title="Leads ativos" value={String(resumo.leadsAtivos)} detail={`${resumo.totalLeads} lead(s) no total`} icon={UsersRound} />
          <ResumoCard title="Pipeline total" value={formatarMoeda(resumo.pipelineTotal)} detail={`Ticket previsto: ${formatarMoeda(resumo.ticketMedioPrevisto)}`} icon={TrendingUp} />
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
                  placeholder="Buscar lead, telefone, origem ou interesse"
                  className="premium-input h-11 w-full pl-11"
                />
              </label>

              <label className="relative">
                <Filter className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <select
                  value={etapaFiltro}
                  onChange={(event) => setEtapaFiltro(event.target.value)}
                  className="premium-input h-11 w-full bg-[#1d2437] pl-11"
                >
                  <option value="todas">Todas as etapas</option>
                  {LEAD_ETAPAS.map((etapa) => (
                    <option key={etapa.value} value={etapa.value}>
                      {etapa.label}
                    </option>
                  ))}
                </select>
              </label>

              <select
                value={origemFiltro}
                onChange={(event) => setOrigemFiltro(event.target.value)}
                className="premium-input h-11 w-full bg-[#1d2437]"
              >
                <option value="todas">Todas as origens</option>
                {origens.map((origem) => (
                  <option key={origem} value={origem}>
                    {origem}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => baixarCsv(leadsFiltrados)} disabled={leadsFiltrados.length === 0}>
                Exportar CSV
              </Button>
              <Button type="button" variant="outline" onClick={() => setCampanhaModal(true)}>
                <Megaphone className="size-4" />
                Campanha
              </Button>
              <Button type="button" onClick={() => setLeadModal(true)}>
                <Plus className="size-4" />
                Novo lead
              </Button>
            </div>
          </div>
        </section>

        <section className="flex gap-2 overflow-x-auto rounded-3xl border border-white/[0.10] bg-white/[0.055] p-2 scrollbar-premium">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`min-w-fit rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                tab === item.key ? "bg-white/[0.14] text-white shadow-lg shadow-black/10" : "text-slate-400 hover:bg-white/[0.08] hover:text-slate-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </section>

        {tab === "pipeline" && (
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
                onConvert={converterLead}
                onDelete={removerLead}
                isPending={isPending}
              />
            ))}
          </section>
        )}

        {tab === "campanhas" && (
          <CampanhasView campanhas={campanhas} onDelete={removerCampanha} isPending={isPending} />
        )}

        {tab === "mensagens" && <TemplatesView />}
      </div>

      <LeadModal open={leadModal} onClose={() => setLeadModal(false)} onSubmit={salvarLead} disabled={isPending} />
      <CampanhaModal open={campanhaModal} onClose={() => setCampanhaModal(false)} onSubmit={salvarCampanha} disabled={isPending} />
      <MarketingMessageModal lead={mensagemModal} onClose={() => setMensagemModal(null)} />

      {isPending && (
        <div className="fixed bottom-24 right-5 z-50 rounded-2xl border border-violet-400/20 bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-2xl shadow-violet-950/40 lg:bottom-5">
          Atualizando marketing...
        </div>
      )}
    </>
  );
}

function HeroMetric({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-3xl border border-white/[0.12] bg-white/[0.075] p-4 shadow-xl shadow-black/10">
      <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-white/[0.08] text-violet-200">
        <Icon className="size-4" />
      </div>
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
        <div className="flex size-11 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-200 ring-1 ring-violet-300/15">
          <Icon className="size-5" />
        </div>
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
  onConvert,
  onDelete,
  isPending,
}: {
  etapa: LeadEtapa;
  label: string;
  description: string;
  leads: MarketingLead[];
  onEtapaChange: (id: number, etapa: LeadEtapa) => void;
  onMessage: (lead: MarketingLead) => void;
  onConvert: (id: number) => void;
  onDelete: (id: number) => void;
  isPending: boolean;
}) {
  const total = leads.reduce((acc, lead) => acc + lead.valorPrevisto, 0);

  return (
    <div className="min-h-[20rem] rounded-3xl border border-white/[0.10] bg-white/[0.055] p-4 shadow-xl shadow-black/10">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">{label}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span className="rounded-full border border-white/[0.10] bg-white/[0.07] px-2.5 py-1 text-xs font-semibold text-slate-300">
          {leads.length}
        </span>
      </div>

      <div className="mb-4 rounded-2xl border border-white/[0.08] bg-black/10 px-3 py-2 text-xs text-slate-400">
        Valor: <strong className="text-slate-100">{formatarMoeda(total)}</strong>
      </div>

      <div className="space-y-3">
        {leads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.12] p-4 text-center text-xs text-slate-500">
            Nenhum lead nesta etapa.
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              currentEtapa={etapa}
              onEtapaChange={onEtapaChange}
              onMessage={onMessage}
              onConvert={onConvert}
              onDelete={onDelete}
              isPending={isPending}
            />
          ))
        )}
      </div>
    </div>
  );
}

function LeadCard({
  lead,
  currentEtapa,
  onEtapaChange,
  onMessage,
  onConvert,
  onDelete,
  isPending,
}: {
  lead: MarketingLead;
  currentEtapa: LeadEtapa;
  onEtapaChange: (id: number, etapa: LeadEtapa) => void;
  onMessage: (lead: MarketingLead) => void;
  onConvert: (id: number) => void;
  onDelete: (id: number) => void;
  isPending: boolean;
}) {
  return (
    <article className="rounded-3xl border border-white/[0.10] bg-[#20283b]/88 p-4 shadow-lg shadow-black/10">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
          {getInitials(lead.nome)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-white">{lead.nome}</h3>
          <p className="mt-1 truncate text-xs text-slate-400">{lead.interesse || "Interesse não informado"}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-xs text-slate-400">
        <div className="flex items-center justify-between gap-3">
          <span>{getOrigemLabel(lead.origem)}</span>
          <strong className="text-slate-100">{formatarMoeda(lead.valorPrevisto)}</strong>
        </div>
        {lead.telefone ? (
          <div className="flex items-center gap-2">
            <Phone className="size-3.5 text-slate-500" />
            <span>{lead.telefone}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2">
        <select
          value={currentEtapa}
          onChange={(event) => onEtapaChange(lead.id, event.target.value as LeadEtapa)}
          disabled={isPending}
          className="h-10 rounded-2xl border border-white/[0.10] bg-[#171d2d] px-3 text-xs font-medium text-slate-100 outline-none focus:border-violet-400/40"
        >
          {LEAD_ETAPAS.map((etapa) => (
            <option key={etapa.value} value={etapa.value}>
              {etapa.label}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onMessage(lead)}
            className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/15"
          >
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => onConvert(lead.id)}
            disabled={isPending || lead.etapa === "Convertido"}
            className="rounded-2xl border border-violet-300/15 bg-violet-400/10 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-400/15 disabled:opacity-50"
          >
            Cliente
          </button>
          <button
            type="button"
            onClick={() => onDelete(lead.id)}
            disabled={isPending}
            className="rounded-2xl border border-rose-300/15 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-400/15 disabled:opacity-50"
          >
            Excluir
          </button>
        </div>
      </div>
    </article>
  );
}

function CampanhasView({ campanhas, onDelete, isPending }: { campanhas: MarketingCampanha[]; onDelete: (id: number) => void; isPending: boolean }) {
  const totalLeads = campanhas.reduce((acc, campanha) => acc + campanha.leads, 0);
  const investimento = campanhas.reduce((acc, campanha) => acc + campanha.investimento, 0);

  return (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="premium-card-soft p-5">
        <h2 className="text-lg font-semibold text-white">Performance de campanhas</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Use esta área para acompanhar investimento, origem dos leads e quais canais geram mais oportunidades.
        </p>

        <div className="mt-5 grid gap-3">
          <CampaignInsight label="Campanhas cadastradas" value={String(campanhas.length)} />
          <CampaignInsight label="Leads atribuídos" value={String(totalLeads)} />
          <CampaignInsight label="Investimento total" value={formatarMoeda(investimento)} />
          <CampaignInsight label="Custo médio por lead" value={formatarMoeda(totalLeads > 0 ? investimento / totalLeads : 0)} />
        </div>
      </div>

      <div className="premium-table overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-white/[0.10] bg-white/[0.045] text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Campanha</th>
              <th className="px-5 py-4">Canal</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Leads</th>
              <th className="px-5 py-4">Investimento</th>
              <th className="px-5 py-4">Período</th>
              <th className="px-5 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.08]">
            {campanhas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                  Nenhuma campanha cadastrada.
                </td>
              </tr>
            ) : (
              campanhas.map((campanha) => (
                <tr key={campanha.id} className="text-slate-300 hover:bg-white/[0.035]">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white">{campanha.nome}</p>
                    <p className="mt-1 text-xs text-slate-500">Criada em {formatarData(campanha.createdAt)}</p>
                  </td>
                  <td className="px-5 py-4">{campanha.canal}</td>
                  <td className="px-5 py-4">
                    <span className="premium-chip">{campanha.status}</span>
                  </td>
                  <td className="px-5 py-4">{campanha.leads}</td>
                  <td className="px-5 py-4">{formatarMoeda(campanha.investimento)}</td>
                  <td className="px-5 py-4 text-xs text-slate-400">
                    {formatarData(campanha.inicio)} até {formatarData(campanha.fim)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(campanha.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/15 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-400/15 disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CampaignInsight({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.10] bg-white/[0.055] px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <strong className="text-sm text-white">{value}</strong>
    </div>
  );
}

function TemplatesView() {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {WHATSAPP_MARKETING_TEMPLATE_OPTIONS.map((template) => (
        <article key={template.id} className="premium-card-soft p-5">
          <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/15">
            <MessageCircle className="size-5" />
          </div>
          <h2 className="font-semibold text-white">{template.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{template.description}</p>
          <div className="mt-4 rounded-2xl border border-white/[0.08] bg-black/10 p-3 text-xs leading-5 text-slate-400">
            Modelo disponível no botão WhatsApp de cada lead.
          </div>
        </article>
      ))}
    </section>
  );
}

function LeadModal({ open, onClose, onSubmit, disabled }: { open: boolean; onClose: () => void; onSubmit: (dados: LeadFormData) => void; disabled: boolean }) {
  const [form, setForm] = useState<LeadFormData>({
    nome: "",
    telefone: "",
    origem: "Instagram",
    interesse: "",
    etapa: "Novo",
    valorPrevisto: 0,
    observacoes: "",
  });

  if (!open) return null;

  return (
    <Modal title="Novo lead" description="Cadastre uma oportunidade comercial para acompanhar no pipeline." onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form);
        }}
        className="grid gap-4"
      >
        <Input label="Nome" value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Telefone / WhatsApp" value={form.telefone} onChange={(value) => setForm((prev) => ({ ...prev, telefone: value }))} />
          <Select label="Origem" value={form.origem} onChange={(value) => setForm((prev) => ({ ...prev, origem: value }))} options={CAMPANHA_CANAIS.map((item) => item)} />
        </div>
        <Input label="Interesse" value={form.interesse} onChange={(value) => setForm((prev) => ({ ...prev, interesse: value }))} placeholder="Ex: Limpeza de pele, avaliação, pacote" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Etapa" value={form.etapa} onChange={(value) => setForm((prev) => ({ ...prev, etapa: value as LeadEtapa }))} options={LEAD_ETAPAS.map((item) => item.value)} />
          <Input label="Valor previsto" type="number" step="0.01" value={String(form.valorPrevisto)} onChange={(value) => setForm((prev) => ({ ...prev, valorPrevisto: Number(value || 0) }))} />
        </div>
        <Textarea label="Observações" value={form.observacoes} onChange={(value) => setForm((prev) => ({ ...prev, observacoes: value }))} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={disabled}>{disabled ? "Salvando..." : "Salvar lead"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function CampanhaModal({ open, onClose, onSubmit, disabled }: { open: boolean; onClose: () => void; onSubmit: (dados: CampanhaFormData) => void; disabled: boolean }) {
  const [form, setForm] = useState<CampanhaFormData>({
    nome: "",
    canal: "Instagram",
    investimento: 0,
    leads: 0,
    status: "Ativa",
    inicio: "",
    fim: "",
  });

  if (!open) return null;

  return (
    <Modal title="Nova campanha" description="Registre campanhas para acompanhar investimento e geração de oportunidades." onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form);
        }}
        className="grid gap-4"
      >
        <Input label="Nome da campanha" value={form.nome} onChange={(value) => setForm((prev) => ({ ...prev, nome: value }))} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Canal" value={form.canal} onChange={(value) => setForm((prev) => ({ ...prev, canal: value }))} options={CAMPANHA_CANAIS.map((item) => item)} />
          <Select label="Status" value={form.status} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} options={CAMPANHA_STATUS.map((item) => item)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Investimento" type="number" step="0.01" value={String(form.investimento)} onChange={(value) => setForm((prev) => ({ ...prev, investimento: Number(value || 0) }))} />
          <Input label="Leads gerados" type="number" value={String(form.leads)} onChange={(value) => setForm((prev) => ({ ...prev, leads: Number(value || 0) }))} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Início" type="date" value={form.inicio} onChange={(value) => setForm((prev) => ({ ...prev, inicio: value }))} />
          <Input label="Fim" type="date" value={form.fim} onChange={(value) => setForm((prev) => ({ ...prev, fim: value }))} />
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={disabled}>{disabled ? "Salvando..." : "Salvar campanha"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function MarketingMessageModal({ lead, onClose }: { lead: MarketingLead | null; onClose: () => void }) {
  const [template, setTemplate] = useState<WhatsAppMarketingTemplateType>("firstContact");
  const [copied, setCopied] = useState(false);

  if (!lead) return null;

  const message = buildMarketingWhatsAppMessage({
    template,
    leadName: lead.nome,
    interest: lead.interesse,
  });
  const url = buildWhatsAppUrl(lead.telefone, message);

  async function copiarMensagem() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Modal title="Mensagem para WhatsApp" description={`Lead: ${lead.nome}`} onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {WHATSAPP_MARKETING_TEMPLATE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTemplate(option.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                template === option.id
                  ? "border-emerald-300/30 bg-emerald-400/10 text-white"
                  : "border-white/[0.10] bg-white/[0.055] text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              <p className="text-sm font-semibold">{option.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p>
            </button>
          ))}
        </div>

        <textarea value={message} readOnly className="min-h-52 rounded-3xl border border-white/[0.10] bg-[#171d2d] p-4 text-sm leading-6 text-slate-100 outline-none" />

        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" variant="outline" onClick={copiarMensagem}>
            {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copiado" : "Copiar mensagem"}
          </Button>
          <WhatsAppLink href={url} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/20 hover:bg-emerald-400">
            <MessageCircle className="size-4" />
            Abrir WhatsApp
          </WhatsAppLink>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, description, children, onClose }: { title: string; description: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] border border-white/[0.12] bg-[#171d2a] p-5 shadow-2xl shadow-black/40 scrollbar-premium sm:max-w-3xl sm:rounded-[2rem] sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-white/[0.10] bg-white/[0.06] px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/[0.10]">
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, onChange, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { label: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-300">
      {label}
      <input {...props} onChange={(event) => onChange(event.target.value)} className="premium-input w-full" />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-300">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} className="premium-input min-h-28 w-full resize-none" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[] }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-300">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="premium-input w-full bg-[#1d2437]">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
