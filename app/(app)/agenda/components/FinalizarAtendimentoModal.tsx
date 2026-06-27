"use client";

import { useEffect, useState, useTransition } from "react";
import { BadgeDollarSign, CheckCircle2, FileText, HeartPulse, X } from "lucide-react";

import { finalizarAtendimento } from "@/actions/agendamento.actions";
import { Button } from "@/components/ui/button";

type AppointmentDetails = {
  id: number;
  clienteId: number;
  profissionalId: number | null;
  procedimento: string;
  data: Date | string;
  duracao: number;
  valor: number;
  observacoes: string | null;
  status: string;
  cliente: {
    nome: string;
    telefone?: string | null;
    whatsapp?: string | null;
  };
  profissional: {
    nome: string;
    area: string | null;
  } | null;
};

type Props = {
  open: boolean;
  appointment: AppointmentDetails | null;
  onClose: () => void;
};

const formasPagamento = [
  "Pix",
  "Dinheiro",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência",
  "Cortesia",
  "Outro",
];

const statusPagamentoOptions = ["Pago", "Pendente", "Parcial", "Cortesia"];

function formatDateInput(value: Date | string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 10);
}

function formatCurrencyInput(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(".", ",");
  const parts = normalized.split(",");

  if (parts.length <= 1) return normalized;

  return `${parts[0]},${parts[1].slice(0, 2)}`;
}

function parseCurrency(value: string) {
  const parsed = Number(value.replace(".", "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function FinalizarAtendimentoModal({ open, appointment, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [procedimentoRealizado, setProcedimentoRealizado] = useState(appointment?.procedimento || "");
  const [valorCobrado, setValorCobrado] = useState(
    appointment?.valor ? String(appointment.valor).replace(".", ",") : ""
  );
  const [formaPagamento, setFormaPagamento] = useState("Pix");
  const [statusPagamento, setStatusPagamento] = useState("Pago");
  const [dataAtendimento, setDataAtendimento] = useState(
    appointment?.data ? formatDateInput(appointment.data) : formatDateInput(new Date())
  );
  const [evolucao, setEvolucao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!appointment || !open) return;
    setProcedimentoRealizado(appointment.procedimento || "");
    setValorCobrado(appointment.valor ? String(appointment.valor).replace(".", ",") : "");
    setFormaPagamento("Pix");
    setStatusPagamento("Pago");
    setDataAtendimento(formatDateInput(appointment.data));
    setEvolucao("");
    setObservacoes("");
    setErro("");
  }, [appointment, open]);

  if (!open || !appointment) return null;

  function salvar() {
    const valor = parseCurrency(valorCobrado);

    if (!procedimentoRealizado.trim()) {
      setErro("Informe o procedimento realizado.");
      return;
    }

    if (!evolucao.trim()) {
      setErro("Registre a evolução/observação clínica do atendimento.");
      return;
    }

    if (!dataAtendimento) {
      setErro("Informe a data do atendimento.");
      return;
    }

    setErro("");

    startTransition(async () => {
      try {
        await finalizarAtendimento({
          agendamentoId: appointment.id,
          procedimentoRealizado: procedimentoRealizado.trim(),
          profissional: appointment.profissional?.nome || undefined,
          valorCobrado: valor,
          formaPagamento,
          statusPagamento,
          dataAtendimento: `${dataAtendimento}T12:00:00`,
          evolucao: evolucao.trim(),
          observacoes: observacoes.trim(),
        });

        onClose();
        window.location.reload();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível finalizar o atendimento.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/85 px-3 py-4 backdrop-blur-xl sm:px-4">
      <div className="my-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/[0.10] bg-[#111827] shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] bg-white/[0.035] p-5 sm:p-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              <CheckCircle2 size={14} />
              Finalização operacional
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Finalizar atendimento
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Registre o procedimento, a evolução clínica e o pagamento. O prontuário e o financeiro serão atualizados automaticamente.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 text-slate-300 hover:bg-white/[0.08] hover:text-white"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[78vh] space-y-5 overflow-y-auto p-5 scrollbar-premium sm:p-6">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cliente</p>
            <p className="mt-1 text-lg font-semibold text-white">{appointment.cliente.nome}</p>
            <p className="mt-1 text-sm text-slate-400">{appointment.profissional?.nome || "Profissional não definida"}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-slate-300">Procedimento realizado</span>
              <input
                value={procedimentoRealizado}
                onChange={(event) => setProcedimentoRealizado(event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Valor cobrado</span>
              <div className="relative">
                <BadgeDollarSign className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={valorCobrado}
                  onChange={(event) => setValorCobrado(formatCurrencyInput(event.target.value))}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
                />
              </div>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Data do atendimento</span>
              <input
                type="date"
                value={dataAtendimento}
                onChange={(event) => setDataAtendimento(event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 text-sm text-white outline-none transition focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Forma de pagamento</span>
              <select
                value={formaPagamento}
                onChange={(event) => setFormaPagamento(event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/[0.08] bg-slate-900 px-4 text-sm text-white outline-none transition focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
              >
                {formasPagamento.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Status do pagamento</span>
              <select
                value={statusPagamento}
                onChange={(event) => setStatusPagamento(event.target.value)}
                className="h-11 w-full rounded-2xl border border-white/[0.08] bg-slate-900 px-4 text-sm text-white outline-none transition focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
              >
                {statusPagamentoOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <HeartPulse className="size-4 text-violet-300" />
              Evolução clínica do atendimento
            </span>
            <textarea
              value={evolucao}
              onChange={(event) => setEvolucao(event.target.value)}
              placeholder="Ex: Cliente realizou procedimento conforme planejado. Pele íntegra, orientações pós-procedimento repassadas..."
              className="h-32 w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
            />
          </label>

          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <FileText className="size-4 text-slate-400" />
              Observações internas
            </span>
            <textarea
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              placeholder="Observações administrativas ou comerciais, se houver."
              className="h-24 w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/40 focus:ring-4 focus:ring-violet-500/10"
            />
          </label>

          {erro ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {erro}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/[0.08] bg-white/[0.025] p-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={salvar} disabled={isPending}>
            {isPending ? "Finalizando..." : "Finalizar e lançar financeiro"}
          </Button>
        </div>
      </div>
    </div>
  );
}
