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
    <header className="sticky top-0 z-30 w-full border-b border-white/[0.12] bg-[#151a2a]/82 backdrop-blur-2xl">
      <div className="mx-auto flex min-h-16 w-full max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:h-20 sm:px-6 sm:py-0 lg:px-8">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-slate-300 sm:text-xs sm:tracking-[0.18em]">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate capitalize">{hoje}</span>
          </div>
          <h2 className="mt-1 truncate text-lg font-semibold text-white sm:text-xl">
            Painel Operacional
          </h2>
        </div>

        <div className="hidden flex-1 justify-center xl:flex">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            <Search className="h-4 w-4" />
            <span>Buscar cliente, horário, lançamento ou produto...</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          <button className="hidden rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 sm:inline-flex">
            <Bell className="h-4 w-4" />
          </button>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 sm:text-sm"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
