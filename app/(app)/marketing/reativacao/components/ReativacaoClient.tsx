"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  Loader2,
  MessageCircle,
  PencilLine,
  RotateCcw,
  X,
} from "lucide-react";

import {
  definirLimiteDiarioReativacao,
  desfazerEnvioReativacao,
  registrarEnvioReativacao,
  registrarResultadoReativacao,
  salvarModeloReativacao,
} from "@/actions/reativacao-perdidos.actions";
import type { DadosReativacao, ItemEnviado, ItemReativacao } from "@/lib/reativacao-perdidos-dados";
import {
  PAUSA_ENTRE_ENVIOS_SEGUNDOS,
  POR_PAGINA,
  ROTULO_RESULTADO,
  type ResultadoReativacao,
} from "@/lib/reativacao-perdidos";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type Props = {
  dados: DadosReativacao;
  podeGerenciar: boolean;
};

const OPCOES_DIAS = [
  { valor: 0, rotulo: "Qualquer data" },
  { valor: 30, rotulo: "Último mês" },
  { valor: 60, rotulo: "Últimos 2 meses" },
  { valor: 90, rotulo: "Últimos 3 meses" },
  { valor: 180, rotulo: "Últimos 6 meses" },
  { valor: 365, rotulo: "Último ano" },
];

const OPCOES_LIMITE = [5, 10, 15, 20, 30];

function dataCurta(valor: string | null) {
  if (!valor) return "-";
  return new Date(valor).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "America/Sao_Paulo" });
}

function mensagemErro(erro: unknown) {
  return erro instanceof Error && erro.message ? erro.message : "Não foi possível salvar. Tente de novo.";
}

const campo =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100";

export default function ReativacaoClient({ dados, podeGerenciar }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const parametros = useSearchParams();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const [enviadasHoje, setEnviadasHoje] = useState(dados.resumo.enviadasHoje);
  const [ultimoEnvio, setUltimoEnvio] = useState<number>(() =>
    dados.ultimoEnvioEm ? new Date(dados.ultimoEnvioEm).getTime() : 0,
  );
  const [agora, setAgora] = useState(() => Date.now());
  const [enviadosAgora, setEnviadosAgora] = useState<number[]>([]);
  const [editandoModelo, setEditandoModelo] = useState(false);

  useEffect(() => {
    const intervalo = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, []);

  const limite = dados.limiteDiario;
  const limiteAtingido = enviadasHoje >= limite;
  const pausaRestante = Math.max(0, Math.ceil((ultimoEnvio + PAUSA_ENTRE_ENVIOS_SEGUNDOS * 1000 - agora) / 1000));
  const { filtros } = dados;

  function irPara(mudancas: Record<string, string | number | null>) {
    const novo = new URLSearchParams(parametros.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === null || valor === "" || valor === 0) novo.delete(chave);
      else novo.set(chave, String(valor));
    }
    if (!("pagina" in mudancas)) novo.delete("pagina");
    router.push(`${pathname}?${novo.toString()}`);
  }

  function aoEnviar(item: ItemReativacao, mensagem: string) {
    setErro("");
    setEnviadosAgora((atual) => [...atual, item.id]);
    setEnviadasHoje((atual) => atual + 1);
    setUltimoEnvio(Date.now());
    registrarEnvioReativacao({ leadId: item.id, mensagem }).catch((e) => {
      setEnviadosAgora((atual) => atual.filter((id) => id !== item.id));
      setEnviadasHoje((atual) => Math.max(0, atual - 1));
      setErro(mensagemErro(e));
    });
  }

  function desfazer(item: ItemReativacao) {
    setErro("");
    iniciar(async () => {
      try {
        await desfazerEnvioReativacao(item.id);
        setEnviadosAgora((atual) => atual.filter((id) => id !== item.id));
        setEnviadasHoje((atual) => Math.max(0, atual - 1));
      } catch (e) {
        setErro(mensagemErro(e));
      }
    });
  }

  function mudarLimite(valor: number) {
    setErro("");
    iniciar(async () => {
      try {
        await definirLimiteDiarioReativacao(valor);
        router.refresh();
      } catch (e) {
        setErro(mensagemErro(e));
      }
    });
  }

  const totalPaginas = Math.max(
    1,
    Math.ceil((filtros.aba === "lista" ? dados.totalLista : dados.totalEnviadas) / POR_PAGINA),
  );

  return (
    <div className="app-mobile-safe space-y-4 pb-6 sm:space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-6">
        <Link href="/marketing" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-700 dark:text-slate-400">
          <ArrowLeft size={14} /> Voltar para Marketing
        </Link>
        <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Reativação de perdidos</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Quem procurou e não fechou. Cada pessoa recebe a mensagem uma vez só: depois de enviar, ela sai da lista.
          Mande aos poucos, dentro do limite do dia, para o WhatsApp não entender como spam.
        </p>
        {dados.foraDaLista.perdidos > 0 ? (
          <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">
            Você tem <strong>{dados.foraDaLista.perdidos}</strong> perdidos no total.{" "}
            {dados.foraDaLista.semTelefone > 0 ? (
              <>
                <strong>{dados.foraDaLista.semTelefone}</strong> não têm telefone (clicaram no anúncio mas não mandaram
                mensagem), então não dá para enviar.{" "}
              </>
            ) : null}
            {dados.foraDaLista.jaEnviados > 0 ? (
              <>
                <strong>{dados.foraDaLista.jaEnviados}</strong> já receberam.{" "}
              </>
            ) : null}
            {dados.foraDaLista.comHorario > 0 ? (
              <>
                <strong>{dados.foraDaLista.comHorario}</strong> já têm horário marcado.{" "}
              </>
            ) : null}
            Convertidos não entram, porque já são clientes.
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr] sm:gap-3">
          <div className={`col-span-3 rounded-2xl border p-3 sm:col-span-1 ${limiteAtingido ? "border-rose-200 bg-rose-50 dark:border-rose-400/20 dark:bg-rose-500/10" : "border-emerald-200 bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-500/10"}`}>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Hoje você enviou</p>
            <p className={`text-2xl font-bold ${limiteAtingido ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>
              {enviadasHoje} <span className="text-base font-semibold text-slate-500">de {limite}</span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70 dark:bg-white/10">
              <div
                className={`h-full rounded-full ${limiteAtingido ? "bg-rose-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(100, (enviadasHoje / Math.max(1, limite)) * 100)}%` }}
              />
            </div>
            {podeGerenciar ? (
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                Limite por dia
                <select
                  value={OPCOES_LIMITE.includes(limite) ? limite : ""}
                  onChange={(evento) => mudarLimite(Number(evento.target.value))}
                  disabled={pendente}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-white/10 dark:bg-slate-900"
                >
                  {!OPCOES_LIMITE.includes(limite) ? <option value="">{limite}</option> : null}
                  {OPCOES_LIMITE.map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <Resumo rotulo="Já enviadas" valor={dados.resumo.enviadas} />
          <Resumo rotulo="Responderam" valor={dados.resumo.responderam} />
          <Resumo rotulo="Voltaram / agendaram" valor={dados.resumo.voltaram} destaque />
        </div>
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => irPara({ aba: null })}
          className={`h-10 rounded-xl px-4 text-sm font-bold ${filtros.aba === "lista" ? "bg-violet-600 text-white" : "border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-transparent dark:text-slate-200"}`}
        >
          Para reativar ({dados.totalLista})
        </button>
        <button
          type="button"
          onClick={() => irPara({ aba: "enviadas" })}
          className={`h-10 rounded-xl px-4 text-sm font-bold ${filtros.aba === "enviadas" ? "bg-violet-600 text-white" : "border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-transparent dark:text-slate-200"}`}
        >
          Já enviadas ({dados.totalEnviadas})
        </button>
      </div>

      {erro ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{erro}</p> : null}

      {filtros.aba === "lista" ? (
        <>
          <section className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:grid-cols-[1.3fr_1fr_1fr_auto] sm:items-end">
            <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Serviço que procurou
              <select value={filtros.servico} onChange={(evento) => irPara({ servico: evento.target.value })} className={campo}>
                <option value="">Todos os serviços</option>
                {dados.servicos.map((item) => (
                  <option key={item.nome} value={item.nome}>
                    {item.nome} ({item.quantidade})
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Perdido em
              <select value={filtros.dias} onChange={(evento) => irPara({ dias: Number(evento.target.value) })} className={campo}>
                {OPCOES_DIAS.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Origem
              <select value={filtros.origem} onChange={(evento) => irPara({ origem: evento.target.value })} className={campo}>
                <option value="">Todas</option>
                {dados.origens.map((item) => (
                  <option key={item.nome} value={item.nome}>
                    {item.nome} ({item.quantidade})
                  </option>
                ))}
              </select>
            </label>
            {podeGerenciar ? (
              <button
                type="button"
                onClick={() => setEditandoModelo(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200"
              >
                <PencilLine size={16} /> Textos
              </button>
            ) : null}
          </section>

          {limiteAtingido ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
              Limite de hoje atingido ({enviadasHoje} de {limite}). Continue amanhã: mandar muitas mensagens no mesmo dia pode bloquear o número.
            </p>
          ) : pausaRestante > 0 ? (
            <p className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
              <Hourglass size={16} /> Próximo envio liberado em {pausaRestante}s (uma pausa entre as mensagens ajuda a não parecer disparo em massa).
            </p>
          ) : null}

          {dados.itens.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-8 text-center dark:border-emerald-400/20 dark:bg-emerald-500/10">
              <CheckCircle2 className="mx-auto size-7 text-emerald-600" />
              <p className="mt-3 text-sm font-semibold text-emerald-900 dark:text-emerald-200">Ninguém para reativar com esses filtros.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dados.itens.map((item) => (
                <CartaoPerdido
                  key={item.id}
                  item={item}
                  enviado={enviadosAgora.includes(item.id)}
                  bloqueado={!podeGerenciar || limiteAtingido || pausaRestante > 0}
                  pendente={pendente}
                  onEnviar={aoEnviar}
                  onDesfazer={desfazer}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <ListaEnviadas itens={dados.enviadas} podeGerenciar={podeGerenciar} onErro={setErro} />
      )}

      {totalPaginas > 1 ? (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={filtros.pagina <= 1}
            onClick={() => irPara({ pagina: filtros.pagina - 1 })}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 font-semibold disabled:opacity-40 dark:border-white/10 dark:bg-transparent"
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <span className="text-slate-600 dark:text-slate-300">
            Página {filtros.pagina} de {totalPaginas}
          </span>
          <button
            type="button"
            disabled={filtros.pagina >= totalPaginas}
            onClick={() => irPara({ pagina: filtros.pagina + 1 })}
            className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 font-semibold disabled:opacity-40 dark:border-white/10 dark:bg-transparent"
          >
            Próxima <ChevronRight size={16} />
          </button>
        </div>
      ) : null}

      {editandoModelo ? (
        <EditorModelos
          modelos={dados.modelos}
          servicoInicial={filtros.servico || null}
          onFechar={() => setEditandoModelo(false)}
        />
      ) : null}
    </div>
  );
}

function Resumo({ rotulo, valor, destaque = false }: { rotulo: string; valor: number; destaque?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 dark:border-white/10 dark:bg-white/[0.04] sm:p-3">
      <p className="text-[11px] font-semibold leading-4 text-slate-600 dark:text-slate-300 sm:text-xs">{rotulo}</p>
      <p className={`text-xl font-bold sm:text-2xl ${destaque ? "text-violet-700 dark:text-violet-300" : "text-slate-900 dark:text-white"}`}>{valor}</p>
    </div>
  );
}

function CartaoPerdido({
  item,
  enviado,
  bloqueado,
  pendente,
  onEnviar,
  onDesfazer,
}: {
  item: ItemReativacao;
  enviado: boolean;
  bloqueado: boolean;
  pendente: boolean;
  onEnviar: (item: ItemReativacao, mensagem: string) => void;
  onDesfazer: (item: ItemReativacao) => void;
}) {
  const [mensagem, setMensagem] = useState(item.mensagem);
  const [editando, setEditando] = useState(false);
  const url = useMemo(() => buildWhatsAppUrl(item.telefone, mensagem), [item.telefone, mensagem]);
  const travado = bloqueado || item.jaRecebeuPorOutroCadastro || !item.telefone;

  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm transition dark:bg-white/[0.04] ${
        enviado ? "border-slate-200 opacity-70 dark:border-white/10" : "border-violet-200 dark:border-violet-400/25"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-semibold text-slate-900 dark:text-white">{item.nome}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {item.servico || "Serviço não informado"} · {item.origem || "sem origem"} · perdido em {dataCurta(item.perdidoEm)}
          </p>
          {item.motivoPerda ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Motivo: {item.motivoPerda}</p> : null}
        </div>
        {enviado ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            <CheckCircle2 size={14} /> Enviada
          </span>
        ) : null}
      </div>

      {editando && !enviado ? (
        <textarea
          value={mensagem}
          onChange={(evento) => setMensagem(evento.target.value)}
          rows={6}
          className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-800 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
        />
      ) : (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-white/[0.04] dark:text-slate-300">
          <p className="line-clamp-3 whitespace-pre-line">{mensagem}</p>
        </div>
      )}

      {item.jaRecebeuPorOutroCadastro && !enviado ? (
        <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
          Este telefone já recebeu a reativação por outro cadastro. Não será enviado de novo.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {enviado ? (
          <button
            type="button"
            onClick={() => onDesfazer(item)}
            disabled={pendente}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300"
          >
            {pendente ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            Não consegui enviar (desfazer)
          </button>
        ) : (
          <>
            {travado ? (
              <span className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-semibold text-slate-400 dark:bg-white/[0.06]">
                <MessageCircle className="size-4" /> Enviar no WhatsApp
              </span>
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onEnviar(item, mensagem)}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <MessageCircle className="size-4" /> Enviar no WhatsApp
              </a>
            )}
            <button
              type="button"
              onClick={() => setEditando((atual) => !atual)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300"
            >
              <PencilLine size={14} /> {editando ? "Pronto" : "Editar texto"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ListaEnviadas({
  itens,
  podeGerenciar,
  onErro,
}: {
  itens: ItemEnviado[];
  podeGerenciar: boolean;
  onErro: (texto: string) => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  function marcar(item: ItemEnviado, resultado: ResultadoReativacao) {
    onErro("");
    iniciar(async () => {
      try {
        await registrarResultadoReativacao({ leadId: item.id, resultado: item.resultado === resultado ? null : resultado });
        router.refresh();
      } catch (e) {
        onErro(mensagemErro(e));
      }
    });
  }

  if (itens.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.04]">
        Nenhuma reativação enviada ainda.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {itens.map((item) => (
        <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="break-words font-semibold text-slate-900 dark:text-white">{item.nome}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {item.servico || "Serviço não informado"} · enviada em {dataCurta(item.enviadaEm)}
              </p>
            </div>
            {item.agendouSozinho ? (
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">Voltou: tem agendamento depois da mensagem</span>
            ) : item.resultado ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                {ROTULO_RESULTADO[item.resultado]}
              </span>
            ) : null}
          </div>
          {podeGerenciar ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(Object.keys(ROTULO_RESULTADO) as ResultadoReativacao[]).map((resultado) => (
                <button
                  key={resultado}
                  type="button"
                  disabled={pendente}
                  onClick={() => marcar(item, resultado)}
                  aria-pressed={item.resultado === resultado}
                  className={`h-8 rounded-lg px-2.5 text-xs font-semibold disabled:opacity-50 ${
                    item.resultado === resultado
                      ? "bg-violet-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300"
                  }`}
                >
                  {ROTULO_RESULTADO[resultado]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function EditorModelos({
  modelos,
  servicoInicial,
  onFechar,
}: {
  modelos: DadosReativacao["modelos"];
  servicoInicial: string | null;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const inicial = modelos.find((item) => item.servico === servicoInicial) ?? modelos[0];
  const [chave, setChave] = useState(inicial?.chave ?? "");
  const atual = modelos.find((item) => item.chave === chave) ?? inicial;
  const [texto, setTexto] = useState(atual?.texto ?? "");
  const [erro, setErro] = useState("");

  function trocar(novaChave: string) {
    setChave(novaChave);
    setTexto(modelos.find((item) => item.chave === novaChave)?.texto ?? "");
  }

  function salvar() {
    setErro("");
    iniciar(async () => {
      try {
        await salvarModeloReativacao({ servico: atual?.servico ?? null, texto });
        router.refresh();
        onFechar();
      } catch (e) {
        setErro(mensagemErro(e));
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl dark:bg-slate-900">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-white/10">
          <div>
            <p className="font-bold text-slate-900 dark:text-white">Texto da mensagem por serviço</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Use {"{nome}"} para o primeiro nome e {"{servico}"} para o serviço que a pessoa procurou.
            </p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-xl border border-slate-200 p-2 text-slate-500 dark:border-white/10">
            <X size={16} />
          </button>
        </header>
        <div className="space-y-3 overflow-y-auto px-4 py-4">
          <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Serviço
            <select value={chave} onChange={(evento) => trocar(evento.target.value)} className={campo}>
              {modelos.map((item) => (
                <option key={item.chave} value={item.chave}>
                  {item.servico ?? "Padrão (serviços sem texto próprio)"}
                  {item.personalizado ? " · editado" : ""}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            rows={9}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-800 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
          />
          {erro ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{erro}</p> : null}
        </div>
        <footer className="flex gap-2 border-t border-slate-100 px-4 py-3 dark:border-white/10">
          <button type="button" onClick={onFechar} className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-semibold dark:border-white/10 dark:text-slate-200">
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={pendente}
            className="inline-flex h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white disabled:opacity-50"
          >
            {pendente ? <Loader2 size={16} className="animate-spin" /> : null}
            Salvar texto
          </button>
        </footer>
      </div>
    </div>
  );
}
