"use client";

import { confirmarAgendamentoCentral } from "@/actions/dashboard.actions";
import { registrarContatoLead } from "@/actions/marketing.actions";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type CategoriaFilaComercial =
  | "Follow-up vencido"
  | "Contato de hoje"
  | "Avaliação sem confirmação"
  | "Negociação parada"
  | "Prioridade comercial";

type FilaComercialItem = {
  id: number;
  nome: string;
  etapa: string;
  interesse: string | null;
  valorPrevisto: number;
  categoria: CategoriaFilaComercial;
  detalhe: string;
  whatsappUrl: string;
  agendamentoId: number | null;
  agendaUrl: string | null;
  podeConfirmarAgendamento: boolean;
};

type ResumoFila = {
  atrasados: number;
  hoje: number;
  avaliacoes: number;
  negociacoes: number;
  prioridades: number;
  totalAbertos: number;
};

type Props = {
  itens: FilaComercialItem[];
  resumo: ResumoFila;
  podeGerenciarMarketing: boolean;
  podeGerenciarAgenda: boolean;
};

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function estiloCategoria(categoria: CategoriaFilaComercial) {
  switch (categoria) {
    case "Follow-up vencido":
      return {
        badge: "border-rose-200 bg-rose-50 text-rose-700",
        detalhe: "text-rose-700",
      };
    case "Contato de hoje":
      return {
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        detalhe: "text-amber-700",
      };
    case "Avaliação sem confirmação":
      return {
        badge: "border-violet-200 bg-violet-50 text-violet-700",
        detalhe: "text-violet-700",
      };
    case "Negociação parada":
      return {
        badge: "border-cyan-200 bg-cyan-50 text-cyan-700",
        detalhe: "text-cyan-700",
      };
    default:
      return {
        badge: "border-blue-200 bg-blue-50 text-blue-700",
        detalhe: "text-blue-700",
      };
  }
}

export default function FilaComercialClient({
  itens,
  resumo,
  podeGerenciarMarketing,
  podeGerenciarAgenda,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [processados, setProcessados] = useState<number[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const itensVisiveis = useMemo(
    () => itens.filter((item) => !processados.includes(item.id)),
    [itens, processados],
  );

  function registrarContato(id: number) {
    setErro(null);

    startTransition(async () => {
      try {
        await registrarContatoLead(id, null);
        setProcessados((atuais) => [...atuais, id]);
        router.refresh();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível registrar o contato comercial.",
        );
      }
    });
  }

  function confirmarAvaliacao(item: FilaComercialItem) {
    if (!item.agendamentoId) return;

    setErro(null);
    const agendamentoId = item.agendamentoId;

    startTransition(async () => {
      try {
        await confirmarAgendamentoCentral(agendamentoId);
        setProcessados((atuais) => [...atuais, item.id]);
        router.refresh();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível confirmar a avaliação.",
        );
      }
    });
  }

  const cardsResumo = [
    {
      label: "Follow-ups vencidos",
      valor: resumo.atrasados,
      className: "border-rose-100 bg-rose-50/70 text-rose-700",
    },
    {
      label: "Contatos de hoje",
      valor: resumo.hoje,
      className: "border-amber-100 bg-amber-50/70 text-amber-700",
    },
    {
      label: "Avaliações a confirmar",
      valor: resumo.avaliacoes,
      className: "border-violet-100 bg-violet-50/70 text-violet-700",
    },
    {
      label: "Negociações paradas",
      valor: resumo.negociacoes,
      className: "border-cyan-100 bg-cyan-50/70 text-cyan-700",
    },
    {
      label: "Prioridades comerciais",
      valor: resumo.prioridades,
      className: "border-blue-100 bg-blue-50/70 text-blue-700",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {cardsResumo.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-3 ${card.className}`}
          >
            <p className="text-2xl font-bold tracking-tight">{card.valor}</p>
            <p className="mt-0.5 text-[11px] font-bold leading-4">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Target className="size-4 text-blue-600" />
          <span>
            <strong className="text-slate-900">{resumo.totalAbertos}</strong> oportunidade(s) aberta(s) no CRM.
          </span>
        </div>
        <p className="text-[11px] font-medium text-slate-400">
          Negociação parada = 3 ou mais dias sem contato comercial registrado.
        </p>
      </div>

      {erro ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {erro}
        </div>
      ) : null}

      {itensVisiveis.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {itensVisiveis.map((item) => {
            const estilo = estiloCategoria(item.categoria);
            const podeConfirmar =
              item.podeConfirmarAgendamento &&
              Boolean(item.agendamentoId) &&
              podeGerenciarAgenda;

            return (
              <article
                key={`${item.categoria}-${item.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-950">{item.nome}</p>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {item.interesse || "Interesse não informado"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${estilo.badge}`}
                  >
                    {item.categoria}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">
                    {item.etapa}
                  </span>
                  {item.valorPrevisto > 0 ? (
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700">
                      {formatarMoeda(item.valorPrevisto)}
                    </span>
                  ) : null}
                </div>

                <div className={`mt-3 flex items-start gap-2 text-xs font-semibold leading-5 ${estilo.detalhe}`}>
                  <Clock3 className="mt-0.5 size-3.5 shrink-0" />
                  <span>{item.detalhe}</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <WhatsAppLink
                    href={item.whatsappUrl}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </WhatsAppLink>

                  {podeConfirmar ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => confirmarAvaliacao(item)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <BadgeCheck className="size-4" />
                      Confirmou
                    </button>
                  ) : podeGerenciarMarketing ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => registrarContato(item.id)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <CheckCircle2 className="size-4" />
                      Contato feito
                    </button>
                  ) : (
                    <div className="flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] font-semibold text-slate-500">
                      Somente consulta
                    </div>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link
                    href="/marketing"
                    className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:text-blue-700"
                  >
                    Abrir CRM
                  </Link>

                  {item.agendaUrl ? (
                    <Link
                      href={item.agendaUrl}
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-violet-200 hover:text-violet-700"
                    >
                      <CalendarDays className="size-3.5" />
                      Agenda
                    </Link>
                  ) : (
                    <div className="flex min-h-9 items-center justify-center rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-400">
                      Sem agenda vinculada
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-6 text-center">
          <CheckCircle2 className="mx-auto size-7 text-emerald-600" />
          <p className="mt-2 text-sm font-bold text-emerald-900">
            Nenhuma ação comercial prioritária pendente nesta fila.
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            Novos follow-ups e mudanças do CRM aparecerão aqui automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}
