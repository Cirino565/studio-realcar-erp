"use client";

import { useState } from "react";
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
  area: string;
  onAreaChange: (area: string) => void;
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
  area,
  onAreaChange,
}: Props) {
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const quantidadeFiltrosAvancados = [
    status !== "todos",
    ordenacao !== "nome-asc",
    procedimento !== "todos",
    retorno !== "todos",
    area !== "todas",
  ].filter(Boolean).length;

  const possuiFiltros =
    Boolean(value.trim()) || quantidadeFiltrosAvancados > 0;

  function limparFiltros() {
    onChange("");
    onStatusChange("todos");
    onOrdenacaoChange("nome-asc");
    onProcedimentoChange("todos");
    onRetornoChange("todos");
    onAreaChange("todas");
    setFiltrosAbertos(false);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-4">
      <div className="mb-4 hidden items-center justify-between gap-3 sm:flex">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Pesquisa e filtros
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Encontre clientes e oportunidades de retorno rapidamente.
          </p>
        </div>

        {possuiFiltros ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={limparFiltros}
          >
            <RotateCcw size={14} />
            Limpar
          </Button>
        ) : null}
      </div>

      {/* Busca: sempre visível */}
      <label className="relative block min-w-0">
        <span className="sr-only">Pesquisar clientes</span>

        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Nome, telefone, CPF ou procedimento"
          className="premium-input w-full pl-11"
        />
      </label>

      {/* Controles compactos somente no celular */}
      <div className="mt-2 flex gap-2 sm:hidden">
        <Button
          type="button"
          variant="outline"
          onClick={() => setFiltrosAbertos((atual) => !atual)}
          className="min-w-0 flex-1"
          aria-expanded={filtrosAbertos}
          aria-controls="cliente-filtros-mobile"
        >
          <SlidersHorizontal size={16} />
          Filtros

          {quantidadeFiltrosAvancados > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {quantidadeFiltrosAvancados}
            </span>
          ) : null}
        </Button>

        {possuiFiltros ? (
          <Button
            type="button"
            variant="ghost"
            onClick={limparFiltros}
            className="shrink-0"
          >
            <RotateCcw size={15} />
            Limpar
          </Button>
        ) : null}
      </div>

      {/* Filtros mobile: fechados por padrão */}
      <div
        id="cliente-filtros-mobile"
        className={`${filtrosAbertos ? "grid" : "hidden"} mt-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.035] sm:hidden`}
      >
        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Status
          </span>

          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="premium-input w-full appearance-none"
          >
            <option value="todos">Todos os status</option>
            <option value="Ativa">Ativas</option>
            <option value="Inativa">Inativas</option>
          </select>
        </label>

        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Ordenação
          </span>

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

        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Área
          </span>

          <select
            value={area}
            onChange={(event) => onAreaChange(event.target.value)}
            className="premium-input w-full appearance-none"
          >
            <option value="todas">Todas as áreas</option>
            <option value="estetica">Somente Estética</option>
            <option value="cilios">Somente Cílios</option>
            <option value="ambas">Estética e Cílios</option>
            <option value="sem-area">Sem área definida</option>
          </select>
        </label>

        <label>
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Procedimento
          </span>

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
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Retorno
          </span>

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

      {/* Desktop: mantém todos os filtros abertos */}
      <div className="mt-3 hidden gap-3 sm:grid lg:grid-cols-[180px_220px_minmax(0,1fr)]">
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

        <label>
          <span className="sr-only">Filtrar por área</span>

          <select
            value={area}
            onChange={(event) => onAreaChange(event.target.value)}
            className="premium-input w-full appearance-none"
          >
            <option value="todas">Todas as áreas</option>
            <option value="estetica">Somente Estética</option>
            <option value="cilios">Somente Cílios</option>
            <option value="ambas">Estética e Cílios</option>
            <option value="sem-area">Sem área definida</option>
          </select>
        </label>
      </div>

      <div className="mt-3 hidden gap-3 sm:grid lg:grid-cols-[minmax(0,1fr)_220px]">
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
