"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export default function TesteMobilePage() {
  const [contador, setContador] = useState(0);
  const [tab, setTab] = useState<"a" | "b" | "c">("a");
  const hora = useMemo(() => new Date().toLocaleTimeString("pt-BR"), []);

  return (
    <div className="mx-auto max-w-xl space-y-5 pb-10">
      <section className="rounded-[2rem] border border-white/[0.12] bg-white/[0.075] p-5 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-200">Diagnóstico mobile</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Teste de JavaScript</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Esta página confirma se o navegador do celular está carregando a parte interativa do sistema.
        </p>
        <p className="mt-3 rounded-2xl border border-white/[0.10] bg-white/[0.06] px-4 py-3 text-sm text-slate-300">
          Página renderizada às: <span className="font-semibold text-white">{hora}</span>
        </p>
      </section>

      <section className="rounded-[2rem] border border-white/[0.12] bg-white/[0.075] p-5">
        <h2 className="text-base font-semibold text-white">1. Botão com onClick</h2>
        <p className="mt-1 text-sm text-slate-400">Se este número subir, o JavaScript está funcionando.</p>
        <button
          type="button"
          onClick={() => setContador((current) => current + 1)}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white"
        >
          Testar clique: {contador}
        </button>
      </section>

      <section className="rounded-[2rem] border border-white/[0.12] bg-white/[0.075] p-5">
        <h2 className="text-base font-semibold text-white">2. Abas com estado</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["a", "b", "c"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-2xl px-3 py-3 text-sm font-semibold ${
                tab === item ? "bg-white/[0.14] text-white" : "bg-white/[0.06] text-slate-400"
              }`}
            >
              Aba {item.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="mt-4 rounded-2xl border border-white/[0.10] bg-[#111827]/60 px-4 py-3 text-sm text-white">
          Aba ativa: {tab.toUpperCase()}
        </p>
      </section>

      <section className="rounded-[2rem] border border-white/[0.12] bg-white/[0.075] p-5">
        <h2 className="text-base font-semibold text-white">3. Link normal</h2>
        <Link
          href="/configuracoes"
          className="mt-4 flex w-full items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.07] px-4 py-3 text-sm font-semibold text-white"
        >
          Voltar para Configurações
        </Link>
      </section>
    </div>
  );
}
