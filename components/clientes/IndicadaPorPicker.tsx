"use client";

import { useEffect, useState, useTransition } from "react";

import { buscarClientesParaIndicacao } from "@/actions/indicacao.actions";

type Pessoa = { id: number; nome: string };

/** Campo "Indicada por" (busca a cliente que indicou pelo nome ou telefone). */
export default function IndicadaPorPicker({
  value,
  onChange,
  className = "",
}: {
  value: Pessoa | null;
  onChange: (pessoa: Pessoa | null) => void;
  className?: string;
}) {
  const [termo, setTermo] = useState("");
  const [opcoes, setOpcoes] = useState<Array<Pessoa & { telefone: string }>>([]);
  const [, startBusca] = useTransition();

  // Espera a pessoa parar de digitar para nao consultar a cada letra.
  useEffect(() => {
    if (value || termo.trim().length < 2) return;
    const espera = window.setTimeout(() => {
      startBusca(async () => {
        try {
          setOpcoes(await buscarClientesParaIndicacao(termo, 0));
        } catch {
          setOpcoes([]);
        }
      });
    }, 300);
    return () => window.clearTimeout(espera);
  }, [termo, value]);

  if (value) {
    return (
      <div className={`flex flex-wrap items-center gap-2 text-sm ${className}`}>
        <span className="text-slate-600 dark:text-slate-300">
          Indicada por <strong className="text-slate-900 dark:text-white">{value.nome}</strong>
        </span>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setTermo("");
            setOpcoes([]);
          }}
          className="text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300"
        >
          Trocar
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <input
        value={termo}
        onChange={(event) => {
          setTermo(event.target.value);
          if (event.target.value.trim().length < 2) setOpcoes([]);
        }}
        placeholder="Quem indicou? Digite o nome ou telefone (opcional)"
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
      />
      {opcoes.length > 0 ? (
        <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-slate-900">
          {opcoes.map((opcao) => (
            <li key={opcao.id}>
              <button
                type="button"
                onClick={() => {
                  onChange({ id: opcao.id, nome: opcao.nome });
                  setOpcoes([]);
                }}
                className="flex w-full justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-violet-50 dark:hover:bg-white/[0.06]"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-100">{opcao.nome}</span>
                <span className="text-xs text-slate-500">{opcao.telefone}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
