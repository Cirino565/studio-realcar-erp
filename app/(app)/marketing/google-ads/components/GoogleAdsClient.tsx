"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  Send,
  XCircle,
} from "lucide-react";

import {
  definirConversaoPorProcedimento,
  enviarConversoesAgora,
} from "@/actions/google-ads.actions";

type StatusVenda = "ENVIADA" | "AGUARDANDO" | "ERRO" | "NAO_ENVIADA" | "NAO_SE_APLICA";

type VendaLinha = {
  vendaId: number;
  clienteNome: string | null;
  data: string;
  valor: number;
  status: StatusVenda;
  motivo: string;
};

type Props = {
  vendas: VendaLinha[];
  cliques: {
    total: number;
    comGclid: number;
    semGclid: { id: number; codigo: string | null; origem: string | null; cliente: string | null; data: string }[];
  };
  nomeConversao: string;
  nomesPorProcedimento: string[];
  porProcedimento: boolean;
  driveConfigurado: boolean;
  ultimaExecucao: { ok: boolean; detalhes: string | null; usuario: string; data: string } | null;
  podeGerenciar: boolean;
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

const VISUAL: Record<Exclude<StatusVenda, "NAO_SE_APLICA">, { texto: string; classe: string }> = {
  ENVIADA: { texto: "Enviada", classe: "bg-emerald-100 text-emerald-700" },
  AGUARDANDO: { texto: "Aguardando envio", classe: "bg-amber-100 text-amber-700" },
  ERRO: { texto: "Erro", classe: "bg-rose-100 text-rose-700" },
  NAO_ENVIADA: { texto: "Não enviada", classe: "bg-slate-200 text-slate-700" },
};

export default function GoogleAdsClient({
  vendas,
  cliques,
  nomeConversao,
  nomesPorProcedimento,
  porProcedimento,
  driveConfigurado,
  ultimaExecucao,
  podeGerenciar,
}: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [filtro, setFiltro] = useState<"problemas" | "todas">("problemas");

  const contagem = useMemo(() => {
    const base = { ENVIADA: 0, AGUARDANDO: 0, ERRO: 0, NAO_ENVIADA: 0 };
    for (const venda of vendas) {
      if (venda.status !== "NAO_SE_APLICA") base[venda.status] += 1;
    }
    return base;
  }, [vendas]);

  const linhas = vendas.filter((venda) =>
    filtro === "todas" ? true : venda.status !== "ENVIADA",
  );

  function enviarAgora() {
    setMensagem(null);
    iniciar(async () => {
      try {
        const resultado = await enviarConversoesAgora();
        if (resultado.ok) {
          setMensagem({
            tipo: "ok",
            texto: `Planilha atualizada: ${resultado.vendas} venda(s), ${resultado.novas} nova(s). O Google Ads importa na agenda que está configurada lá.`,
          });
        } else {
          setMensagem({ tipo: "erro", texto: resultado.erro });
        }
        router.refresh();
      } catch (erro) {
        setMensagem({
          tipo: "erro",
          texto: erro instanceof Error ? erro.message : "Não foi possível enviar agora.",
        });
      }
    });
  }

  function alternarPorProcedimento() {
    setMensagem(null);
    iniciar(async () => {
      try {
        await definirConversaoPorProcedimento(!porProcedimento);
        router.refresh();
      } catch (erro) {
        setMensagem({
          tipo: "erro",
          texto: erro instanceof Error ? erro.message : "Não foi possível salvar.",
        });
      }
    });
  }

  return (
    <div className="app-mobile-safe space-y-4 pb-6 sm:space-y-6 sm:pb-0">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-7">
        <Link
          href="/marketing"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-700 dark:text-slate-400"
        >
          <ArrowLeft size={14} /> Voltar para Marketing
        </Link>
        <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Conversões enviadas ao Google Ads
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Mostra quais vendas de clientes que vieram de anúncio já foram para a planilha que o Google
          Ads lê, quais estão esperando e quais não conseguem subir (e por quê). Considera os últimos
          90 dias.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Resumo icone={<CheckCircle2 size={16} />} rotulo="Enviadas" valor={contagem.ENVIADA} classe="text-emerald-700" />
          <Resumo icone={<Clock3 size={16} />} rotulo="Aguardando envio" valor={contagem.AGUARDANDO} classe="text-amber-700" />
          <Resumo icone={<AlertTriangle size={16} />} rotulo="Com erro" valor={contagem.ERRO} classe="text-rose-700" />
          <Resumo icone={<XCircle size={16} />} rotulo="Não enviadas" valor={contagem.NAO_ENVIADA} classe="text-slate-700 dark:text-slate-300" />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
          {ultimaExecucao ? (
            <p className={ultimaExecucao.ok ? "text-slate-700 dark:text-slate-200" : "font-semibold text-rose-700"}>
              {ultimaExecucao.ok ? "Última atualização da planilha: " : "A última tentativa FALHOU: "}
              {dataHora(ultimaExecucao.data)} ({ultimaExecucao.usuario}).{" "}
              <span className="text-xs text-slate-500 dark:text-slate-400">{ultimaExecucao.detalhes}</span>
            </p>
          ) : (
            <p className="text-slate-700 dark:text-slate-200">
              A planilha ainda não foi atualizada nenhuma vez por aqui.
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            A atualização automática roda todo dia às 4h. Quem importa a planilha para dentro do Google Ads
            é o próprio Google, no horário configurado lá.
          </p>

          {!driveConfigurado ? (
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              O Google Drive ainda não está configurado neste sistema, então a planilha não pode ser atualizada.
            </p>
          ) : null}

          {podeGerenciar ? (
            <button
              type="button"
              onClick={enviarAgora}
              disabled={pendente || !driveConfigurado}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
            >
              {pendente ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Enviar agora
            </button>
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
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Vendas</h2>
          <div className="flex gap-1.5 text-xs font-semibold">
            {(["problemas", "todas"] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => setFiltro(opcao)}
                className={`rounded-full border px-3 py-1.5 ${
                  filtro === opcao
                    ? "border-violet-300 bg-violet-100 text-violet-800"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {opcao === "problemas" ? "Só as que ainda não subiram" : "Todas"}
              </button>
            ))}
          </div>
        </div>

        {linhas.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Nenhuma venda para mostrar neste filtro.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/10">
            {linhas.map((venda) => {
              const visual = VISUAL[venda.status as keyof typeof VISUAL];
              return (
                <li key={venda.vendaId} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Venda #{venda.vendaId}, {venda.clienteNome || "Cliente não vinculada"}
                    </p>
                    {visual ? (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${visual.classe}`}>
                        {visual.texto}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {dataHora(venda.data)} · {moeda(venda.valor)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{venda.motivo}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Cliques que viraram contato</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Nos últimos 90 dias, <strong>{cliques.total}</strong> clique(s) no botão de WhatsApp geraram contato;{" "}
          <strong>{cliques.comGclid}</strong> guardaram o código de clique do Google (gclid) e{" "}
          <strong className={cliques.total - cliques.comGclid > 0 ? "text-rose-700" : ""}>
            {cliques.total - cliques.comGclid}
          </strong>{" "}
          não guardaram. Sem o código, a venda dessa pessoa nunca sobe para o Google.
        </p>
        {cliques.semGclid.length > 0 ? (
          <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
            {cliques.semGclid.map((clique) => (
              <li key={clique.id}>
                {dataHora(clique.data)} · código {clique.codigo} · {clique.origem || "sem origem"}
                {clique.cliente ? ` · cliente ${clique.cliente}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 text-xs text-slate-500">
          Se muitos contatos de anúncio estão sem código, o problema é na página do anúncio: ela precisa
          ler o gclid do endereço e mandar junto no clique do WhatsApp (e guardá-lo no navegador para não
          perder se a pessoa trocar de página).
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nomes das conversões</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          O nome enviado precisa ser <strong>idêntico</strong>, letra por letra, ao nome da conversão criada
          no Google Ads (Metas → Conversões). Se não bater, o Google recusa a linha.
        </p>
        <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 dark:bg-white/10 dark:text-white">
          {nomeConversao}
        </p>

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-900 dark:text-white">
              Enviar também uma conversão por procedimento
            </p>
            {podeGerenciar ? (
              <button
                type="button"
                onClick={alternarPorProcedimento}
                disabled={pendente}
                className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                  porProcedimento
                    ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {porProcedimento ? "Ligado (tocar para desligar)" : "Desligado (tocar para ligar)"}
              </button>
            ) : (
              <span className="text-xs font-semibold text-slate-500">
                {porProcedimento ? "Ligado" : "Desligado"}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">
            Cada venda também sobe com o nome do procedimento (ex.: {nomesPorProcedimento[0] || `${nomeConversao} - Limpeza de Pele`}),
            para o Google separar por tipo. Antes de ligar, crie no Google Ads uma conversão para cada nome
            abaixo, como <strong>secundária</strong> (sem contar em “Conversões”, para não contar a venda duas vezes).
            A conversão “{nomeConversao}” continua sendo enviada normalmente.
          </p>
          {nomesPorProcedimento.length > 0 ? (
            <ul className="mt-2 grid gap-1 text-xs text-slate-700 dark:text-slate-300 sm:grid-cols-2">
              {nomesPorProcedimento.map((nome) => (
                <li key={nome} className="rounded-lg bg-slate-50 px-2 py-1 dark:bg-white/[0.04]">
                  {nome}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Conferir no Google Ads</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700 dark:text-slate-300">
          <li>
            Em Metas → Conversões → Uploads, a fonte da importação deve ser a planilha “Conversões Google Ads” e a
            programação ligada (diária). Veja ali o resultado da última importação e os erros por linha.
          </li>
          <li>
            A conversão “{nomeConversao}” deve existir com esse nome exato, do tipo importação de cliques.
          </li>
          <li>
            A “janela de conversão após clique” dessa conversão deve estar em 90 dias. Com 30 dias (padrão), vendas
            feitas depois disso são recusadas pelo Google.
          </li>
          <li>
            Se a conversão está para contar “Uma” por clique, só a primeira venda de cada clique conta; para contar
            todas as compras, use “Todas”.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Resumo({
  icone,
  rotulo,
  valor,
  classe,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: number;
  classe: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
      <p className={`flex items-center justify-center gap-1.5 text-2xl font-bold ${classe}`}>
        {icone}
        {valor}
      </p>
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{rotulo}</p>
    </div>
  );
}
