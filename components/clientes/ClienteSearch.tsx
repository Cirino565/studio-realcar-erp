"use client";

import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  value: string;
  onChange: (texto: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  ordenacao: string;
  onOrdenacaoChange: (ordenacao: string) => void;
  procedimento: string;
  onProcedimentoChange: (procedimento: string) => void;
  procedimentos: string[];
  retorno: string;
  onRetornoChange: (retorno: string) => void;
};

export default function ClienteSearch({
  value,
  onChange,
  status,
  onStatusChange,
  ordenacao,
  onOrdenacaoChange,
  procedimento,
  onProcedimentoChange,
  procedimentos,
  retorno,
  onRetornoChange,
}: Props) {
  const possuiFiltros =
    Boolean(value.trim()) ||
    status !== "todos" ||
    ordenacao !== "nome-asc" ||
    procedimento !== "todos" ||
    retorno !== "todos";

  function limparFiltros() {
    onChange("");
    onStatusChange("todos");
    onOrdenacaoChange("nome-asc");
    onProcedimentoChange("todos");
    onRetornoChange("todos");
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Pesquisa e filtros
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Encontre clientes e oportunidades de retorno rapidamente.
          </p>
        </div>

        {possuiFiltros ? (
          <Button type="button" size="sm" variant="ghost" onClick={limparFiltros}>
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Limpar</span>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_220px]">
        <label className="relative block min-w-0">
          <span className="sr-only">Pesquisar clientes</span>
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Nome, telefone, CPF, WhatsApp, origem ou procedimento"
            className="premium-input w-full pl-11"
          />
        </label>

        <label className="relative block">
          <span className="sr-only">Filtrar por status</span>
          <SlidersHorizontal
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="premium-input w-full appearance-none pl-11"
          >
            <option value="todos">Todos os status</option>
            <option value="Ativa">Ativas</option>
            <option value="Inativa">Inativas</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Ordenar clientes</span>
          <select
            value={ordenacao}
            onChange={(event) => onOrdenacaoChange(event.target.value)}
            className="premium-input w-full appearance-none"
          >
            <option value="nome-asc">Nome A-Z</option>
            <option value="recentes">Cadastro mais recente</option>
            <option value="maior-valor">Maior valor gasto</option>
            <option value="ultima-visita">Última visita</option>
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
        <label>
          <span className="sr-only">Filtrar por procedimento</span>
          <select
            value={procedimento}
            onChange={(event) => onProcedimentoChange(event.target.value)}
            className="premium-input w-full appearance-none"
          >
            <option value="todos">Todos os procedimentos</option>
            {procedimentos.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Filtrar oportunidades de retorno</span>
          <select
            value={retorno}
            onChange={(event) => onRetornoChange(event.target.value)}
            className="premium-input w-full appearance-none"
          >
            <option value="todos">Todos os retornos</option>
            <option value="30">Sem retorno há 30 dias</option>
            <option value="60">Sem retorno há 60 dias</option>
            <option value="90">Sem retorno há 90 dias</option>
          </select>
        </label>
      </div>
    </section>
  );
}
