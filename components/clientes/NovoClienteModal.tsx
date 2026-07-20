"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Save, UserRound, X } from "lucide-react";
import type { OrigemCliente, ProcedimentoInteresse } from "@prisma/client";

import { Button } from "@/components/ui/button";
import type { Cliente } from "@/lib/types";


function useLockBodyScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;

    const previous = {
      htmlOverflow: html.style.overflow,
      htmlOverflowX: html.style.overflowX,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverflowX: body.style.overflowX,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
    };

    html.style.overflow = "hidden";
    html.style.overflowX = "hidden";
    html.style.overscrollBehavior = "none";

    body.style.overflow = "hidden";
    body.style.overflowX = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      html.style.overflow = previous.htmlOverflow;
      html.style.overflowX = previous.htmlOverflowX;
      html.style.overscrollBehavior = previous.htmlOverscrollBehavior;

      body.style.overflow = previous.bodyOverflow;
      body.style.overflowX = previous.bodyOverflowX;
      body.style.overscrollBehavior = previous.bodyOverscrollBehavior;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.left = previous.bodyLeft;
      body.style.right = previous.bodyRight;
      body.style.width = previous.bodyWidth;

      window.scrollTo(0, scrollY);
    };
  }, [open]);
}

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
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatarDataInput(value: Date | string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function montarFormulario(
  cliente: Cliente | null,
  origemPadrao: string,
  procedimentoPadrao: string,
): FormData {
  if (!cliente) {
    return {
      nome: "",
      telefone: "",
      whatsapp: "",
      cpf: "",
      instagram: "",
      origem: origemPadrao,
      procedimentoInteresse: procedimentoPadrao,
      nascimento: "",
      observacoes: "",
    };
  }

  return {
    nome: cliente.nome ?? "",
    telefone: formatarTelefone(cliente.telefone ?? ""),
    whatsapp: formatarTelefone(cliente.whatsapp ?? ""),
    cpf: formatarCpf(cliente.cpf ?? ""),
    instagram: cliente.instagram ?? "",
    origem: cliente.origem ?? origemPadrao,
    procedimentoInteresse:
      cliente.procedimentoInteresse ??
      cliente.procedimento ??
      procedimentoPadrao,
    nascimento: formatarDataInput(cliente.nascimento),
    observacoes: cliente.observacoes ?? "",
  };
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-2 block text-[0.68rem] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
      {children}
    </span>
  );
}

function NovoClienteForm({
  cliente,
  onClose,
  onSalvar,
  origens,
  procedimentosInteresse,
}: Omit<Props, "open">) {
  const origensDisponiveis = useMemo(
    () => (origens.length > 0 ? origens.map((origem) => origem.nome) : ORIGENS_FALLBACK),
    [origens],
  );

  const procedimentosDisponiveis = useMemo(
    () =>
      procedimentosInteresse.length > 0
        ? procedimentosInteresse.map((procedimento) => procedimento.nome)
        : PROCEDIMENTOS_FALLBACK,
    [procedimentosInteresse],
  );

  const origemPadrao = origensDisponiveis[0] ?? "Indicação";
  const procedimentoPadrao = procedimentosDisponiveis[0] ?? "Avaliação";

  const [form, setForm] = useState<FormData>(() =>
    montarFormulario(cliente, origemPadrao, procedimentoPadrao),
  );
  const [erro, setErro] = useState("");

  function alterarCampo(campo: keyof FormData, valor: string) {
    setErro("");
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function salvar() {
    if (!form.nome.trim()) {
      setErro("Informe o nome completo da cliente.");
      return;
    }

    if (!somenteNumeros(form.whatsapp) && !somenteNumeros(form.telefone)) {
      setErro("Informe pelo menos o WhatsApp ou o telefone da cliente.");
      return;
    }

    onSalvar({
      ...form,
      nome: form.nome.trim(),
      telefone: formatarTelefone(form.telefone || form.whatsapp),
      whatsapp: formatarTelefone(form.whatsapp || form.telefone),
      cpf: formatarCpf(form.cpf),
      instagram: form.instagram.trim(),
      origem: form.origem || origemPadrao,
      procedimentoInteresse:
        form.procedimentoInteresse || procedimentoPadrao,
      nascimento: form.nascimento,
      observacoes: form.observacoes.trim(),
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        salvar();
      }}
      className="flex max-h-[calc(100dvh-1.5rem)] w-full min-w-0 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-[#111827] dark:shadow-black/50 sm:max-h-[calc(100dvh-2rem)] sm:max-w-3xl"
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/[0.035] sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="hidden size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 sm:flex">
            <UserRound size={20} />
          </div>

          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
              {cliente ? "Editar cliente" : "Nova cliente"}
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
              Cadastro clínico, comercial, origem e interesse principal.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-rose-50 hover:text-rose-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
          aria-label="Fechar modal"
        >
          <X size={18} />
        </button>
      </header>

      <div
        className="scrollbar-premium min-h-0 min-w-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6"
        style={{ touchAction: "pan-y", overscrollBehaviorX: "none" }}
      >
        {erro ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{erro}</span>
          </div>
        ) : null}

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <Label>Nome completo</Label>
            <input
              name="nome"
              value={form.nome}
              onChange={(event) => alterarCampo("nome", event.target.value)}
              placeholder="Ex.: Jully Oliveira"
              className="premium-input w-full min-w-0 max-w-full text-base sm:text-sm"
              autoComplete="name"
            />
          </label>

          <label>
            <Label>WhatsApp</Label>
            <input
              name="whatsapp"
              value={form.whatsapp}
              onChange={(event) =>
                alterarCampo("whatsapp", formatarTelefone(event.target.value))
              }
              placeholder="(11) 99999-9999"
              className="premium-input w-full min-w-0 max-w-full text-base sm:text-sm"
              inputMode="tel"
              autoComplete="tel"
            />
          </label>

          <label>
            <Label>Telefone alternativo</Label>
            <input
              name="telefone"
              value={form.telefone}
              onChange={(event) =>
                alterarCampo("telefone", formatarTelefone(event.target.value))
              }
              placeholder="(11) 99999-9999"
              className="premium-input w-full min-w-0 max-w-full text-base sm:text-sm"
              inputMode="tel"
            />
          </label>

          <label>
            <Label>CPF</Label>
            <input
              name="cpf"
              value={form.cpf}
              onChange={(event) => alterarCampo("cpf", formatarCpf(event.target.value))}
              placeholder="000.000.000-00"
              className="premium-input w-full min-w-0 max-w-full text-base sm:text-sm"
              inputMode="numeric"
            />
          </label>

          <label>
            <Label>Data de nascimento</Label>
            <input
              name="nascimento"
              type="date"
              value={form.nascimento}
              onChange={(event) => alterarCampo("nascimento", event.target.value)}
              className="premium-input w-full min-w-0 max-w-full text-base sm:text-sm"
            />
          </label>

          <label>
            <Label>Instagram</Label>
            <input
              name="instagram"
              value={form.instagram}
              onChange={(event) => alterarCampo("instagram", event.target.value)}
              placeholder="@usuario"
              className="premium-input w-full min-w-0 max-w-full text-base sm:text-sm"
              autoCapitalize="none"
            />
          </label>

          <label>
            <Label>Origem</Label>
            <select
              name="origem"
              value={form.origem}
              onChange={(event) => alterarCampo("origem", event.target.value)}
              className="premium-input w-full min-w-0 max-w-full text-base sm:text-sm"
            >
              {origensDisponiveis.map((origem) => (
                <option key={origem} value={origem}>
                  {origem}
                </option>
              ))}
            </select>
          </label>

          <label className="sm:col-span-2">
            <Label>Procedimento de interesse</Label>
            <select
              name="procedimentoInteresse"
              value={form.procedimentoInteresse}
              onChange={(event) =>
                alterarCampo("procedimentoInteresse", event.target.value)
              }
              className="premium-input w-full min-w-0 max-w-full text-base sm:text-sm"
            >
              {procedimentosDisponiveis.map((procedimento) => (
                <option key={procedimento} value={procedimento}>
                  {procedimento}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              As opções podem ser gerenciadas em Configurações &gt; Cadastros
              auxiliares.
            </p>
          </label>
        </div>

        <label>
          <Label>Observações</Label>
          <textarea
            name="observacoes"
            value={form.observacoes}
            onChange={(event) => alterarCampo("observacoes", event.target.value)}
            placeholder="Preferências, restrições iniciais ou informações importantes."
            className="premium-input min-h-28 w-full min-w-0 max-w-full resize-y text-base sm:text-sm"
          />
        </label>
      </div>

      <footer className="grid shrink-0 gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/[0.025] sm:grid-cols-2 sm:px-6">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">
          <Save size={16} />
          {cliente ? "Salvar alterações" : "Salvar cliente"}
        </Button>
      </footer>
    </form>
  );
}

export default function NovoClienteModal({
  open,
  onClose,
  cliente,
  onSalvar,
  origens,
  procedimentosInteresse,
}: Props) {
  useLockBodyScroll(open);

  if (!open) return null;

  return (
    <div
      className="app-modal-backdrop fixed inset-0 z-[100] flex h-[100dvh] w-full max-w-full items-start justify-center overflow-hidden bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      style={{ touchAction: "pan-y", overscrollBehaviorX: "none" }}
    >
      <NovoClienteForm
        key={cliente?.id ?? "nova-cliente"}
        cliente={cliente}
        onClose={onClose}
        onSalvar={onSalvar}
        origens={origens}
        procedimentosInteresse={procedimentosInteresse}
      />
    </div>
  );
}
