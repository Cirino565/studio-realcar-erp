"use client";

import { useMemo, useState } from "react";
import type { OrigemCliente, ProcedimentoInteresse } from "@prisma/client";
import type { Cliente } from "@/lib/types";

type FormData = {
  nome: string;
  telefone: string;
  whatsapp: string;
  cpf: string;
  instagram: string;
  origem: string;
  procedimentoInteresse: string;
  nascimento: string;
  observacoes: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  origens: OrigemCliente[];
  procedimentosInteresse: ProcedimentoInteresse[];
  onSalvar: (dados: FormData) => void;
};

const ORIGENS_FALLBACK = [
  "Indicação",
  "Google Ads",
  "Facebook Ads",
  "Instagram",
  "WhatsApp",
  "Busca orgânica",
  "Cliente antigo",
  "Passou na frente",
  "Outro",
];

const PROCEDIMENTOS_FALLBACK = [
  "Avaliação",
  "Limpeza de pele",
  "Botox",
  "Preenchimento",
  "Bioestimulador",
  "Depilação",
  "Massagem",
  "Drenagem",
  "Peeling",
  "Outro",
];

const inicial: FormData = {
  nome: "",
  telefone: "",
  whatsapp: "",
  cpf: "",
  instagram: "",
  origem: "Indicação",
  procedimentoInteresse: "Avaliação",
  nascimento: "",
  observacoes: "",
};

function somenteNumeros(value: string) {
  return value.replace(/\D/g, "");
}

function formatarTelefone(value: string) {
  const digits = somenteNumeros(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatarCpf(value: string) {
  const digits = somenteNumeros(value).slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function montarFormulario(cliente: Cliente | null, origemPadrao: string, procedimentoPadrao: string): FormData {
  if (!cliente) {
    return {
      ...inicial,
      origem: origemPadrao,
      procedimentoInteresse: procedimentoPadrao,
    };
  }

  return {
    nome: cliente.nome ?? "",
    telefone: formatarTelefone(cliente.telefone ?? ""),
    whatsapp: formatarTelefone(cliente.whatsapp ?? ""),
    cpf: formatarCpf(cliente.cpf ?? ""),
    instagram: cliente.instagram ?? "",
    origem: cliente.origem ?? origemPadrao,
    procedimentoInteresse: cliente.procedimentoInteresse ?? cliente.procedimento ?? procedimentoPadrao,
    nascimento: cliente.nascimento ? new Date(cliente.nascimento).toISOString().split("T")[0] : "",
    observacoes: cliente.observacoes ?? "",
  };
}

function NovoClienteForm({ cliente, onClose, onSalvar, origens, procedimentosInteresse }: Omit<Props, "open">) {
  const origensDisponiveis = useMemo(
    () => (origens.length > 0 ? origens.map((origem) => origem.nome) : ORIGENS_FALLBACK),
    [origens]
  );
  const procedimentosDisponiveis = useMemo(
    () =>
      procedimentosInteresse.length > 0
        ? procedimentosInteresse.map((procedimento) => procedimento.nome)
        : PROCEDIMENTOS_FALLBACK,
    [procedimentosInteresse]
  );

  const origemPadrao = origensDisponiveis[0] ?? "Indicação";
  const procedimentoPadrao = procedimentosDisponiveis[0] ?? "Avaliação";
  const formInicial = useMemo(
    () => montarFormulario(cliente, origemPadrao, procedimentoPadrao),
    [cliente, origemPadrao, procedimentoPadrao]
  );
  const [form, setForm] = useState<FormData>(formInicial);

  function alterarCampo(campo: keyof FormData, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function salvar() {
    if (!form.nome.trim()) {
      alert("Informe o nome do cliente.");
      return;
    }

    if (!somenteNumeros(form.whatsapp) && !somenteNumeros(form.telefone)) {
      alert("Informe pelo menos o WhatsApp ou telefone do cliente.");
      return;
    }

    const telefoneFormatado = formatarTelefone(form.telefone || form.whatsapp);
    const whatsappFormatado = formatarTelefone(form.whatsapp || form.telefone);

    onSalvar({
      ...form,
      telefone: telefoneFormatado,
      whatsapp: whatsappFormatado,
      cpf: formatarCpf(form.cpf),
      instagram: "",
      nascimento: "",
      procedimentoInteresse: form.procedimentoInteresse || procedimentoPadrao,
    });
    onClose();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        salvar();
      }}
      className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-hidden rounded-[1.5rem] border border-white/[0.10] bg-[#111827] shadow-2xl shadow-black/40 sm:rounded-[2rem]"
    >
      <div className="border-b border-white/[0.08] bg-white/[0.035] px-4 py-4 sm:px-8 sm:py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {cliente ? "Editar cliente" : "Novo cliente"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">Cadastro clínico, comercial, origem e interesse do cliente.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-200"
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="max-h-[calc(100dvh-12rem)] space-y-5 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Nome completo
            </label>
            <input
              name="nome"
              value={form.nome}
              onChange={(event) => alterarCampo("nome", event.target.value)}
              placeholder="Ex: Jully Oliveira"
              className="premium-input"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              WhatsApp
            </label>
            <input
              name="whatsapp"
              value={form.whatsapp}
              onChange={(event) => alterarCampo("whatsapp", formatarTelefone(event.target.value))}
              placeholder="(11) 99999-9999"
              className="premium-input"
              inputMode="tel"
              autoComplete="tel"
            />
            <p className="mt-2 text-xs text-slate-500">Usado para abrir o WhatsApp já com a mensagem pronta.</p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Telefone alternativo
            </label>
            <input
              name="telefone"
              value={form.telefone}
              onChange={(event) => alterarCampo("telefone", formatarTelefone(event.target.value))}
              placeholder="(11) 99999-9999"
              className="premium-input"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              CPF
            </label>
            <input
              name="cpf"
              value={form.cpf}
              onChange={(event) => alterarCampo("cpf", formatarCpf(event.target.value))}
              placeholder="000.000.000-00"
              className="premium-input"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Origem
            </label>
            <select
              name="origem"
              value={form.origem}
              onChange={(event) => alterarCampo("origem", event.target.value)}
              className="premium-input"
            >
              {origensDisponiveis.map((origem) => (
                <option key={origem} value={origem}>
                  {origem}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Procedimento de interesse
            </label>
            <select
              name="procedimentoInteresse"
              value={form.procedimentoInteresse}
              onChange={(event) => alterarCampo("procedimentoInteresse", event.target.value)}
              className="premium-input"
            >
              {procedimentosDisponiveis.map((procedimento) => (
                <option key={procedimento} value={procedimento}>
                  {procedimento}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              As opções são editadas em Configurações &gt; Cadastros auxiliares.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4">
          <p className="text-sm font-semibold text-slate-200">Data de cadastro</p>
          <p className="mt-1 text-sm text-slate-400">
            Esse campo é preenchido automaticamente pelo sistema no momento em que o cliente é salvo.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Observações
          </label>
          <textarea
            name="observacoes"
            value={form.observacoes}
            onChange={(event) => alterarCampo("observacoes", event.target.value)}
            placeholder="Observações comerciais, preferências, restrições iniciais ou informações importantes."
            className="premium-input min-h-32"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-white/[0.08] bg-white/[0.025] px-4 py-4 sm:flex-row sm:justify-end sm:px-8 sm:py-5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl border border-white/[0.10] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:from-violet-500 hover:to-fuchsia-500"
        >
          {cliente ? "Salvar alterações" : "Salvar cliente"}
        </button>
      </div>
    </form>
  );
}

export default function NovoClienteModal({ open, onClose, cliente, onSalvar, origens, procedimentosInteresse }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/75 p-3 pt-4 backdrop-blur-md sm:items-center sm:p-4">
      <NovoClienteForm
        key={cliente?.id ?? "novo-cliente"}
        cliente={cliente}
        onClose={onClose}
        onSalvar={onSalvar}
        origens={origens}
        procedimentosInteresse={procedimentosInteresse}
      />
    </div>
  );
}
