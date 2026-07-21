"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  History,
  MessageCircle,
  MessagesSquare,
  PencilLine,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  marcarComunicacaoEnviada,
  registrarAberturaComunicacao,
  salvarMensagemModelo,
} from "@/actions/comunicacao.actions";
import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type {
  ComunicacaoFilaItem,
  ComunicacaoHistoricoItem,
  ComunicacaoResumo,
  MensagemModeloItem,
} from "../types";

type Props = {
  fila: ComunicacaoFilaItem[];
  modelos: MensagemModeloItem[];
  historico: ComunicacaoHistoricoItem[];
  resumo: ComunicacaoResumo;
  podeGerenciar: boolean;
};

type Tab = "fila" | "modelos" | "historico";

const categoriaStyle: Record<string, string> = {
  "Confirmação de agendamento": "border-amber-200 bg-amber-50 text-amber-700",
  "Pós-atendimento": "border-emerald-200 bg-emerald-50 text-emerald-700",
  Aniversário: "border-rose-200 bg-rose-50 text-rose-700",
  Reativação: "border-cyan-200 bg-cyan-50 text-cyan-700",
  "Follow-up comercial": "border-blue-200 bg-blue-50 text-blue-700",
  Negociação: "border-violet-200 bg-violet-50 text-violet-700",
  Falta: "border-orange-200 bg-orange-50 text-orange-700",
};

function formatarDataHora(value: string | null) {
  if (!value) return "Não registrado";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ResumoCard({
  titulo,
  valor,
  descricao,
  icon: Icon,
}: {
  titulo: string;
  valor: number;
  descricao: string;
  icon: typeof MessageCircle;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            {titulo}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{valor}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{descricao}</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

function ModeloCard({ modelo, podeGerenciar }: { modelo: MensagemModeloItem; podeGerenciar: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nome, setNome] = useState(modelo.nome);
  const [corpo, setCorpo] = useState(modelo.corpo);
  const [ativo, setAtivo] = useState(modelo.ativo);
  const [mensagem, setMensagem] = useState<string | null>(null);

  function salvar() {
    startTransition(async () => {
      try {
        await salvarMensagemModelo({ id: modelo.id, nome, corpo, ativo });
        setMensagem("Modelo salvo.");
        router.refresh();
      } catch (error) {
        setMensagem(error instanceof Error ? error.message : "Não foi possível salvar o modelo.");
      }
    });
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300">
            {modelo.categoria}
          </span>
          <p className="mt-2 text-xs font-semibold text-slate-400">Chave: {modelo.chave}</p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={ativo}
            disabled={!podeGerenciar || isPending}
            onChange={(event) => setAtivo(event.target.checked)}
            className="size-4 rounded border-slate-300 accent-violet-600"
          />
          Modelo ativo
        </label>
      </div>

      <label className="mt-4 grid gap-1.5">
        <span className="text-xs font-bold text-slate-500">Nome do modelo</span>
        <input
          value={nome}
          disabled={!podeGerenciar || isPending}
          onChange={(event) => setNome(event.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
        />
      </label>

      <label className="mt-3 grid gap-1.5">
        <span className="text-xs font-bold text-slate-500">Texto</span>
        <textarea
          value={corpo}
          disabled={!podeGerenciar || isPending}
          onChange={(event) => setCorpo(event.target.value)}
          className="min-h-44 resize-y rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100"
        />
      </label>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-5 text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
        Variáveis disponíveis: {"{primeiro_nome}"}, {"{nome}"}, {"{clinica}"}, {"{procedimento}"}, {"{data}"}, {"{horario}"}, {"{profissional}"}, {"{interesse_texto}"}.
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className={`text-xs ${mensagem?.includes("salvo") ? "text-emerald-600" : "text-rose-600"}`}>{mensagem}</p>
        {podeGerenciar ? (
          <Button type="button" onClick={salvar} disabled={isPending || !nome.trim() || !corpo.trim()}>
            <Save className="size-4" />
            {isPending ? "Salvando..." : "Salvar modelo"}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export default function ComunicacoesClient({ fila, modelos, historico, resumo, podeGerenciar }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("fila");
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [selecionado, setSelecionado] = useState<ComunicacaoFilaItem | null>(null);
  const [mensagemEditada, setMensagemEditada] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const categorias = useMemo(
    () => ["Todas", ...Array.from(new Set(fila.map((item) => item.categoria)))],
    [fila],
  );

  const filaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return fila.filter((item) => {
      const matchesCategoria = categoria === "Todas" || item.categoria === categoria;
      const matchesBusca =
        !termo ||
        `${item.nome} ${item.telefone || ""} ${item.categoria} ${item.detalhe}`.toLowerCase().includes(termo);
      return matchesCategoria && matchesBusca;
    });
  }, [busca, categoria, fila]);

  function abrirModal(item: ComunicacaoFilaItem) {
    setSelecionado(item);
    setMensagemEditada(item.mensagem);
    setErro(null);
  }

  function fecharModal() {
    if (isPending) return;
    setSelecionado(null);
    setErro(null);
  }

  function dadosRegistro(item: ComunicacaoFilaItem) {
    return {
      modeloId: item.modeloId,
      clienteId: item.clienteId,
      leadId: item.leadId,
      agendamentoId: item.agendamentoId,
      destinatarioNome: item.nome,
      telefone: item.telefone,
      categoria: item.categoria,
      mensagem: mensagemEditada,
    };
  }

  function abrirWhatsApp() {
    if (!selecionado || !mensagemEditada.trim()) return;

    const url = buildWhatsAppUrl(selecionado.telefone, mensagemEditada);
    window.open(url, "_blank", "noopener,noreferrer");

    if (!podeGerenciar) return;

    startTransition(async () => {
      try {
        await registrarAberturaComunicacao(dadosRegistro(selecionado));
        router.refresh();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "WhatsApp aberto, mas não foi possível registrar a abertura.");
      }
    });
  }

  function marcarEnviada(forcarDuplicado = false) {
    if (!selecionado || !mensagemEditada.trim()) return;

    startTransition(async () => {
      try {
        const resultado = await marcarComunicacaoEnviada({
          ...dadosRegistro(selecionado),
          forcarDuplicado,
        });

        if (resultado.duplicada) {
          const existenteEm = resultado.existenteEm;
          setErro(
            existenteEm
              ? `Já existe uma comunicação desta categoria marcada como enviada hoje em ${formatarDataHora(existenteEm.toISOString())}.`
              : "Já existe uma comunicação desta categoria marcada como enviada hoje.",
          );
          return;
        }

        setSelecionado(null);
        setErro(null);
        router.refresh();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível registrar a comunicação.");
      }
    });
  }

  return (
    <div className="min-w-0 space-y-5 pb-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#11131d] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_30%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300">
              <MessagesSquare className="size-3.5" />
              Central de Comunicação
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Comunicação assistida, organizada e rastreável.
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Revise a mensagem, abra o WhatsApp e registre apenas quando o contato realmente tiver sido enviado. Abrir o WhatsApp não é tratado como confirmação de envio.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/" className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:border-violet-200 hover:text-violet-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
              Central do Dia
            </Link>
            <Link href="/marketing" className="inline-flex h-10 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700">
              Abrir CRM
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ResumoCard titulo="Pendentes" valor={resumo.pendentes} descricao="Ações da fila ainda não marcadas como enviadas hoje." icon={MessageCircle} />
        <ResumoCard titulo="Prioridade" valor={resumo.atrasadas} descricao="Follow-ups, negociações ou faltas que exigem atenção." icon={AlertTriangle} />
        <ResumoCard titulo="Enviadas hoje" valor={resumo.enviadasHoje} descricao="Registros confirmados manualmente pela equipe." icon={CheckCircle2} />
        <ResumoCard titulo="WhatsApp aberto" valor={resumo.abertasHoje} descricao="Aberturas registradas que não comprovam envio." icon={ExternalLink} />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#11131d]">
        <div className="grid grid-cols-3 gap-1">
          {([
            ["fila", "Fila do dia", MessageCircle],
            ["modelos", "Modelos", Settings2],
            ["historico", "Histórico", History],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold transition ${
                tab === key
                  ? "bg-slate-950 text-white shadow-sm dark:bg-violet-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </section>

      {tab === "fila" ? (
        <section className="space-y-4">
          <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#11131d] md:grid-cols-[minmax(0,1fr)_260px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar cliente, lead, telefone ou ação"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
              />
            </label>
            <select
              value={categoria}
              onChange={(event) => setCategoria(event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200"
            >
              {categorias.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {filaFiltrada.length > 0 ? filaFiltrada.map((item) => (
              <article key={item.id} className={`rounded-3xl border bg-white p-4 shadow-sm dark:bg-[#11131d] sm:p-5 ${item.enviadaHoje ? "border-emerald-200 dark:border-emerald-400/20" : "border-slate-200 dark:border-white/10"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${categoriaStyle[item.categoria] || "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      {item.categoria}
                    </span>
                    <h2 className="mt-3 truncate text-lg font-bold text-slate-950 dark:text-white">{item.nome}</h2>
                    <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{item.detalhe}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-400">{item.telefone || "Sem telefone cadastrado"}</p>
                  </div>
                  {item.enviadaHoje ? (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" title="Já enviada hoje">
                      <CheckCircle2 className="size-5" />
                    </div>
                  ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                      <MessageCircle className="size-5" />
                    </div>
                  )}
                </div>

                {item.enviadaHoje ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    Enviada hoje {item.ultimaComunicacaoEm ? `às ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(item.ultimaComunicacaoEm))}` : ""}.
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" asChild>
                    <Link href={item.destinoHref}>Ver cadastro</Link>
                  </Button>
                  <Button type="button" onClick={() => abrirModal(item)} disabled={!item.telefone}>
                    <Send className="size-4" />
                    Preparar mensagem
                  </Button>
                </div>
              </article>
            )) : (
              <div className="xl:col-span-2 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-white/10 dark:bg-white/[0.025]">
                <ShieldCheck className="mx-auto size-8 text-emerald-500" />
                <h2 className="mt-3 font-bold text-slate-900 dark:text-white">Nenhuma comunicação encontrada neste filtro.</h2>
                <p className="mt-1 text-sm text-slate-500">A fila é montada automaticamente com dados da Agenda, Clientes e CRM.</p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {tab === "modelos" ? (
        <section>
          <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#11131d] sm:p-5">
            <div className="flex items-start gap-3">
              <PencilLine className="mt-0.5 size-5 text-violet-600" />
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">Biblioteca de mensagens</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Os textos podem ser adaptados pela equipe. Mensagens de pós-atendimento devem permanecer genéricas ou ser aprovadas pela responsável técnica antes de incluir orientações clínicas específicas.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {modelos.map((modelo) => <ModeloCard key={modelo.id} modelo={modelo} podeGerenciar={podeGerenciar} />)}
          </div>
        </section>
      ) : null}

      {tab === "historico" ? (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#11131d]">
          <div className="border-b border-slate-200 p-4 dark:border-white/10 sm:p-5">
            <h2 className="font-bold text-slate-950 dark:text-white">Histórico recente de comunicação</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Aberturas do WhatsApp e envios confirmados manualmente ficam separados para manter o histórico honesto.</p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-white/[0.07]">
            {historico.length > 0 ? historico.map((item) => (
              <article key={item.id} className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_180px_150px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">{item.destinatarioNome}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${item.status === "Enviada" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.categoria}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{item.mensagem}</p>
                </div>
                <div className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  <p className="font-bold text-slate-700 dark:text-slate-300">{formatarDataHora(item.enviadoEm || item.createdAt)}</p>
                  <p>{item.usuario || "Usuário não registrado"}</p>
                </div>
                <div>
                  {item.clienteId ? (
                    <Link href={`/clientes/${item.clienteId}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:text-violet-700 dark:border-white/10 dark:text-slate-300">
                      Abrir cliente <ExternalLink className="size-3" />
                    </Link>
                  ) : item.leadId ? (
                    <Link href="/marketing" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:text-violet-700 dark:border-white/10 dark:text-slate-300">
                      Abrir CRM <ExternalLink className="size-3" />
                    </Link>
                  ) : null}
                </div>
              </article>
            )) : (
              <div className="p-10 text-center text-sm text-slate-500">Nenhuma comunicação registrada ainda.</div>
            )}
          </div>
        </section>
      ) : null}

      {selecionado ? (
        <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-5">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#11131d]">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 dark:border-white/10 sm:p-5">
              <div>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${categoriaStyle[selecionado.categoria] || "border-slate-200 bg-slate-50 text-slate-600"}`}>
                  {selecionado.categoria}
                </span>
                <h2 className="mt-3 text-xl font-bold text-slate-950 dark:text-white">Mensagem para {selecionado.nome}</h2>
                <p className="mt-1 text-sm text-slate-500">{selecionado.detalhe}</p>
              </div>
              <button type="button" onClick={fecharModal} className="flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.05]" aria-label="Fechar">
                <X className="size-4" />
              </button>
            </header>

            <div className="p-4 sm:p-5">
              {selecionado.enviadaHoje ? (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
                  <strong>Já existe envio registrado hoje.</strong> Revise antes de abrir uma nova conversa para evitar mensagens duplicadas.
                </div>
              ) : null}

              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Revise antes de abrir</span>
                <textarea
                  value={mensagemEditada}
                  onChange={(event) => setMensagemEditada(event.target.value)}
                  className="min-h-72 resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-900 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-100"
                />
              </label>

              <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
                <strong>Abrir WhatsApp</strong> registra apenas que a conversa foi aberta. Use <strong>Marcar como enviada</strong> somente depois de confirmar que a mensagem realmente foi enviada.
              </div>

              {erro ? <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">{erro}</div> : null}

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <Button type="button" variant="outline" onClick={fecharModal} disabled={isPending}>Fechar</Button>
                <Button type="button" variant="outline" onClick={abrirWhatsApp} disabled={!mensagemEditada.trim() || !selecionado.telefone}>
                  <ExternalLink className="size-4" />
                  Abrir WhatsApp
                </Button>
                <Button type="button" onClick={() => marcarEnviada(false)} disabled={!podeGerenciar || isPending || !mensagemEditada.trim()}>
                  <CheckCircle2 className="size-4" />
                  {isPending ? "Registrando..." : "Marcar como enviada"}
                </Button>
              </div>

              {erro?.includes("Já existe uma comunicação") && podeGerenciar ? (
                <button type="button" onClick={() => marcarEnviada(true)} disabled={isPending} className="mt-3 w-full text-center text-xs font-bold text-rose-600 underline underline-offset-4">
                  Registrar novo envio mesmo assim
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
