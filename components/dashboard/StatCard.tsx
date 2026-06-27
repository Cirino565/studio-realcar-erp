type Props = {
  titulo: string;
  valor: string;
  descricao?: string;
  cor?: string;
};

export default function StatCard({
  titulo,
  valor,
  descricao,
  cor = "text-white",
}: Props) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-md transition hover:bg-white/10">
      
      <div className="relative">
        {/* TÍTULO */}
        <p className="text-sm text-slate-300">{titulo}</p>

        {/* VALOR */}
        <p className={`mt-2 text-2xl font-bold ${cor}`}>
          {valor}
        </p>

        {/* DESCRIÇÃO */}
        {descricao && (
          <p className="mt-1 text-xs text-slate-400">
            {descricao}
          </p>
        )}
      </div>
    </div>
  );
}