"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";

import { formatarMoeda } from "@/lib/format";

export type PacoteParaAviso = {
  id: number;
  descricao: string;
  valorTotal: number;
  valorPago: number;
};

type Props = {
  pacotes: PacoteParaAviso[];
  /** Para onde o botao leva. Use "#pacotes" quando ja estiver na ficha. */
  href: string;
  /** Chamado ao tocar no botao (ex.: fechar a janela da agenda). */
  onAbrir?: () => void;
};

// Aviso "pacote com saldo a cobrar". Aparece na ficha da cliente e nos
// detalhes do agendamento, para quem atende ver na hora quanto ja foi pago e
// quanto falta cobrar - sem precisar procurar na aba Pacotes.
export default function AvisoPacoteAberto({ pacotes, href, onAbrir }: Props) {
  const abertos = pacotes.filter(
    (pacote) => pacote.valorTotal - pacote.valorPago > 0.004,
  );

  if (abertos.length === 0) return null;

  return (
    <div className="space-y-2">
      {abertos.map((pacote) => {
        const falta = Math.max(pacote.valorTotal - pacote.valorPago, 0);

        return (
          <div
            key={pacote.id}
            className="rounded-2xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-400/30 dark:bg-amber-500/10"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
                <Wallet className="size-[18px]" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                  Pacote com valor a cobrar
                </p>
                <p className="mt-0.5 break-words text-sm font-bold text-amber-950 dark:text-amber-50">
                  {pacote.descricao}
                </p>
                <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">
                  Pago {formatarMoeda(pacote.valorPago)} de{" "}
                  {formatarMoeda(pacote.valorTotal)}.{" "}
                  <strong className="font-extrabold">
                    Falta cobrar {formatarMoeda(falta)}
                  </strong>
                </p>

                <Link
                  href={href}
                  onClick={onAbrir}
                  className="mt-2 inline-flex min-h-9 items-center rounded-xl bg-amber-300 px-3 text-xs font-bold text-amber-950 shadow-sm ring-1 ring-amber-500/40 transition hover:bg-amber-400 dark:bg-amber-500/25 dark:text-amber-100 dark:ring-amber-300/40 dark:hover:bg-amber-500/40"
                >
                  Registrar pagamento
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
