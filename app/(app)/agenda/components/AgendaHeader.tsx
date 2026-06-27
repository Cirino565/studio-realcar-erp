import Link from "next/link";
import { CalendarDays, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AgendaHeader() {
  return (
    <div className="premium-card relative hidden overflow-hidden p-6 lg:block">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="absolute -bottom-10 left-1/3 h-24 w-24 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-300">
            <Sparkles size={12} className="text-violet-300" />
            Agenda Premium 3.0
          </div>

          <div>
            <h1 className="text-[2rem] font-semibold tracking-tight text-white">
              Agenda Clínica
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Visual refinado para acompanhar atendimentos, abrir a ficha do cliente e agendar com mais rapidez.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-slate-300 xl:flex">
            <CalendarDays size={16} className="text-violet-300" />
            Visão por profissional
          </div>

          <Button
            size="lg"
            asChild
            className="shadow-xl shadow-violet-950/25"
            data-mobile-action="true"
          >
            <Link href="/agenda/novo">
              <Plus size={16} />
              Novo agendamento
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
