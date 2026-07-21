import { CalendarDays } from "lucide-react";

export default function AgendaHeader() {
  return (
    <div className="flex items-center justify-between gap-4 px-1 pb-1">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
            <CalendarDays size={17} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-950 dark:text-white">
              Agenda Clínica
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Atendimentos organizados por profissional e horário.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
