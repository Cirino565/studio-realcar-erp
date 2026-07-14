"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  PencilLine,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";
import type { Cliente } from "@/lib/types";
import {
  buildClientWhatsAppMessage,
  buildWhatsAppUrl,
  WHATSAPP_CLIENT_TEMPLATE_OPTIONS,
  type WhatsAppClientTemplateType,
} from "@/lib/whatsapp";

type Props = {
  open: boolean;
  cliente: Cliente | null;
  onClose: () => void;
};

type ContentProps = {
  cliente: Cliente;
  onClose: () => void;
};

const DEFAULT_TEMPLATE: WhatsAppClientTemplateType = "returnInvite";

function gerarMensagem(
  cliente: Cliente,
  template: WhatsAppClientTemplateType,
) {
  return buildClientWhatsAppMessage({
    template,
    clientName: cliente.nome,
  });
}

function ClienteQuickMessageContent({ cliente, onClose }: ContentProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<WhatsAppClientTemplateType>(DEFAULT_TEMPLATE);
  const [message, setMessage] = useState(() =>
    gerarMensagem(cliente, DEFAULT_TEMPLATE),
  );
  const [copied, setCopied] = useState(false);

  const whatsappUrl = useMemo(
    () =>
      buildWhatsAppUrl(
        cliente.whatsapp || cliente.telefone,
        message.trim(),
      ),
    [cliente.telefone, cliente.whatsapp, message],
  );

  const hasPhone = Boolean(cliente.whatsapp || cliente.telefone);

  function selecionarModelo(template: WhatsAppClientTemplateType) {
    setSelectedTemplate(template);
    setMessage(gerarMensagem(cliente, template));
    setCopied(false);
  }

  async function copyMessage() {
    if (!message.trim()) return;

    await navigator.clipboard.writeText(message);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  return (
    <div className="w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/25 dark:border-white/10 dark:bg-[#11131d] dark:shadow-black/50">
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.035] sm:gap-6 sm:p-6">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
            <MessageCircle size={14} />
            WhatsApp manual
          </div>

          <h2 className="truncate text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            Mensagem para {cliente.nome}
          </h2>
          <p className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
            Escolha um modelo, revise o texto e personalize antes de abrir o
            WhatsApp.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
          aria-label="Fechar modal"
        >
          <X size={18} />
        </button>
      </header>

      <div className="grid lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.02] sm:p-5 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Modelos disponíveis
          </p>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {WHATSAPP_CLIENT_TEMPLATE_OPTIONS.map((template) => {
              const active = template.id === selectedTemplate;

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selecionarModelo(template.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-violet-300 bg-violet-50 text-violet-900 shadow-sm ring-2 ring-violet-100 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-white dark:ring-violet-500/10"
                      : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/60 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="block text-sm font-bold">{template.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {template.description}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="p-4 sm:p-6">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/[0.035]">
              <p className="text-xs font-semibold text-slate-500">Cliente</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                {cliente.nome}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/[0.035]">
              <p className="text-xs font-semibold text-slate-500">Status</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                {cliente.status}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/[0.035]">
              <p className="text-xs font-semibold text-slate-500">Contato</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                {hasPhone
                  ? cliente.whatsapp || cliente.telefone
                  : "Sem telefone"}
              </p>
            </div>
          </div>

          <label className="grid gap-2">
            <span className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              <PencilLine size={14} />
              Revise e edite a mensagem
            </span>

            <textarea
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setCopied(false);
              }}
              className="min-h-64 w-full resize-y rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-100 dark:focus:border-violet-300/40 dark:focus:ring-violet-500/10"
            />
          </label>

          {!hasPhone ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
              Cadastre um telefone ou WhatsApp para abrir a conversa desta
              cliente. Ainda é possível copiar o texto.
            </div>
          ) : null}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={copyMessage}
              disabled={!message.trim()}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copiado" : "Copiar mensagem"}
            </Button>

            {hasPhone ? (
              <Button type="button" asChild disabled={!message.trim()}>
                <WhatsAppLink href={whatsappUrl}>
                  <ExternalLink size={16} />
                  Abrir no WhatsApp
                </WhatsAppLink>
              </Button>
            ) : (
              <Button type="button" disabled>
                <ExternalLink size={16} />
                Sem telefone
              </Button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ClienteQuickMessageModal({
  open,
  cliente,
  onClose,
}: Props) {
  if (!open || !cliente) return null;

  return (
    <div className="app-modal-backdrop fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4">
      <ClienteQuickMessageContent
        key={cliente.id}
        cliente={cliente}
        onClose={onClose}
      />
    </div>
  );
}
