"use client";

import { useState } from "react";
import {
  CalendarPlus,
  MessageCircle,
} from "lucide-react";

import ClienteQuickMessageModal from "./ClienteQuickMessageModal";
import type { Cliente } from "@/lib/types";

type Props = {
  cliente: Cliente;
};

export default function ClienteProfileActions({
  cliente,
}: Props) {
  const [mensagemAberta, setMensagemAberta] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <a
          href={`/agenda?clienteId=${cliente.id}`}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800"
        >
          <CalendarPlus className="size-4" />
          Agendar
        </a>

        <button
          type="button"
          onClick={() => setMensagemAberta(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          <MessageCircle className="size-4" />
          WhatsApp
        </button>
      </div>

      <ClienteQuickMessageModal
        open={mensagemAberta}
        cliente={cliente}
        onClose={() => setMensagemAberta(false)}
      />
    </>
  );
}