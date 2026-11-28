import type { MesComparado, NumerosMes } from "@/lib/comparar-meses";

import {
  MESES_CURTOS,
  custoPorClienteAnuncio,
  diferenca,
  mediaPorCliente,
  reais,
  reaisCentavos,
  vieramDeCada10,
  type Sentido,
} from "./numeros";

function Delta({
  atual,
  anterior,
  sentido,
  formato,
  unidade,
}: {
  atual: number;
  anterior: number | undefined;
  sentido: Sentido;
  formato: "reais" | "numero";
  unidade?: string;
}) {
  const d = diferenca(atual, anterior, sentido, formato, unidade);
  if (!d) return null;
  return (
    <span className={`whitespace-nowrap text-xs font-bold ${d.cor}`}>
      {d.seta === "=" ? "= igual" : `${d.seta} ${d.texto}`}
    </span>
  );
}

function Destaque({
  titulo,
  valor,
  detalhe,
  cor,
  children,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  cor: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-3 ${cor}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{titulo}</p>
      <p className="mt-0.5 text-xl font-black leading-tight">{valor}</p>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
        {children}
        {detalhe ? <span className="text-[11px] opacity-75">{detalhe}</span> : null}
      </div>
    </div>
  );
}

type Linha = {
  rotulo: string;
  explica?: string;
  valor: string;
  atual: number;
  anterior?: number;
  sentido: Sentido;
  formato: "reais" | "numero";
  unidade?: string;
  forte?: boolean;
};

function Grupo({ titulo, linhas }: { titulo: string; linhas: Linha[] }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-violet-700">{titulo}</p>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {linhas.map((linha) => (
          <li key={linha.rotulo} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <p className={`text-sm ${linha.forte ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                {linha.rotulo}
              </p>
              {linha.explica ? <p className="text-[11px] leading-4 text-slate-400">{linha.explica}</p> : null}
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-sm ${linha.forte ? "font-black text-slate-950" : "font-bold text-slate-900"}`}>
                {linha.valor}
              </p>
              <Delta
                atual={linha.atual}
                anterior={linha.anterior}
                sentido={linha.sentido}
                formato={linha.formato}
                unidade={linha.unidade}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function linhas(n: NumerosMes, a: NumerosMes | null) {
  const p = a ?? undefined;
  const voltaram = Math.max(0, n.clientesAtendidas - n.clientesNovas);
  const voltaramAntes = p ? Math.max(0, p.clientesAtendidas - p.clientesNovas) : undefined;
  const de10 = vieramDeCada10(n);
  const custoAnuncio = custoPorClienteAnuncio(n);

  const dinheiro: Linha[] = [
    { rotulo: "Entrou", explica: "dinheiro recebido no mês", valor: reais(n.entrou), atual: n.entrou, anterior: p?.entrou, sentido: "maior", formato: "reais", forte: true },
    { rotulo: "Taxas da maquininha", valor: reais(n.taxas), atual: n.taxas, anterior: p?.taxas, sentido: "menor", formato: "reais" },
    { rotulo: "Material usado", explica: "produtos e insumos gastos nos atendimentos e vendas", valor: reais(n.material), atual: n.material, anterior: p?.material, sentido: "neutro", formato: "reais" },
    { rotulo: "Despesas do studio", explica: "aluguel, salários, marketing, contas…", valor: reais(n.despesas), atual: n.despesas, anterior: p?.despesas, sentido: "menor", formato: "reais" },
    { rotulo: "Lucro", explica: "o que sobrou depois de tudo", valor: reais(n.lucro), atual: n.lucro, anterior: p?.lucro, sentido: "maior", formato: "reais", forte: true },
    { rotulo: "Compras de estoque", explica: "reposição paga no mês (vira material depois)", valor: reais(n.comprasEstoque), atual: n.comprasEstoque, anterior: p?.comprasEstoque, sentido: "neutro", formato: "reais" },
    { rotulo: "Sobrou no caixa", explica: "entrou menos todas as saídas pagas", valor: reais(n.sobrouNoCaixa), atual: n.sobrouNoCaixa, anterior: p?.sobrouNoCaixa, sentido: "maior", formato: "reais" },
    ...(n.aReceber > 0
      ? [{ rotulo: "Ainda a receber", explica: "lançado e não pago", valor: reais(n.aReceber), atual: n.aReceber, anterior: p?.aReceber, sentido: "menor" as Sentido, formato: "reais" as const }]
      : []),
  ];

  const clientes: Linha[] = [
    { rotulo: "Atendimentos feitos", explica: n.retornos > 0 ? `${n.retornos} deles foram retornos sem custo` : undefined, valor: String(n.atendimentos), atual: n.atendimentos, anterior: p?.atendimentos, sentido: "maior", formato: "numero", forte: true },
    { rotulo: "Clientes atendidas", explica: "pessoas diferentes", valor: String(n.clientesAtendidas), atual: n.clientesAtendidas, anterior: p?.clientesAtendidas, sentido: "maior", formato: "numero", unidade: "pessoas" },
    { rotulo: "Novas", explica: "primeira vez no studio", valor: String(n.clientesNovas), atual: n.clientesNovas, anterior: p?.clientesNovas, sentido: "maior", formato: "numero", unidade: "pessoas" },
    { rotulo: "Voltaram", explica: "já eram clientes", valor: String(voltaram), atual: voltaram, anterior: voltaramAntes, sentido: "maior", formato: "numero", unidade: "pessoas" },
    { rotulo: "Média gasta por cliente", valor: reaisCentavos(mediaPorCliente(n)), atual: mediaPorCliente(n), anterior: p ? mediaPorCliente(p) : undefined, sentido: "maior", formato: "reais" },
    { rotulo: "Faltas", explica: de10 !== null ? `de cada 10 marcados, ${de10} vieram` : undefined, valor: String(n.faltas), atual: n.faltas, anterior: p?.faltas, sentido: "menor", formato: "numero" },
    { rotulo: "Cancelamentos", valor: String(n.cancelados), atual: n.cancelados, anterior: p?.cancelados, sentido: "menor", formato: "numero" },
  ];

  const produtos: Linha[] = [
    { rotulo: "Vendeu em produtos", valor: reais(n.vendeuProdutos), atual: n.vendeuProdutos, anterior: p?.vendeuProdutos, sentido: "maior", formato: "reais" },
    { rotulo: "Lucro com produtos", valor: reais(n.lucroProdutos), atual: n.lucroProdutos, anterior: p?.lucroProdutos, sentido: "maior", formato: "reais" },
  ];

  const marketing: Linha[] = [
    { rotulo: "Investido em anúncios", explica: "saídas ligadas a campanhas", valor: reais(n.investimentoAnuncios), atual: n.investimentoAnuncios, anterior: p?.investimentoAnuncios, sentido: "neutro", formato: "reais" },
    { rotulo: "Contatos que chegaram", explica: "leads no marketing", valor: String(n.leads), atual: n.leads, anterior: p?.leads, sentido: "maior", formato: "numero", unidade: "pessoas" },
    { rotulo: "Viraram clientes", valor: String(n.leadsViraramClientes), atual: n.leadsViraramClientes, anterior: p?.leadsViraramClientes, sentido: "maior", formato: "numero", unidade: "pessoas" },
    ...(custoAnuncio !== null
      ? [{ rotulo: "Cada cliente que veio custou", explica: "investido ÷ quem virou cliente", valor: reaisCentavos(custoAnuncio), atual: custoAnuncio, anterior: p ? custoPorClienteAnuncio(p) ?? undefined : undefined, sentido: "menor" as Sentido, formato: "reais" as const }]
      : []),
  ];

  return { dinheiro, clientes, produtos, marketing };
}

export default function CartaoMes({ mes, abertoDeInicio }: { mes: MesComparado; abertoDeInicio: boolean }) {
  const n = mes.numeros;
  const a = mes.anterior;
  const nomeAnterior = MESES_CURTOS[(Number(mes.chave.slice(5)) + 10) % 12].toLowerCase();
  const sobrouDe100 = n.entrou > 0 ? Math.round((n.lucro / n.entrou) * 100) : null;
  const grupos = linhas(n, a);
  const semMovimento = n.entrou === 0 && n.atendimentos === 0 && n.leads === 0;

  return (
    <section className="premium-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-950">
          {mes.nome} <span className="font-semibold text-slate-400">{mes.ano}</span>
        </h2>
        <span className="text-xs font-semibold text-slate-500">
          {mes.emAndamento
            ? `em andamento · até dia ${mes.diasContados} · comparado com ${nomeAnterior} até dia ${mes.diasContados}`
            : `comparado com ${nomeAnterior}`}
        </span>
      </div>

      {semMovimento ? (
        <p className="mt-3 text-sm text-slate-500">Sem movimento registrado neste mês.</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Destaque titulo="Entrou" valor={reais(n.entrou)} cor="border-violet-100 bg-violet-50 text-violet-950">
              <Delta atual={n.entrou} anterior={a?.entrou} sentido="maior" formato="reais" />
            </Destaque>
            <Destaque
              titulo="Lucro"
              valor={reais(n.lucro)}
              detalhe={sobrouDe100 !== null && n.lucro > 0 ? `R$ ${sobrouDe100} de cada R$ 100` : undefined}
              cor={n.lucro >= 0 ? "border-emerald-100 bg-emerald-50 text-emerald-950" : "border-rose-100 bg-rose-50 text-rose-950"}
            >
              <Delta atual={n.lucro} anterior={a?.lucro} sentido="maior" formato="reais" />
            </Destaque>
            <Destaque titulo="Atendimentos" valor={String(n.atendimentos)} detalhe={`${n.clientesAtendidas} pessoas`} cor="border-sky-100 bg-sky-50 text-sky-950">
              <Delta atual={n.atendimentos} anterior={a?.atendimentos} sentido="maior" formato="numero" />
            </Destaque>
            <Destaque titulo="Clientes novas" valor={String(n.clientesNovas)} detalhe="1ª vez no studio" cor="border-amber-100 bg-amber-50 text-amber-950">
              <Delta atual={n.clientesNovas} anterior={a?.clientesNovas} sentido="maior" formato="numero" />
            </Destaque>
          </div>

          <details className="group mt-3" open={abertoDeInicio}>
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Ver tudo de {mes.nome.toLowerCase()}
              <span className="text-xs text-violet-700 group-open:hidden">abrir</span>
              <span className="hidden text-xs text-violet-700 group-open:inline">fechar</span>
            </summary>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Grupo titulo="Dinheiro" linhas={grupos.dinheiro} />
              <Grupo titulo="Clientes e agenda" linhas={grupos.clientes} />
              <Grupo titulo="Produtos" linhas={grupos.produtos} />
              <Grupo titulo="Marketing" linhas={grupos.marketing} />
            </div>
          </details>
        </>
      )}
    </section>
  );
}
