"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  MessageCircle,
  RotateCcw,
  Search,
} from "lucide-react";
import {
  registrarReativacao,
  type AcaoReativacao,
} from "@/actions/reativacao.actions";
import { IndicadorNavegacao } from "@/components/ui/indicador-navegacao";

type ProcedimentoAtrasado = {
  nome: string;
  ultimaVez: string;
  diasAtraso: number;
};

type ClienteRetorno = {
  clienteId: number;
  nome: string;
  whatsapp: string | null;
  telefone: string;
  procedimentos: ProcedimentoAtrasado[];
  maiorAtraso: number;
  situacao: string | null;
  mensagem: string;
  whatsappUrl: string | null;
};

type ClientePausado = {
  clienteId: number;
  nome: string;
  situacao: string | null;
  voltaEm: string | null;
};

type Props = {
  itens: ClienteRetorno[];
  pausados?: ClientePausado[];
  semConfiguracao: boolean;
};

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatarData(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function textoAtraso(dias: number) {
  if (dias === 0) return "vence hoje";
  if (dias < 30) return `${dias} dia${dias === 1 ? "" : "s"} atrás do previsto`;
  const meses = Math.floor(dias / 30);
  return `${meses} ${meses === 1 ? "mês" : "meses"} atrás do previsto`;
}

function formatarDataCurta(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function etiquetaDaSituacao(situacao: string | null) {
  if (situacao === "Mais tarde") {
    return { texto: "Pediu para ser chamada de novo", classe: "text-amber-700" };
  }
  if (situacao === "Vai marcar") {
    return { texto: "Tinha dito que ia marcar", classe: "text-cyan-700" };
  }
  if (situacao === "Contatada") {
    return {
      texto: "Já recebeu a mensagem e não marcou",
      classe: "text-slate-500",
    };
  }
  return null;
}

function textoEspera(item: ClientePausado) {
  const data = formatarDataCurta(item.voltaEm) || "breve";
  if (item.situacao === "Não quer mais") return "Não quer mais ser chamada";
  if (item.situacao === "Mais tarde") return `Chamar de novo em ${data}`;
  if (item.situacao === "Vai marcar")
    return `Disse que vai marcar · volta à lista em ${data}`;
  return `Mensagem enviada · volta à lista em ${data}`;
}

export default function RetornosClient({
  itens,
  pausados = [],
  semConfiguracao,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busca, setBusca] = useState("");
  const [enviando, setEnviando] = useState<number[]>([]);
  const [ocultos, setOcultos] = useState<number[]>([]);
  const [voltaram, setVoltaram] = useState<number[]>([]);
  const [novosEspera, setNovosEspera] = useState<ClientePausado[]>([]);
  const [abertoId, setAbertoId] = useState<number | null>(null);
  const [esperaAberta, setEsperaAberta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const atualizarEm = useRef<number | null>(null);

  const visiveis = useMemo(
    () => itens.filter((cliente) => !ocultos.includes(cliente.clienteId)),
    [itens, ocultos],
  );

  // Quem acabou de ser enviada ja aparece em "Em espera" na hora.
  const idsDoServidor = new Set(pausados.map((item) => item.clienteId));
  const esperaVisivel = [
    ...pausados,
    ...novosEspera.filter((item) => !idsDoServidor.has(item.clienteId)),
  ].filter((item) => !voltaram.includes(item.clienteId));

  function mensagemDeErro(error: unknown) {
    return error instanceof Error
      ? error.message
      : "Não foi possível salvar. Tente novamente.";
  }

  function agendarAtualizacao() {
    if (atualizarEm.current) window.clearTimeout(atualizarEm.current);
    atualizarEm.current = window.setTimeout(() => router.refresh(), 1200);
  }

  function adicionarNaEspera(
    cliente: { clienteId: number; nome: string },
    situacao: string,
    dias: number | null,
  ) {
    setNovosEspera((atuais) => [
      ...atuais.filter((item) => item.clienteId !== cliente.clienteId),
      {
        clienteId: cliente.clienteId,
        nome: cliente.nome,
        situacao,
        voltaEm:
          dias === null
            ? null
            : new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);
    setVoltaram((atuais) => atuais.filter((id) => id !== cliente.clienteId));
  }

  function executar(
    cliente: { clienteId: number; nome: string },
    acao: AcaoReativacao,
    meses?: number,
  ) {
    setErro(null);

    startTransition(async () => {
      try {
        await registrarReativacao(cliente.clienteId, acao, meses);

        if (acao === "VOLTAR") {
          setVoltaram((atuais) => [...atuais, cliente.clienteId]);
          setOcultos((atuais) =>
            atuais.filter((id) => id !== cliente.clienteId),
          );
          setEnviando((atuais) =>
            atuais.filter((id) => id !== cliente.clienteId),
          );
          setNovosEspera((atuais) =>
            atuais.filter((item) => item.clienteId !== cliente.clienteId),
          );
        } else {
          setOcultos((atuais) => [...atuais, cliente.clienteId]);
          if (acao === "VAI_MARCAR") {
            adicionarNaEspera(cliente, "Vai marcar", 21);
          } else if (acao === "MAIS_TARDE") {
            adicionarNaEspera(cliente, "Mais tarde", (meses || 2) * 30);
          } else {
            adicionarNaEspera(cliente, "Não quer mais", null);
          }
        }

        setAbertoId(null);
        agendarAtualizacao();
      } catch (error) {
        setErro(mensagemDeErro(error));
      }
    });
  }

  function aoEnviarMensagem(cliente: ClienteRetorno) {
    setErro(null);
    setEnviando((atuais) => [...atuais, cliente.clienteId]);

    registrarReativacao(
      cliente.clienteId,
      "CONTATADA",
      undefined,
      cliente.mensagem,
    )
      .then(() => {
        adicionarNaEspera(cliente, "Contatada", 30);
        window.setTimeout(() => {
          setOcultos((atuais) => [...atuais, cliente.clienteId]);
        }, 900);
        agendarAtualizacao();
      })
      .catch((error) => {
        setEnviando((atuais) =>
          atuais.filter((id) => id !== cliente.clienteId),
        );
        setErro(mensagemDeErro(error));
      });
  }

  function confirmarNaoQuer(cliente: ClienteRetorno) {
    if (
      window.confirm(
        `Marcar que ${cliente.nome} não quer mais receber esse contato? Ela sai da lista e só volta se você trouxer de volta.`,
      )
    ) {
      executar(cliente, "NAO_QUER");
    }
  }

  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    if (!termo) return visiveis;

    return visiveis.filter(
      (cliente) =>
        normalizarBusca(cliente.nome).includes(termo) ||
        cliente.procedimentos.some((item) =>
          normalizarBusca(item.nome).includes(termo),
        ),
    );
  }, [visiveis, busca]);

  return (
    <div className="app-mobile-safe space-y-4 pb-6 sm:space-y-6 sm:pb-0">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.12),transparent_36%)]" />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:border-teal-400/20 dark:bg-teal-500/15 dark:text-teal-200">
              <CalendarClock size={14} />
              Relacionamento
            </div>

            <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Retornos previstos
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Clientes que já passaram do intervalo de retorno do procedimento
              que fizeram e ainda não têm horário marcado. Quem já remarcou não
              aparece aqui.
            </p>
          </div>

          {!semConfiguracao ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {visiveis.length}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                para contatar
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {semConfiguracao ? (
        <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/70 p-8 text-center dark:border-amber-400/20 dark:bg-amber-500/10">
          <CalendarClock className="mx-auto size-7 text-amber-600 dark:text-amber-300" />
          <p className="mt-3 text-sm font-semibold text-amber-900 dark:text-amber-200">
            Nenhum procedimento tem intervalo de retorno configurado ainda.
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-amber-700 dark:text-amber-300">
            Vá em Configurações, procure a lista de serviços e preencha o campo
            &quot;Lembrar retorno após&quot; nos procedimentos que se repetem.
            Por exemplo: 90 dias na limpeza de pele, 150 no botox. Os que ficarem
            vazios simplesmente não geram lembrete.
          </p>
        </div>
      ) : (
        <>
          <label className="relative block min-w-0">
            <span className="sr-only">Buscar por cliente ou procedimento</span>

            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por cliente ou procedimento"
              className="premium-input w-full pl-11"
            />
          </label>

          {erro ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {erro}
            </div>
          ) : null}

          {filtrados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-8 text-center dark:border-emerald-400/20 dark:bg-emerald-500/10">
              <CheckCircle2 className="mx-auto size-7 text-emerald-600 dark:text-emerald-300" />
              <p className="mt-3 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                {busca
                  ? "Nenhum resultado para essa busca."
                  : "Nenhum retorno atrasado no momento."}
              </p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                {busca
                  ? "Tente buscar por outro nome ou procedimento."
                  : "Todo mundo está em dia ou já tem horário marcado."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtrados.map((cliente) => {
                const jaContatado = enviando.includes(cliente.clienteId);
                const url = cliente.whatsappUrl;
                const etiqueta = etiquetaDaSituacao(cliente.situacao);
                const aberto = abertoId === cliente.clienteId;

                return (
                  <div
                    key={cliente.clienteId}
                    className={`rounded-2xl border bg-white p-4 shadow-sm transition dark:bg-white/[0.04] ${
                      jaContatado
                        ? "border-slate-200 opacity-60 dark:border-white/10"
                        : "border-teal-200 dark:border-teal-400/25"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">
                          {cliente.nome}
                        </p>
                        {etiqueta ? (
                          <p className={`mt-0.5 text-[11px] font-bold ${etiqueta.classe}`}>
                            {etiqueta.texto}
                          </p>
                        ) : null}

                        <div className="mt-2 space-y-1">
                          {cliente.procedimentos.map((procedimento) => (
                            <p
                              key={procedimento.nome}
                              className="text-sm text-slate-600 dark:text-slate-300"
                            >
                              <span className="font-medium">
                                {procedimento.nome}
                              </span>{" "}
                              <span className="text-slate-400 dark:text-slate-500">
                                · última vez em{" "}
                                {formatarData(procedimento.ultimaVez)} ·{" "}
                                {textoAtraso(procedimento.diasAtraso)}
                              </span>
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => aoEnviarMensagem(cliente)}
                          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                        >
                          <MessageCircle className="size-4" />
                          {jaContatado ? "Enviado" : "WhatsApp"}
                        </a>
                      ) : (
                        <span className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400 dark:bg-white/[0.06]">
                          Sem telefone cadastrado
                        </span>
                      )}

                      <Link
                        href={`/clientes/${cliente.clienteId}`}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                      >
                        <IndicadorNavegacao modo="preceder" className="size-3.5 animate-spin">
                          Ver ficha
                        </IndicadorNavegacao>
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAbertoId(aberto ? null : cliente.clienteId)}
                      aria-expanded={aberto}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:text-violet-900"
                    >
                      Ela respondeu?
                      <ChevronDown
                        className={`size-3.5 transition-transform ${aberto ? "rotate-180" : ""}`}
                      />
                    </button>

                    {aberto ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => executar(cliente, "VAI_MARCAR")}
                          className="rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-xs font-bold text-cyan-700 hover:bg-cyan-50 disabled:opacity-60"
                        >
                          Vai marcar um dia
                        </button>
                        {[1, 2, 3].map((meses) => (
                          <button
                            key={meses}
                            type="button"
                            disabled={isPending}
                            onClick={() => executar(cliente, "MAIS_TARDE", meses)}
                            className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                          >
                            Agora não · chamar em {meses} {meses === 1 ? "mês" : "meses"}
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => confirmarNaoQuer(cliente)}
                          className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          Não quer mais
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {esperaVisivel.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]">
              <button
                type="button"
                onClick={() => setEsperaAberta((aberta) => !aberta)}
                aria-expanded={esperaAberta}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-bold text-slate-700"
              >
                <span className="inline-flex items-center gap-2">
                  <CalendarClock className="size-4 text-slate-400" />
                  Em espera ({esperaVisivel.length})
                </span>
                <ChevronDown
                  className={`size-4 text-slate-400 transition-transform ${esperaAberta ? "rotate-180" : ""}`}
                />
              </button>

              {esperaAberta ? (
                <div className="space-y-2 border-t border-slate-200 p-3 dark:border-white/10">
                  <p className="text-xs text-slate-500">
                    Quem já recebeu mensagem ou pediu para ser chamada depois.
                    Elas voltam sozinhas para a lista na data indicada.
                  </p>
                  {esperaVisivel.map((item) => (
                    <div
                      key={item.clienteId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/clientes/${item.clienteId}`}
                          className="block truncate text-sm font-bold text-slate-900 hover:text-violet-700"
                        >
                          {item.nome}
                        </Link>
                        <p className="text-[11px] font-semibold leading-4 text-slate-500">
                          {textoEspera(item)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => executar(item, "VOLTAR")}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-60"
                      >
                        <RotateCcw className="size-3" />
                        Trazer de volta
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
