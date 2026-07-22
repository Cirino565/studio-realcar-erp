/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CalendarPlus,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Package,
  RotateCcw,
  Sparkles,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import { finalizarAtendimento } from "@/actions/agendamento.actions";
import ProdutosVendaEditor from "@/components/vendas/ProdutosVendaEditor";
import type {
  ItemProdutoVendaDraft,
  ProdutoVendaOption,
} from "@/lib/vendas.types";

type AppointmentForFinish = {
  id: number;
  clienteId: number;
  profissionalId: number | null;
  procedimento: string;
  data: string;
  duracao: number;
  valor: number;
  observacoes: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  cliente: {
    nome: string;
    telefone?: string | null;
    whatsapp?: string | null;
  };
  profissional: {
    id: number;
    nome: string;
    area: string | null;
    cor: string;
    status: string;
  } | null;
};

type ServicoFinalizacao = {
  id: number;
  nome: string;
  categoria: string | null;
  duracaoPadrao: number;
  valorPadrao: number;
  custoPadrao: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentForFinish | null;
  servicos: ServicoFinalizacao[];
  produtos: ProdutoVendaOption[];
  onAgendarRetorno?: (appointment: AppointmentForFinish) => void;
};

const FORMAS_PAGAMENTO = [
  "Pix",
  "Dinheiro",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência",
  "Outro",
];

function useLockBodyScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open]);
}

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizarTexto(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CL";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function FinalizarAtendimentoModal({
  open,
  onClose,
  appointment,
  servicos,
  produtos,
  onAgendarRetorno,
}: Props) {
  const [procedimentoRealizado, setProcedimentoRealizado] = useState("");
  const [procedimentoServicoId, setProcedimentoServicoId] = useState<
    number | null
  >(null);
  const [evolucao, setEvolucao] = useState("");
  const [valorServico, setValorServico] = useState(0);
  const [custoServico, setCustoServico] = useState(0);
  const [itensProdutos, setItensProdutos] = useState<ItemProdutoVendaDraft[]>([]);
  const [formaPagamento, setFormaPagamento] = useState("Pix");
  const [statusPagamento, setStatusPagamento] = useState("Pago");
  const [confirmando, setConfirmando] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open || !appointment) {
      setProcedimentoRealizado("");
      setProcedimentoServicoId(null);
      setEvolucao("");
      setValorServico(0);
      setCustoServico(0);
      setItensProdutos([]);
      setFormaPagamento("Pix");
      setStatusPagamento("Pago");
      setConfirmando(false);
      setFinalizado(false);
      setError(null);
      return;
    }

    const servico = servicos.find(
      (item) =>
        normalizarTexto(item.nome) === normalizarTexto(appointment.procedimento),
    );

    setProcedimentoRealizado(appointment.procedimento || "");
    setProcedimentoServicoId(servico?.id || null);
    setValorServico(Number(appointment.valor || servico?.valorPadrao || 0));
    setCustoServico(Number(servico?.custoPadrao || 0));
    setItensProdutos([]);
    setFormaPagamento("Pix");
    setStatusPagamento("Pago");
    setEvolucao("");
    setConfirmando(false);
    setFinalizado(false);
    setError(null);
  }, [open, appointment, servicos]);

  const totais = useMemo(() => {
    const totalProdutos = itensProdutos.reduce(
      (total, item) => total + item.valorUnitario * item.quantidade,
      0,
    );
    const custoProdutos = itensProdutos.reduce(
      (total, item) => total + item.custoUnitario * item.quantidade,
      0,
    );
    const total = valorServico + totalProdutos;
    const custo = custoServico + custoProdutos;
    const margem = total - custo;

    return {
      totalProdutos,
      custoProdutos,
      total,
      custo,
      margem,
      margemPercentual: total > 0 ? (margem / total) * 100 : 0,
    };
  }, [itensProdutos, valorServico, custoServico]);

  if (!open || !appointment) return null;

  const currentAppointment = appointment;
  const procedimentoFinal =
    procedimentoRealizado.trim() || currentAppointment.procedimento || "Atendimento";

  function limparEFechar() {
    setConfirmando(false);
    setFinalizado(false);
    setError(null);
    onClose();
  }

  function atualizarProcedimento(value: string) {
    setProcedimentoRealizado(value);
    setError(null);

    const servico = servicos.find(
      (item) => normalizarTexto(item.nome) === normalizarTexto(value),
    );

    if (servico) {
      setProcedimentoServicoId(servico.id);
      setCustoServico(servico.custoPadrao || 0);
    } else {
      setProcedimentoServicoId(null);
    }
  }

  function validarAntesDeConfirmar() {
    setError(null);

    if (!procedimentoFinal.trim()) {
      setError("Informe o procedimento realizado.");
      return;
    }

    if (!evolucao.trim()) {
      setError("Informe a evolução ou observação clínica do atendimento.");
      return;
    }

    setConfirmando(true);
  }

  function handleFinalizarConfirmado() {
    const evolucaoClinica = evolucao.trim();

    if (!evolucaoClinica) {
      setError("Informe a evolução ou observação clínica do atendimento.");
      setConfirmando(false);
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        await finalizarAtendimento({
          agendamentoId: currentAppointment.id,
          procedimentoRealizado: procedimentoFinal,
          procedimentoServicoId,
          profissional: undefined,
          valorCobrado: Math.max(0, valorServico),
          custoServico: Math.max(0, custoServico),
          produtos: itensProdutos.map((item) => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            valorUnitario: item.valorUnitario,
          })),
          formaPagamento,
          statusPagamento,
          evolucao: evolucaoClinica,
        });

        setFinalizado(true);
        setConfirmando(false);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Não foi possível finalizar o atendimento.",
        );
        setConfirmando(false);
      }
    });
  }

  function concluirSemRetorno() {
    window.location.reload();
  }

  function agendarRetornoAgora() {
    if (!onAgendarRetorno) {
      window.location.reload();
      return;
    }

    onClose();
    onAgendarRetorno(currentAppointment);
  }

  const etapa = finalizado ? "success" : confirmando ? "review" : "form";

  return (
    <div className="fixed inset-0 z-[110] h-[100dvh] overflow-hidden">
      <button
        type="button"
        aria-label="Fechar finalização do atendimento"
        onClick={finalizado ? concluirSemRetorno : limparEFechar}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="finalizar-atendimento-title"
        className="absolute inset-0 flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-slate-50 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-[680px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:border-slate-200"
      >
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                  finalizado ? "bg-emerald-600" : "bg-violet-600"
                }`}
              >
                {finalizado ? <CheckCircle2 size={19} /> : <ClipboardCheck size={19} />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                  {etapa === "success"
                    ? "Atendimento e venda concluídos"
                    : etapa === "review"
                      ? "Revisão final"
                      : "Registro clínico e financeiro"}
                </p>
                <h2
                  id="finalizar-atendimento-title"
                  className="mt-0.5 truncate text-[17px] font-bold leading-5 text-slate-950"
                >
                  {etapa === "success"
                    ? "Finalizado com sucesso"
                    : etapa === "review"
                      ? "Confira a composição da venda"
                      : "Finalizar atendimento"}
                </h2>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {currentAppointment.cliente.nome}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={finalizado ? concluirSemRetorno : limparEFechar}
              disabled={isPending}
              className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              aria-label="Fechar"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        {etapa === "success" ? (
          <>
            <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
              <div className="space-y-4">
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <Check size={19} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-900">
                        Atendimento, venda e estoque atualizados
                      </p>
                      <p className="mt-1 text-xs leading-5 text-emerald-700">
                        O histórico preservou preço vendido, custos do momento e produtos adicionados.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white">
                      {getInitials(currentAppointment.cliente.nome)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-950">
                        {currentAppointment.cliente.nome}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Serviço {formatCurrency(valorServico)} + produtos {formatCurrency(totais.totalProdutos)}
                      </p>
                    </div>
                    <p className="text-lg font-black text-violet-700">
                      {formatCurrency(totais.total)}
                    </p>
                  </div>
                </section>
              </div>
            </main>

            <footer className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={concluirSemRetorno}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Voltar à agenda
                </button>
                <button
                  type="button"
                  onClick={agendarRetornoAgora}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-700"
                >
                  <CalendarPlus size={15} />
                  Agendar retorno
                </button>
              </div>
            </footer>
          </>
        ) : etapa === "form" ? (
          <>
            <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3.5 sm:px-5 sm:py-5">
              <div className="space-y-3">
                {error ? (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5">
                    <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-700" />
                    <p className="text-xs leading-5 text-rose-700">{error}</p>
                  </div>
                ) : null}

                <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <UserRound size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cliente</p>
                      <p className="mt-0.5 text-sm font-bold text-slate-950">{currentAppointment.cliente.nome}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{currentAppointment.profissional?.nome || "Profissional não definida"}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <label className="block border-b border-slate-100 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles size={16} className="text-violet-600" />
                      <span className="text-xs font-bold text-slate-900">Procedimento realizado</span>
                    </div>
                    <textarea
                      value={procedimentoRealizado}
                      onChange={(event) => atualizarProcedimento(event.target.value)}
                      className="min-h-16 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-900 outline-none focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                    />
                  </label>

                  <label className="block border-b border-slate-100 p-4">
                    <div className="mb-1.5 flex items-center gap-2">
                      <ClipboardCheck size={16} className="text-violet-600" />
                      <span className="text-xs font-bold text-slate-900">Evolução da cliente</span>
                    </div>
                    <textarea
                      value={evolucao}
                      onChange={(event) => {
                        setEvolucao(event.target.value);
                        setError(null);
                      }}
                      placeholder="Descreva como foi o atendimento."
                      className="min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-900 outline-none focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                    />
                  </label>

                  <div className="p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <WalletCards size={16} className="text-violet-600" />
                      <span className="text-xs font-bold text-slate-900">Serviço e custo direto</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label>
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Valor vendido do serviço</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={valorServico}
                          onChange={(event) => setValorServico(Math.max(0, Number(event.target.value) || 0))}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400"
                        />
                      </label>
                      <label>
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Custo direto deste atendimento</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={custoServico}
                          onChange={(event) => setCustoServico(Math.max(0, Number(event.target.value) || 0))}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400"
                        />
                      </label>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Margem do serviço: <strong className={valorServico - custoServico >= 0 ? "text-emerald-700" : "text-rose-700"}>{formatCurrency(valorServico - custoServico)}</strong>. O custo ficará congelado no histórico desta venda.
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <Package size={16} className="text-violet-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Produtos vendidos junto</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">A baixa no estoque será automática ao confirmar.</p>
                    </div>
                  </div>
                  <ProdutosVendaEditor
                    produtos={produtos}
                    itens={itensProdutos}
                    onChange={setItensProdutos}
                    compact
                  />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Forma de pagamento</span>
                      <select
                        value={formaPagamento}
                        onChange={(event) => setFormaPagamento(event.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-violet-400"
                      >
                        {FORMAS_PAGAMENTO.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Status</span>
                      <select
                        value={statusPagamento}
                        onChange={(event) => setStatusPagamento(event.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-violet-400"
                      >
                        <option value="Pago">Pago</option>
                        <option value="Pendente">Pendente / a receber</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <ResumoValor label="Serviço" value={valorServico} />
                    <ResumoValor label="Produtos" value={totais.totalProdutos} />
                    <ResumoValor label="Custo direto" value={totais.custo} />
                    <ResumoValor label="Total da venda" value={totais.total} destaque />
                  </div>
                  <p className="mt-3 text-right text-xs text-slate-500">
                    Margem direta estimada: <strong className={totais.margem >= 0 ? "text-emerald-700" : "text-rose-700"}>{formatCurrency(totais.margem)} ({totais.margemPercentual.toFixed(1).replace(".", ",")}%)</strong>
                  </p>
                </section>
              </div>
            </main>

            <footer className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={limparEFechar} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={validarAntesDeConfirmar} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-700">
                  <ClipboardCheck size={15} /> Revisar {formatCurrency(totais.total)}
                </button>
              </div>
            </footer>
          </>
        ) : (
          <>
            <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3.5 sm:px-5 sm:py-5">
              <div className="space-y-3">
                {error ? (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5">
                    <AlertCircle size={18} className="mt-0.5 text-rose-700" />
                    <p className="text-xs text-rose-700">{error}</p>
                  </div>
                ) : null}

                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">Confirmar finalização?</p>
                      <p className="mt-1 text-[11px] leading-4 text-amber-800">Esta operação cria o histórico clínico, a venda, o financeiro e as baixas de estoque em uma única transação.</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <ResumoLinha label="Cliente" value={currentAppointment.cliente.nome} />
                  <ResumoLinha label="Procedimento" value={procedimentoFinal} />
                  <ResumoLinha label="Serviço" value={formatCurrency(valorServico)} />
                  <ResumoLinha label="Produtos" value={formatCurrency(totais.totalProdutos)} />
                  <ResumoLinha label="Total" value={formatCurrency(totais.total)} forte />
                  <ResumoLinha label="Custo direto histórico" value={formatCurrency(totais.custo)} />
                  <ResumoLinha label="Margem direta" value={`${formatCurrency(totais.margem)} · ${totais.margemPercentual.toFixed(1).replace(".", ",")}%`} />
                  <ResumoLinha label="Pagamento" value={`${formaPagamento} · ${statusPagamento}`} />
                </section>

                {itensProdutos.length > 0 ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Produtos</p>
                    <div className="mt-2 space-y-2">
                      {itensProdutos.map((item) => (
                        <div key={item.produtoId} className="flex justify-between gap-3 text-xs">
                          <span className="text-slate-600">{item.quantidade}x {item.nome}</span>
                          <strong className="text-slate-900">{formatCurrency(item.valorUnitario * item.quantidade)}</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="rounded-2xl border border-violet-200 bg-violet-50 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <RotateCcw size={17} className="mt-0.5 text-violet-700" />
                    <p className="text-[11px] leading-4 text-violet-800">Após confirmar, você poderá agendar o retorno ou voltar para a agenda.</p>
                  </div>
                </section>
              </div>
            </main>

            <footer className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmando(false);
                    setError(null);
                  }}
                  disabled={isPending}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleFinalizarConfirmado}
                  disabled={isPending}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                  {isPending ? "Finalizando..." : `Confirmar ${formatCurrency(totais.total)}`}
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function ResumoValor({
  label,
  value,
  destaque = false,
}: {
  label: string;
  value: number;
  destaque?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-2.5 ${destaque ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-slate-50"}`}>
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-black ${destaque ? "text-violet-800" : "text-slate-900"}`}>{formatCurrency(value)}</p>
    </div>
  );
}

function ResumoLinha({
  label,
  value,
  forte = false,
}: {
  label: string;
  value: string;
  forte?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-right text-xs ${forte ? "font-black text-violet-700" : "font-bold text-slate-900"}`}>{value}</span>
    </div>
  );
}
