"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Link2, Loader2, MousePointerClick, X } from "lucide-react";

import {
  confirmarVinculoClique,
  definirPrimeiraMensagem,
  juntarLeadsDoMesmoClique,
  recusarSugestaoClique,
} from "@/actions/vinculo-clique.actions";
import type { VinculoDoLead } from "@/lib/vinculo-clique";

type Props = {
  leadId: number;
  vinculo: VinculoDoLead | null | undefined;
  podeGerenciar: boolean;
  onAtualizado?: () => void;
};

function hora(valor: string) {
  return new Date(valor).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function diaHora(valor: string) {
  return new Date(valor).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

/** "2026-10-20T12:25" no horario de Brasilia, para o campo de data e hora. */
function paraCampo(valor: string | null) {
  const data = valor ? new Date(valor) : new Date();
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);
  const parte = (tipo: string) => partes.find((item) => item.type === tipo)?.value ?? "00";
  return `${parte("year")}-${parte("month")}-${parte("day")}T${parte("hour")}:${parte("minute")}`;
}

export default function VinculoCliquePainel({ leadId, vinculo, podeGerenciar, onAtualizado }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const [editandoHora, setEditandoHora] = useState(false);
  const [horaMensagem, setHoraMensagem] = useState(() => paraCampo(vinculo?.referenciaEm ?? null));

  if (!vinculo || (!vinculo.elegivel && vinculo.mesmoClique.length === 0)) return null;
  const sugestao = vinculo.sugestao;

  function executar(acao: () => Promise<unknown>) {
    setErro("");
    iniciar(async () => {
      try {
        await acao();
        setEditandoHora(false);
        onAtualizado?.();
        router.refresh();
      } catch (e) {
        setErro(e instanceof Error && e.message ? e.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {vinculo.mesmoClique.length > 0 ? (
        <section className="rounded-3xl border border-violet-300/25 bg-violet-400/10 p-4 text-sm text-violet-100">
          <h4 className="flex items-center gap-2 font-semibold text-white">
            <MousePointerClick className="size-4" />
            Mesmo clique do anúncio
          </h4>
          <p className="mt-1 leading-6">
            A mesma pessoa clicou em mais de um botão da página (o Google mandou o mesmo código de clique). É uma pessoa só.
          </p>
          <ul className="mt-2 space-y-2">
            {vinculo.mesmoClique.map((outro) => (
              <li key={outro.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-black/10 px-3 py-2">
                <span className="min-w-0 break-words">
                  {outro.codigo || "sem código"} · {outro.nome}
                </span>
                {podeGerenciar ? (
                  <button
                    type="button"
                    disabled={pendente}
                    onClick={() => executar(() => juntarLeadsDoMesmoClique({ leadId, outroId: outro.id }))}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {pendente ? <Loader2 className="size-3.5 animate-spin" /> : <Link2 className="size-3.5" />}
                    Juntar num lead só
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {vinculo.elegivel ? (
        <section
          className={`rounded-3xl border p-4 text-sm ${
            sugestao
              ? "border-amber-300/25 bg-amber-400/10 text-amber-100"
              : "border-white/[0.10] bg-white/[0.04] text-slate-300"
          }`}
        >
          {sugestao ? (
            <>
              <h4 className="flex items-center gap-2 font-semibold text-white">
                <MousePointerClick className="size-4 text-amber-300" />
                Provável Google Ads{sugestao.campanhaNome ? ` · campanha ${sugestao.campanhaNome}` : ""}
              </h4>
              <p className="mt-1 leading-6">
                Clique às <strong>{hora(sugestao.cliqueEm)}</strong>
                {sugestao.minutosAntes > 0
                  ? `, ${sugestao.minutosAntes} min antes da 1ª mensagem`
                  : ", praticamente junto com a 1ª mensagem"}
                {sugestao.servico ? ` · botão de ${sugestao.servico}` : ""}
                {sugestao.mesmoServico ? " · mesmo serviço" : ""}. A pessoa chegou sem o código {sugestao.codigo}.
              </p>
              <p className="mt-1 text-xs opacity-80">
                É um palpite pelo horário. Confirme só se fizer sentido (ex.: ela falou do serviço do anúncio).
              </p>
              {podeGerenciar ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pendente}
                    onClick={() => executar(() => confirmarVinculoClique({ contatoId: leadId, cliqueId: sugestao.cliqueId }))}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
                  >
                    {pendente ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
                    Confirmar: veio deste clique
                  </button>
                  <button
                    type="button"
                    disabled={pendente}
                    onClick={() => executar(() => recusarSugestaoClique(leadId))}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/20 px-3 text-xs font-semibold hover:bg-white/10 disabled:opacity-50"
                  >
                    <X className="size-4" />
                    Não é ela
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="flex items-start gap-2 leading-6">
              <MousePointerClick className="mt-1 size-4 shrink-0 opacity-70" />
              <span>
                Chegou sem código. Nenhum clique do Google sem dono nos 30 min antes da 1ª mensagem
                {vinculo.referenciaEm ? ` (${diaHora(vinculo.referenciaEm)})` : ""}.
              </span>
            </p>
          )}

          {podeGerenciar ? (
            editandoHora ? (
              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-white/10 pt-3">
                <label className="grid gap-1 text-xs font-semibold">
                  Hora da 1ª mensagem no WhatsApp
                  <input
                    type="datetime-local"
                    value={horaMensagem}
                    onChange={(evento) => setHoraMensagem(evento.target.value)}
                    className="premium-input h-10 bg-[#1d2437] px-3 text-sm"
                  />
                </label>
                <button
                  type="button"
                  disabled={pendente || !horaMensagem}
                  onClick={() => executar(() => definirPrimeiraMensagem({ contatoId: leadId, quando: horaMensagem }))}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white disabled:opacity-50"
                >
                  {pendente ? <Loader2 className="size-4 animate-spin" /> : null}
                  Procurar de novo
                </button>
                <button type="button" onClick={() => setEditandoHora(false)} className="h-10 px-2 text-xs font-semibold opacity-80">
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditandoHora(true)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold underline-offset-2 opacity-80 hover:underline"
              >
                <Clock3 className="size-3.5" />
                Cadastrou bem depois da mensagem? Informe a hora em que ela chegou
              </button>
            )
          ) : null}
        </section>
      ) : null}

      {erro ? (
        <p className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-100">{erro}</p>
      ) : null}
    </div>
  );
}
