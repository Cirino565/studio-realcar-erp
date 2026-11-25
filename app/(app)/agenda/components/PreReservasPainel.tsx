"use client";

import { useState } from "react";
import { CalendarCheck2, CalendarX2, ChevronDown, Loader2, MessageCircle } from "lucide-react";

import { confirmarPreReserva } from "@/actions/pre-reserva.actions";
import { desmarcarAgendamento } from "@/actions/remarcacao.actions";
import { mensagemErroAcao } from "@/lib/erro-acao";
import { dataParaMensagem, mensagemPreReserva, type PreReservaParaConfirmar } from "@/lib/pre-reserva";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type Props = {
  itens: PreReservaParaConfirmar[];
  modelo: string | null;
  clinica: string;
  onAbrir: (agendamentoId: number) => void;
};

/**
 * Pre-reservas dos proximos 7 dias que a cliente ainda nao confirmou.
 * Mensagem pronta no WhatsApp; "Confirmou" vira agendamento normal;
 * "Liberar" solta o horario e manda a cliente para "Para remarcar".
 */
export default function PreReservasPainel({ itens, modelo, clinica, onAbrir }: Props) {
  const urgentes = itens.filter((item) => item.urgente).length;
  const [aberto, setAberto] = useState(urgentes > 0);
  const [liberando, setLiberando] = useState<number | null>(null);
  const [salvando, setSalvando] = useState<number | null>(null);
  const [erro, setErro] = useState("");

  if (itens.length === 0) return null;

  async function executar(id: number, acao: () => Promise<unknown>) {
    setErro("");
    setSalvando(id);
    try {
      await acao();
      window.location.reload();
    } catch (e) {
      setSalvando(null);
      setErro(mensagemErroAcao(e, "Não foi possível salvar. Tente de novo."));
    }
  }

  return (
    <section
      className={`mb-2 rounded-2xl border shadow-sm sm:mb-3 ${
        urgentes > 0
          ? "border-rose-200 bg-rose-50/80 dark:border-rose-400/20 dark:bg-rose-500/10"
          : "border-sky-200 bg-sky-50/80 dark:border-sky-400/20 dark:bg-sky-500/10"
      }`}
    >
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left sm:px-4 sm:py-3"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-900 dark:text-white">
            Pré-reservas para confirmar: {itens.length}
          </span>
          <span className={`block text-xs ${urgentes > 0 ? "font-semibold text-rose-700 dark:text-rose-200" : "text-slate-600 dark:text-slate-300"}`}>
            {urgentes > 0
              ? `${urgentes} sem resposta e faltam 2 dias ou menos`
              : "Próximos 7 dias · mande a mensagem e marque a resposta"}
          </span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-slate-500 transition ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto ? (
        <ul className="space-y-2 border-t border-slate-200/70 px-3 py-3 dark:border-white/10">
          {itens.map((item) => {
            const quando = dataParaMensagem(item.data);
            const whatsapp = buildWhatsAppUrl(item.telefone, mensagemPreReserva(modelo, item, clinica));
            const ocupado = salvando !== null;

            return (
              <li
                key={item.id}
                className={`rounded-xl border bg-white px-3 py-2 text-sm dark:bg-slate-900 ${
                  item.urgente ? "border-rose-300 dark:border-rose-400/40" : "border-slate-200 dark:border-white/10"
                }`}
              >
                <button type="button" onClick={() => onAbrir(item.id)} className="block w-full min-w-0 text-left">
                  <p className="break-words font-bold text-slate-900 dark:text-white">{item.clienteNome}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {quando.diaSemana.replace("-feira", "")}, {quando.data} às {quando.horario} · {item.procedimento}
                    {item.retorno ? " (retorno)" : ""}
                  </p>
                  {item.urgente ? (
                    <p className="mt-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-200">Ainda sem resposta</p>
                  ) : null}
                </button>

                {liberando === item.id ? (
                  <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-700 dark:bg-white/[0.06] dark:text-slate-200">
                    <p className="font-semibold">Liberar o horário? Ela vai para a lista &quot;Para remarcar&quot;.</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() =>
                          executar(item.id, () =>
                            desmarcarAgendamento({
                              agendamentoId: item.id,
                              tipo: "CANCELOU",
                              vaiRemarcar: true,
                              sinal: null,
                              observacao: "Pré-reserva não confirmada.",
                            }),
                          )
                        }
                        className="h-9 rounded-lg bg-rose-600 px-3 font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        Sim, liberar
                      </button>
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => setLiberando(null)}
                        className="h-9 px-2 font-semibold text-slate-500"
                      >
                        Voltar
                      </button>
                      {salvando === item.id ? <Loader2 size={14} className="animate-spin" /> : null}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs font-bold text-emerald-700"
                    >
                      <MessageCircle size={14} /> Mensagem
                    </a>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => executar(item.id, () => confirmarPreReserva(item.id))}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {salvando === item.id ? <Loader2 size={14} className="animate-spin" /> : <CalendarCheck2 size={14} />}
                      Confirmou
                    </button>
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => setLiberando(item.id)}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-slate-300"
                    >
                      <CalendarX2 size={14} /> Liberar
                    </button>
                  </div>
                )}
              </li>
            );
          })}
          {erro ? <li className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{erro}</li> : null}
        </ul>
      ) : null}
    </section>
  );
}
