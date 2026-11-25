"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { registrarMensagemEnviada } from "@/actions/mensagem-enviada.actions";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";

type Props = {
  href: string;
  enviadaInicial: boolean;
  registro: {
    categoria: "Aniversário" | "Pós-atendimento" | "Confirmação de agendamento";
    clienteId: number;
    agendamentoId?: number | null;
    destinatarioNome: string;
    telefone?: string | null;
  };
  /** Classes do botao antes de enviar (verde). */
  className: string;
  /** Classes depois de enviada (cinza). */
  classNameEnviada: string;
  rotuloEnviada?: string;
  /** Avisa a tela quando a mensagem acabou de ser enviada. */
  onEnviada?: () => void;
  "aria-label"?: string;
  children: React.ReactNode;
};

/**
 * Botao do WhatsApp que fica cinza depois de usado ("Enviada"), para todo
 * mundo ver que a mensagem ja saiu. Continua clicavel para mandar de novo.
 */
export function WhatsAppEnviado({
  href,
  enviadaInicial,
  registro,
  className,
  classNameEnviada,
  rotuloEnviada = "Enviada",
  onEnviada,
  children,
  ...props
}: Props) {
  const [enviada, setEnviada] = useState(enviadaInicial);

  return (
    <WhatsAppLink
      href={href}
      aria-label={props["aria-label"]}
      title={enviada ? "Já enviada hoje (toque para mandar de novo)" : undefined}
      className={enviada ? classNameEnviada : className}
      onClick={() => {
        if (!enviada) {
          setEnviada(true);
          onEnviada?.();
          void registrarMensagemEnviada(registro).catch(() => undefined);
        }
      }}
    >
      {enviada ? (
        <>
          <Check className="size-3.5" />
          {rotuloEnviada}
        </>
      ) : (
        children
      )}
    </WhatsAppLink>
  );
}
