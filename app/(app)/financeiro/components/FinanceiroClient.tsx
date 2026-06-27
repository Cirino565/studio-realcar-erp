"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  Download,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";

import { excluirLancamento } from "@/actions/lancamento.actions";
import { Button } from "@/components/ui/button";
import { formatarMoeda } from "@/lib/format";

import FinanceiroResumo from "./FinanceiroResumo";
import LancamentosTable from "./LancamentosTable";
import NovoLancamentoModal from "./NovoLancamentoModal";
import type {
  FinanceiroResumoData,
  LancamentoFinanceiro,
  PeriodoFinanceiro,
} from "../types";

type Props = {
  lancamentos: LancamentoFinanceiro[];
};

const periodoOptions: { value: PeriodoFinanceiro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "ano", label: "Ano" },
];

function isSameDay(date: Date, reference: Date) {
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function isWithinPeriod(date: Date, periodo: PeriodoFinanceiro) {
  const now = new Date();

  if (periodo === "todos") return true;
  if (periodo === "hoje") return isSameDay(date, now);

  if (periodo === "semana") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    return date >= start && date < end;
  }

  if (periodo === "mes") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  return date.getFullYear() === now.getFullYear();
}

function calcularResumo(lancamentos: LancamentoFinanceiro[]): FinanceiroResumoData {
  const entradas = lancamentos.filter((item) => item.tipo === "ENTRADA");
  const saidas = lancamentos.filter((item) => item.tipo === "SAIDA");

  const totalEntradas = entradas.reduce((acc, item) => acc + item.valor, 0);
  const totalSaidas = saidas.reduce((acc, item) => acc + item.valor, 0);
  const maiorEntrada = entradas.reduce(
    (max, item) => Math.max(max, item.valor),
    0
  );
  const maiorSaida = saidas.reduce((max, item) => Math.max(max, item.valor), 0);

  return {
    entradas: totalEntradas,
    saidas: totalSaidas,
    saldo: totalEntradas - totalSaidas,
    quantidadeEntradas: entradas.length,
    quantidadeSaidas: saidas.length,
    totalLancamentos: lancamentos.length,
    ticketMedioEntrada: entradas.length > 0 ? totalEntradas / entradas.length : 0,
    maiorEntrada,
    maiorSaida,
  };
}

function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function gerarCsv(lancamentos: LancamentoFinanceiro[]) {
  const header = ["Data", "Tipo", "Categoria", "Descrição", "Valor", "Forma", "Status", "Origem", "Observações"];
  const rows = lancamentos.map((item) => [
    new Date(item.data).toLocaleDateString("pt-BR"),
    item.tipo === "ENTRADA" ? "Entrada" : "Saída",
    item.categoria || "",
    item.descricao,
    String(item.valor).replace(".", ","),
    item.formaPagamento || "",
    item.statusPagamento || "",
    item.origem || "",
    item.observacoes || "",
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";"))
    .join("\n");
}

function baixarCsv(lancamentos: LancamentoFinanceiro[]) {
  const csv = gerarCsv(lancamentos);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "financeiro-studio-realcar.csv";
  anchor.click();

  URL.revokeObjectURL(url);
}

export default function FinanceiroClient({ lancamentos }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [periodo, setPeriodo] = useState<PeriodoFinanceiro>("mes");
  const [categoria, setCategoria] = useState("todas");

  const categorias = useMemo(() => {
    const valores = new Set(
      lancamentos
        .map((item) => item.categoria)
        .filter((item): item is string => Boolean(item))
    );

    return Array.from(valores).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [lancamentos]);

  const lancamentosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca.trim());

    return lancamentos.filter((item) => {
      const data = new Date(item.data);
      const matchesTipo = tipo === "todos" || item.tipo === tipo;
      const matchesPeriodo = isWithinPeriod(data, periodo);
      const matchesCategoria = categoria === "todas" || item.categoria === categoria;
      const textoBusca = normalizarTexto(
        `${item.descricao} ${item.categoria || ""} ${item.formaPagamento || ""} ${item.statusPagamento || ""} ${item.origem || ""} ${item.observacoes || ""}`
      );
      const matchesBusca = !termo || textoBusca.includes(termo);

      return matchesTipo && matchesPeriodo && matchesCategoria && matchesBusca;
    });
  }, [busca, categoria, lancamentos, periodo, tipo]);

  const resumo = useMemo(
    () => calcularResumo(lancamentosFiltrados),
    [lancamentosFiltrados]
  );

  const saldoGeral = useMemo(() => calcularResumo(lancamentos).saldo, [lancamentos]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-slate-950/80 p-6 shadow-2xl shadow-black/20 md:p-8">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-28 left-20 size-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-violet-200">
              <WalletCards className="size-3.5" />
              Gestão financeira
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Financeiro
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Controle entradas, despesas, saldo operacional e acompanhe o caixa da clínica com leitura rápida para tomada de decisão.
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-slate-300 ring-1 ring-white/[0.08]">
                Saldo geral: <strong className="text-white">{formatarMoeda(saldoGeral)}</strong>
              </span>
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-slate-300 ring-1 ring-white/[0.08]">
                {lancamentos.length} lançamento(s) cadastrados
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => baixarCsv(lancamentosFiltrados)}
              disabled={lancamentosFiltrados.length === 0}
            >
              <Download className="size-4" />
              Exportar CSV
            </Button>
            <Button type="button" onClick={() => setModalAberto(true)}>
              <Plus className="size-4" />
              Novo lançamento
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/[0.08] bg-slate-950/70 p-4 shadow-2xl shadow-black/20 md:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-300">
          <SlidersHorizontal className="size-4 text-violet-300" />
          Filtros financeiros
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por descrição, categoria ou observação"
              className="h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
            />
          </label>

          <label className="relative">
            <Filter className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
              className="h-11 w-full rounded-2xl border border-white/[0.08] bg-slate-900 pl-11 pr-4 text-sm text-white outline-none transition focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
            >
              <option value="todos">Todos os tipos</option>
              <option value="ENTRADA">Entradas</option>
              <option value="SAIDA">Saídas</option>
            </select>
          </label>

          <label className="relative">
            <CalendarRange className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <select
              value={periodo}
              onChange={(event) => setPeriodo(event.target.value as PeriodoFinanceiro)}
              className="h-11 w-full rounded-2xl border border-white/[0.08] bg-slate-900 pl-11 pr-4 text-sm text-white outline-none transition focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
            >
              {periodoOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <select
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
            className="h-11 w-full rounded-2xl border border-white/[0.08] bg-slate-900 px-4 text-sm text-white outline-none transition focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
          >
            <option value="todas">Todas as categorias</option>
            {categorias.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </section>

      <FinanceiroResumo resumo={resumo} />

      <LancamentosTable
        lancamentos={lancamentosFiltrados}
        isPending={isPending}
        onExcluir={(id) => {
          startTransition(async () => {
            await excluirLancamento(id);
            router.refresh();
          });
        }}
      />

      {isPending ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl border border-violet-300/20 bg-violet-600/90 px-4 py-3 text-sm font-medium text-white shadow-2xl shadow-violet-950/40 backdrop-blur">
          Atualizando financeiro...
        </div>
      ) : null}

      <NovoLancamentoModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
