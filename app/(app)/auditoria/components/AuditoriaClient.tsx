"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Download,
  Filter,
  Layers3,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

import { excluirRegistroAuditoria, limparAuditoriaAntiga } from "@/actions/auditoria.actions";
import { formatarDataHora } from "@/lib/format";
import type { AuditoriaLog, AuditoriaResumo } from "../types";

type PeriodoFiltro = "todos" | "hoje" | "7d" | "30d" | "90d";

type Props = {
  logs: AuditoriaLog[];
  resumo: AuditoriaResumo;
};

const periodos: { label: string; value: PeriodoFiltro }[] = [
  { label: "Todos", value: "todos" },
  { label: "Hoje", value: "hoje" },
  { label: "7 dias", value: "7d" },
  { label: "30 dias", value: "30d" },
  { label: "90 dias", value: "90d" },
];

function inicioDoDia(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function getLimitePeriodo(periodo: PeriodoFiltro) {
  const agora = new Date();

  if (periodo === "hoje") {
    return inicioDoDia(agora);
  }

  if (periodo === "7d") {
    const data = new Date(agora);
    data.setDate(data.getDate() - 7);
    return data;
  }

  if (periodo === "30d") {
    const data = new Date(agora);
    data.setDate(data.getDate() - 30);
    return data;
  }

  if (periodo === "90d") {
    const data = new Date(agora);
    data.setDate(data.getDate() - 90);
    return data;
  }

  return null;
}

function isAcaoCritica(log: AuditoriaLog) {
  const texto = `${log.acao} ${log.detalhes ?? ""}`.toLowerCase();
  return texto.includes("excluiu") || texto.includes("delete") || texto.includes("limpou") || texto.includes("backup");
}

function escapeCsv(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function exportarCsv(logs: AuditoriaLog[]) {
  const header = ["Data", "Modulo", "Acao", "Entidade", "ID da entidade", "Usuario", "Detalhes"];
  const rows = logs.map((log) => [
    formatarDataHora(log.createdAt),
    log.modulo,
    log.acao,
    log.entidade ?? "",
    log.entidadeId ?? "",
    log.usuario ?? "",
    log.detalhes ?? "",
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `auditoria-studio-realcar-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function StatCard({ titulo, valor, descricao, icon: Icon }: { titulo: string; valor: string; descricao: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-3xl border border-white/[0.12] bg-white/[0.075] p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{titulo}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{valor}</p>
          <p className="mt-1 text-sm text-slate-400">{descricao}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.08] text-violet-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function getModuloClass(modulo: string) {
  const lower = modulo.toLowerCase();

  if (lower.includes("financeiro")) return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  if (lower.includes("clientes")) return "border-sky-400/20 bg-sky-400/10 text-sky-200";
  if (lower.includes("agenda")) return "border-violet-400/20 bg-violet-400/10 text-violet-200";
  if (lower.includes("estoque")) return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  if (lower.includes("marketing")) return "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200";

  return "border-white/[0.12] bg-white/[0.08] text-slate-200";
}

function LogMobileCard({ log, onDelete, pending }: { log: AuditoriaLog; onDelete: (id: number) => void; pending: boolean }) {
  const critico = isAcaoCritica(log);

  return (
    <article className="rounded-3xl border border-white/[0.12] bg-white/[0.07] p-4 shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${getModuloClass(log.modulo)}`}>{log.modulo}</span>
            {critico ? (
              <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-[0.68rem] font-semibold text-rose-200">
                Crítico
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-sm font-semibold text-white">{log.acao}</h3>
          <p className="mt-1 text-xs text-slate-400">{formatarDataHora(log.createdAt)}</p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => onDelete(log.id)}
          className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-2 text-rose-200 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Excluir registro de auditoria"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-2xl border border-white/[0.10] bg-slate-950/20 p-3">
          <p className="text-slate-500">Entidade</p>
          <p className="mt-1 truncate font-medium text-slate-200">{log.entidade ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.10] bg-slate-950/20 p-3">
          <p className="text-slate-500">Usuário</p>
          <p className="mt-1 truncate font-medium text-slate-200">{log.usuario ?? "-"}</p>
        </div>
      </div>

      {log.detalhes ? <p className="mt-4 rounded-2xl border border-white/[0.10] bg-slate-950/20 p-3 text-xs leading-5 text-slate-300">{log.detalhes}</p> : null}
    </article>
  );
}

export default function AuditoriaClient({ logs, resumo }: Props) {
  const [busca, setBusca] = useState("");
  const [modulo, setModulo] = useState("Todos");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("30d");
  const [somenteCriticos, setSomenteCriticos] = useState(false);
  const [isPending, startTransition] = useTransition();

  const modulos = useMemo(() => ["Todos", ...Array.from(new Set(logs.map((log) => log.modulo))).sort()], [logs]);

  const logsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const limite = getLimitePeriodo(periodo);

    return logs.filter((log) => {
      const data = new Date(log.createdAt);
      const texto = [log.modulo, log.acao, log.entidade, log.entidadeId, log.usuario, log.detalhes].filter(Boolean).join(" ").toLowerCase();

      const passaBusca = !termo || texto.includes(termo);
      const passaModulo = modulo === "Todos" || log.modulo === modulo;
      const passaPeriodo = !limite || data >= limite;
      const passaCritico = !somenteCriticos || isAcaoCritica(log);

      return passaBusca && passaModulo && passaPeriodo && passaCritico;
    });
  }, [busca, modulo, periodo, somenteCriticos, logs]);

  function handleDelete(id: number) {
    const confirmado = window.confirm("Excluir este registro de auditoria?");
    if (!confirmado) return;

    startTransition(() => {
      void excluirRegistroAuditoria(id);
    });
  }

  function handleLimparAntigos() {
    const confirmado = window.confirm("Remover registros com mais de 180 dias? Os registros recentes serão preservados.");
    if (!confirmado) return;

    startTransition(() => {
      void limparAuditoriaAntiga(180);
    });
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/[0.12] bg-white/[0.07] shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="relative p-6 sm:p-8">
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-24 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Controle operacional
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Auditoria</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Acompanhe alterações relevantes, exclusões, backups e operações sensíveis do ERP Studio Realçar.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => exportarCsv(logsFiltrados)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.12]"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleLimparAntigos}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Limpar antigos
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard titulo="Registros" valor={String(resumo.total)} descricao="últimos registros" icon={Activity} />
        <StatCard titulo="Hoje" valor={String(resumo.hoje)} descricao="ações no dia" icon={CalendarClock} />
        <StatCard titulo="Módulos" valor={String(resumo.modulos)} descricao="áreas rastreadas" icon={Layers3} />
        <StatCard titulo="Usuários" valor={String(resumo.usuarios)} descricao="autores únicos" icon={UserRound} />
        <StatCard titulo="Críticos" valor={String(resumo.criticos)} descricao="exclusões e backups" icon={AlertTriangle} />
      </section>

      <section className="rounded-[2rem] border border-white/[0.12] bg-white/[0.07] p-4 shadow-xl shadow-black/10 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por ação, módulo, entidade, usuário ou detalhe"
              className="h-12 w-full rounded-2xl border border-white/[0.12] bg-slate-950/25 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/40 focus:bg-slate-950/35"
            />
          </label>

          <select
            value={modulo}
            onChange={(event) => setModulo(event.target.value)}
            className="h-12 rounded-2xl border border-white/[0.12] bg-slate-950/25 px-4 text-sm text-white outline-none transition focus:border-violet-300/40"
          >
            {modulos.map((item) => (
              <option key={item} value={item} className="bg-slate-950 text-white">
                {item}
              </option>
            ))}
          </select>

          <select
            value={periodo}
            onChange={(event) => setPeriodo(event.target.value as PeriodoFiltro)}
            className="h-12 rounded-2xl border border-white/[0.12] bg-slate-950/25 px-4 text-sm text-white outline-none transition focus:border-violet-300/40"
          >
            {periodos.map((item) => (
              <option key={item.value} value={item.value} className="bg-slate-950 text-white">
                {item.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSomenteCriticos((value) => !value)}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
              somenteCriticos
                ? "border-rose-400/25 bg-rose-400/15 text-rose-100"
                : "border-white/[0.12] bg-white/[0.08] text-slate-200 hover:bg-white/[0.12]"
            }`}
          >
            <Filter className="h-4 w-4" />
            Críticos
          </button>
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-[2rem] border border-white/[0.12] bg-white/[0.07] shadow-xl shadow-black/10 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-white/[0.10] bg-white/[0.05] text-xs uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-5 py-4">Data</th>
                <th className="px-5 py-4">Módulo</th>
                <th className="px-5 py-4">Ação</th>
                <th className="px-5 py-4">Entidade</th>
                <th className="px-5 py-4">Usuário</th>
                <th className="px-5 py-4">Detalhes</th>
                <th className="px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {logsFiltrados.map((log) => {
                const critico = isAcaoCritica(log);

                return (
                  <tr key={log.id} className="text-slate-300 transition hover:bg-white/[0.045]">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-400">{formatarDataHora(log.createdAt)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getModuloClass(log.modulo)}`}>{log.modulo}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{log.acao}</span>
                        {critico ? <AlertTriangle className="h-4 w-4 text-amber-300" /> : null}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-200">{log.entidade ?? "-"}</p>
                      {log.entidadeId ? <p className="mt-1 text-xs text-slate-500">ID {log.entidadeId}</p> : null}
                    </td>
                    <td className="px-5 py-4">{log.usuario ?? "-"}</td>
                    <td className="max-w-[280px] px-5 py-4 text-slate-400">
                      <span className="line-clamp-2">{log.detalhes ?? "-"}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDelete(log.id)}
                        className="inline-flex items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/10 p-2 text-rose-200 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Excluir registro de auditoria"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {logsFiltrados.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-white">Nenhum registro encontrado.</p>
            <p className="mt-1 text-sm text-slate-400">Ajuste os filtros para ampliar a busca.</p>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 lg:hidden">
        {logsFiltrados.map((log) => (
          <LogMobileCard key={log.id} log={log} onDelete={handleDelete} pending={isPending} />
        ))}

        {logsFiltrados.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.12] bg-white/[0.07] px-5 py-10 text-center">
            <p className="text-sm font-medium text-white">Nenhum registro encontrado.</p>
            <p className="mt-1 text-sm text-slate-400">Ajuste os filtros para ampliar a busca.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
