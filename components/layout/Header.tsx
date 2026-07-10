"use client";

import { Bell, CalendarDays, LogOut, Search } from "lucide-react";

import { logout } from "@/actions/auth.actions";

export default function Header() {
  const hoje = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/92 px-3 py-2.5 text-slate-900 shadow-sm shadow-slate-900/[0.03] backdrop-blur-xl sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <CalendarDays className="size-4" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:hidden">
            Hoje
          </p>
          <span className="block truncate text-xs font-semibold capitalize text-slate-700 sm:text-sm">
            {hoje}
          </span>
        </div>
      </div>

      <label className="relative hidden w-full max-w-md md:block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Buscar clientes e agendamentos..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
        />
      </label>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Notificações"
          className="flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <Bell className="size-4" />
        </button>

        <form action={logout}>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </form>
      </div>
    </header>
  );
}
