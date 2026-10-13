"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Pencil, Plus, Repeat } from "lucide-react";

import {
  alterarSituacaoContaFixa,
  pagarContaFixa,
  salvarContaFixa,
} from "@/actions/conta-fixa.actions";
import { formatarMoeda } from "@/lib/format";

import type { ContaFinanceiraData, ContaFixaData, LancamentoFinanceiro } from "../types";

type Props = {
  contasFixas?: ContaFixaData[];
  lancamentos: LancamentoFinanceiro[];
  contas: ContaFinanceiraData[];
  onAtualizado: () => void;
};

const CATEGORIAS = [
  "Aluguel",
  "Contas de consumo",
  "Salários",
  "Impostos",
  "Marketing",
  "Produtos e insumos",
  "Equipamentos",
  "Outras despesas",
];

const FUSO = "America/Sao_Paulo";

function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());
}

function diaISO(valor: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date(valor));
}

function diaCurto(valor: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit" }).format(
    new Date(valor),
  );
}

function diasAte(de: string, ate: string) {
  const [a1, m1, d1] = de.split("-").map(Number);
  const [a2, m2, d2] = ate.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

/** Aceita "1.234,56", "1234,56" ou "1234.56". */
function lerValor(texto: string) {
  const limpo = texto.trim().replace(/\s|R\$/g, "");
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const numero = Number(normal);
  return Number.isFinite(numero) ? numero : 0;
}

function valorParaCampo(valor: number) {
  return valor.toFixed(2).replace(".", ",");
}

type Formulario = {
  id: number | null;
  nome: string;
  valor: string;
  dia: string;
  categoria: string;
  contaId: string;
  variavel: boolean;
  comecar: "este" | "proximo";
};

const FORM_VAZIO: Formulario = {
  id: null,
  nome: "",
  valor: "",
  dia: "5",
  categoria: CATEGORIAS[0],
  contaId: "",
  variavel: false,
  comecar: "este",
};

const campo =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white";

export default function ContasFixasPainel({ contasFixas = [], lancamentos, contas, onAtualizado }: Props) {
  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [pagando, setPagando] = useState<{ id: number; valor: string; data: string; contaId: string } | null>(null);
  const [form, setForm] = useState<Formulario | null>(null);
  const [gerenciarAberto, setGerenciarAberto] = useState(false);

  const hoje = useMemo(() => hojeISO(), []);
  const mesAtual = hoje.slice(0, 7);
  const contaPorId = useMemo(() => new Map(contasFixas.map((conta) => [conta.id, conta])), [contasFixas]);

  // Contas do mes: as que faltam pagar (inclusive atrasadas de meses
  // anteriores) e as ja pagas deste mes.
  const itens = useMemo(() => {
    return lancamentos
      .filter((item) => {
        if (!item.contaFixaId) return false;
        const status = (item.statusPagamento || "").toLowerCase();
        if (status === "cancelado") return false;
        if (status === "pendente") return (item.competencia || "") <= mesAtual;
        return item.competencia === mesAtual;
      })
      .map((item) => {
        const vencimento = diaISO(item.vencimento || item.data);
        const pago = (item.statusPagamento || "").toLowerCase() === "pago";
        const faltam = diasAte(hoje, vencimento);
        return { item, vencimento, pago, faltam, conta: contaPorId.get(item.contaFixaId as number) };
      })
      .sort((a, b) => Number(a.pago) - Number(b.pago) || a.vencimento.localeCompare(b.vencimento));
  }, [lancamentos, mesAtual, hoje, contaPorId]);

  const abertas = itens.filter((linha) => !linha.pago);
  const atrasadas = abertas.filter((linha) => linha.faltam < 0);
  const faltaPagar = abertas.reduce((total, linha) => total + linha.item.valor, 0);
  const pagoNoMes = itens.filter((linha) => linha.pago).reduce((total, linha) => total + linha.item.valor, 0);
  const ativas = contasFixas.filter((conta) => conta.status === "Ativa");

  function executar(acao: () => Promise<{ ok: boolean; mensagem?: string }>, sucesso: string, depois?: () => void) {
    setMensagem(null);
    iniciar(async () => {
      try {
        const resultado = await acao();
        if (resultado.ok) {
          setMensagem({ tipo: "ok", texto: resultado.mensagem || sucesso });
          depois?.();
          onAtualizado();
        } else {
          setMensagem({ tipo: "erro", texto: resultado.mensagem || "Não foi possível salvar." });
        }
      } catch (erro) {
        setMensagem({ tipo: "erro", texto: erro instanceof Error ? erro.message : "Não foi possível salvar." });
      }
    });
  }

  function confirmarPagamento() {
    if (!pagando) return;
    const valor = lerValor(pagando.valor);
    if (valor <= 0) {
      setMensagem({ tipo: "erro", texto: "Informe o valor pago." });
      return;
    }
    executar(
      () =>
        pagarContaFixa({
          lancamentoId: pagando.id,
          valor,
          data: pagando.data,
          contaFinanceiraId: pagando.contaId ? Number(pagando.contaId) : null,
        }),
      "Conta marcada como paga.",
      () => setPagando(null),
    );
  }

  function salvarFormulario() {
    if (!form) return;
    executar(
      () =>
        salvarContaFixa({
          id: form.id,
          nome: form.nome,
          valor: lerValor(form.valor),
          diaVencimento: Number(form.dia),
          categoria: form.categoria,
          contaFinanceiraId: form.contaId ? Number(form.contaId) : null,
          valorVariavel: form.variavel,
          comecar: form.comecar,
        }),
      form.id ? "Conta fixa atualizada." : "Conta fixa cadastrada. Ela já aparece nas contas do mês.",
      () => setForm(null),
    );
  }

  function editar(conta: ContaFixaData) {
    setGerenciarAberto(true);
    setForm({
      id: conta.id,
      nome: conta.nome,
      valor: valorParaCampo(conta.valor),
      dia: String(conta.diaVencimento),
      categoria: conta.categoria || CATEGORIAS[0],
      contaId: conta.contaFinanceiraId ? String(conta.contaFinanceiraId) : "",
      variavel: conta.valorVariavel,
      comecar: "este",
    });
  }

  function mudarSituacao(conta: ContaFixaData, situacao: "Ativa" | "Pausada" | "Encerrada") {
    if (situacao !== "Ativa") {
      const texto =
        situacao === "Pausada"
          ? `Pausar "${conta.nome}"? A conta deste mês que ainda não foi paga será cancelada.`
          : `Encerrar "${conta.nome}"? Ela não será mais lançada. O que já foi pago continua no histórico.`;
      if (!window.confirm(texto)) return;
    }
    executar(
      () => alterarSituacaoContaFixa(conta.id, situacao),
      situacao === "Ativa" ? "Conta fixa reativada." : situacao === "Pausada" ? "Conta fixa pausada." : "Conta fixa encerrada.",
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/[0.05] dark:border-white/10 dark:bg-slate-950/70 dark:shadow-black/20 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Repeat className="size-4 text-violet-600 dark:text-violet-300" />
            Contas fixas do mês
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Lançadas sozinhas todo mês como &quot;a pagar&quot;. Só entram no saldo depois que você toca em Paguei.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setGerenciarAberto(true);
            setForm({ ...FORM_VAZIO, contaId: contas.find((conta) => conta.principal)?.id.toString() || "" });
          }}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
        >
          <Plus className="size-4" />
          Nova conta fixa
        </button>
      </div>

      {contasFixas.length === 0 && !form ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-white/15 dark:text-slate-300">
          Nenhuma conta fixa cadastrada ainda. Cadastre as contas que se repetem todo mês (aluguel, luz, água,
          internet, contador...) e o sistema lança sozinho, com o vencimento de cada uma.
        </p>
      ) : null}

      {itens.length > 0 ? (
        <>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 flex items-center justify-between gap-3 px-3 py-2 sm:block sm:p-3 dark:border-amber-400/20 dark:bg-amber-500/10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">Falta pagar</p>
              <p className="whitespace-nowrap font-bold sm:mt-1 sm:text-xl text-amber-900 dark:text-amber-100 sm:text-xl">{formatarMoeda(faltaPagar)}</p>
              <p className="text-xs text-amber-800 dark:text-amber-200">{abertas.length} conta(s)</p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 flex items-center justify-between gap-3 px-3 py-2 sm:block sm:p-3 dark:border-rose-400/20 dark:bg-rose-500/10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-200">Atrasadas</p>
              <p className="whitespace-nowrap font-bold sm:mt-1 sm:text-xl text-rose-800 dark:text-rose-100 sm:text-xl">{atrasadas.length}</p>
              <p className="text-xs text-rose-700 dark:text-rose-200">
                {formatarMoeda(atrasadas.reduce((total, linha) => total + linha.item.valor, 0))}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 flex items-center justify-between gap-3 px-3 py-2 sm:block sm:p-3 dark:border-emerald-400/20 dark:bg-emerald-500/10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">Pagas neste mês</p>
              <p className="whitespace-nowrap font-bold sm:mt-1 sm:text-xl text-emerald-900 dark:text-emerald-100 sm:text-xl">{formatarMoeda(pagoNoMes)}</p>
              <p className="text-xs text-emerald-800 dark:text-emerald-200">{itens.length - abertas.length} conta(s)</p>
            </div>
          </div>

          <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/10">
            {itens.map(({ item, vencimento, pago, faltam, conta }) => {
              const situacao = pago
                ? { texto: `Paga em ${diaCurto(item.data)}`, classe: "text-emerald-700 dark:text-emerald-300" }
                : faltam < 0
                  ? { texto: `Atrasada · venceu ${diaCurto(`${vencimento}T12:00:00-03:00`)}`, classe: "font-semibold text-rose-700 dark:text-rose-300" }
                  : faltam === 0
                    ? { texto: "Vence hoje", classe: "font-semibold text-amber-700 dark:text-amber-300" }
                    : faltam <= 3
                      ? { texto: `Vence em ${faltam} dia(s)`, classe: "font-semibold text-amber-700 dark:text-amber-300" }
                      : { texto: `Vence ${diaCurto(`${vencimento}T12:00:00-03:00`)}`, classe: "text-slate-500 dark:text-slate-400" };
              const emPagamento = pagando?.id === item.id;
              return (
                <li key={item.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                        {!pago && faltam < 0 ? <AlertTriangle className="size-4 shrink-0 text-rose-600" /> : null}
                        {pago ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : null}
                        <span className="truncate">{item.descricao}</span>
                      </p>
                      <p className={`mt-0.5 text-xs ${situacao.classe}`}>
                        {situacao.texto}
                        {item.categoria ? <span className="font-normal text-slate-500 dark:text-slate-400"> · {item.categoria}</span> : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-white">{formatarMoeda(item.valor)}</p>
                        {!pago && conta?.valorVariavel ? (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">valor estimado</p>
                        ) : null}
                      </div>
                      {!pago && !emPagamento ? (
                        <button
                          type="button"
                          disabled={pendente}
                          onClick={() =>
                            setPagando({
                              id: item.id,
                              valor: valorParaCampo(item.valor),
                              data: hoje,
                              contaId: item.contaFinanceiraId ? String(item.contaFinanceiraId) : "",
                            })
                          }
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                        >
                          <CheckCircle2 className="size-4" />
                          Paguei
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {emPagamento && pagando ? (
                    <div className="mt-3 grid gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-400/20 dark:bg-emerald-500/10 sm:grid-cols-4">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Valor pago (R$)
                        <input
                          inputMode="decimal"
                          value={pagando.valor}
                          onChange={(event) => setPagando({ ...pagando, valor: event.target.value })}
                          className={`mt-1 ${campo}`}
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Data do pagamento
                        <input
                          type="date"
                          value={pagando.data}
                          onChange={(event) => setPagando({ ...pagando, data: event.target.value })}
                          className={`mt-1 ${campo}`}
                        />
                      </label>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Saiu da conta
                        <select
                          value={pagando.contaId}
                          onChange={(event) => setPagando({ ...pagando, contaId: event.target.value })}
                          className={`mt-1 ${campo}`}
                        >
                          <option value="">Conta principal</option>
                          {contas.map((contaFinanceira) => (
                            <option key={contaFinanceira.id} value={contaFinanceira.id}>
                              {contaFinanceira.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex items-end gap-2">
                        <button
                          type="button"
                          disabled={pendente}
                          onClick={confirmarPagamento}
                          className="h-10 flex-1 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setPagando(null)}
                          className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 dark:border-white/10 dark:text-slate-300"
                        >
                          Voltar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : contasFixas.length > 0 ? (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Nenhuma conta fixa para este mês{ativas.length === 0 ? " (todas estão pausadas ou encerradas)" : ""}.
        </p>
      ) : null}

      {mensagem ? (
        <p
          className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${
            mensagem.tipo === "ok"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200"
          }`}
        >
          {mensagem.texto}
        </p>
      ) : null}

      {form ? (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-400/20 dark:bg-violet-500/10">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {form.id ? "Editar conta fixa" : "Nova conta fixa"}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 sm:col-span-2">
              Nome
              <input
                value={form.nome}
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
                placeholder="Ex.: Aluguel, Luz, Contador"
                className={`mt-1 ${campo}`}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Valor (R$)
              <input
                inputMode="decimal"
                value={form.valor}
                onChange={(event) => setForm({ ...form, valor: event.target.value })}
                placeholder="Digite o valor aqui"
                className={`mt-1 ${campo}`}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Vence todo dia
              <select value={form.dia} onChange={(event) => setForm({ ...form, dia: event.target.value })} className={`mt-1 ${campo}`}>
                {Array.from({ length: 31 }, (_, indice) => String(indice + 1)).map((dia) => (
                  <option key={dia} value={dia}>
                    {dia}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Categoria
              <select
                value={form.categoria}
                onChange={(event) => setForm({ ...form, categoria: event.target.value })}
                className={`mt-1 ${campo}`}
              >
                {CATEGORIAS.map((categoria) => (
                  <option key={categoria}>{categoria}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Sai da conta
              <select value={form.contaId} onChange={(event) => setForm({ ...form, contaId: event.target.value })} className={`mt-1 ${campo}`}>
                <option value="">Conta principal</option>
                {contas.map((contaFinanceira) => (
                  <option key={contaFinanceira.id} value={contaFinanceira.id}>
                    {contaFinanceira.nome}
                  </option>
                ))}
              </select>
            </label>
            {!form.id ? (
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Começar a lançar
                <select
                  value={form.comecar}
                  onChange={(event) => setForm({ ...form, comecar: event.target.value as "este" | "proximo" })}
                  className={`mt-1 ${campo}`}
                >
                  <option value="este">Já neste mês</option>
                  <option value="proximo">Só a partir do próximo mês</option>
                </select>
              </label>
            ) : null}
            <label className="flex items-start gap-2 self-end rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.variavel}
                onChange={(event) => setForm({ ...form, variavel: event.target.checked })}
                className="mt-0.5 size-4"
              />
              O valor muda todo mês (luz, água). Lança com este valor estimado e eu ajusto ao pagar.
            </label>
          </div>
          {!form.id ? (
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Se a conta deste mês já foi paga e lançada à mão, escolha &quot;Só a partir do próximo mês&quot; para não ficar em dobro.
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              A mudança vale para as contas ainda não pagas e para os próximos meses. As já pagas não mudam.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pendente}
              onClick={salvarFormulario}
              className="h-10 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 dark:border-white/10 dark:text-slate-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {contasFixas.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setGerenciarAberto((aberto) => !aberto)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-violet-700 dark:text-violet-300"
          >
            <CalendarClock className="size-4" />
            {gerenciarAberto ? "Esconder" : "Ver e gerenciar"} contas fixas cadastradas ({contasFixas.length})
          </button>

          {gerenciarAberto ? (
            <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-white/10 dark:border-white/10">
              {contasFixas.map((conta) => (
                <li key={conta.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {conta.nome}{" "}
                      <span
                        className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          conta.status === "Ativa"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"
                            : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                        }`}
                      >
                        {conta.status}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatarMoeda(conta.valor)}
                      {conta.valorVariavel ? " (estimado)" : ""} · todo dia {conta.diaVencimento}
                      {conta.categoria ? ` · ${conta.categoria}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    {conta.status !== "Encerrada" ? (
                      <button
                        type="button"
                        onClick={() => editar(conta)}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-slate-700 dark:border-white/10 dark:text-slate-200"
                      >
                        <Pencil className="size-3.5" /> Editar
                      </button>
                    ) : null}
                    {conta.status === "Ativa" ? (
                      <button
                        type="button"
                        disabled={pendente}
                        onClick={() => mudarSituacao(conta, "Pausada")}
                        className="h-8 rounded-lg border border-amber-200 px-2.5 text-amber-800 dark:border-amber-400/20 dark:text-amber-200"
                      >
                        Pausar
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pendente}
                        onClick={() => mudarSituacao(conta, "Ativa")}
                        className="h-8 rounded-lg border border-emerald-200 px-2.5 text-emerald-800 dark:border-emerald-400/20 dark:text-emerald-200"
                      >
                        Reativar
                      </button>
                    )}
                    {conta.status !== "Encerrada" ? (
                      <button
                        type="button"
                        disabled={pendente}
                        onClick={() => mudarSituacao(conta, "Encerrada")}
                        className="h-8 rounded-lg border border-rose-200 px-2.5 text-rose-700 dark:border-rose-400/20 dark:text-rose-200"
                      >
                        Encerrar
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
