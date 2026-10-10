import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requirePagePermission } from "@/lib/auth";
import { formatarMoeda } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  dataValida,
  hojeSaoPaulo,
  listaPorProcedimento,
  primeiroDiaDoMes,
  resumoPorProcedimento,
  type FiltroRelatorio,
  type LinhaOrigem,
  type TipoLista,
} from "@/lib/relatorio-procedimentos";

export const dynamic = "force-dynamic";

type Params = Promise<Record<string, string | string[] | undefined>>;

function um(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}

function dataBr(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function diaBr(dia: string) {
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a}`;
}

function somar(linhas: LinhaOrigem[]) {
  return linhas.reduce(
    (acc, l) => ({ quantidade: acc.quantidade + l.quantidade, valor: acc.valor + l.valor }),
    { quantidade: 0, valor: 0 },
  );
}

const TITULO_LISTA: Record<TipoLista, string> = {
  feitos: "Quem fez (pagos)",
  agendados: "Agendados em aberto",
  pendentes: "Feitos e ainda não pagos",
};

export default async function RelatorioProcedimentosPage({ searchParams }: { searchParams: Params }) {
  await requirePagePermission("relatorios.visualizar");
  const params = await searchParams;

  const hoje = hojeSaoPaulo();
  let inicio = dataValida(um(params.inicio)) ? (um(params.inicio) as string) : primeiroDiaDoMes(hoje);
  let fim = dataValida(um(params.fim)) ? (um(params.fim) as string) : hoje;
  if (fim < inicio) [inicio, fim] = [fim, inicio];

  const procedimentos = await prisma.procedimentoServico.findMany({
    orderBy: [{ status: "asc" }, { nome: "asc" }],
    select: { id: true, nome: true, status: true },
  });

  const idPedido = Number(um(params.procedimento));
  const escolhido = Number.isInteger(idPedido) ? procedimentos.find((p) => p.id === idPedido) : undefined;

  const filtro: FiltroRelatorio = {
    procedimentoId: escolhido?.id ?? null,
    procedimentoNome: escolhido?.nome ?? null,
    inicio,
    fim,
  };

  const resumo = await resumoPorProcedimento(filtro);
  const totalFeitos = somar(resumo.feitos);
  const totalAgendados = somar(resumo.agendados);
  const totalPendentes = somar(resumo.pendentes);
  const google = resumo.feitos.find((l) => l.grupo === "Google Ads") ?? { quantidade: 0, valor: 0 };
  const outras = {
    quantidade: totalFeitos.quantidade - google.quantidade,
    valor: totalFeitos.valor - google.valor,
  };

  const tipoPedido = um(params.lista);
  const tipo: TipoLista | null =
    tipoPedido === "feitos" || tipoPedido === "agendados" || tipoPedido === "pendentes" ? tipoPedido : null;
  const lista = tipo ? await listaPorProcedimento(filtro, tipo, Number(um(params.pagina)) || 1) : null;

  const nomeProc = escolhido ? escolhido.nome : "procedimentos";
  const base = new URLSearchParams({ inicio, fim });
  if (escolhido) base.set("procedimento", String(escolhido.id));
  const linkLista = (t: TipoLista, pagina = 1) => {
    const q = new URLSearchParams(base);
    q.set("lista", t);
    q.set("pagina", String(pagina));
    return `/relatorios/procedimentos?${q.toString()}`;
  };

  const campo =
    "mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-white/15 dark:bg-slate-900 dark:text-white";

  return (
    <div className="app-mobile-safe space-y-4 pb-6 sm:space-y-6 sm:pb-0">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-7">
        <Link
          href="/relatorios"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-violet-700 dark:text-slate-400"
        >
          <ArrowLeft size={14} /> Voltar para Relatórios
        </Link>
        <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Relatório por procedimento
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Escolha o procedimento e o período. Os números vêm direto do banco, então abre rápido mesmo com
          muitos registros.
        </p>

        <form method="get" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">
            Procedimento
            <select name="procedimento" defaultValue={escolhido ? String(escolhido.id) : ""} className={campo}>
              <option value="">Todos</option>
              {procedimentos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                  {p.status !== "Ativo" ? " (inativo)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            De
            <input type="date" name="inicio" defaultValue={inicio} className={campo} />
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Até
            <input type="date" name="fim" defaultValue={fim} className={campo} />
          </label>
          <div className="sm:col-span-4">
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
            >
              Ver relatório
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100 sm:p-5">
        <p className="text-base font-semibold">
          Do dia {diaBr(inicio)} ao dia {diaBr(fim)}, fizemos {totalFeitos.quantidade}{" "}
          {escolhido ? escolhido.nome : "procedimento(s)"} ({formatarMoeda(totalFeitos.valor)}), sendo{" "}
          {google.quantidade} pelo Google ({formatarMoeda(google.valor)}) e {outras.quantidade} por outras
          origens ({formatarMoeda(outras.valor)}).
        </p>
        <p className="mt-1 text-xs opacity-80">
          Conta só o que foi vendido e já está pago. As vendas canceladas ficam de fora.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Cartao
          titulo="Feitos e pagos"
          quantidade={totalFeitos.quantidade}
          valor={totalFeitos.valor}
          link={linkLista("feitos")}
          textoLink="Ver quem fez"
        />
        <Cartao
          titulo="Agendados em aberto"
          quantidade={totalAgendados.quantidade}
          valor={totalAgendados.valor}
          link={linkLista("agendados")}
          textoLink="Ver quem está agendado"
          dica="Marcados na agenda e ainda não atendidos."
        />
        <Cartao
          titulo="Feitos e ainda não pagos"
          quantidade={totalPendentes.quantidade}
          valor={totalPendentes.valor}
          link={linkLista("pendentes")}
          textoLink="Ver quem falta pagar"
          dica="Já vendidos, com pagamento pendente."
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">De onde vieram</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Cada pessoa entra em um só grupo. Google Ads = veio de campanha do Google ou guardou o código de
          clique do anúncio.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="py-2 pr-3">Origem</th>
                <th className="py-2 pr-3 text-right">Feitos (pagos)</th>
                <th className="py-2 pr-3 text-right">Valor</th>
                <th className="py-2 pr-3 text-right">Agendados</th>
                <th className="py-2 text-right">Não pagos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {resumo.feitos.map((linha, i) => (
                <tr key={linha.grupo} className="text-slate-800 dark:text-slate-100">
                  <td className="py-2 pr-3 font-medium">{linha.grupo}</td>
                  <td className="py-2 pr-3 text-right">{linha.quantidade}</td>
                  <td className="py-2 pr-3 text-right">{formatarMoeda(linha.valor)}</td>
                  <td className="py-2 pr-3 text-right">{resumo.agendados[i].quantidade}</td>
                  <td className="py-2 text-right">{resumo.pendentes[i].quantidade}</td>
                </tr>
              ))}
              <tr className="font-bold text-slate-900 dark:text-white">
                <td className="py-2 pr-3">Total</td>
                <td className="py-2 pr-3 text-right">{totalFeitos.quantidade}</td>
                <td className="py-2 pr-3 text-right">{formatarMoeda(totalFeitos.valor)}</td>
                <td className="py-2 pr-3 text-right">{totalAgendados.quantidade}</td>
                <td className="py-2 text-right">{totalPendentes.quantidade}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {lista && tipo ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {TITULO_LISTA[tipo]} - {nomeProc}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {lista.total} registro(s). Mostrando 30 por página.
          </p>

          {lista.linhas.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Nada neste período.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3">Procedimento</th>
                    <th className="py-2 pr-3">Origem</th>
                    <th className="py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {lista.linhas.map((l) => (
                    <tr key={l.chave} className="text-slate-800 dark:text-slate-100">
                      <td className="py-2 pr-3 whitespace-nowrap">{dataBr(l.data)}</td>
                      <td className="py-2 pr-3 font-medium">{l.cliente ?? "—"}</td>
                      <td className="py-2 pr-3">{l.procedimento}</td>
                      <td className="py-2 pr-3">{l.grupo}</td>
                      <td className="py-2 text-right">{formatarMoeda(l.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {lista.paginas > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm">
              {lista.pagina > 1 ? (
                <Link href={linkLista(tipo, lista.pagina - 1)} className="font-semibold text-violet-700 dark:text-violet-300">
                  ← Anterior
                </Link>
              ) : (
                <span />
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Página {lista.pagina} de {lista.paginas}
              </span>
              {lista.pagina < lista.paginas ? (
                <Link href={linkLista(tipo, lista.pagina + 1)} className="font-semibold text-violet-700 dark:text-violet-300">
                  Próxima →
                </Link>
              ) : (
                <span />
              )}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Cartao({
  titulo,
  quantidade,
  valor,
  link,
  textoLink,
  dica,
}: {
  titulo: string;
  quantidade: number;
  valor: number;
  link: string;
  textoLink: string;
  dica?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{titulo}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{quantidade}</p>
      <p className="text-sm text-slate-600 dark:text-slate-300">{formatarMoeda(valor)}</p>
      {dica ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{dica}</p> : null}
      <Link href={link} className="mt-2 inline-block text-xs font-semibold text-violet-700 dark:text-violet-300">
        {textoLink} →
      </Link>
    </div>
  );
}
