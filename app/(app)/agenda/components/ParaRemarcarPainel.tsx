"use client";

import { useState } from "react";
import { CalendarPlus, ChevronDown, Loader2, MessageCircle, UserX } from "lucide-react";

import { encerrarRemarcacao } from "@/actions/remarcacao.actions";
import type { RemarcacaoPendente } from "@/lib/remarcacao";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type Props = {
  pendentes: RemarcacaoPendente[];
  onAgendar: (pendente: RemarcacaoPendente) => void;
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataCurta(valor: string | null) {
  if (!valor) return "";
  return new Date(valor).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] || nome;
}

export default function ParaRemarcarPainel({ pendentes, onAgendar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [desistindo, setDesistindo] = useState<number | null>(null);
  const [salvando, setSalvando] = useState<number | null>(null);
  const [erro, setErro] = useState("");

  if (pendentes.length === 0) return null;

  const comSinal = pendentes.filter((item) => item.sinalGuardado).length;

  async function desistiu(pendente: RemarcacaoPendente, sinal?: "RETER" | "DEVOLVER") {
    setErro("");
    setSalvando(pendente.id);
    try {
      await encerrarRemarcacao({ agendamentoId: pendente.id, sinal });
      window.location.reload();
    } catch (e) {
      setSalvando(null);
      setErro(e instanceof Error && e.message ? e.message : "Não foi possível salvar.");
    }
  }

  return (
    <section className="mb-3 rounded-2xl border border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-400/20 dark:bg-amber-500/10">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-amber-900 dark:text-amber-100">
            Para remarcar: {pendentes.length} cliente{pendentes.length === 1 ? "" : "s"}
          </span>
          <span className="block text-xs text-amber-800/80 dark:text-amber-200/80">
            Desmarcaram e ainda não têm nova data
            {comSinal > 0 ? ` · ${comSinal} com sinal guardado` : ""}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-amber-700 transition ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto ? (
        <ul className="space-y-2 border-t border-amber-200 px-3 py-3 dark:border-amber-400/20">
          {pendentes.map((pendente) => {
            const whatsapp = pendente.telefone
              ? buildWhatsAppUrl(
                  pendente.telefone,
                  `Oi, ${primeiroNome(pendente.clienteNome)}! Tudo bem? Vamos remarcar o seu horário de ${pendente.procedimento}? Me diga o melhor dia para você.`,
                )
              : null;

            return (
              <li
                key={pendente.id}
                className="rounded-xl border border-amber-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-bold text-slate-900 dark:text-white">{pendente.clienteNome}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {pendente.procedimento}
                      {pendente.naturezaAtendimento === "RETORNO" ? " (retorno)" : ""} · era {dataCurta(pendente.data)}
                      {pendente.status === "Faltou" ? " · faltou" : ` · desmarcou ${dataCurta(pendente.desmarcadoEm)}`}
                    </p>
                  </div>
                  {pendente.sinalGuardado ? (
                    <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      Sinal guardado {moeda(pendente.valorSinal)}
                    </span>
                  ) : null}
                </div>

                {desistindo === pendente.id ? (
                  <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-700 dark:bg-white/[0.06] dark:text-slate-200">
                    {pendente.sinalGuardado ? (
                      <>
                        <p className="font-semibold">Ela desistiu. E o sinal de {moeda(pendente.valorSinal)}?</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" onClick={() => desistiu(pendente, "RETER")} disabled={salvando !== null} className="h-9 rounded-lg bg-slate-800 px-3 font-semibold text-white disabled:opacity-50">
                            Ficar com o sinal
                          </button>
                          <button type="button" onClick={() => desistiu(pendente, "DEVOLVER")} disabled={salvando !== null} className="h-9 rounded-lg border border-slate-300 bg-white px-3 font-semibold disabled:opacity-50">
                            Devolver o sinal
                          </button>
                          <button type="button" onClick={() => setDesistindo(null)} disabled={salvando !== null} className="h-9 px-2 font-semibold text-slate-500">
                            Voltar
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">Tirar da lista?</span>
                        <button type="button" onClick={() => desistiu(pendente)} disabled={salvando !== null} className="h-9 rounded-lg bg-slate-800 px-3 font-semibold text-white disabled:opacity-50">
                          Sim, desistiu
                        </button>
                        <button type="button" onClick={() => setDesistindo(null)} disabled={salvando !== null} className="h-9 px-2 font-semibold text-slate-500">
                          Voltar
                        </button>
                      </div>
                    )}
                    {salvando === pendente.id ? <Loader2 size={14} className="mt-2 animate-spin" /> : null}
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => onAgendar(pendente)}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-2 text-xs font-bold text-white hover:bg-violet-700"
                    >
                      <CalendarPlus size={14} /> Agendar
                    </button>
                    {whatsapp ? (
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs font-bold text-emerald-700"
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={() => setDesistindo(pendente.id)}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-transparent dark:text-slate-300"
                    >
                      <UserX size={14} /> Desistiu
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
