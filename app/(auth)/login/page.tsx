"use client";

import { useActionState, useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  UserRound,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { login, type LoginState } from "@/actions/auth.actions";

const estadoInicial: LoginState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    login,
    estadoInicial,
  );

  const [mostrarSenha, setMostrarSenha] = useState(false);

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-200/60 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-fuchsia-100/80 blur-3xl" />

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 md:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden min-h-[560px] overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-600 p-9 text-white md:flex md:flex-col md:justify-between">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/15 bg-white/10" />

          <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full border border-white/10 bg-white/10" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              <Sparkles size={14} />
              Studio Realçar
            </div>

            <h1 className="mt-8 max-w-sm text-4xl font-bold leading-tight tracking-tight">
              Sua clínica organizada em um só lugar.
            </h1>

            <p className="mt-5 max-w-sm text-base leading-7 text-violet-100">
              Agenda, clientes, atendimentos, evolução clínica, estoque e
              financeiro integrados em uma experiência simples e profissional.
            </p>
          </div>

          <div className="relative rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-violet-700">
                <ShieldCheck size={21} />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Ambiente protegido
                </p>

                <p className="mt-0.5 text-xs text-violet-100">
                  Acesso exclusivo para usuários autorizados.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[540px] items-center bg-white px-5 py-7 sm:px-10 sm:py-10 md:min-h-[560px] lg:px-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-7 md:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/20">
                <Sparkles size={21} />
              </div>

              <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                Studio Realçar
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                Área de acesso
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Entre na sua conta
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Digite seu nome de usuário e sua senha para acessar o sistema.
              </p>
            </div>

            <form
              action={formAction}
              className="mt-7 space-y-4"
            >
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Usuário
                </span>

                <span className="relative block">
                  <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    name="usuario"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="words"
                    spellCheck={false}
                    placeholder="Ex.: Gabriely"
                    required
                    disabled={isPending}
                    aria-invalid={Boolean(state.erro)}
                    aria-describedby={
                      state.erro ? "login-error" : undefined
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Senha
                </span>

                <span className="relative block">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    name="senha"
                    type={mostrarSenha ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    required
                    disabled={isPending}
                    aria-invalid={Boolean(state.erro)}
                    aria-describedby={
                      state.erro ? "login-error" : undefined
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-12 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarSenha((valorAtual) => !valorAtual)
                    }
                    disabled={isPending}
                    aria-label={
                      mostrarSenha
                        ? "Ocultar senha"
                        : "Mostrar senha"
                    }
                    className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  >
                    {mostrarSenha ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </span>
              </label>

              {state.erro ? (
                <div
                  id="login-error"
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3"
                >
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0 text-rose-600"
                  />

                  <p className="text-sm leading-5 text-rose-700">
                    {state.erro}
                  </p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}

                {isPending
                  ? "Entrando..."
                  : "Entrar no sistema"}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <LockKeyhole size={13} />
              Acesso exclusivo para usuários autorizados
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}