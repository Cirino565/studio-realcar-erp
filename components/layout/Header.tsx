"use client";

import { Bell, CalendarDays, Search } from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { logout } from "@/actions/auth.actions";

export default function Header() {
  const hoje = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0b1220] text-white">
      
      <div className="flex items-center gap-3">
        <CalendarDays className="w-5 h-5 text-violet-300" />
        <span className="text-sm text-slate-300 capitalize">{hoje}</span>
      </div>

      <div className="hidden md:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          placeholder="Buscar clientes, agendamentos..."
          className="bg-transparent outline-none text-sm text-white placeholder:text-slate-500 w-64"
        />
      </div>

      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-slate-300" />
        <ThemeToggle />

        {/* 🔥 CORREÇÃO CRÍTICA: logout via form action */}
        <form action={logout}>
          <button
            type="submit"
            className="text-sm px-3 py-1.5 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}