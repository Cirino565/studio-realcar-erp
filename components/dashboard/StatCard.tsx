type Props = {
  titulo: string;
  valor: string;
  cor?: string;
  descricao?: string;
};

export default function StatCard({ titulo, valor, cor = "text-white", descricao }: Props) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/[0.12] bg-white/[0.085] p-5 shadow-2xl shadow-black/12 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.20] hover:bg-white/[0.11] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.13),transparent_38%)] opacity-80" />
      <div className="relative">
        <p className="text-sm font-medium text-slate-300">{titulo}</p>
        <p className={`mt-3 text-2xl font-semibold tracking-tight sm:text-3xl ${cor}`}>{valor}</p>
        {descricao ? <p className="mt-2 text-xs leading-5 text-slate-400">{descricao}</p> : null}
      </div>
    </div>
  );
}
