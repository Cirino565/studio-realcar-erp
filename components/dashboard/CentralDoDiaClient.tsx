"use client";

import { confirmarAgendamentoCentral } from "@/actions/dashboard.actions";
import { WhatsAppEnviado } from "@/components/ui/whatsapp-enviado";
import { BadgeCheck, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ConfirmacaoItem = {
  id: number;
  clienteId: number;
  telefone: string | null;
  /** A mensagem de confirmacao ja foi aberta no WhatsApp. */
  enviada: boolean;
  cliente: string;
  procedimento: string;
  horario: string;
  profissional: string | null;
  whatsappUrl: string;
};

type Props = {
  confirmacoes: ConfirmacaoItem[];
  // "amanhã" ou "segunda (26/10)" quando domingo/feriado ficam no meio.
  rotuloDia?: string;
  podeGerenciarAgenda: boolean;
};

export default function CentralDoDiaClient({
  confirmacoes,
  rotuloDia = "amanhã",
  podeGerenciarAgenda,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmados, setConfirmados] = useState<number[]>([]);
  const [enviadasAgora, setEnviadasAgora] = useState<number[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const pendentes = confirmacoes.filter((item) => !confirmados.includes(item.id));

  function confirmar(id: number) {
    setErro(null);

    startTransition(async () => {
      try {
        await confirmarAgendamentoCentral(id);
        setConfirmados((atuais) => [...atuais, id]);
        router.refresh();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível confirmar o atendimento.",
        );
      }
    });
  }

  if (pendentes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-5 text-center">
        <BadgeCheck className="mx-auto size-6 text-emerald-600" />
        <p className="mt-2 text-sm font-semibold text-emerald-900">
          Nenhuma confirmação pendente para {rotuloDia}.
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          A agenda de {rotuloDia} está sem atendimentos aguardando confirmação.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {erro ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {erro}
        </div>
      ) : null}

      {pendentes.map((item) => {
        const enviada = item.enviada || enviadasAgora.includes(item.id);
        return (
        <div
          key={item.id}
          className={`rounded-2xl border p-3 shadow-sm ${enviada ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">
                {item.cliente}
              </p>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {item.procedimento}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className="rounded-lg bg-violet-50 px-2 py-1 text-violet-700">
                  {item.horario}
                </span>
                {item.profissional ? (
                  <span className="rounded-lg bg-slate-100 px-2 py-1">
                    {item.profissional}
                  </span>
                ) : null}
              </div>
            </div>

            {enviada ? (
              <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                Aguardando resposta
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Pendente
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <WhatsAppEnviado
              href={item.whatsappUrl}
              enviadaInicial={item.enviada}
              onEnviada={() => setEnviadasAgora((atuais) => [...atuais, item.id])}
              registro={{
                categoria: "Confirmação de agendamento",
                clienteId: item.clienteId,
                agendamentoId: item.id,
                destinatarioNome: item.cliente,
                telefone: item.telefone,
              }}
              rotuloEnviada="Já enviada"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
              classNameEnviada="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-300"
            >
              <MessageCircle className="size-4" />
              WhatsApp
            </WhatsAppEnviado>

            {podeGerenciarAgenda ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => confirmar(item.id)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <BadgeCheck className="size-4" />
                Confirmou
              </button>
            ) : (
              <div className="flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] font-semibold text-slate-500">
                Sem permissão para alterar
              </div>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}
