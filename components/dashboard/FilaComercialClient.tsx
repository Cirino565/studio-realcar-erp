"use client";

import { confirmarAgendamentoCentral } from "@/actions/dashboard.actions";
import { registrarResultadoContatoLead } from "@/actions/marketing.actions";
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
  | "Agendamento sem confirmação"
  | "Aguardando resposta parada"
  | "Sem próxima ação";

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
  confirmacoes: number;
  negociacoes: number;
  semProximaAcao: number;
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

function dataFuturaEmDiasInput(dias: number) {
  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const base = new Date(`${hoje}T12:00:00-03:00`);
  const alvo = new Date(base.getTime() + dias * 24 * 60 * 60 * 1000);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(alvo);
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
    case "Agendamento sem confirmação":
      return {
        badge: "border-violet-200 bg-violet-50 text-violet-700",
        detalhe: "text-violet-700",
      };
    case "Aguardando resposta parada":
      return {
        badge: "border-cyan-200 bg-cyan-50 text-cyan-800",
        detalhe: "text-cyan-800",
      };
    case "Sem próxima ação":
      return {
        badge: "border-blue-200 bg-blue-50 text-blue-800",
        detalhe: "text-blue-800",
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

  function registrarResultado(
    item: FilaComercialItem,
    resultado:
      | "nao_respondeu"
      | "amanha"
      | "dois_dias"
      | "tres_dias",
  ) {
    const configuracoes = {
      nao_respondeu: {
        dias: 1,
        houveResposta: false,
        descricao:
          "Cliente não respondeu ao contato realizado pela Central do Dia.",
      },
      amanha: {
        dias: 1,
        houveResposta: true,
        descricao:
          "Contato realizado. Novo retorno programado para amanhã.",
      },
      dois_dias: {
        dias: 2,
        houveResposta: true,
        descricao:
          "Contato realizado. Novo retorno programado para daqui a 2 dias.",
      },
      tres_dias: {
        dias: 3,
        houveResposta: true,
        descricao:
          "Contato realizado. Novo retorno programado para daqui a 3 dias.",
      },
    } as const;

    const configuracao = configuracoes[resultado];
    setErro(null);

    startTransition(async () => {
      try {
        await registrarResultadoContatoLead({
          leadId: item.id,
          resultado: configuracao.descricao,
          proximoContato: dataFuturaEmDiasInput(configuracao.dias),
          houveResposta: configuracao.houveResposta,
        });

        // Esconde imediatamente depois do salvamento. Diferente do antigo
        // "Contato feito", agora a proxima data tambem fica gravada no banco,
        // por isso o card continua fora da fila apos atualizar a pagina.
        setProcessados((atuais) => [...atuais, item.id]);
        router.refresh();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível registrar o resultado do contato.",
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
      label: "Agendamentos a confirmar",
      valor: resumo.confirmacoes,
      className: "border-violet-100 bg-violet-50/70 text-violet-700",
    },
    {
      label: "Negociações paradas",
      valor: resumo.negociacoes,
      className: "border-cyan-100 bg-cyan-50/70 text-cyan-800",
    },
    {
      label: "Sem próxima ação",
      valor: resumo.semProximaAcao,
      className: "border-blue-100 bg-blue-50/70 text-blue-800",
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
        <p className="text-[11px] font-medium text-slate-500">
          A fila respeita o próximo contato programado. Quando você registra o resultado, o lead só volta na data escolhida.
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
                  ) : (
                    <Link
                      href="/marketing"
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                    >
                      Abrir CRM
                    </Link>
                  )}
                </div>

                {!podeConfirmar && podeGerenciarMarketing ? (
                  <div className="mt-2">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      Depois do contato
                    </p>

                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => registrarResultado(item, "nao_respondeu")}
                        className="min-h-9 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Não respondeu
                      </button>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => registrarResultado(item, "amanha")}
                        className="min-h-9 rounded-xl border border-blue-200 bg-blue-50 px-2 py-2 text-[11px] font-bold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Amanhã
                      </button>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => registrarResultado(item, "dois_dias")}
                        className="min-h-9 rounded-xl border border-violet-200 bg-violet-50 px-2 py-2 text-[11px] font-bold text-violet-800 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        +2 dias
                      </button>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => registrarResultado(item, "tres_dias")}
                        className="min-h-9 rounded-xl border border-cyan-200 bg-cyan-50 px-2 py-2 text-[11px] font-bold text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        +3 dias
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-2 grid grid-cols-2 gap-2">
                  {podeConfirmar ? (
                    <Link
                      href="/marketing"
                      className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:text-blue-700"
                    >
                      Abrir CRM
                    </Link>
                  ) : (
                    <div className="flex min-h-9 items-center justify-center rounded-xl bg-slate-50 px-3 py-2 text-center text-[11px] font-semibold text-slate-500">
                      Resultado salvo = sai da fila
                    </div>
                  )}

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