"use client";

import { useMemo, useState } from "react";
import { Check, Search, UserRound, X } from "lucide-react";

import type { ClienteVendaOption } from "@/app/(app)/vendas/types";

type Props = {
  clientes: ClienteVendaOption[];
  value: string;
  onChange: (value: string) => void;
};

function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function somenteDigitos(value: string) {
  return value.replace(/\D/g, "");
}

export default function ClienteVendaSearch({ clientes, value, onChange }: Props) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);

  const selecionado = clientes.find((cliente) => String(cliente.id) === value) || null;

  const resultados = useMemo(() => {
    const termo = normalizarTexto(busca);
    const digitos = somenteDigitos(busca);

    if (!termo && !digitos) return clientes.slice(0, 20);

    return clientes
      .filter((cliente) => {
        const nome = normalizarTexto(cliente.nome);
        const telefone = somenteDigitos(cliente.telefone || "");
        const whatsapp = somenteDigitos(cliente.whatsapp || "");

        return (
          (termo && nome.includes(termo)) ||
          (digitos && (telefone.includes(digitos) || whatsapp.includes(digitos)))
        );
      })
      .slice(0, 30);
  }, [busca, clientes]);

  function selecionar(cliente: ClienteVendaOption) {
    onChange(String(cliente.id));
    setBusca("");
    setAberto(false);
  }

  function limpar() {
    onChange("");
    setBusca("");
    setAberto(true);
  }

  return (
    <div className="relative">
      {selecionado ? (
        <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 dark:border-violet-400/20 dark:bg-violet-400/10">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
            <UserRound className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-950 dark:text-white">{selecionado.nome}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {selecionado.whatsapp || selecionado.telefone}
            </p>
          </div>
          <Check className="size-4 text-emerald-600" />
          <button
            type="button"
            onClick={limpar}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Trocar cliente"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(event) => {
              setBusca(event.target.value);
              setAberto(true);
            }}
            onFocus={() => setAberto(true)}
            onBlur={() => globalThis.setTimeout(() => setAberto(false), 150)}
            placeholder="Pesquisar por nome, telefone ou WhatsApp"
            className="premium-input h-12 w-full pl-11"
            autoComplete="off"
          />
        </div>
      )}

      {!selecionado && aberto ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-[90] max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-slate-950">
          {resultados.length > 0 ? (
            resultados.map((cliente) => (
              <button
                key={cliente.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selecionar(cliente)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-violet-50 dark:hover:bg-white/5"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300">
                  <UserRound className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{cliente.nome}</p>
                  <p className="truncate text-xs text-slate-500">
                    {cliente.whatsapp || cliente.telefone}
                    {cliente.whatsapp && cliente.telefone !== cliente.whatsapp ? ` · ${cliente.telefone}` : ""}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              Nenhuma cliente encontrada.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
