"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus, MessageCircle, Pencil } from "lucide-react";

import type { Cliente } from "@/lib/types";
import ClienteQuickMessageModal from "./ClienteQuickMessageModal";

type Props = {
  cliente: Cliente;
};

export default function ClienteProfileActions({ cliente }: Props) {
  const [mensagemAberta, setMensagemAberta] = useState(false);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Link
          href={`/agenda?clienteId=${cliente.id}`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 dark:bg-teal-500 dark:hover:bg-teal-400"
        >
          <CalendarPlus className="size-4" />
          Agendar
        </Link>

        <button
          type="button"
          onClick={() => setMensagemAberta(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
        >
          <MessageCircle className="size-4" />
          WhatsApp
        </button>

        <Link
          href={`/clientes/${cliente.id}/editar`}
          className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-violet-500/15 dark:hover:text-violet-200 sm:col-span-1"
        >
          <Pencil className="size-4" />
          Editar
        </Link>
      </div>

      <ClienteQuickMessageModal
        open={mensagemAberta}
        cliente={cliente}
        onClose={() => setMensagemAberta(false)}
      />
    </>
  );
}
