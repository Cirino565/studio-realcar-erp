"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle, X } from "lucide-react";

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

export default function ClienteQuickMessageModal({
  open,
  cliente,
  onClose,
}: Props) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<WhatsAppClientTemplateType>("returnInvite");
  const [copied, setCopied] = useState(false);

  const message = useMemo(() => {
    if (!cliente) return "";

    return buildClientWhatsAppMessage({
      template: selectedTemplate,
      clientName: cliente.nome,
    });
  }, [cliente, selectedTemplate]);

  const whatsappUrl = useMemo(() => {
    if (!cliente) return "";

    return buildWhatsAppUrl(cliente.whatsapp || cliente.telefone, message);
  }, [cliente, message]);

  async function copyMessage() {
    if (!message) return;

    await navigator.clipboard.writeText(message);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  if (!open || !cliente) return null;

  const hasPhone = Boolean(cliente.whatsapp || cliente.telefone);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/80 px-3 py-4 backdrop-blur-xl sm:items-center sm:px-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-[1.5rem] border border-white/[0.10] bg-[#11131d] shadow-2xl shadow-black/50 sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] bg-white/[0.035] p-4 sm:gap-6 sm:p-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <MessageCircle size={14} />
              WhatsApp manual
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Mensagem para {cliente.nome}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Use modelos rápidos para relacionamento, retorno e reativação.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-2 text-slate-300 hover:bg-white/[0.08] hover:text-white"
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
          <div className="border-b border-white/[0.08] bg-white/[0.02] p-5 lg:border-b-0 lg:border-r">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Modelos
            </p>

            <div className="space-y-2">
              {WHATSAPP_CLIENT_TEMPLATE_OPTIONS.map((template) => {
                const active = template.id === selectedTemplate;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-violet-400/40 bg-violet-500/12 text-white shadow-lg shadow-violet-950/20"
                        : "border-white/[0.08] bg-white/[0.025] text-slate-300 hover:border-white/[0.14] hover:bg-white/[0.05]"
                    }`}
                  >
                    <span className="block text-sm font-semibold">
                      {template.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {template.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">Cliente</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {cliente.nome}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">Status</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {cliente.status}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                <p className="text-xs text-slate-500">Contato</p>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {hasPhone ? cliente.whatsapp || cliente.telefone : "Sem telefone"}
                </p>
              </div>
            </div>

            <textarea
              value={message}
              readOnly
              className="h-72 w-full resize-none rounded-3xl border border-white/[0.10] bg-slate-950/60 p-5 text-sm leading-6 text-slate-100 outline-none"
            />

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={copyMessage}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copiado" : "Copiar mensagem"}
              </Button>

              <Button type="button" asChild>
                <WhatsAppLink href={whatsappUrl}>
                  <ExternalLink size={16} />
                  Abrir no WhatsApp
                </WhatsAppLink>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
