"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Link2,
  Loader2,
  Repeat2,
} from "lucide-react";

import {
  confirmarSubstituirBlocos,
  ligarCampanhaGoogleAds,
  previaSubstituirBlocos,
} from "@/actions/gasto-google-ads.actions";
import type { PreviaSubstituicao } from "@/lib/gasto-google-ads";

export type CampanhaGoogle = {
  googleCampanhaId: string;
  nome: string;
  primeiroDia: string;
  ultimoDia: string;
  total: number;
  ultimos30: number;
};

export type CampanhaSistema = {
  id: number;
  nome: string;
  canal: string;
  status: string;
  googleAdsCampanhaId: string | null;
  gastoAutomaticoDesde: string | null;
  ultimoManualDia: string | null;
  manuaisAntes: { quantidade: number; total: number };
  manuaisDepois: { quantidade: number; total: number };
  automaticos: { quantidade: number; total: number };
};

type Props = {
  campanhasGoogle: CampanhaGoogle[];
  campanhasSistema: CampanhaSistema[];
  endereco: string;
  ultimoRecebimento: { ok: boolean; detalhes: string | null; data: string } | null;
  hoje: string;
  podeGerenciar: boolean;
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dia(valor: string | null) {
  if (!valor) return "-";
  const [ano, mes, d] = valor.split("-");
  return `${d}/${mes}/${ano}`;
}

function proximoDia(valor: string) {
  const [ano, mes, d] = valor.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, d + 1)).toISOString().slice(0, 10);
}

function dataHora(valor: string) {
  return new Date(valor).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function mensagemErro(erro: unknown, padrao: string) {
  return erro instanceof Error && erro.message ? erro.message : padrao;
}

const cartao =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-6";

export default function GastoGoogleAdsPainel({
  campanhasGoogle,
  campanhasSistema,
  endereco,
  ultimoRecebimento,
  hoje,
  podeGerenciar,
}: Props) {
  return (
    <div className="app-mobile-safe space-y-4 pb-6 sm:space-y-6 sm:pb-0">
      <section className={cartao}>
        <Link
          href="/marketing"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-700 dark:text-slate-400"
        >
          <ArrowLeft size={14} /> Voltar para Marketing
        </Link>
        <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Gasto diário do Google Ads
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Todo dia o Google Ads manda quanto cada campanha gastou em cada dia. O sistema lança sozinho no
          Financeiro uma saída paga por dia, na data certa, saindo da conta principal. Assim &ldquo;últimos 7
          dias&rdquo; e &ldquo;últimos 30 dias&rdquo; mostram o gasto do dia em que ele aconteceu.
        </p>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
          {ultimoRecebimento ? (
            <p
              className={
                ultimoRecebimento.ok ? "text-slate-700 dark:text-slate-200" : "font-semibold text-rose-700"
              }
            >
              {ultimoRecebimento.ok ? "Último envio do Google Ads: " : "O último envio FALHOU: "}
              {dataHora(ultimoRecebimento.data)}.{" "}
              <span className="text-xs text-slate-500 dark:text-slate-400">{ultimoRecebimento.detalhes}</span>
            </p>
          ) : (
            <p className="font-semibold text-amber-700 dark:text-amber-300">
              O Google Ads ainda não mandou nenhum gasto. Falta colar e agendar o script no Google Ads.
            </p>
          )}
          <p className="mt-2 break-all text-xs text-slate-500 dark:text-slate-400">
            Endereço que o script usa: <span className="font-mono">{endereco}</span> · senha: a mesma da
            exportação de conversões (MARKETING_EXPORT_SECRET).
          </p>
        </div>
      </section>

      {campanhasGoogle.length === 0 ? null : (
        <section className={cartao}>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Campanhas do Google Ads</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Ligue cada campanha do Google à campanha certa do sistema e escolha a partir de que dia o gasto entra
            sozinho. Use o dia seguinte ao último custo que você lançou à mão, para não somar duas vezes.
          </p>
          <div className="mt-4 space-y-4">
            {campanhasGoogle.map((google) => (
              <CartaoCampanhaGoogle
                key={google.googleCampanhaId}
                google={google}
                campanhasSistema={campanhasSistema}
                hoje={hoje}
                podeGerenciar={podeGerenciar}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CartaoCampanhaGoogle({
  google,
  campanhasSistema,
  hoje,
  podeGerenciar,
}: {
  google: CampanhaGoogle;
  campanhasSistema: CampanhaSistema[];
  hoje: string;
  podeGerenciar: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const ligada = campanhasSistema.find((item) => item.googleAdsCampanhaId === google.googleCampanhaId) ?? null;

  const [campanhaId, setCampanhaId] = useState<string>(ligada ? String(ligada.id) : "");
  const [desde, setDesde] = useState<string>(
    ligada?.gastoAutomaticoDesde ?? sugerirInicio(null, google),
  );
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  function sugerirInicio(campanha: CampanhaSistema | null, campanhaGoogle: CampanhaGoogle) {
    if (campanha?.gastoAutomaticoDesde) return campanha.gastoAutomaticoDesde;
    if (campanha?.ultimoManualDia) {
      const seguinte = proximoDia(campanha.ultimoManualDia);
      return seguinte > hoje ? hoje : seguinte;
    }
    return campanhaGoogle.primeiroDia;
  }

  function escolherCampanha(valor: string) {
    setCampanhaId(valor);
    setMensagem(null);
    const campanha = campanhasSistema.find((item) => String(item.id) === valor) ?? null;
    setDesde(sugerirInicio(campanha, google));
  }

  function salvar() {
    setMensagem(null);
    iniciar(async () => {
      try {
        const resultado = await ligarCampanhaGoogleAds({
          googleCampanhaId: google.googleCampanhaId,
          campanhaId: campanhaId ? Number(campanhaId) : null,
          desde,
        });
        setMensagem({
          tipo: resultado.semConta ? "erro" : "ok",
          texto: resultado.semConta
            ? "Salvo, mas não há conta financeira principal ativa: nada foi lançado. Marque uma conta como principal no Financeiro."
            : campanhaId
              ? `Salvo. Lançamentos: ${resultado.criados} novo(s), ${resultado.atualizados} atualizado(s), ${resultado.removidos} removido(s).`
              : "Campanha desligada. O que já foi lançado continua no Financeiro.",
        });
        router.refresh();
      } catch (erro) {
        setMensagem({ tipo: "erro", texto: mensagemErro(erro, "Não foi possível salvar.") });
      }
    });
  }

  // Campanha escolhida agora (ainda nao salva), para mostrar a dica do dia de inicio.
  const escolhidaNova =
    campanhaId && String(ligada?.id ?? "") !== campanhaId
      ? (campanhasSistema.find((item) => String(item.id) === campanhaId) ?? null)
      : null;

  const mudou =
    campanhaId !== (ligada ? String(ligada.id) : "") ||
    (Boolean(campanhaId) && desde !== (ligada?.gastoAutomaticoDesde ?? ""));

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-bold text-slate-900 dark:text-white">{google.nome}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Dados de {dia(google.primeiroDia)} a {dia(google.ultimoDia)} · nº {google.googleCampanhaId}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-bold text-slate-900 dark:text-white">{moeda(google.ultimos30)}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">gasto nos últimos 30 dias</p>
        </div>
      </div>

      {podeGerenciar ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Campanha do sistema
            <select
              value={campanhaId}
              onChange={(evento) => escolherCampanha(evento.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            >
              <option value="">Não ligar (não lança nada)</option>
              {campanhasSistema.map((campanha) => (
                <option key={campanha.id} value={campanha.id}>
                  {campanha.nome}
                  {campanha.status !== "Ativa" ? ` (${campanha.status})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Lançar sozinho a partir de
            <input
              type="date"
              value={desde}
              onChange={(evento) => setDesde(evento.target.value)}
              disabled={!campanhaId}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <button
            type="button"
            onClick={salvar}
            disabled={pendente || !mudou || (Boolean(campanhaId) && !desde)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
          >
            {pendente ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
            Salvar
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {ligada ? `Ligada a: ${ligada.nome}` : "Ainda não ligada a nenhuma campanha do sistema."}
        </p>
      )}

      {escolhidaNova?.ultimoManualDia ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Último custo lançado à mão nessa campanha: {dia(escolhidaNova.ultimoManualDia)}. Por isso a sugestão é
          começar em {dia(proximoDia(escolhidaNova.ultimoManualDia))}.
        </p>
      ) : null}

      {mensagem ? (
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${
            mensagem.tipo === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"
          }`}
        >
          {mensagem.texto}
        </p>
      ) : null}

      {ligada ? <SituacaoLigada campanha={ligada} podeGerenciar={podeGerenciar} /> : null}
    </article>
  );
}

function SituacaoLigada({ campanha, podeGerenciar }: { campanha: CampanhaSistema; podeGerenciar: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [previa, setPrevia] = useState<PreviaSubstituicao | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  function verPrevia() {
    setMensagem(null);
    iniciar(async () => {
      try {
        setPrevia(await previaSubstituirBlocos(campanha.id));
      } catch (erro) {
        setMensagem({ tipo: "erro", texto: mensagemErro(erro, "Não foi possível montar a prévia.") });
      }
    });
  }

  function confirmar() {
    setMensagem(null);
    iniciar(async () => {
      try {
        const resultado = await confirmarSubstituirBlocos(campanha.id);
        setPrevia(null);
        setMensagem({
          tipo: "ok",
          texto: `Pronto: ${resultado.substituidos} lançamento(s) manual(is) trocado(s) por ${resultado.criados} lançamento(s) por dia, somando os mesmos ${moeda(resultado.total)}. O saldo não mudou.`,
        });
        router.refresh();
      } catch (erro) {
        setMensagem({ tipo: "erro", texto: mensagemErro(erro, "Não foi possível substituir.") });
      }
    });
  }

  const diferenca = previa ? Math.round((previa.totalGoogle - previa.totalBlocos) * 100) / 100 : 0;

  return (
    <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-sm dark:border-white/10">
      <p className="flex items-start gap-2 text-slate-700 dark:text-slate-200">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <span>
          Ligada a <strong>{campanha.nome}</strong>. Gasto lançado sozinho desde {dia(campanha.gastoAutomaticoDesde)}:{" "}
          {campanha.automaticos.quantidade} dia(s), {moeda(campanha.automaticos.total)}.
        </span>
      </p>

      {campanha.manuaisDepois.quantidade > 0 ? (
        <p className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Atenção: há {campanha.manuaisDepois.quantidade} custo(s) lançado(s) à mão a partir de{" "}
            {dia(campanha.gastoAutomaticoDesde)} ({moeda(campanha.manuaisDepois.total)}). Eles somam junto com o gasto
            automático (gasto em dobro). Cancele-os no Financeiro, ou mude o dia de início para depois deles.
          </span>
        </p>
      ) : null}

      {campanha.manuaisAntes.quantidade > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="font-semibold">
            Há {campanha.manuaisAntes.quantidade} custo(s) lançado(s) à mão em bloco antes de{" "}
            {dia(campanha.gastoAutomaticoDesde)}, somando {moeda(campanha.manuaisAntes.total)}.
          </p>
          <p className="mt-1">
            Dá para trocar esses blocos pelo gasto de cada dia: o mesmo total é espalhado pelos dias em que o Google
            mostra gasto. O saldo continua igual; só a data de cada parte fica certa.
          </p>

          {podeGerenciar && !previa ? (
            <button
              type="button"
              onClick={verPrevia}
              disabled={pendente}
              className="mt-2 inline-flex h-9 items-center gap-2 rounded-lg bg-amber-600 px-3 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {pendente ? <Loader2 className="size-3.5 animate-spin" /> : <Repeat2 className="size-3.5" />}
              Ver como fica
            </button>
          ) : null}

          {previa ? (
            <div className="mt-3 space-y-2 rounded-lg bg-white/70 p-3 text-slate-800 dark:bg-slate-900/60 dark:text-slate-100">
              <p>
                Período: <strong>{dia(previa.inicio)}</strong> a <strong>{dia(previa.fim)}</strong> ·{" "}
                {previa.diasComGasto > 0
                  ? `${previa.diasComGasto} dia(s) com gasto no Google`
                  : "sem gasto do Google nesse período (vai dividir por igual entre os dias)"}
              </p>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto">
                {previa.blocos.map((bloco) => (
                  <li key={bloco.id} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {dia(bloco.data)} · {bloco.descricao}
                    </span>
                    <span className="shrink-0 font-semibold">{moeda(bloco.valor)}</span>
                  </li>
                ))}
              </ul>
              <p>
                Lançado à mão: <strong>{moeda(previa.totalBlocos)}</strong> → continua{" "}
                <strong>{moeda(previa.totalBlocos)}</strong>, agora dividido por dia.
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Só para conferência: o Google mostra {moeda(previa.totalGoogle)} nesse período
                {Math.abs(diferenca) >= 0.01
                  ? ` (${diferenca > 0 ? "mais" : "menos"} ${moeda(Math.abs(diferenca))} que o lançado). Esse valor não muda o saldo.`
                  : ", igual ao lançado."}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={confirmar}
                  disabled={pendente}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-amber-600 px-3 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {pendente ? <Loader2 className="size-3.5 animate-spin" /> : <Repeat2 className="size-3.5" />}
                  Trocar os blocos pelo gasto de cada dia
                </button>
                <button
                  type="button"
                  onClick={() => setPrevia(null)}
                  disabled={pendente}
                  className="inline-flex h-9 items-center rounded-lg border border-slate-300 px-3 text-xs font-semibold dark:border-white/20"
                >
                  Agora não
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {mensagem ? (
        <p
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${
            mensagem.tipo === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"
          }`}
        >
          {mensagem.texto}
        </p>
      ) : null}
    </div>
  );
}
