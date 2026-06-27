import {
  Users,
  UserPlus,
  Wallet,
  Cake,
} from "lucide-react";

type Props = {
  total: number;
  ativos: number;
  faturamento: number;
  aniversariantes: number;
};

export default function ClienteCards({
  total,
  ativos,
  faturamento,
  aniversariantes,
}: Props) {
  const cards = [
    {
      titulo: "Clientes",
      valor: total,
      icon: Users,
      cor: "text-cyan-400",
    },
    {
      titulo: "Clientes Ativos",
      valor: ativos,
      icon: UserPlus,
      cor: "text-green-400",
    },
    {
      titulo: "Faturamento",
      valor: faturamento.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      icon: Wallet,
      cor: "text-yellow-400",
    },
    {
      titulo: "Aniversariantes",
      valor: aniversariantes,
      icon: Cake,
      cor: "text-pink-400",
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.titulo}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                {card.titulo}
              </p>

              <Icon
                size={22}
                className={card.cor}
              />
            </div>

            <h2 className="mt-5 text-3xl font-bold text-white">
              {card.valor}
            </h2>
          </div>
        );
      })}
    </div>
  );
}