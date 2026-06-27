"use client";

import { Archive, CheckCircle2, Clock3, Database, Download, FileJson, History, ShieldCheck, Trash2 } from "lucide-react";
import { excluirBackupRegistro, limparBackupsAntigos, registrarBackupManual } from "@/actions/backup.actions";
import { formatarDataHora } from "@/lib/format";
import type { BackupMetricas, BackupRegistroItem, BackupSaude } from "../types";

type BackupClientProps = {
  backups: BackupRegistroItem[];
  metricas: BackupMetricas;
  saude: BackupSaude;
};

const grupos = [
  { titulo: "Operação", itens: ["clientes", "agendamentos", "lancamentos", "produtos", "movimentacoes"] as const },
  { titulo: "Crescimento", itens: ["leads", "campanhas", "fornecedores"] as const },
  { titulo: "Clínico", itens: ["anamneses", "fotos", "documentos", "procedimentos", "evolucoes"] as const },
  { titulo: "Sistema", itens: ["usuarios", "perfis", "permissoes", "automacoes", "auditoria", "configuracoes"] as const },
];

const nomesMetricas: Record<keyof Omit<BackupMetricas, "total">, string> = {
  clientes: "Clientes",
  agendamentos: "Agendamentos",
  lancamentos: "Lançamentos",
  fornecedores: "Fornecedores",
  produtos: "Produtos",
  movimentacoes: "Movimentações",
  leads: "Leads",
  campanhas: "Campanhas",
  usuarios: "Usuários",
  perfis: "Perfis",
  permissoes: "Permissões",
  automacoes: "Automações",
  auditoria: "Auditoria",
  anamneses: "Anamneses",
  fotos: "Fotos",
  documentos: "Documentos",
  procedimentos: "Procedimentos",
  evolucoes: "Evoluções",
  configuracoes: "Configurações",
};

function baixarHistoricoCsv(backups: BackupRegistroItem[]) {
  const linhas = backups.map((backup) => [
    backup.nome,
    backup.status,
    backup.tamanho ?? "",
    backup.observacoes ?? "",
    formatarDataHora(backup.createdAt),
  ]);

  const csv = [["Nome", "Status", "Tamanho", "Observações", "Criado em"], ...linhas]
    .map((linha) => linha.map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `historico-backups-studio-realcar-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function BackupClient({ backups, metricas, saude }: BackupClientProps) {
  const percentualProtegido = metricas.total === 0 ? 0 : Math.min(100, Math.round((saude.registrosProtegidos / metricas.total) * 100));

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/40 p-5 shadow-2xl shadow-black/20 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-200">
              <ShieldCheck className="size-3.5" /> Segurança operacional
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Backup Premium</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Controle de snapshots lógicos, exportação dos dados do ERP e histórico de segurança para recuperação operacional.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <form action={registrarBackupManual}>
              <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:from-violet-500 hover:to-fuchsia-500 sm:w-auto">
                <Archive className="size-4" /> Registrar backup
              </button>
            </form>
            <a
              href="/api/backup"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.05] px-5 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
            >
              <Download className="size-4" /> Baixar JSON
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.055] p-5 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Registros mapeados</p>
            <Database className="size-5 text-violet-300" />
          </div>
          <p className="mt-3 text-3xl font-bold text-white">{metricas.total}</p>
          <p className="mt-1 text-xs text-slate-500">Dados cobertos na exportação lógica.</p>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.055] p-5 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Último backup</p>
            <Clock3 className="size-5 text-cyan-300" />
          </div>
          <p className="mt-3 text-lg font-bold text-white">{saude.ultimoBackup ? formatarDataHora(saude.ultimoBackup) : "Ainda não gerado"}</p>
          <p className="mt-1 text-xs text-slate-500">Histórico manual registrado no ERP.</p>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.055] p-5 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Backups registrados</p>
            <History className="size-5 text-emerald-300" />
          </div>
          <p className="mt-3 text-3xl font-bold text-white">{saude.totalBackups}</p>
          <p className="mt-1 text-xs text-slate-500">Mantemos os registros recentes visíveis.</p>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.055] p-5 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Cobertura lógica</p>
            <CheckCircle2 className="size-5 text-emerald-300" />
          </div>
          <p className="mt-3 text-3xl font-bold text-white">{percentualProtegido}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" style={{ width: `${percentualProtegido}%` }} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.045] p-5 shadow-xl shadow-black/10 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Mapa de dados do backup</h2>
              <p className="mt-1 text-sm text-slate-400">Entidades incluídas no snapshot lógico exportável.</p>
            </div>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-300">
              {metricas.total} registros
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {grupos.map((grupo) => (
              <div key={grupo.titulo} className="rounded-3xl border border-white/[0.07] bg-slate-950/30 p-4">
                <h3 className="text-sm font-semibold text-white">{grupo.titulo}</h3>
                <div className="mt-4 space-y-3">
                  {grupo.itens.map((item) => (
                    <div key={item} className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-slate-400">{nomesMetricas[item]}</span>
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-100">{metricas[item]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.045] p-5 shadow-xl shadow-black/10 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Exportação e manutenção</h2>
              <p className="mt-1 text-sm text-slate-400">Ações seguras para rotina operacional.</p>
            </div>
            <FileJson className="size-5 text-violet-300" />
          </div>

          <div className="space-y-3">
            <a href="/api/backup" className="block rounded-3xl border border-white/[0.08] bg-slate-950/35 p-4 transition hover:bg-slate-900/70">
              <p className="font-semibold text-white">Baixar snapshot JSON</p>
              <p className="mt-1 text-sm text-slate-400">Exporta a fotografia lógica dos dados atuais do ERP.</p>
            </a>

            <button
              type="button"
              onClick={() => baixarHistoricoCsv(backups)}
              className="block w-full rounded-3xl border border-white/[0.08] bg-slate-950/35 p-4 text-left transition hover:bg-slate-900/70"
            >
              <p className="font-semibold text-white">Exportar histórico CSV</p>
              <p className="mt-1 text-sm text-slate-400">Baixa o histórico de backups registrados nesta tela.</p>
            </button>

            <form action={limparBackupsAntigos}>
              <button className="block w-full rounded-3xl border border-amber-300/15 bg-amber-400/10 p-4 text-left transition hover:bg-amber-400/15">
                <p className="font-semibold text-amber-100">Manter apenas os 10 mais recentes</p>
                <p className="mt-1 text-sm text-amber-100/70">Remove registros antigos do histórico. Não apaga dados do ERP.</p>
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.045] p-5 shadow-xl shadow-black/10 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Histórico de backups</h2>
            <p className="mt-1 text-sm text-slate-400">Registros manuais de snapshots lógicos.</p>
          </div>
          <span className="text-sm text-slate-400">{backups.length} registros</span>
        </div>

        {backups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/[0.10] bg-slate-950/25 p-8 text-center">
            <p className="font-semibold text-white">Nenhum backup registrado ainda.</p>
            <p className="mt-2 text-sm text-slate-400">Clique em Registrar backup para criar o primeiro registro operacional.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/[0.08]">
            <div className="hidden grid-cols-[1.1fr_0.6fr_0.6fr_0.8fr_80px] gap-4 border-b border-white/[0.08] bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 lg:grid">
              <span>Backup</span>
              <span>Status</span>
              <span>Tamanho</span>
              <span>Criado em</span>
              <span></span>
            </div>

            <div className="divide-y divide-white/[0.07]">
              {backups.map((backup) => (
                <div key={backup.id} className="grid gap-3 bg-slate-950/20 p-4 lg:grid-cols-[1.1fr_0.6fr_0.6fr_0.8fr_80px] lg:items-center">
                  <div>
                    <p className="font-semibold text-white">{backup.nome}</p>
                    <p className="mt-1 text-sm text-slate-400">{backup.observacoes ?? "Backup lógico registrado."}</p>
                  </div>
                  <div>
                    <span className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                      {backup.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{backup.tamanho ?? "Não calculado"}</p>
                  <p className="text-sm text-slate-400">{formatarDataHora(backup.createdAt)}</p>
                  <form action={excluirBackupRegistro.bind(null, backup.id)} className="flex lg:justify-end">
                    <button className="inline-flex size-9 items-center justify-center rounded-xl border border-rose-300/15 bg-rose-400/10 text-rose-200 transition hover:bg-rose-400/15" aria-label="Excluir registro de backup">
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
