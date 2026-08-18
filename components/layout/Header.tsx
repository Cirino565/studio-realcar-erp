"use client";

import { Bell, CalendarDays, LogOut } from "lucide-react";

import { logout } from "@/actions/auth.actions";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default function Header() {
  const hoje = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());

  function abrirAgendaCalendario() {
    const evento = new Event("studio-realcar:open-agenda-calendar", {
      cancelable: true,
    });

    const eventoNaoFoiTratado = window.dispatchEvent(evento);

    if (eventoNaoFoiTratado) {
      window.location.href = "/agenda";
    }
  }

  return (
    <header className="app-header sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b px-3 py-2.5 shadow-sm backdrop-blur-xl sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={abrirAgendaCalendario}
          className="app-header-date-icon flex size-9 shrink-0 items-center justify-center rounded-xl transition active:scale-95"
          aria-label="Abrir calendário da agenda"
          title="Abrir calendário"
        >
          <CalendarDays className="size-4" />
        </button>

        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:hidden">
            Hoje
          </p>
          <span className="block truncate text-xs font-semibold capitalize sm:text-sm">
            {hoje}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />

        <button
          type="button"
          aria-label="Notificações"
          className="app-header-action flex size-9 items-center justify-center rounded-xl border transition"
        >
          <Bell className="size-4" />
        </button>

        <form action={logout}>
          <button
            type="submit"
            className="app-logout-button inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </form>
      </div>
    </header>
  );
}