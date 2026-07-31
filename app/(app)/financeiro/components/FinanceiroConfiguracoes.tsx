"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, X } from "lucide-react";

import {
  registrarConciliacaoConta,
  salvarContaFinanceira,
  salvarFormaPagamentoConfig,
} from "@/actions/financeiro-config.actions";
import { Button } from "@/components/ui/button";
import { formatarMoeda } from "@/lib/format";
import type {
  ContaFinanceiraData,
  FormaPagamentoConfigData,
} from "../types";

type Props = {
  contas: ContaFinanceiraData[];
  formasPagamento: FormaPagamentoConfigData[];
};

type ContaForm = {
  id: number | null;
  nome: string;
  banco: string;
  tipo: string;
  saldoInicial: string;
  principal: boolean;
  observacoes: string;
};

type FormaForm = {
  id: number | null;
  nome: string;
  taxaPercentual: string;
  taxaFixa: string;
  prazoDias: string;
  status: string;
  ordem: string;
};

const contaVazia: ContaForm = {
  id: null,
  nome: "Conta corrente Studio Realçar",
  banco: "",
  tipo: "Conta corrente",
  saldoInicial: "",
  principal: true,
  observacoes: "",
};

const formaVazia: FormaForm = {
  id: null,
  nome: "",
  taxaPercentual: "0",
  taxaFixa: "0",
  prazoDias: "0",
  status: "Ativa",
  ordem: "0",
};

function numero(value: string) {
  return Number(value.replace(",", ".")) || 0;
}

export default function FinanceiroConfiguracoes({ contas, formasPagamento }: Props) {
  const router = useRouter();
  const [contaModal, setContaModal] = useState(false);
  const [formaModal, setFormaModal] = useState(false);
  const [conciliacaoConta, setConciliacaoConta] = useState<ContaFinanceiraData | null>(null);
  const [saldoBanco, setSaldoBanco] = useState("");
  const [contaForm, setContaForm] = useState<ContaForm>(contaVazia);
  const [formaForm, setFormaForm] = useState<FormaForm>(formaVazia);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function executar(tarefa: () => Promise<void>) {
    setErro(null);
    startTransition(async () => {
      try {
        await tarefa();
        router.refresh();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  function abrirConta(conta?: ContaFinanceiraData) {
    setContaForm(
      conta
        ? {
            id: conta.id,
            nome: conta.nome,
            banco: conta.banco || "",
            tipo: conta.tipo,
            saldoInicial: String(conta.saldoInicial),
            principal: conta.principal,
            observacoes: conta.observacoes || "",
          }
        : contaVazia,
    );
    setContaModal(true);
  }

  function abrirForma(forma?: FormaPagamentoConfigData) {
    setFormaForm(
      forma
        ? {
            id: forma.id,
            nome: forma.nome,
            taxaPercentual: String(forma.taxaPercentual),
            taxaFixa: String(forma.taxaFixa),
            prazoDias: String(forma.prazoDias),
            status: forma.status,
            ordem: String(forma.ordem),
          }
        : formaVazia,
    );
    setFormaModal(true);
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_1.25fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/[0.05] dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Conciliação bancária</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Contas financeiras</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">O saldo inicial representa o valor que já existe no banco. Somente novos lançamentos vinculados à conta serão somados ou descontados.</p>
          </div>
          <Button type="button" size="sm" onClick={() => abrirConta()}><Plus className="size-4" />Conta</Button>
        </div>

        <div className="mt-5 space-y-3">
          {contas.length === 0 ? (
            <button type="button" onClick={() => abrirConta()} className="w-full rounded-2xl border border-dashed border-violet-300 bg-violet-50 p-5 text-left text-sm text-violet-800 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-200">
              Cadastre a conta corrente e informe o saldo atual para iniciar a conciliação sem transformar esse valor em receita.
            </button>
          ) : contas.map((conta) => (
            <div key={conta.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950 dark:text-white">{conta.nome}{conta.principal ? " · principal" : ""}</p>
                  <p className="mt-1 text-xs text-slate-500">{conta.banco || conta.tipo}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setConciliacaoConta(conta); setSaldoBanco(String(conta.saldoBancoInformado ?? conta.saldoCalculado)); }} className="rounded-xl border border-emerald-200 px-2.5 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:text-emerald-300">Conferir saldo</button>
                  <button type="button" onClick={() => abrirConta(conta)} className="rounded-xl border border-slate-200 p-2 text-slate-500 dark:border-white/10 dark:text-slate-300"><Pencil className="size-4" /></button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">Saldo inicial</p><strong className="text-slate-950 dark:text-white">{formatarMoeda(conta.saldoInicial)}</strong></div>
                <div><p className="text-xs text-slate-500">Saldo calculado</p><strong className="text-emerald-700 dark:text-emerald-300">{formatarMoeda(conta.saldoCalculado)}</strong></div>
                <div><p className="text-xs text-slate-500">Entradas líquidas</p><span>{formatarMoeda(conta.entradasLiquidas)}</span></div>
                <div><p className="text-xs text-slate-500">Saídas</p><span>{formatarMoeda(conta.saidas)}</span></div>
                <div><p className="text-xs text-slate-500">Saldo no banco</p><span>{conta.saldoBancoInformado === null ? "Não conferido" : formatarMoeda(conta.saldoBancoInformado)}</span></div>
                <div><p className="text-xs text-slate-500">Diferença</p><strong className={conta.diferencaConciliacao === null || Math.abs(conta.diferencaConciliacao) < 0.01 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>{conta.diferencaConciliacao === null ? "Não calculada" : formatarMoeda(conta.diferencaConciliacao)}</strong></div>
              </div>
              <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                <p>Início da contagem: {new Date(conta.createdAt).toLocaleString("pt-BR")}</p>
                {conta.conciliadoEm ? <p>Última conferência: {new Date(conta.conciliadoEm).toLocaleString("pt-BR")}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/[0.05] dark:border-white/10 dark:bg-slate-950/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-300">Recebimentos</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Taxas da maquininha</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Configure percentual e valor fixo por transação. A venda preserva a taxa aplicada e o valor líquido.</p>
          </div>
          <Button type="button" size="sm" onClick={() => abrirForma()}><Plus className="size-4" />Forma</Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {formasPagamento.map((forma) => (
            <button key={forma.id} type="button" onClick={() => abrirForma(forma)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-violet-300 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-3"><strong className="text-slate-950 dark:text-white">{forma.nome}</strong><Pencil className="size-3.5 text-slate-400" /></div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{forma.taxaPercentual.toFixed(2)}% + {formatarMoeda(forma.taxaFixa)}</p>
              <p className="mt-1 text-xs text-slate-500">Prazo: {forma.prazoDias} dia(s) · {forma.status}</p>
            </button>
          ))}
        </div>
      </div>

      {erro ? <div className="xl:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">{erro}</div> : null}

      {conciliacaoConta ? (
        <Modal title="Conferir saldo bancário" onClose={() => setConciliacaoConta(null)}>
          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-slate-500">Saldo calculado pelo sistema</p>
              <strong className="mt-1 block text-xl text-slate-950 dark:text-white">{formatarMoeda(conciliacaoConta.saldoCalculado)}</strong>
            </div>
            <Input label="Saldo exibido no banco agora" type="number" step="0.01" value={saldoBanco} onChange={setSaldoBanco} />
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-xs leading-5 text-cyan-900 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-100">A conferência não altera receitas, despesas nem o saldo inicial. Ela apenas registra o saldo do banco e mostra a diferença para investigação.</div>
            <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setConciliacaoConta(null)}>Cancelar</Button><Button type="button" disabled={isPending || !saldoBanco.trim()} onClick={() => executar(async () => { await registrarConciliacaoConta({ contaId: conciliacaoConta.id, saldoBancoInformado: numero(saldoBanco) }); setConciliacaoConta(null); })}>{isPending ? "Conferindo..." : "Registrar conferência"}</Button></div>
          </div>
        </Modal>
      ) : null}

      {contaModal ? (
        <Modal title={contaForm.id ? "Editar conta financeira" : "Nova conta financeira"} onClose={() => setContaModal(false)}>
          <div className="grid gap-4">
            <Input label="Nome da conta" value={contaForm.nome} onChange={(value) => setContaForm({ ...contaForm, nome: value })} />
            <div className="grid gap-4 sm:grid-cols-2"><Input label="Banco" value={contaForm.banco} onChange={(value) => setContaForm({ ...contaForm, banco: value })} /><Input label="Tipo" value={contaForm.tipo} onChange={(value) => setContaForm({ ...contaForm, tipo: value })} /></div>
            <Input label="Saldo atual para início" type="number" step="0.01" value={contaForm.saldoInicial} onChange={(value) => setContaForm({ ...contaForm, saldoInicial: value })} />
            <label className="flex items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900 dark:border-cyan-400/20 dark:bg-cyan-500/10 dark:text-cyan-100"><input type="checkbox" checked={contaForm.principal} onChange={(event) => setContaForm({ ...contaForm, principal: event.target.checked })} className="mt-1" /><span>Usar como conta principal para novas vendas e lançamentos.</span></label>
            <Textarea label="Observações" value={contaForm.observacoes} onChange={(value) => setContaForm({ ...contaForm, observacoes: value })} />
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">Não inclua novamente receitas que já compõem esse saldo inicial. Ajustar o saldo inicial depois altera o saldo calculado da conta.</div>
            <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setContaModal(false)}>Cancelar</Button><Button type="button" disabled={isPending || !contaForm.nome.trim()} onClick={() => executar(async () => { await salvarContaFinanceira({ id: contaForm.id, nome: contaForm.nome, banco: contaForm.banco, tipo: contaForm.tipo, saldoInicial: numero(contaForm.saldoInicial), principal: contaForm.principal, observacoes: contaForm.observacoes }); setContaModal(false); })}>{isPending ? "Salvando..." : "Salvar conta"}</Button></div>
          </div>
        </Modal>
      ) : null}

      {formaModal ? (
        <Modal title={formaForm.id ? "Editar forma de pagamento" : "Nova forma de pagamento"} onClose={() => setFormaModal(false)}>
          <div className="grid gap-4">
            <Input label="Nome" value={formaForm.nome} onChange={(value) => setFormaForm({ ...formaForm, nome: value })} />
            <div className="grid gap-4 sm:grid-cols-2"><Input label="Taxa percentual" type="number" step="0.01" value={formaForm.taxaPercentual} onChange={(value) => setFormaForm({ ...formaForm, taxaPercentual: value })} /><Input label="Taxa fixa por transação" type="number" step="0.01" value={formaForm.taxaFixa} onChange={(value) => setFormaForm({ ...formaForm, taxaFixa: value })} /></div>
            <div className="grid gap-4 sm:grid-cols-3"><Input label="Prazo, dias" type="number" min="0" value={formaForm.prazoDias} onChange={(value) => setFormaForm({ ...formaForm, prazoDias: value })} /><Input label="Ordem" type="number" min="0" value={formaForm.ordem} onChange={(value) => setFormaForm({ ...formaForm, ordem: value })} /><label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">Status<select value={formaForm.status} onChange={(event) => setFormaForm({ ...formaForm, status: event.target.value })} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-slate-900"><option>Ativa</option><option>Inativa</option></select></label></div>
            <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setFormaModal(false)}>Cancelar</Button><Button type="button" disabled={isPending || !formaForm.nome.trim()} onClick={() => executar(async () => { await salvarFormaPagamentoConfig({ id: formaForm.id, nome: formaForm.nome, taxaPercentual: numero(formaForm.taxaPercentual), taxaFixa: numero(formaForm.taxaFixa), prazoDias: numero(formaForm.prazoDias), status: formaForm.status, ordem: numero(formaForm.ordem) }); setFormaModal(false); })}>{isPending ? "Salvando..." : "Salvar forma"}</Button></div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[180] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"><div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-950 sm:max-w-2xl sm:rounded-3xl"><div className="mb-5 flex items-center justify-between gap-3"><h3 className="text-xl font-semibold text-slate-950 dark:text-white">{title}</h3><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 p-2 dark:border-white/10"><X className="size-4" /></button></div>{children}</div></div>;
}

function Input({ label, onChange, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { label: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">{label}<input {...props} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-slate-950 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-900 dark:text-white" /></label>;
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none focus:border-violet-400 dark:border-white/10 dark:bg-slate-900 dark:text-white" /></label>;
}
