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
import KitsVendaEditor from "@/components/vendas/KitsVendaEditor";
import type {
  ItemKitVendaDraft,
  ItemProdutoVendaDraft,
  KitVendaOption,
  ProdutoVendaOption,
} from "@/lib/vendas.types";
import {
  custoUnitarioKit,
  necessidadesEstoqueVenda,
  valorUnitarioKit,
} from "@/lib/vendas.types";

import type { AppointmentDetails } from "./AppointmentDetailsModal";

type ServicoFinalizacao = {
  id: number;
  nome: string;
  categoria: string | null;
  duracaoPadrao: number;
  valorPadrao: number;
  custoPadrao: number;
};

export type FormaPagamentoFinalizacao = {
  id: number;
  nome: string;
  taxaPercentual: number;
  taxaFixa: number;
  prazoDias: number;
};

export type AtendimentoFinalizadoPayload = {
  agendamentoId: number;
  procedimento: string;
  valor: number;
  evolucaoRegistrada: boolean;
  dataAtendimento: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentDetails | null;
  servicos: ServicoFinalizacao[];
  produtos: ProdutoVendaOption[];
  kits: KitVendaOption[];
  formasPagamento: FormaPagamentoFinalizacao[];
  podeAutorizarEstoqueNegativo: boolean;
  onAgendarRetorno?: (appointment: AppointmentDetails) => void;
  onFinalizado?: (payload: AtendimentoFinalizadoPayload) => void;
};

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

function arredondarMoeda(value: number) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
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

function mensagemErroSeguro(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  const mensagem = error.message?.trim();

  if (
    !mensagem ||
    mensagem.includes("An error occurred in the Server Components render") ||
    mensagem.includes("A digest property is included")
  ) {
    return fallback;
  }

  return mensagem;
}

export default function FinalizarAtendimentoModal({
  open,
  onClose,
  appointment,
  servicos,
  produtos,
  kits,
  formasPagamento,
  podeAutorizarEstoqueNegativo,
  onAgendarRetorno,
  onFinalizado,
}: Props) {
  const [procedimentoRealizado, setProcedimentoRealizado] = useState("");
  const [procedimentoServicoId, setProcedimentoServicoId] = useState<
    number | null
  >(null);
  const [evolucao, setEvolucao] = useState("");
  const [valorServico, setValorServico] = useState(0);
  const [custoServico, setCustoServico] = useState(0);
  const [itensProdutos, setItensProdutos] = useState<ItemProdutoVendaDraft[]>([]);
  const [itensKits, setItensKits] = useState<ItemKitVendaDraft[]>([]);
  const [permitirEstoqueNegativo, setPermitirEstoqueNegativo] = useState(false);
  const [formaPagamentoConfigId, setFormaPagamentoConfigId] = useState<number | null>(null);
  const [statusPagamento, setStatusPagamento] = useState("Pago");
  const [confirmando, setConfirmando] = useState(false);
  const [finalizado, setFinalizado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const formaPadrao = useMemo(
    () =>
      formasPagamento.find((item) => normalizarTexto(item.nome) === "pix") ||
      formasPagamento[0] ||
      null,
    [formasPagamento],
  );

  const formaConfig = useMemo(
    () =>
      formasPagamento.find((item) => item.id === formaPagamentoConfigId) ||
      null,
    [formasPagamento, formaPagamentoConfigId],
  );

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open || !appointment) {
      setProcedimentoRealizado("");
      setProcedimentoServicoId(null);
      setEvolucao("");
      setValorServico(0);
      setCustoServico(0);
      setItensProdutos([]);
      setItensKits([]);
      setPermitirEstoqueNegativo(false);
      setFormaPagamentoConfigId(formaPadrao?.id || null);
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
    const atendimentoRetornoAtual =
      appointment.naturezaAtendimento === "RETORNO";

    setProcedimentoRealizado(appointment.procedimento || "");
    setProcedimentoServicoId(servico?.id || null);
    setValorServico(
      atendimentoRetornoAtual
        ? 0
        : Number(appointment.valor ?? servico?.valorPadrao ?? 0),
    );
    setCustoServico(
      atendimentoRetornoAtual ? 0 : Number(servico?.custoPadrao || 0),
    );
    setItensProdutos([]);
    setItensKits([]);
    setPermitirEstoqueNegativo(false);
    setFormaPagamentoConfigId(formaPadrao?.id || null);
    setStatusPagamento("Pago");
    setEvolucao("");
    setConfirmando(false);
    setFinalizado(false);
    setError(null);
  }, [open, appointment, servicos, formaPadrao]);

  const totais = useMemo(() => {
    const totalProdutosAvulsos = itensProdutos.reduce(
      (total, item) => total + item.valorUnitario * item.quantidade,
      0,
    );
    const custoProdutosAvulsos = itensProdutos.reduce(
      (total, item) => total + item.custoUnitario * item.quantidade,
      0,
    );
    const totalKits = itensKits.reduce(
      (total, item) => total + valorUnitarioKit(item) * item.quantidadeKits,
      0,
    );
    const custoKits = itensKits.reduce(
      (total, item) => total + custoUnitarioKit(item) * item.quantidadeKits,
      0,
    );
    const totalProdutos = totalProdutosAvulsos + totalKits;
    const custoProdutos = custoProdutosAvulsos + custoKits;
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
  }, [itensProdutos, itensKits, valorServico, custoServico]);

  const pagamentoPrevisto = useMemo(() => {
    const valorBruto = Math.max(0, arredondarMoeda(totais.total));
    const taxaPercentual = Math.max(0, Number(formaConfig?.taxaPercentual || 0));
    const taxaFixa = Math.max(0, arredondarMoeda(formaConfig?.taxaFixa || 0));
    const taxaPagamento = Math.min(
      valorBruto,
      arredondarMoeda(valorBruto * (taxaPercentual / 100) + taxaFixa),
    );
    const valorLiquido = arredondarMoeda(valorBruto - taxaPagamento);
    const margemLiquida = arredondarMoeda(valorLiquido - totais.custo);

    return {
      valorBruto,
      taxaPercentual,
      taxaFixa,
      taxaPagamento,
      valorLiquido,
      margemLiquida,
      margemLiquidaPercentual:
        valorBruto > 0 ? (margemLiquida / valorBruto) * 100 : 0,
    };
  }, [formaConfig, totais.custo, totais.total]);

  const estoqueInsuficiente = useMemo(
    () => necessidadesEstoqueVenda(itensProdutos, itensKits),
    [itensProdutos, itensKits],
  );

  if (!open || !appointment) return null;

  const currentAppointment = appointment;
  const atendimentoRetorno =
    currentAppointment.naturezaAtendimento === "RETORNO";
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
      setCustoServico(atendimentoRetorno ? 0 : servico.custoPadrao || 0);
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

    if (estoqueInsuficiente.length > 0 && !permitirEstoqueNegativo) {
      setError(
        "Há estoque insuficiente. Ajuste os itens ou solicite autorização de um administrador.",
      );
      return;
    }

    if (totais.total > 0 && !formaConfig) {
      setError(
        "Cadastre ou selecione uma forma de pagamento ativa no Financeiro antes de finalizar uma venda com cobrança.",
      );
      return;
    }

    setConfirmando(true);
  }

  function handleFinalizarConfirmado() {
    const evolucaoClinica = evolucao.trim() || undefined;

    setError(null);

    startTransition(async () => {
      try {
        const resultado = await finalizarAtendimento({
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
          kits: itensKits.map((item) => ({
            kitId: item.kitId,
            quantidade: item.quantidadeKits,
            componentes:
              item.tipo === "FLEXIVEL"
                ? item.componentes.map((componente) => ({
                    produtoId: componente.produtoId,
                    quantidade: componente.quantidadePorKit,
                  }))
                : undefined,
          })),
          permitirEstoqueNegativo,
          formaPagamento: formaConfig?.nome || "Não informado",
          formaPagamentoConfigId: formaConfig?.id || null,
          statusPagamento,
          evolucao: evolucaoClinica,
        });

        onFinalizado?.({
          agendamentoId: resultado.agendamentoId,
          procedimento: resultado.procedimento,
          valor: resultado.valor,
          evolucaoRegistrada: resultado.evolucaoStatus === "CONCLUIDA",
          dataAtendimento: resultado.dataAtendimento,
        });

        setFinalizado(true);
        setConfirmando(false);
      } catch (error) {
        setError(
          mensagemErroSeguro(
            error,
            "Não foi possível confirmar a finalização. Confira o status na agenda antes de tentar novamente.",
          ),
        );
        setConfirmando(false);
      }
    });
  }

  function concluirSemRetorno() {
    onClose();
  }

  function agendarRetornoAgora() {
    onClose();

    if (onAgendarRetorno) {
      onAgendarRetorno(currentAppointment);
    }
  }

  const evolucaoRegistradaNestaFinalizacao = Boolean(evolucao.trim());
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
                    ? atendimentoRetorno
                      ? "Retorno concluído"
                      : "Atendimento e venda concluídos"
                    : etapa === "review"
                      ? "Revisão final"
                      : atendimentoRetorno
                        ? "Retorno clínico gratuito"
                        : "Registro clínico e financeiro"}
                </p>
                <h2
                  id="finalizar-atendimento-title"
                  className="mt-0.5 truncate text-[17px] font-bold leading-5 text-slate-950"
                >
                  {etapa === "success"
                    ? "Finalizado com sucesso"
                    : etapa === "review"
                      ? atendimentoRetorno
                        ? "Confira o registro do retorno"
                        : "Confira a composição da venda"
                      : atendimentoRetorno
                        ? "Finalizar retorno"
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
                        {atendimentoRetorno
                          ? "Retorno e histórico clínico atualizados"
                          : "Atendimento, venda e estoque atualizados"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-emerald-700">
                        {atendimentoRetorno
                          ? "O retorno permaneceu sem cobrança. Produtos adicionados, quando houver, seguem o fluxo normal de estoque e venda."
                          : "O histórico preservou preço vendido, custos do momento e produtos adicionados."}
                      </p>
                      {!evolucaoRegistradaNestaFinalizacao ? (
                        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                          A evolução ficou pendente e já aparece na Central do Dia para preenchimento posterior.
                        </p>
                      ) : null}
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
                      <span className="text-xs font-bold text-slate-900">Evolução da cliente, opcional agora</span>
                    </div>
                    <textarea
                      value={evolucao}
                      onChange={(event) => {
                        setEvolucao(event.target.value);
                        setError(null);
                      }}
                      placeholder="Descreva agora ou deixe em branco para registrar depois."
                      className="min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] text-slate-900 outline-none focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                    />
                    <p className="mt-2 text-[11px] leading-4 text-slate-500">
                      Se ficar em branco, o atendimento será encerrado normalmente e a evolução entrará na fila de pendências.
                    </p>
                  </label>

                  <div className="p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <WalletCards size={16} className="text-violet-600" />
                      <span className="text-xs font-bold text-slate-900">
                        {atendimentoRetorno
                          ? "Retorno sem cobrança"
                          : "Serviço e custo direto"}
                      </span>
                    </div>
                    {atendimentoRetorno ? (
                      <div className="mb-3 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-[11px] leading-4 text-cyan-800">
                        O serviço deste retorno permanece em R$ 0,00 e não gera receita. Produtos ou kits adicionados abaixo continuam sendo registrados normalmente.
                      </div>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label>
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Valor vendido do serviço</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={valorServico}
                          disabled={atendimentoRetorno}
                          onChange={(event) => setValorServico(Math.max(0, Number(event.target.value) || 0))}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </label>
                      <label>
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Custo direto deste atendimento</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={custoServico}
                          disabled={atendimentoRetorno}
                          onChange={(event) => setCustoServico(Math.max(0, Number(event.target.value) || 0))}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </label>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      {atendimentoRetorno ? (
                        <>O retorno clínico não compõe faturamento nem custo de serviço.</>
                      ) : (
                        <>Margem do serviço: <strong className={valorServico - custoServico >= 0 ? "text-emerald-700" : "text-rose-700"}>{formatCurrency(valorServico - custoServico)}</strong>. O custo ficará congelado no histórico desta venda.</>
                      )}
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
                    podeExcederEstoque={podeAutorizarEstoqueNegativo}
                  />
                </section>

                <section className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <Package size={16} className="text-violet-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Kits vendidos junto</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        O sistema baixa automaticamente cada produto que compõe o kit.
                      </p>
                    </div>
                  </div>
                  <KitsVendaEditor
                    kits={kits}
                    itens={itensKits}
                    onChange={setItensKits}
                    compact
                  />
                </section>

                {estoqueInsuficiente.length > 0 ? (
                  <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-amber-900">Estoque insuficiente</p>
                        <p className="mt-1 text-[11px] leading-5 text-amber-800">
                          {estoqueInsuficiente
                            .map((item) => `${item.nome}: precisa ${item.necessario}, disponível ${item.disponivel}`)
                            .join("; ")}
                        </p>
                        {podeAutorizarEstoqueNegativo ? (
                          <label className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-white/70 p-3">
                            <input
                              type="checkbox"
                              checked={permitirEstoqueNegativo}
                              onChange={(event) => setPermitirEstoqueNegativo(event.target.checked)}
                              className="mt-0.5 size-4"
                            />
                            <span className="text-xs font-semibold text-amber-900">
                              Autorizar estoque negativo nesta finalização. A autorização ficará registrada.
                            </span>
                          </label>
                        ) : (
                          <p className="mt-2 text-[11px] font-semibold text-amber-900">
                            Ajuste os itens ou solicite autorização de um administrador.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                ) : null}

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Forma de pagamento</span>
                      <select
                        value={formaPagamentoConfigId ? String(formaPagamentoConfigId) : ""}
                        onChange={(event) =>
                          setFormaPagamentoConfigId(
                            event.target.value ? Number(event.target.value) : null,
                          )
                        }
                        disabled={formasPagamento.length === 0}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {formasPagamento.length === 0 ? (
                          <option value="">Nenhuma forma ativa cadastrada</option>
                        ) : (
                          formasPagamento.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.nome}
                            </option>
                          ))
                        )}
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
                  {totais.total > 0 && formaConfig ? (
                    <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/70 p-3">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] sm:grid-cols-4">
                        <ResumoPagamento label="Taxa" value={formatCurrency(pagamentoPrevisto.taxaPagamento)} />
                        <ResumoPagamento label="Líquido" value={formatCurrency(pagamentoPrevisto.valorLiquido)} />
                        <ResumoPagamento
                          label="Prazo"
                          value={formaConfig.prazoDias > 0 ? `D+${formaConfig.prazoDias}` : "Mesmo dia"}
                        />
                        <ResumoPagamento
                          label="Margem após taxa"
                          value={`${formatCurrency(pagamentoPrevisto.margemLiquida)} · ${pagamentoPrevisto.margemLiquidaPercentual.toFixed(1).replace(".", ",")}%`}
                          negativo={pagamentoPrevisto.margemLiquida < 0}
                        />
                      </div>
                      <p className="mt-2 text-[10px] leading-4 text-violet-700">
                        Taxa configurada: {pagamentoPrevisto.taxaPercentual.toFixed(2).replace(".", ",")}% + {formatCurrency(pagamentoPrevisto.taxaFixa)} por transação.
                      </p>
                    </div>
                  ) : totais.total > 0 ? (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                      Nenhuma forma de pagamento ativa está disponível. Cadastre uma no Financeiro antes de concluir a cobrança.
                    </p>
                  ) : null}
                  <p className="mt-3 text-right text-xs text-slate-500">
                    Margem direta antes das taxas: <strong className={totais.margem >= 0 ? "text-emerald-700" : "text-rose-700"}>{formatCurrency(totais.margem)} ({totais.margemPercentual.toFixed(1).replace(".", ",")}%)</strong>
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
                      <p className="mt-1 text-[11px] leading-4 text-amber-800">
                        {atendimentoRetorno
                          ? "Esta operação conclui o retorno sem gerar receita de serviço. Produtos e kits, quando adicionados, seguem o fluxo normal de venda e estoque."
                          : "Esta operação conclui o atendimento, a venda, o financeiro e as baixas de estoque em uma única transação."}
                        {!evolucaoRegistradaNestaFinalizacao
                          ? " A evolução será marcada como pendente para preenchimento posterior."
                          : " A evolução será registrada agora."}
                      </p>
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
                  <ResumoLinha
                    label="Pagamento"
                    value={`${formaConfig?.nome || "Sem forma configurada"} · ${statusPagamento}`}
                  />
                  {totais.total > 0 && formaConfig ? (
                    <>
                      <ResumoLinha label="Taxa prevista" value={formatCurrency(pagamentoPrevisto.taxaPagamento)} />
                      <ResumoLinha label="Valor líquido" value={formatCurrency(pagamentoPrevisto.valorLiquido)} forte />
                      <ResumoLinha
                        label="Prazo configurado"
                        value={formaConfig.prazoDias > 0 ? `D+${formaConfig.prazoDias}` : "Mesmo dia"}
                      />
                    </>
                  ) : null}
                  <ResumoLinha
                    label="Evolução"
                    value={
                      evolucaoRegistradaNestaFinalizacao
                        ? "Será registrada agora"
                        : "Ficará pendente para depois"
                    }
                  />
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

                {itensKits.length > 0 ? (
                  <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-violet-500">Kits</p>
                    <div className="mt-2 space-y-3">
                      {itensKits.map((item) => (
                        <div key={item.clientKey} className="text-xs">
                          <div className="flex justify-between gap-3">
                            <span className="font-semibold text-slate-700">
                              {item.quantidadeKits}x {item.nome}
                            </span>
                            <strong className="text-slate-900">
                              {formatCurrency(
                                valorUnitarioKit(item) * item.quantidadeKits,
                              )}
                            </strong>
                          </div>
                          <p className="mt-1 text-[10px] leading-4 text-slate-500">
                            {item.componentes
                              .map(
                                (componente) =>
                                  `${componente.quantidadePorKit}x ${componente.nome} por kit`,
                              )
                              .join(", ")}
                          </p>
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
                  {isPending
                    ? "Finalizando..."
                    : evolucaoRegistradaNestaFinalizacao
                      ? `Confirmar ${formatCurrency(totais.total)}`
                      : "Finalizar e deixar evolução pendente"}
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function ResumoPagamento({
  label,
  value,
  negativo = false,
}: {
  label: string;
  value: string;
  negativo?: boolean;
}) {
  return (
    <div>
      <p className="font-semibold uppercase tracking-wide text-violet-500">{label}</p>
      <p className={`mt-0.5 font-bold ${negativo ? "text-rose-700" : "text-slate-900"}`}>
        {value}
      </p>
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
