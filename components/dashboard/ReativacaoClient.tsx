"use client";

import {
  registrarReativacao,
  type AcaoReativacao,
} from "@/actions/reativacao.actions";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";
import {
  CalendarClock,
  ChevronDown,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type ReativacaoItem = {
  id: number;
  nome: string;
  procedimento: string | null;
  ultimaVisita: string | null;
  diasSemVisita: number | null;
  situacao: string | null;
  mensagem: string;
  whatsappUrl: string;
};

export type ReativacaoEsperaItem = {
  id: number;
  nome: string;
  procedimento: string | null;
  situacao: string | null;
  voltaEm: string | null;
};

type Props = {
  clientes: ReativacaoItem[];
  emEspera: ReativacaoEsperaItem[];
};

function etiquetaDaSituacao(situacao: string | null) {
  if (situacao === "Mais tarde") {
    return {
      texto: "Pediu para ser chamada de novo",
      classe: "text-amber-700",
    };
  }
  if (situacao === "Vai marcar") {
    return {
      texto: "Tinha dito que ia marcar",
      classe: "text-cyan-700",
    };
  }
  if (situacao === "Contatada") {
    return {
      texto: "Já recebeu a mensagem e não marcou",
      classe: "text-slate-500",
    };
  }
  return null;
}

function textoEspera(item: ReativacaoEsperaItem) {
  if (item.situacao === "Não quer mais") return "Não quer mais ser chamada";
  if (item.situacao === "Mais tarde")
    return `Chamar de novo em ${item.voltaEm || "breve"}`;
  if (item.situacao === "Vai marcar")
    return `Disse que vai marcar · volta à lista em ${item.voltaEm || "breve"}`;
  return `Mensagem enviada · volta à lista em ${item.voltaEm || "breve"}`;
}

export default function ReativacaoClient({ clientes, emEspera }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ocultos, setOcultos] = useState<number[]>([]);
  const [voltaram, setVoltaram] = useState<number[]>([]);
  const [enviando, setEnviando] = useState<number[]>([]);
  const [abertoId, setAbertoId] = useState<number | null>(null);
  const [esperaAberta, setEsperaAberta] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const visiveis = clientes.filter((item) => !ocultos.includes(item.id));
  const esperaVisivel = emEspera.filter(
    (item) => !ocultos.includes(item.id) && !voltaram.includes(item.id),
  );

  function mensagemDeErro(error: unknown) {
    return error instanceof Error
      ? error.message
      : "Não foi possível salvar. Tente novamente.";
  }

  function executar(
    id: number,
    acao: AcaoReativacao,
    meses?: number,
  ) {
    setErro(null);

    startTransition(async () => {
      try {
        await registrarReativacao(id, acao, meses);
        if (acao === "VOLTAR") {
          setVoltaram((atuais) => [...atuais, id]);
        } else {
          setOcultos((atuais) => [...atuais, id]);
        }
        setAbertoId(null);
        router.refresh();
      } catch (error) {
        setErro(mensagemDeErro(error));
      }
    });
  }

  function aoEnviarMensagem(item: ReativacaoItem) {
    setErro(null);
    setEnviando((atuais) => [...atuais, item.id]);

    registrarReativacao(item.id, "CONTATADA", undefined, item.mensagem)
      .then(() => {
        window.setTimeout(() => {
          setOcultos((atuais) => [...atuais, item.id]);
          router.refresh();
        }, 900);
      })
      .catch((error) => {
        setEnviando((atuais) => atuais.filter((id) => id !== item.id));
        setErro(mensagemDeErro(error));
      });
  }

  function confirmarNaoQuer(item: ReativacaoItem) {
    if (
      window.confirm(
        `Marcar que ${item.nome} não quer mais receber esse contato? Ela sai da lista e só volta se você trouxer de volta.`,
      )
    ) {
      executar(item.id, "NAO_QUER");
    }
  }

  return (
    <div className="mt-4 space-y-2.5">
      {erro ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {erro}
        </div>
      ) : null}

      {visiveis.length > 0 ? (
        visiveis.map((cliente) => {
          const etiqueta = etiquetaDaSituacao(cliente.situacao);
          const emEnvio = enviando.includes(cliente.id);
          const aberto = abertoId === cliente.id;

          return (
            <div
              key={cliente.id}
              className={`rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-opacity ${
                emEnvio ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/clientes/${cliente.id}`}
                    className="block truncate font-bold text-slate-900 hover:text-violet-700"
                  >
                    {cliente.nome}
                  </Link>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {cliente.procedimento || "Procedimento não informado"}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    Última visita:{" "}
                    {cliente.ultimaVisita || "não registrada"}
                    {cliente.diasSemVisita !== null
                      ? ` · há ${cliente.diasSemVisita} dias`
                      : ""}
                  </p>
                  {etiqueta ? (
                    <p className={`mt-1 text-[11px] font-bold ${etiqueta.classe}`}>
                      {etiqueta.texto}
                    </p>
                  ) : null}
                </div>

                <WhatsAppLink
                  href={cliente.whatsappUrl}
                  onClick={() => aoEnviarMensagem(cliente)}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                  aria-label={`Enviar mensagem de retorno para ${cliente.nome}`}
                  title="Abrir WhatsApp com a mensagem pronta"
                >
                  <MessageCircle className="size-4" />
                </WhatsAppLink>
              </div>

              <button
                type="button"
                onClick={() => setAbertoId(aberto ? null : cliente.id)}
                aria-expanded={aberto}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:text-violet-900"
              >
                Ela respondeu?
                <ChevronDown
                  className={`size-3.5 transition-transform ${
                    aberto ? "rotate-180" : ""
                  }`}
                />
              </button>

              {aberto ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => executar(cliente.id, "VAI_MARCAR")}
                    className="rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-xs font-bold text-cyan-700 hover:bg-cyan-50 disabled:opacity-60"
                  >
                    Vai marcar um dia
                  </button>
                  {[1, 2, 3].map((meses) => (
                    <button
                      key={meses}
                      type="button"
                      disabled={isPending}
                      onClick={() => executar(cliente.id, "MAIS_TARDE", meses)}
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
        })
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
          Nenhum cliente para chamar neste momento.
        </div>
      )}

      {esperaVisivel.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setEsperaAberta((aberta) => !aberta)}
            aria-expanded={esperaAberta}
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-bold text-slate-700"
          >
            <span className="inline-flex items-center gap-2">
              <CalendarClock className="size-4 text-slate-400" />
              Em espera ({esperaVisivel.length})
            </span>
            <ChevronDown
              className={`size-4 text-slate-400 transition-transform ${
                esperaAberta ? "rotate-180" : ""
              }`}
            />
          </button>

          {esperaAberta ? (
            <div className="space-y-2 border-t border-slate-200 p-3">
              <p className="text-xs text-slate-500">
                Quem já recebeu mensagem ou pediu para ser chamada depois. Elas
                voltam sozinhas para a lista na data indicada.
              </p>
              {esperaVisivel.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/clientes/${item.id}`}
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
                    onClick={() => executar(item.id, "VOLTAR")}
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
    </div>
  );
}
