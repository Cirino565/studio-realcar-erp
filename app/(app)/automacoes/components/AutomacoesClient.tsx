"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  Clock3,
  Copy,
  Filter,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";

import {
  atualizarStatusAutomacao,
  criarAutomacao,
  criarAutomacoesPadrao,
  excluirAutomacao,
  registrarExecucaoAutomacao,
} from "@/actions/automacao.actions";
import { Button } from "@/components/ui/button";
import { formatarDataHora } from "@/lib/format";
import type {
  AutomacaoFormData,
  AutomacaoInsight,
  AutomacaoItem,
  AutomacaoResumo,
  AutomacaoStatus,
} from "../types";
import { AUTOMACAO_FREQUENCIAS, AUTOMACAO_PRIORIDADES, AUTOMACAO_STATUS, AUTOMACAO_TIPOS } from "../types";

type Props = {
  automacoes: AutomacaoItem[];
  insights: AutomacaoInsight[];
};

type TabKey = "regras" | "central" | "insights";

const tabs: { key: TabKey; label: string }[] = [
  { key: "regras", label: "Regras" },
  { key: "central", label: "Central" },
  { key: "insights", label: "Insights" },
];

const statusStyles: Record<string, string> = {
  Ativa: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
  Pausada: "border-amber-300/20 bg-amber-400/10 text-amber-200",
  "Em teste": "border-cyan-300/20 bg-cyan-400/10 text-cyan-200",
  Erro: "border-rose-300/20 bg-rose-400/10 text-rose-200",
};

const prioridadeStyles: Record<string, string> = {
  Baixa: "text-slate-300",
  Média: "text-cyan-200",
  Alta: "text-amber-200",
  Crítica: "text-rose-200",
};

function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function calcularResumo(automacoes: AutomacaoItem[]): AutomacaoResumo {
  const execucoes = automacoes.reduce((acc, automacao) => acc + automacao.execucoes, 0);
  const falhas = automacoes.reduce((acc, automacao) => acc + automacao.falhas, 0);
  const taxaSucesso = execucoes === 0 ? 100 : Math.max(0, Math.round(((execucoes - falhas) / execucoes) * 100));

  return {
    total: automacoes.length,
    ativas: automacoes.filter((automacao) => automacao.status === "Ativa").length,
    pausadas: automacoes.filter((automacao) => automacao.status === "Pausada").length,
    criticas: automacoes.filter((automacao) => automacao.prioridade === "Crítica" || automacao.status === "Erro").length,
    execucoes,
    falhas,
    taxaSucesso,
  };
}

function gerarResumoOperacional(automacoes: AutomacaoItem[], insights: AutomacaoInsight[]) {
  const regrasAtivas = automacoes.filter((automacao) => automacao.status === "Ativa").length;
  const prioridades = insights.filter((insight) => insight.total > 0 && ["Alta", "Crítica"].includes(insight.prioridade)).length;

  return `Central de automações Studio Realçar\n\nRegras ativas: ${regrasAtivas}\nAlertas prioritários: ${prioridades}\nTotal de regras: ${automacoes.length}\n\nPrioridades de hoje:\n${insights
    .filter((insight) => insight.total > 0)
    .map((insight) => `- ${insight.titulo}: ${insight.total} item(ns). ${insight.acaoRecomendada}`)
    .join("\n") || "- Nenhum alerta operacional no momento."}`;
}

function copiarTexto(texto: string) {
  void navigator.clipboard.writeText(texto);
}

export function AutomacoesClient({ automacoes, insights }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabKey>("regras");
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");

  const resumo = useMemo(() => calcularResumo(automacoes), [automacoes]);

  const automacoesFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca.trim());

    return automacoes.filter((automacao) => {
      const conteudo = normalizarTexto(`${automacao.nome} ${automacao.tipo} ${automacao.gatilho} ${automacao.acao} ${automacao.canal ?? ""} ${automacao.observacoes ?? ""}`);
      const matchesBusca = !termo || conteudo.includes(termo);
      const matchesTipo = tipoFiltro === "todos" || automacao.tipo === tipoFiltro;
      const matchesStatus = statusFiltro === "todos" || automacao.status === statusFiltro;

      return matchesBusca && matchesTipo && matchesStatus;
    });
  }, [automacoes, busca, statusFiltro, tipoFiltro]);

  const proximasRegras = useMemo(() => {
    return automacoes
      .filter((automacao) => automacao.proximaExecucao)
      .sort((a, b) => new Date(a.proximaExecucao ?? 0).getTime() - new Date(b.proximaExecucao ?? 0).getTime())
      .slice(0, 6);
  }, [automacoes]);

  function salvarAutomacao(dados: AutomacaoFormData) {
    startTransition(async () => {
      await criarAutomacao(dados);
      router.refresh();
      setModalAberto(false);
    });
  }

  function alterarStatus(id: number, status: AutomacaoStatus) {
    startTransition(async () => {
      await atualizarStatusAutomacao(id, status);
      router.refresh();
    });
  }

  function registrarExecucao(id: number, sucesso: boolean) {
    startTransition(async () => {
      await registrarExecucaoAutomacao(id, sucesso);
      router.refresh();
    });
  }

  function excluir(id: number) {
    startTransition(async () => {
      await excluirAutomacao(id);
      router.refresh();
    });
  }

  function criarPadroes() {
    startTransition(async () => {
      await criarAutomacoesPadrao();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/35 p-5 shadow-2xl shadow-black/20 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-200">
              <Zap className="size-3.5" /> Rotinas inteligentes
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Automações Premium</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Central para organizar lembretes, tarefas internas e alertas operacionais sem custo de API. A base fica pronta para integrações futuras.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" size="lg" onClick={criarPadroes} disabled={isPending}>
              <Sparkles className="size-4" /> Criar padrões
            </Button>
            <Button size="lg" onClick={() => setModalAberto(true)}>
              <Plus className="size-4" /> Nova automação
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Regras ativas" value={resumo.ativas} description={`${resumo.total} regras cadastradas`} icon={<PlayCircle className="size-5 text-emerald-300" />} />
        <MetricCard title="Taxa operacional" value={`${resumo.taxaSucesso}%`} description={`${resumo.execucoes} execuções registradas`} icon={<CheckCircle2 className="size-5 text-cyan-300" />} />
        <MetricCard title="Pausadas" value={resumo.pausadas} description="Regras fora da rotina ativa" icon={<PauseCircle className="size-5 text-amber-300" />} />
        <MetricCard title="Atenção" value={resumo.criticas} description={`${resumo.falhas} falhas registradas`} icon={<AlertTriangle className="size-5 text-rose-300" />} />
      </section>

      <section className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.045] p-3 shadow-xl shadow-black/10 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex rounded-2xl border border-white/[0.08] bg-slate-950/30 p-1">
            {tabs.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === item.key ? "bg-white/[0.10] text-white" : "text-slate-400 hover:text-white"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "regras" ? (
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px] lg:w-[700px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar por regra, gatilho ou ação"
                  className="h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.045] pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/30 focus:bg-white/[0.07]"
                />
              </label>
              <Select value={tipoFiltro} onChange={setTipoFiltro} icon={<Filter className="size-4" />}>
                <option value="todos">Todos os tipos</option>
                {AUTOMACAO_TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </Select>
              <Select value={statusFiltro} onChange={setStatusFiltro}>
                <option value="todos">Todos os status</option>
                {AUTOMACAO_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
      </section>

      {tab === "regras" ? (
        <RegrasView
          automacoes={automacoesFiltradas}
          isPending={isPending}
          onStatusChange={alterarStatus}
          onRun={registrarExecucao}
          onDelete={excluir}
        />
      ) : null}

      {tab === "central" ? <CentralView automacoes={automacoes} proximasRegras={proximasRegras} insights={insights} /> : null}
      {tab === "insights" ? <InsightsView insights={insights} /> : null}

      {modalAberto ? <AutomacaoModal isPending={isPending} onClose={() => setModalAberto(false)} onSave={salvarAutomacao} /> : null}
    </div>
  );
}

function MetricCard({ title, value, description, icon }: { title: string; value: number | string; description: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.055] p-5 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function Select({ value, onChange, children, icon }: { value: string; onChange: (value: string) => void; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <label className="relative block">
      {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span> : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.045] ${icon ? "pl-10" : "pl-4"} pr-4 text-sm text-white outline-none transition focus:border-violet-300/30 focus:bg-white/[0.07]`}
      >
        {children}
      </select>
    </label>
  );
}

function RegrasView({
  automacoes,
  isPending,
  onStatusChange,
  onRun,
  onDelete,
}: {
  automacoes: AutomacaoItem[];
  isPending: boolean;
  onStatusChange: (id: number, status: AutomacaoStatus) => void;
  onRun: (id: number, sucesso: boolean) => void;
  onDelete: (id: number) => void;
}) {
  if (automacoes.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-white/[0.12] bg-white/[0.035] p-8 text-center">
        <BellRing className="mx-auto size-8 text-slate-500" />
        <h2 className="mt-3 text-lg font-semibold text-white">Nenhuma automação encontrada</h2>
        <p className="mt-1 text-sm text-slate-400">Crie regras padrão ou cadastre uma nova rotina operacional.</p>
      </div>
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {automacoes.map((automacao) => (
        <article key={automacao.id} className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.045] p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[automacao.status] ?? statusStyles.Pausada}`}>{automacao.status}</span>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-slate-300">{automacao.tipo}</span>
                <span className={`rounded-full border border-white/[0.08] bg-slate-950/30 px-2.5 py-1 text-xs font-semibold ${prioridadeStyles[automacao.prioridade] ?? "text-slate-300"}`}>
                  {automacao.prioridade}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">{automacao.nome}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400"><strong className="text-slate-200">Quando:</strong> {automacao.gatilho}</p>
              <p className="text-sm leading-6 text-slate-400"><strong className="text-slate-200">Fazer:</strong> {automacao.acao}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-col">
              <Button variant="outline" size="sm" onClick={() => onRun(automacao.id, true)} disabled={isPending}>
                <CheckCircle2 className="size-3.5" /> OK
              </Button>
              <Button variant="outline" size="sm" onClick={() => onStatusChange(automacao.id, automacao.status === "Ativa" ? "Pausada" : "Ativa")} disabled={isPending}>
                {automacao.status === "Ativa" ? <PauseCircle className="size-3.5" /> : <PlayCircle className="size-3.5" />} {automacao.status === "Ativa" ? "Pausar" : "Ativar"}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete(automacao.id)} disabled={isPending}>
                <Trash2 className="size-3.5" /> Excluir
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <MiniInfo label="Canal" value={automacao.canal ?? "Interno"} />
            <MiniInfo label="Frequência" value={automacao.frequencia} />
            <MiniInfo label="Execuções" value={String(automacao.execucoes)} />
            <MiniInfo label="Falhas" value={String(automacao.falhas)} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniInfo label="Próxima execução" value={formatarDataHora(automacao.proximaExecucao)} />
            <MiniInfo label="Última execução" value={formatarDataHora(automacao.ultimaExecucao)} />
          </div>

          {automacao.observacoes ? <p className="mt-4 rounded-2xl bg-slate-950/30 p-3 text-sm leading-6 text-slate-400">{automacao.observacoes}</p> : null}
        </article>
      ))}
    </section>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-slate-950/30 p-3">
      <p className="text-[0.7rem] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function CentralView({ automacoes, proximasRegras, insights }: { automacoes: AutomacaoItem[]; proximasRegras: AutomacaoItem[]; insights: AutomacaoInsight[] }) {
  const resumo = gerarResumoOperacional(automacoes, insights);

  return (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.045] p-5 shadow-xl shadow-black/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Resumo operacional</h2>
            <p className="mt-1 text-sm text-slate-400">Texto pronto para repassar prioridades da rotina interna.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => copiarTexto(resumo)}>
            <Copy className="size-3.5" /> Copiar
          </Button>
        </div>
        <pre className="mt-5 whitespace-pre-wrap rounded-3xl border border-white/[0.08] bg-slate-950/40 p-4 text-sm leading-6 text-slate-300">{resumo}</pre>
      </div>

      <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.045] p-5 shadow-xl shadow-black/10">
        <h2 className="text-lg font-bold text-white">Próximas rotinas</h2>
        <p className="mt-1 text-sm text-slate-400">Agenda de regras com próxima execução cadastrada.</p>
        <div className="mt-5 space-y-3">
          {proximasRegras.length > 0 ? (
            proximasRegras.map((automacao) => (
              <div key={automacao.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-slate-950/30 p-4">
                <div>
                  <p className="font-semibold text-white">{automacao.nome}</p>
                  <p className="mt-1 text-sm text-slate-400">{automacao.tipo} · {automacao.frequencia}</p>
                </div>
                <div className="text-right text-sm text-slate-300">
                  <Clock3 className="ml-auto mb-1 size-4 text-violet-300" />
                  {formatarDataHora(automacao.proximaExecucao)}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/[0.10] p-5 text-sm text-slate-400">Nenhuma próxima execução cadastrada.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function InsightsView({ insights }: { insights: AutomacaoInsight[] }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {insights.map((insight) => (
        <article key={insight.id} className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.045] p-5 shadow-xl shadow-black/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-slate-300">{insight.modulo}</span>
                <span className={`rounded-full border border-white/[0.08] bg-slate-950/30 px-2.5 py-1 text-xs font-semibold ${prioridadeStyles[insight.prioridade]}`}>{insight.prioridade}</span>
              </div>
              <h2 className="text-lg font-bold text-white">{insight.titulo}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{insight.descricao}</p>
            </div>
            <div className="rounded-3xl border border-white/[0.08] bg-slate-950/40 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-white">{insight.total}</p>
              <p className="text-xs text-slate-500">itens</p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-slate-950/30 p-4 text-sm text-slate-300">
            <ArrowUpRight className="size-4 text-violet-300" />
            {insight.acaoRecomendada}
          </div>
        </article>
      ))}
    </section>
  );
}

function AutomacaoModal({ isPending, onClose, onSave }: { isPending: boolean; onClose: () => void; onSave: (dados: AutomacaoFormData) => void }) {
  const [form, setForm] = useState<AutomacaoFormData>({
    nome: "",
    tipo: "Operacional",
    gatilho: "",
    acao: "",
    canal: "Interno",
    frequencia: "Manual",
    prioridade: "Média",
    status: "Ativa",
    proximaExecucao: "",
    observacoes: "",
  });

  function update<K extends keyof AutomacaoFormData>(key: K, value: AutomacaoFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/[0.10] bg-slate-900 p-5 shadow-2xl shadow-black/40 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Nova automação</h2>
            <p className="mt-1 text-sm text-slate-400">Cadastre uma regra manual, interna ou preparada para integração futura.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/[0.08] px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/[0.06]">
            Fechar
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Nome" value={form.nome} onChange={(value) => update("nome", value)} required />
          <SelectField label="Tipo" value={form.tipo} onChange={(value) => update("tipo", value as AutomacaoFormData["tipo"])} options={AUTOMACAO_TIPOS} />
          <Field label="Gatilho" value={form.gatilho} onChange={(value) => update("gatilho", value)} required />
          <Field label="Ação" value={form.acao} onChange={(value) => update("acao", value)} required />
          <Field label="Canal" value={form.canal} onChange={(value) => update("canal", value)} />
          <SelectField label="Frequência" value={form.frequencia} onChange={(value) => update("frequencia", value as AutomacaoFormData["frequencia"])} options={AUTOMACAO_FREQUENCIAS} />
          <SelectField label="Prioridade" value={form.prioridade} onChange={(value) => update("prioridade", value as AutomacaoFormData["prioridade"])} options={AUTOMACAO_PRIORIDADES} />
          <SelectField label="Status" value={form.status} onChange={(value) => update("status", value as AutomacaoFormData["status"])} options={AUTOMACAO_STATUS} />
          <label className="grid gap-2 text-sm text-slate-400 md:col-span-2">
            Próxima execução
            <input
              type="datetime-local"
              value={form.proximaExecucao}
              onChange={(event) => update("proximaExecucao", event.target.value)}
              className="h-11 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 text-sm text-white outline-none transition focus:border-violet-300/30 focus:bg-white/[0.07]"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-400 md:col-span-2">
            Observações
            <textarea
              value={form.observacoes}
              onChange={(event) => update("observacoes", event.target.value)}
              className="min-h-28 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/30 focus:bg-white/[0.07]"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>
            <Activity className="size-4" /> Salvar automação
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm text-slate-400">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-11 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/30 focus:bg-white/[0.07]"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[] }) {
  return (
    <label className="grid gap-2 text-sm text-slate-400">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 text-sm text-white outline-none transition focus:border-violet-300/30 focus:bg-white/[0.07]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
