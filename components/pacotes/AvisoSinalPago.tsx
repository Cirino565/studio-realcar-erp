import { BadgeCheck } from "lucide-react";

import { formatarMoeda } from "@/lib/format";

type Props = {
  /** Valor do sinal registrado. 0 = sinal antigo, sem valor. */
  valorSinal: number;
  /** Na finalizacao: quanto falta cobrar agora (ja descontado o sinal). */
  cobrarAgora?: number;
};

// Faixa "sinal ja foi pago", para quem atende ver na hora que nao deve
// cobrar o valor cheio. Aparece nos detalhes do agendamento e na finalizacao.
export default function AvisoSinalPago({ valorSinal, cobrarAgora }: Props) {
  const temValor = valorSinal > 0;

  return (
    <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-400/30 dark:bg-emerald-500/10">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-200 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200">
          <BadgeCheck className="size-[18px]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
            Sinal já pago
          </p>

          {temValor ? (
            <>
              <p className="mt-0.5 text-sm font-bold text-emerald-950 dark:text-emerald-50">
                {formatarMoeda(valorSinal)} já recebidos
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-900 dark:text-emerald-100">
                {cobrarAgora !== undefined ? (
                  <>
                    Cobrar agora:{" "}
                    <strong className="font-extrabold">
                      {formatarMoeda(cobrarAgora)}
                    </strong>
                    . O sinal já está no Financeiro e é descontado do total.
                  </>
                ) : (
                  "Já está no Financeiro. Ao finalizar, o sistema desconta do total e cobra só o restante."
                )}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs leading-5 text-emerald-900 dark:text-emerald-100">
              Sinal marcado como pago, sem valor registrado. Confira quanto foi
              e desconte na hora de cobrar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
