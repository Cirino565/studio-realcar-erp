"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Download,
  LineChart,
  PackageSearch,
  PieChart,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatarData, formatarMoeda } from "@/lib/format";
import type {
  AbaRelatorio,
  AgendamentoRelatorio,
  ClienteRelatorio,
  LancamentoRelatorio,
  PeriodoRelatorio,
  ProdutoRelatorio,
  RelatoriosData,
} from "../types";

type Props = {
  data: RelatoriosData;
};

type ResumoFinanceiro = {
  receita: number;
  despesas: number;
  saldo: number;
  margem: number;
  ticketMedio: number;
  entradas: number;
  saidas: number;
};

type BarItem = {
  label: string;
  value: number;
  description?: string;
};

const periodoOptions: { value: PeriodoRelatorio; label: string }[] = [
  { value: "mes", label: "Este mês" },
  { value: "trimestre", label: "Trimestre" },
  { value: "ano", label: "Ano" },
  { value: "todos", label: "Todo período" },
];

const abas: { value: AbaRelatorio; label: string }[] = [
  { value: "visao", label: "Visão geral" },
  { value: "financeiro", label: "Financeiro" },
  { value: "agenda", label: "Agenda" },
  { value: "clientes", label: "Clientes" },
  { value: "estoque", label: "Estoque" },
];

function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isWithinPeriod(value: string, periodo: PeriodoRelatorio) {
  if (periodo === "todos") return true;

  const date = new Date(value);
  const now = new Date();

  if (periodo === "mes") {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  if (periodo === "trimestre") {
    const trimestreAtual = Math.floor(now.getMonth() / 3);
    const trimestreData = Math.floor(date.getMonth() / 3);

    return date.getFullYear() === now.getFullYear() && trimestreData === trimestreAtual;
  }

  return date.getFullYear() === now.getFullYear();
}

function calcularResumoFinanceiro(lancamentos: LancamentoRelatorio[], clientes: ClienteRelatorio[]): ResumoFinanceiro {
  const entradas = lancamentos.filter((item) => item.tipo === "ENTRADA");
  const saidas = lancamentos.filter((item) => item.tipo === "SAIDA");
  const receita = entradas.reduce((acc, item) => acc + item.valor, 0);
  const despesas = saidas.reduce((acc, item) => acc + item.valor, 0);
  const saldo = receita - despesas;

  return {
    receita,
    despesas,
    saldo,
    margem: receita > 0 ? (saldo / receita) * 100 : 0,
    ticketMedio: clientes.length > 0 ? receita / clientes.length : 0,
    entradas: entradas.length,
    saidas: saidas.length,
  };
}

function agruparPorCategoria(lancamentos: LancamentoRelatorio[], tipo: "ENTRADA" | "SAIDA") {
  const map = new Map<string, number>();

  lancamentos
    .filter((item) => item.tipo === tipo)
    .forEach((item) => {
      const categoria = item.categoria || "Sem categoria";
      map.set(categoria, (map.get(categoria) || 0) + item.valor);
    });

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function agruparAgendamentosPorProcedimento(agendamentos: AgendamentoRelatorio[]) {
  const map = new Map<string, number>();

  agendamentos.forEach((item) => {
    map.set(item.procedimento, (map.get(item.procedimento) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function agruparStatusAgenda(agendamentos: AgendamentoRelatorio[]) {
  const map = new Map<string, number>();

  agendamentos.forEach((item) => {
    map.set(item.status, (map.get(item.status) || 0) + 1);
  });

  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function calcularFluxoMensal(lancamentos: LancamentoRelatorio[]) {
  const meses = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));

    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      receita: 0,
      despesas: 0,
    };
  });

  lancamentos.forEach((item) => {
    const date = new Date(item.data);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const mes = meses.find((mesItem) => mesItem.key === key);

    if (!mes) return;

    if (item.tipo === "ENTRADA") {
      mes.receita += item.valor;
    } else if (item.tipo === "SAIDA") {
      mes.despesas += item.valor;
    }
  });

  return meses;
}

function gerarCsv(data: RelatoriosData, periodo: PeriodoRelatorio) {
  const linhas = [
    ["Relatório", "Studio Realçar"],
    ["Período", periodo],
    ["Gerado em", new Date().toLocaleString("pt-BR")],
    [],
    ["Financeiro"],
    ["Data", "Tipo", "Categoria", "Descrição", "Valor"],
    ...data.lancamentos
      .filter((item) => isWithinPeriod(item.data, periodo))
      .map((item) => [
        formatarData(item.data),
        item.tipo,
        item.categoria || "",
        item.descricao,
        String(item.valor).replace(".", ","),
      ]),
    [],
    ["Agenda"],
    ["Data", "Cliente", "Procedimento", "Status"],
    ...data.agendamentos
      .filter((item) => isWithinPeriod(item.data, periodo))
      .map((item) => [formatarData(item.data), item.clienteNome, item.procedimento, item.status]),
    [],
    ["Estoque crítico"],
    ["Produto", "Quantidade", "Mínimo", "Fornecedor"],
    ...data.produtos
      .filter((produto) => produto.quantidade <= produto.estoqueMinimo)
      .map((produto) => [
        produto.nome,
        String(produto.quantidade),
        String(produto.estoqueMinimo),
        produto.fornecedorNome || "",
      ]),
  ];

  return linhas
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
    .join("\n");
}

function baixarRelatorio(data: RelatoriosData, periodo: PeriodoRelatorio) {
  const csv = gerarCsv(data, periodo);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `relatorio-studio-realcar-${periodo}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "neutral",
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof BarChart3;
  tone?: "neutral" | "success" | "danger" | "warning" | "info";
}) {
  const toneClass = {
    neutral: "from-white/[0.12] to-white/[0.06] text-white",
    success: "from-emerald-400/20 to-emerald-400/[0.06] text-emerald-200",
    danger: "from-rose-400/20 to-rose-400/[0.06] text-rose-200",
    warning: "from-amber-400/20 to-amber-400/[0.06] text-amber-200",
    info: "from-cyan-400/20 to-cyan-400/[0.06] text-cyan-200",
  }[tone];

  return (
    <div className="rounded-3xl border border-white/[0.12] bg-white/[0.08] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-300">{title}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{value}</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
        </div>
        <div className={`rounded-2xl bg-gradient-to-br p-3 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function BarList({ title, items, currency = false }: { title: string; items: BarItem[]; currency?: boolean }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className="rounded-3xl border border-white/[0.12] bg-white/[0.08] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <PieChart className="h-5 w-5 text-slate-400" />
      </div>

      <div className="mt-6 space-y-4">
        {items.length > 0 ? (
          items.map((item) => {
            const width = Math.max((item.value / max) * 100, 6);

            return (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-slate-300">{item.label}</span>
                  <span className="shrink-0 font-medium text-white">
                    {currency ? formatarMoeda(item.value) : item.value}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-950/60">
                  <div className="h-2 rounded-full bg-gradient-to-r from-cyan-300/70 to-violet-300/70" style={{ width: `${width}%` }} />
                </div>
                {item.description ? <p className="mt-1 text-xs text-slate-500">{item.description}</p> : null}
              </div>
            );
          })
        ) : (
          <p className="rounded-2xl border border-dashed border-white/[0.12] p-5 text-sm text-slate-400">
            Ainda não há dados suficientes para este indicador.
          </p>
        )}
      </div>
    </section>
  );
}

function FluxoMensal({ lancamentos }: { lancamentos: LancamentoRelatorio[] }) {
  const fluxo = calcularFluxoMensal(lancamentos);
  const max = Math.max(...fluxo.flatMap((item) => [item.receita, item.despesas]), 1);

  return (
    <section className="rounded-3xl border border-white/[0.12] bg-white/[0.08] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Fluxo dos últimos 6 meses</h2>
          <p className="mt-1 text-sm text-slate-400">Comparativo visual de entradas e saídas.</p>
        </div>
        <LineChart className="h-5 w-5 text-slate-400" />
      </div>

      <div className="mt-6 grid grid-cols-6 gap-3 sm:gap-5">
        {fluxo.map((item) => {
          const receitaHeight = Math.max((item.receita / max) * 100, item.receita > 0 ? 8 : 0);
          const despesaHeight = Math.max((item.despesas / max) * 100, item.despesas > 0 ? 8 : 0);

          return (
            <div key={item.key} className="flex min-h-48 flex-col justify-end gap-3">
              <div className="flex flex-1 items-end justify-center gap-1.5 rounded-2xl bg-slate-950/35 p-2">
                <div className="w-3 rounded-full bg-emerald-300/75 sm:w-4" style={{ height: `${receitaHeight}%` }} title={formatarMoeda(item.receita)} />
                <div className="w-3 rounded-full bg-rose-300/75 sm:w-4" style={{ height: `${despesaHeight}%` }} title={formatarMoeda(item.despesas)} />
              </div>
              <p className="text-center text-xs font-medium uppercase text-slate-400">{item.label}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-400">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-300/75" />Entradas</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-300/75" />Saídas</span>
      </div>
    </section>
  );
}

function ProdutosCriticos({ produtos }: { produtos: ProdutoRelatorio[] }) {
  const criticos = produtos
    .filter((produto) => produto.quantidade <= produto.estoqueMinimo)
    .sort((a, b) => a.quantidade - b.quantidade)
    .slice(0, 8);

  return (
    <section className="rounded-3xl border border-white/[0.12] bg-white/[0.08] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Estoque em atenção</h2>
          <p className="mt-1 text-sm text-slate-400">Produtos no mínimo ou abaixo do mínimo configurado.</p>
        </div>
        <AlertTriangle className="h-5 w-5 text-amber-300" />
      </div>

      <div className="mt-5 space-y-3">
        {criticos.length > 0 ? (
          criticos.map((produto) => (
            <div key={produto.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.10] bg-slate-950/35 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{produto.nome}</p>
                <p className="mt-1 text-xs text-slate-400">{produto.categoria || "Sem categoria"} · mínimo {produto.estoqueMinimo} {produto.unidade}</p>
              </div>
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-100">
                {produto.quantidade} {produto.unidade}
              </span>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-white/[0.12] p-5 text-sm text-slate-400">
            Nenhum produto crítico no momento.
          </p>
        )}
      </div>
    </section>
  );
}

function RankingClientes({ clientes, agendamentos }: { clientes: ClienteRelatorio[]; agendamentos: AgendamentoRelatorio[] }) {
  const ranking = clientes
    .map((cliente) => {
      const totalAgendamentos = agendamentos.filter((item) => item.clienteId === cliente.id).length;

      return {
        ...cliente,
        totalAgendamentos,
      };
    })
    .sort((a, b) => b.valorGasto + b.totalAgendamentos * 100 - (a.valorGasto + a.totalAgendamentos * 100))
    .slice(0, 8);

  return (
    <section className="rounded-3xl border border-white/[0.12] bg-white/[0.08] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Ranking de clientes</h2>
          <p className="mt-1 text-sm text-slate-400">Prioriza recorrência e valor registrado.</p>
        </div>
        <Users className="h-5 w-5 text-slate-400" />
      </div>

      <div className="mt-5 space-y-3">
        {ranking.length > 0 ? (
          ranking.map((cliente, index) => (
            <div key={cliente.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.10] bg-slate-950/35 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.10] text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{cliente.nome}</p>
                  <p className="mt-1 text-xs text-slate-400">{cliente.totalAgendamentos} agendamento(s)</p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold text-cyan-100">{formatarMoeda(cliente.valorGasto)}</span>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-white/[0.12] p-5 text-sm text-slate-400">
            Sem clientes cadastrados para o ranking.
          </p>
        )}
      </div>
    </section>
  );
}

function TabelaLancamentos({ lancamentos }: { lancamentos: LancamentoRelatorio[] }) {
  return (
    <section className="rounded-3xl border border-white/[0.12] bg-white/[0.08] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Lançamentos recentes</h2>
        <ChevronRight className="h-5 w-5 text-slate-400" />
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-white/[0.10] md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.06] text-xs uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.08]">
            {lancamentos.slice(0, 8).map((item) => (
              <tr key={item.id} className="bg-slate-950/25">
                <td className="px-4 py-4 text-slate-400">{formatarData(item.data)}</td>
                <td className="px-4 py-4 font-medium text-white">{item.descricao}</td>
                <td className="px-4 py-4 text-slate-400">{item.categoria || "-"}</td>
                <td className={`px-4 py-4 text-right font-semibold ${item.tipo === "ENTRADA" ? "text-emerald-200" : "text-rose-200"}`}>
                  {item.tipo === "ENTRADA" ? "+" : "-"} {formatarMoeda(item.valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {lancamentos.slice(0, 8).map((item) => (
          <div key={item.id} className="rounded-2xl border border-white/[0.10] bg-slate-950/35 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">{item.descricao}</p>
                <p className="mt-1 text-xs text-slate-400">{formatarData(item.data)} · {item.categoria || "Sem categoria"}</p>
              </div>
              <span className={`shrink-0 text-sm font-semibold ${item.tipo === "ENTRADA" ? "text-emerald-200" : "text-rose-200"}`}>
                {formatarMoeda(item.valor)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function RelatoriosClient({ data }: Props) {
  const [periodo, setPeriodo] = useState<PeriodoRelatorio>("mes");
  const [aba, setAba] = useState<AbaRelatorio>("visao");
  const [busca, setBusca] = useState("");

  const termoBusca = normalizarTexto(busca.trim());

  const lancamentosFiltrados = useMemo(
    () => data.lancamentos.filter((item) => isWithinPeriod(item.data, periodo)),
    [data.lancamentos, periodo]
  );

  const agendamentosFiltrados = useMemo(
    () => data.agendamentos.filter((item) => isWithinPeriod(item.data, periodo)),
    [data.agendamentos, periodo]
  );

  const clientesFiltrados = useMemo(
    () => data.clientes.filter((item) => isWithinPeriod(item.createdAt, periodo) || periodo === "todos"),
    [data.clientes, periodo]
  );

  const resumo = useMemo(
    () => calcularResumoFinanceiro(lancamentosFiltrados, data.clientes),
    [data.clientes, lancamentosFiltrados]
  );

  const produtosCriticos = data.produtos.filter((produto) => produto.quantidade <= produto.estoqueMinimo);
  const valorEstoque = data.produtos.reduce((acc, produto) => acc + produto.quantidade * produto.valorCompra, 0);
  const campanhasInvestimento = data.campanhas.reduce((acc, campanha) => acc + campanha.investimento, 0);
  const leadsPeriodo = data.leads.filter((lead) => isWithinPeriod(lead.createdAt, periodo));
  const conversaoEstimativa = leadsPeriodo.length > 0 ? (clientesFiltrados.length / (clientesFiltrados.length + leadsPeriodo.length)) * 100 : 0;

  const categoriasReceita = useMemo(() => agruparPorCategoria(lancamentosFiltrados, "ENTRADA"), [lancamentosFiltrados]);
  const categoriasDespesa = useMemo(() => agruparPorCategoria(lancamentosFiltrados, "SAIDA"), [lancamentosFiltrados]);
  const procedimentos = useMemo(() => agruparAgendamentosPorProcedimento(agendamentosFiltrados), [agendamentosFiltrados]);
  const statusAgenda = useMemo(() => agruparStatusAgenda(agendamentosFiltrados), [agendamentosFiltrados]);

  const lancamentosBuscados = useMemo(() => {
    if (!termoBusca) return lancamentosFiltrados;

    return lancamentosFiltrados.filter((item) =>
      normalizarTexto(`${item.descricao} ${item.categoria || ""} ${item.tipo}`).includes(termoBusca)
    );
  }, [lancamentosFiltrados, termoBusca]);

  const agendamentosBuscados = useMemo(() => {
    if (!termoBusca) return agendamentosFiltrados;

    return agendamentosFiltrados.filter((item) =>
      normalizarTexto(`${item.clienteNome} ${item.procedimento} ${item.status}`).includes(termoBusca)
    );
  }, [agendamentosFiltrados, termoBusca]);

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.12] bg-gradient-to-br from-slate-800/80 via-slate-900/70 to-violet-950/30 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.08] px-3 py-1 text-xs font-medium text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
              Inteligência gerencial
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Relatórios Premium</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Análise consolidada de financeiro, agenda, clientes, estoque e marketing para decisões mais rápidas.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar no relatório"
                className="h-12 w-full rounded-2xl border border-white/[0.12] bg-slate-950/35 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 sm:w-72"
              />
            </div>
            <Button onClick={() => baixarRelatorio(data, periodo)} className="h-12 rounded-2xl">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-white/[0.12] bg-white/[0.07] p-3 backdrop-blur-xl xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
          {abas.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setAba(item.value)}
              className={`shrink-0 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                aba === item.value
                  ? "bg-white text-slate-950 shadow-lg shadow-black/10"
                  : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          {periodoOptions.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setPeriodo(item.value)}
              className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                periodo === item.value
                  ? "bg-cyan-300 text-slate-950"
                  : "border border-white/[0.10] bg-slate-950/25 text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Receita" value={formatarMoeda(resumo.receita)} description={`${resumo.entradas} entrada(s) no período`} icon={TrendingUp} tone="success" />
        <MetricCard title="Despesas" value={formatarMoeda(resumo.despesas)} description={`${resumo.saidas} saída(s) no período`} icon={TrendingDown} tone="danger" />
        <MetricCard title="Saldo operacional" value={formatarMoeda(resumo.saldo)} description={`Margem de ${resumo.margem.toFixed(0)}%`} icon={Activity} tone={resumo.saldo >= 0 ? "info" : "warning"} />
        <MetricCard title="Ticket médio" value={formatarMoeda(resumo.ticketMedio)} description="Receita dividida pela base total" icon={BarChart3} tone="neutral" />
      </section>

      {aba === "visao" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <FluxoMensal lancamentos={data.lancamentos} />
          <section className="rounded-3xl border border-white/[0.12] bg-white/[0.08] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Resumo executivo</h2>
                <p className="mt-1 text-sm text-slate-400">Indicadores combinados da operação.</p>
              </div>
              <Activity className="h-5 w-5 text-slate-400" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.10] bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Clientes</p>
                <p className="mt-3 text-2xl font-semibold text-white">{data.clientes.length}</p>
                <p className="mt-1 text-sm text-slate-400">{clientesFiltrados.length} novo(s) no período</p>
              </div>
              <div className="rounded-2xl border border-white/[0.10] bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Agenda</p>
                <p className="mt-3 text-2xl font-semibold text-white">{agendamentosFiltrados.length}</p>
                <p className="mt-1 text-sm text-slate-400">atendimento(s) filtrados</p>
              </div>
              <div className="rounded-2xl border border-white/[0.10] bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Estoque</p>
                <p className="mt-3 text-2xl font-semibold text-white">{formatarMoeda(valorEstoque)}</p>
                <p className="mt-1 text-sm text-slate-400">{produtosCriticos.length} produto(s) em atenção</p>
              </div>
              <div className="rounded-2xl border border-white/[0.10] bg-slate-950/35 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Marketing</p>
                <p className="mt-3 text-2xl font-semibold text-white">{leadsPeriodo.length}</p>
                <p className="mt-1 text-sm text-slate-400">{formatarMoeda(campanhasInvestimento)} investidos · conversão {conversaoEstimativa.toFixed(0)}%</p>
              </div>
            </div>
          </section>
          <BarList title="Receitas por categoria" items={categoriasReceita} currency />
          <RankingClientes clientes={data.clientes} agendamentos={data.agendamentos} />
        </div>
      ) : null}

      {aba === "financeiro" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <FluxoMensal lancamentos={data.lancamentos} />
          <BarList title="Despesas por categoria" items={categoriasDespesa} currency />
          <BarList title="Receitas por categoria" items={categoriasReceita} currency />
          <TabelaLancamentos lancamentos={lancamentosBuscados} />
        </div>
      ) : null}

      {aba === "agenda" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <BarList title="Procedimentos mais agendados" items={procedimentos} />
          <BarList title="Status da agenda" items={statusAgenda} />
          <section className="rounded-3xl border border-white/[0.12] bg-white/[0.08] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-6 xl:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Agendamentos do período</h2>
              <CalendarDays className="h-5 w-5 text-slate-400" />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {agendamentosBuscados.slice(0, 12).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/[0.10] bg-slate-950/35 p-4">
                  <p className="text-sm font-medium text-white">{item.clienteNome}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatarData(item.data)} · {item.procedimento}</p>
                  <span className="mt-3 inline-flex rounded-full border border-white/[0.12] bg-white/[0.07] px-3 py-1 text-xs text-slate-300">{item.status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {aba === "clientes" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <RankingClientes clientes={data.clientes} agendamentos={data.agendamentos} />
          <BarList
            title="Procedimentos da base"
            items={Object.entries(
              data.clientes.reduce<Record<string, number>>((acc, cliente) => {
                const procedimento = cliente.procedimento || "Sem procedimento";
                acc[procedimento] = (acc[procedimento] || 0) + 1;
                return acc;
              }, {})
            )
              .map(([label, value]) => ({ label, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 6)}
          />
        </div>
      ) : null}

      {aba === "estoque" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ProdutosCriticos produtos={data.produtos} />
          <BarList
            title="Valor por categoria"
            items={Object.entries(
              data.produtos.reduce<Record<string, number>>((acc, produto) => {
                const categoria = produto.categoria || "Sem categoria";
                acc[categoria] = (acc[categoria] || 0) + produto.quantidade * produto.valorCompra;
                return acc;
              }, {})
            )
              .map(([label, value]) => ({ label, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 6)}
            currency
          />
          <section className="rounded-3xl border border-white/[0.12] bg-white/[0.08] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-6 xl:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Resumo do estoque</h2>
              <PackageSearch className="h-5 w-5 text-slate-400" />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.10] bg-slate-950/35 p-4">
                <p className="text-sm text-slate-400">Produtos cadastrados</p>
                <p className="mt-3 text-2xl font-semibold text-white">{data.produtos.length}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.10] bg-slate-950/35 p-4">
                <p className="text-sm text-slate-400">Valor de compra</p>
                <p className="mt-3 text-2xl font-semibold text-white">{formatarMoeda(valorEstoque)}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.10] bg-slate-950/35 p-4">
                <p className="text-sm text-slate-400">Alertas</p>
                <p className="mt-3 text-2xl font-semibold text-amber-100">{produtosCriticos.length}</p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
