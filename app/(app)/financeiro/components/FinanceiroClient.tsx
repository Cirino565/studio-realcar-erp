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

import {
  excluirLancamento,
  marcarLancamentoPago,
} from "@/actions/lancamento.actions";
import { Button } from "@/components/ui/button";
import { formatarMoeda } from "@/lib/format";

import FinanceiroConfiguracoes from "./FinanceiroConfiguracoes";
import FinanceiroResumo from "./FinanceiroResumo";
import LancamentosTable from "./LancamentosTable";
import NovoLancamentoModal from "./NovoLancamentoModal";
import type {
  CampanhaFinanceiroOption,
  ContaFinanceiraData,
  FinanceiroResumoData,
  FormaPagamentoConfigData,
  LancamentoFinanceiro,
  PeriodoFinanceiro,
} from "../types";

type Props = {
  lancamentos: LancamentoFinanceiro[];
  contas: ContaFinanceiraData[];
  formasPagamento: FormaPagamentoConfigData[];
  campanhas: CampanhaFinanceiroOption[];
};

type SituacaoFiltro = "ativos" | "cancelados" | "todos";

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

function isCancelado(item: LancamentoFinanceiro) {
  return (
    (item.statusPagamento || "").trim().toLowerCase() === "cancelado" ||
    item.venda?.situacao === "CANCELADA"
  );
}

function calcularResumo(lancamentos: LancamentoFinanceiro[]): FinanceiroResumoData {
  const ativos = lancamentos.filter((item) => !isCancelado(item));
  const realizados = ativos.filter(
    (item) => (item.statusPagamento || "Pago").trim().toLowerCase() === "pago",
  );
  const entradas = realizados.filter((item) => item.tipo === "ENTRADA");
  const saidas = realizados.filter((item) => item.tipo === "SAIDA");

  const totalEntradas = entradas.reduce((acc, item) => acc + item.valor, 0);
  const taxasPagamento = entradas.reduce((acc, item) => acc + Number(item.taxaPagamento || 0), 0);
  const entradasLiquidas = entradas.reduce(
    (acc, item) => acc + (item.valorLiquido ?? item.valor - Number(item.taxaPagamento || 0)),
    0,
  );
  const totalSaidas = saidas.reduce((acc, item) => acc + item.valor, 0);
  const maiorEntrada = entradas.reduce(
    (max, item) => Math.max(max, item.valor),
    0,
  );
  const maiorSaida = saidas.reduce(
    (max, item) => Math.max(max, item.valor),
    0,
  );

  return {
    entradas: totalEntradas,
    entradasLiquidas,
    taxasPagamento,
    saidas: totalSaidas,
    saldo: entradasLiquidas - totalSaidas,
    quantidadeEntradas: entradas.length,
    quantidadeSaidas: saidas.length,
    totalLancamentos: ativos.length,
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
  const header = [
    "Data",
    "Tipo",
    "Categoria original",
    "Descrição",
    "Valor bruto",
    "Taxa",
    "Valor líquido",
    "Conta",
    "Campanha",
    "Forma",
    "Status",
    "Origem",
    "Observações",
  ];
  const rows = lancamentos.map((item) => [
    new Date(item.data).toLocaleDateString("pt-BR"),
    item.tipo === "ENTRADA" ? "Entrada" : "Saída",
    item.categoria || "",
    item.descricao,
    String(item.valor).replace(".", ","),
    String(item.taxaPagamento || 0).replace(".", ","),
    String(item.valorLiquido ?? item.valor - Number(item.taxaPagamento || 0)).replace(".", ","),
    item.contaFinanceira?.nome || "",
    item.campanha?.nome || "",
    item.formaPagamento || "",
    isCancelado(item) ? "Cancelado, não contabilizado" : item.statusPagamento || "",
    item.origem || "",
    item.observacoes || "",
  ]);

  return [header, ...rows]
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";"),
    )
    .join("\n");
}

function baixarCsv(
  lancamentos: LancamentoFinanceiro[],
  situacao: SituacaoFiltro,
) {
  const csv = gerarCsv(lancamentos);
  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `financeiro-studio-realcar-${situacao}.csv`;
  anchor.click();

  URL.revokeObjectURL(url);
}

export default function FinanceiroClient({ lancamentos, contas, formasPagamento, campanhas }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [periodo, setPeriodo] = useState<PeriodoFinanceiro>("mes");
  const [categoria, setCategoria] = useState("todas");
  const [situacao, setSituacao] = useState<SituacaoFiltro>("ativos");
  const [feedback, setFeedback] = useState<{
    tipo: "ok" | "erro";
    mensagem: string;
  } | null>(null);

  const totaisSituacao = useMemo(() => {
    const cancelados = lancamentos.filter(isCancelado).length;

    return {
      ativos: lancamentos.length - cancelados,
      cancelados,
    };
  }, [lancamentos]);

  const categorias = useMemo(() => {
    const valores = new Set(
      lancamentos
        .filter((item) => situacao === "todos" || isCancelado(item) === (situacao === "cancelados"))
        .map((item) => item.categoria)
        .filter((item): item is string => Boolean(item)),
    );

    return Array.from(valores).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [lancamentos, situacao]);

  const lancamentosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca.trim());

    return lancamentos.filter((item) => {
      const data = new Date(item.data);
      const cancelado = isCancelado(item);
      const matchesSituacao =
        situacao === "todos" ||
        (situacao === "cancelados" ? cancelado : !cancelado);
      const matchesTipo = tipo === "todos" || item.tipo === tipo;
      const matchesPeriodo = isWithinPeriod(data, periodo);
      const matchesCategoria =
        categoria === "todas" || item.categoria === categoria;
      const textoBusca = normalizarTexto(
        `${item.descricao} ${item.categoria || ""} ${item.formaPagamento || ""} ${item.statusPagamento || ""} ${item.origem || ""} ${item.contaFinanceira?.nome || ""} ${item.campanha?.nome || ""} ${item.observacoes || ""}`,
      );
      const matchesBusca = !termo || textoBusca.includes(termo);

      return (
        matchesSituacao &&
        matchesTipo &&
        matchesPeriodo &&
        matchesCategoria &&
        matchesBusca
      );
    });
  }, [busca, categoria, lancamentos, periodo, situacao, tipo]);

  const resumo = useMemo(
    () => calcularResumo(lancamentosFiltrados),
    [lancamentosFiltrados],
  );

  const saldoGeral = useMemo(
    () => calcularResumo(lancamentos).saldo,
    [lancamentos],
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 text-slate-900 shadow-xl shadow-slate-900/[0.06] dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100 dark:shadow-black/20 md:p-8">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-28 left-20 size-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">
              <WalletCards className="size-3.5" />
              Gestão financeira
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-4xl">
              Financeiro
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Controle entradas, despesas, saldo operacional e acompanhe o caixa da clínica com leitura rápida para tomada de decisão.
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
                Saldo realizado: {" "}
                <strong className="text-slate-950 dark:text-white">
                  {formatarMoeda(saldoGeral)}
                </strong>
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
                {totaisSituacao.ativos} ativo(s)
              </span>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
                {totaisSituacao.cancelados} cancelado(s) para auditoria
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => baixarCsv(lancamentosFiltrados, situacao)}
              disabled={lancamentosFiltrados.length === 0}
            >
              <Download className="size-4" />
              Exportar filtro
            </Button>
            <Button type="button" onClick={() => setModalAberto(true)}>
              <Plus className="size-4" />
              Novo lançamento
            </Button>
          </div>
        </div>
      </section>

      <FinanceiroConfiguracoes contas={contas} formasPagamento={formasPagamento} />

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/[0.05] dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/20 md:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <SlidersHorizontal className="size-4 text-violet-600 dark:text-violet-300" />
          Filtros financeiros
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 dark:border-white/10 dark:bg-white/[0.04] sm:max-w-lg">
          {(
            [
              ["ativos", `Ativos (${totaisSituacao.ativos})`],
              ["cancelados", `Cancelados (${totaisSituacao.cancelados})`],
              ["todos", `Todos (${lancamentos.length})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setSituacao(value);
                setCategoria("todas");
              }}
              className={`rounded-xl px-2 py-2 text-xs font-semibold transition sm:px-3 ${
                situacao === value
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.75fr_0.75fr_0.9fr]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por descrição, categoria ou observação"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-300/40 dark:focus:bg-white/[0.075] dark:focus:ring-violet-500/10"
            />
          </label>

          <label className="relative">
            <Filter className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:focus:border-violet-300/40 dark:focus:bg-white/[0.075] dark:focus:ring-violet-500/10"
            >
              <option value="todos">Todos os tipos</option>
              <option value="ENTRADA">Entradas</option>
              <option value="SAIDA">Saídas</option>
            </select>
          </label>

          <label className="relative">
            <CalendarRange className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <select
              value={periodo}
              onChange={(event) =>
                setPeriodo(event.target.value as PeriodoFinanceiro)
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:focus:border-violet-300/40 dark:focus:bg-white/[0.075] dark:focus:ring-violet-500/10"
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
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:focus:border-violet-300/40 dark:focus:bg-white/[0.075] dark:focus:ring-violet-500/10"
          >
            <option value="todas">Todas as categorias</option>
            {categorias.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {situacao !== "ativos" ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
            Lançamentos cancelados permanecem visíveis apenas para auditoria. Eles não entram em receita, saldo, margem ou contas a receber.
          </div>
        ) : null}
      </section>

      <FinanceiroResumo resumo={resumo} />

      <LancamentosTable
        lancamentos={lancamentosFiltrados}
        isPending={isPending}
        onMarcarPago={(id) => {
          setFeedback(null);
          startTransition(async () => {
            try {
              const resultado = await marcarLancamentoPago(id);
              setFeedback({
                tipo: resultado.ok ? "ok" : "erro",
                mensagem: resultado.mensagem,
              });
              if (resultado.ok) router.refresh();
            } catch (error) {
              setFeedback({
                tipo: "erro",
                mensagem:
                  error instanceof Error
                    ? error.message
                    : "Não foi possível confirmar o pagamento.",
              });
            }
          });
        }}
        onExcluir={(id) => {
          setFeedback(null);
          startTransition(async () => {
            try {
              const resultado = await excluirLancamento(id);
              setFeedback({
                tipo: resultado.ok ? "ok" : "erro",
                mensagem: resultado.mensagem,
              });
              if (resultado.ok) router.refresh();
            } catch (error) {
              setFeedback({
                tipo: "erro",
                mensagem:
                  error instanceof Error
                    ? error.message
                    : "Não foi possível excluir o lançamento.",
              });
            }
          });
        }}
      />

      {feedback ? (
        <div
          className={`fixed bottom-20 right-5 z-50 max-w-md rounded-2xl border px-4 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur ${
            feedback.tipo === "ok"
              ? "border-emerald-300/20 bg-emerald-700/95"
              : "border-rose-300/20 bg-rose-700/95"
          }`}
        >
          {feedback.mensagem}
        </div>
      ) : null}

      {isPending ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl border border-violet-300/20 bg-violet-600/90 px-4 py-3 text-sm font-medium text-white shadow-2xl shadow-violet-950/40 backdrop-blur">
          Atualizando financeiro...
        </div>
      ) : null}

      <NovoLancamentoModal
        open={modalAberto}
        contas={contas}
        formasPagamento={formasPagamento}
        campanhas={campanhas}
        onClose={() => setModalAberto(false)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
