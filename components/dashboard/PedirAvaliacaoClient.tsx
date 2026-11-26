"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Star } from "lucide-react";
import { marcarAvaliacaoPedida } from "@/actions/avaliacao-google.actions";
import { mensagemAvaliacaoGoogle } from "@/lib/avaliacao-google";

export type PedirAvaliacaoItem = {
  agendamentoId: number;
  clienteId: number;
  nome: string;
  procedimento: string;
  /** "ontem" ou a data curta do atendimento. */
  quando: string;
};

async function copiarTexto(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Navegadores antigos: copia por um campo escondido.
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.style.position = "fixed";
    campo.style.opacity = "0";
    document.body.appendChild(campo);
    campo.select();
    const ok = document.execCommand("copy");
    campo.remove();
    return ok;
  }
}

/** Lista "Pedir avaliação hoje": copiar a mensagem e marcar "Já pedi". */
export default function PedirAvaliacaoClient({ itens }: { itens: PedirAvaliacaoItem[] }) {
  const [pedidos, setPedidos] = useState<number[]>([]);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [erro, setErro] = useState("");
  const [, startTransition] = useTransition();

  const visiveis = itens.filter((item) => !pedidos.includes(item.clienteId));

  async function copiar(item: PedirAvaliacaoItem) {
    const ok = await copiarTexto(mensagemAvaliacaoGoogle(item.nome));
    setCopiado(ok ? item.clienteId : null);
    setErro(ok ? "" : "Não deu para copiar. Tente de novo.");
  }

  function jaPedi(item: PedirAvaliacaoItem) {
    setPedidos((atuais) => [...atuais, item.clienteId]);
    startTransition(async () => {
      const resposta = await marcarAvaliacaoPedida({
        clienteId: item.clienteId,
        agendamentoId: item.agendamentoId,
      }).catch(() => ({ ok: false as const }));
      if (!resposta.ok) {
        setPedidos((atuais) => atuais.filter((id) => id !== item.clienteId));
        setErro("Não foi possível marcar. Tente de novo.");
      }
    });
  }

  if (visiveis.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
        Ninguém para pedir avaliação hoje.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {erro ? <p className="text-xs font-semibold text-rose-600">{erro}</p> : null}
      {visiveis.map((item) => (
        <div
          key={item.clienteId}
          className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-900">{item.nome}</p>
            <p className="truncate text-xs text-slate-500">
              {item.procedimento} · {item.quando}
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => copiar(item)}
              className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-xs font-bold transition sm:flex-none ${
                copiado === item.clienteId
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              }`}
            >
              {copiado === item.clienteId ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiado === item.clienteId ? "Copiada" : "Copiar mensagem"}
            </button>
            <button
              type="button"
              onClick={() => jaPedi(item)}
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 sm:flex-none"
            >
              <Star className="size-4 text-amber-500" />
              Já pedi
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
