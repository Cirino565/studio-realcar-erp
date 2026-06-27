import Link from "next/link";
import {
  CalendarDays,
  Eye,
  MessageCircle,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Cliente } from "@/lib/types";
import { formatarData, formatarMoeda } from "@/lib/format";
import { buildClientWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

type Props = {
  clientes: Cliente[];
  onExcluir: (id: number) => void;
  onEditar: (cliente: Cliente) => void;
  onMensagem: (cliente: Cliente) => void;
};


function whatsappClienteHref(cliente: Cliente) {
  return buildWhatsAppUrl(
    cliente.whatsapp || cliente.telefone,
    buildClientWhatsAppMessage({
      template: "returnInvite",
      clientName: cliente.nome,
    })
  );
}

function getInitials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

export default function ClienteTable({
  clientes,
  onExcluir,
  onEditar,
  onMensagem,
}: Props) {
  if (clientes.length === 0) {
    return (
      <div className="premium-card flex min-h-72 flex-col items-center justify-center p-10 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05] text-slate-300">
          <Eye size={22} />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-white">
          Nenhum cliente encontrado
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
          Ajuste os filtros ou cadastre um novo cliente para alimentar sua base de relacionamento.
        </p>
      </div>
    );
  }

  return (
    <div className="premium-table">
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-white/[0.08] bg-white/[0.035] text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-5 py-4 text-left font-semibold">Cliente</th>
              <th className="px-5 py-4 text-left font-semibold">Contato</th>
              <th className="px-5 py-4 text-left font-semibold">Procedimento</th>
              <th className="px-5 py-4 text-left font-semibold">Valor gasto</th>
              <th className="px-5 py-4 text-left font-semibold">Última visita</th>
              <th className="px-5 py-4 text-left font-semibold">Status</th>
              <th className="px-5 py-4 text-right font-semibold">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.06]">
            {clientes.map((cliente) => (
              <tr
                key={cliente.id}
                className="transition hover:bg-white/[0.035]"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white shadow-lg shadow-violet-950/25">
                      {getInitials(cliente.nome)}
                    </div>

                    <div>
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="font-semibold text-white transition hover:text-violet-200"
                      >
                        {cliente.nome}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {cliente.cpf || cliente.origem || "Sem documento"}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4 text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone size={15} className="text-slate-500" />
                    {cliente.whatsapp || cliente.telefone || "-"}
                  </div>
                </td>

                <td className="px-5 py-4 text-slate-300">
                  {cliente.procedimentoInteresse || cliente.procedimento || "Não informado"}
                </td>

                <td className="px-5 py-4 font-semibold text-emerald-300">
                  {formatarMoeda(cliente.valorGasto)}
                </td>

                <td className="px-5 py-4 text-slate-300">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={15} className="text-slate-500" />
                    {formatarData(cliente.ultimaVisita)}
                  </div>
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      cliente.status === "Ativa"
                        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                        : "border-rose-400/20 bg-rose-400/10 text-rose-300"
                    }`}
                  >
                    {cliente.status}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Button type="button" size="icon-sm" variant="outline" asChild>
                      <Link href={`/clientes/${cliente.id}`} aria-label="Ver perfil">
                        <Eye size={16} />
                      </Link>
                    </Button>

                    <Button type="button" size="icon-sm" variant="outline" asChild>
                      <a href={whatsappClienteHref(cliente)} target="_blank" rel="noopener noreferrer" aria-label="Mensagem WhatsApp">
                        <MessageCircle size={16} />
                      </a>
                    </Button>

                    <Button type="button" size="icon-sm" variant="outline" asChild>
                      <Link href={`/clientes/${cliente.id}/editar`} aria-label="Editar cliente">
                        <Pencil size={16} />
                      </Link>
                    </Button>

                    <Button
                      type="button"
                      size="icon-sm"
                      variant="destructive"
                      onClick={() => onExcluir(cliente.id)}
                      aria-label="Excluir cliente"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-3 xl:hidden">
        {clientes.map((cliente) => (
          <div
            key={cliente.id}
            className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
                  {getInitials(cliente.nome)}
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/clientes/${cliente.id}`}
                    className="block truncate font-semibold text-white"
                  >
                    {cliente.nome}
                  </Link>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {cliente.whatsapp || cliente.telefone || "Sem telefone"}
                  </p>
                </div>
              </div>

              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                  cliente.status === "Ativa"
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : "border-rose-400/20 bg-rose-400/10 text-rose-300"
                }`}
              >
                {cliente.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Procedimento</p>
                <p className="mt-1 text-slate-200">
                  {cliente.procedimentoInteresse || cliente.procedimento || "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Valor gasto</p>
                <p className="mt-1 font-semibold text-emerald-300">
                  {formatarMoeda(cliente.valorGasto)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Última visita</p>
                <p className="mt-1 text-slate-200">
                  {formatarData(cliente.ultimaVisita)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href={`/clientes/${cliente.id}`}>
                  <Eye size={15} />
                  Perfil
                </Link>
              </Button>

              <Button type="button" size="sm" variant="outline" asChild>
                <a href={whatsappClienteHref(cliente)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={15} />
                  WhatsApp
                </a>
              </Button>

              <Button type="button" size="sm" variant="outline" asChild>
                <Link href={`/clientes/${cliente.id}/editar`}>
                  <Pencil size={15} />
                  Editar
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
