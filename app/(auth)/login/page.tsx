"use client";

import { useActionState } from "react";
import { Loader2, LockKeyhole, Mail } from "lucide-react";

import { login, type LoginState } from "@/actions/auth.actions";

const estadoInicial: LoginState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, estadoInicial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b1220] px-4 py-8">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#111827]/95 p-6 shadow-2xl shadow-black/30">
        <div className="rounded-3xl border border-violet-300/20 bg-violet-300/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-200">ERP Premium</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">Studio Realçar</h1>
          <p className="mt-1 text-sm text-slate-400">Acesse sua operação com e-mail e senha.</p>
        </div>

        <form className="mt-6 space-y-4" action={formAction}>
          <label className="grid gap-2 text-sm font-medium text-slate-300">
            E-mail
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@studiorealcar.com"
                required
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/50"
              />
            </span>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-300">
            Senha
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                name="senha"
                type="password"
                autoComplete="current-password"
                placeholder="Digite sua senha"
                required
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/50"
              />
            </span>
          </label>

          {state.erro ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {state.erro}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isPending ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs leading-5 text-slate-400">
          Acesso local padrão do seed: <strong className="text-slate-200">admin@studiorealcar.com</strong> / <strong className="text-slate-200">123456</strong>. Em hospedagem, use as credenciais definidas no ambiente.
        </p>
      </div>
    </main>
  );
}
