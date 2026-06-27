import { Cake, Sparkles, TrendingUp, Users } from "lucide-react";

import type { Cliente } from "@/lib/types";
import { formatarMoeda } from "@/lib/format";

type Props = {
  clientes: Cliente[];
  totalGeral: number;
};

export default function ClientesResumo({ clientes, totalGeral }: Props) {
  const total = clientes.length;
  const ativos = clientes.filter((cliente) => cliente.status === "Ativa").length;
  const faturamento = clientes.reduce(
    (totalAtual, cliente) => totalAtual + cliente.valorGasto,
    0
  );

  const hoje = new Date();
  const aniversariantes = clientes.filter((cliente) => {
    if (!cliente.nascimento) return false;

    const data = new Date(cliente.nascimento);

    return data.getMonth() === hoje.getMonth();
  }).length;

  const taxaAtivos = totalGeral > 0 ? Math.round((ativos / totalGeral) * 100) : 0;

  const cards = [
    {
      titulo: "Clientes filtrados",
      valor: total.toString(),
      detalhe: `${totalGeral} cadastrados no total`,
      icon: Users,
      brilho: "from-cyan-400/20 to-violet-500/10",
    },
    {
      titulo: "Clientes ativos",
      valor: ativos.toString(),
      detalhe: `${taxaAtivos}% da base total`,
      icon: Sparkles,
      brilho: "from-emerald-400/20 to-cyan-500/10",
    },
    {
      titulo: "Valor acumulado",
      valor: formatarMoeda(faturamento),
      detalhe: "Histórico financeiro cadastrado",
      icon: TrendingUp,
      brilho: "from-amber-400/20 to-orange-500/10",
    },
    {
      titulo: "Aniversariantes",
      valor: aniversariantes.toString(),
      detalhe: "Clientes do mês atual",
      icon: Cake,
      brilho: "from-pink-400/20 to-fuchsia-500/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.titulo}
            className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.045] p-5 shadow-xl shadow-black/10"
          >
            <div
              className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${card.brilho} opacity-80 blur-2xl transition group-hover:opacity-100`}
            />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">{card.titulo}</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  {card.valor}
                </h2>
                <p className="mt-2 text-xs text-slate-500">{card.detalhe}</p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.06] p-3 text-white">
                <Icon size={20} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
