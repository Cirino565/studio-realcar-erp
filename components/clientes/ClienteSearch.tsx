"use client";

import { Search, SlidersHorizontal } from "lucide-react";

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
  return (
    <div className="premium-card-soft p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px]">
        <label className="relative block">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Pesquisar por nome, telefone, CPF, WhatsApp, origem ou procedimento..."
            className="premium-input w-full pl-11"
          />
        </label>

        <label className="relative block">
          <SlidersHorizontal
            size={17}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
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
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_220px]">
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
      </div>
    </div>
  );
}
