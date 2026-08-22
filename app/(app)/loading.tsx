export default function CarregandoApp() {
  return (
    <div className="flex min-h-[60dvh] w-full flex-col items-center justify-center gap-4">
      <div className="relative size-12">
        <div className="absolute inset-0 rounded-full border-4 border-violet-200 dark:border-violet-500/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-violet-600" />
      </div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        Carregando...
      </p>
    </div>
  );
}
