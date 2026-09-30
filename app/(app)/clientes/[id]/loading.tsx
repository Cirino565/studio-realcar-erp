// Aparece na hora em que alguém clica no nome da cliente ou em
// "Ver prontuário", enquanto a ficha completa carrega.
function Bloco({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/80 dark:bg-white/10 ${className}`}
    />
  );
}

export default function CarregandoProntuario() {
  return (
    <div className="app-mobile-safe space-y-5 sm:space-y-6" aria-busy="true">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.055] sm:p-6">
        <div className="flex items-center gap-4">
          <Bloco className="size-14 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bloco className="h-5 w-48 max-w-full" />
            <Bloco className="h-3.5 w-32 max-w-full" />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.055]">
        <div className="flex gap-2 overflow-hidden border-b border-slate-200 p-3 dark:border-white/10">
          <Bloco className="h-9 w-28 shrink-0" />
          <Bloco className="h-9 w-24 shrink-0" />
          <Bloco className="h-9 w-24 shrink-0" />
          <Bloco className="h-9 w-32 shrink-0" />
        </div>

        <div className="space-y-3 p-4 sm:p-6">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Abrindo prontuário...
          </p>
          <Bloco className="h-24 w-full" />
          <Bloco className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
