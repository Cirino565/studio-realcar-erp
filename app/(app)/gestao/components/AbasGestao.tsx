import Link from "next/link";
import { CalendarRange, TrendingUp } from "lucide-react";

/** Duas leituras na mesma tela: um periodo escolhido ou os meses lado a lado. */
export default function AbasGestao({ ativa }: { ativa: "periodo" | "meses" }) {
  const abas = [
    { chave: "periodo" as const, rotulo: "Período", href: "/gestao", Icone: CalendarRange },
    { chave: "meses" as const, rotulo: "Mês a mês", href: "/gestao?aba=meses", Icone: TrendingUp },
  ];
  return (
    <nav className="flex gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:inline-flex">
      {abas.map(({ chave, rotulo, href, Icone }) => (
        <Link
          key={chave}
          href={href}
          aria-current={ativa === chave ? "page" : undefined}
          className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition sm:flex-none ${
            ativa === chave ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:bg-violet-50 hover:text-violet-700"
          }`}
        >
          <Icone className="size-4" />
          {rotulo}
        </Link>
      ))}
    </nav>
  );
}
