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
import { formatarData, formatarMoeda } from "@/lib/format";
import type { Cliente } from "@/lib/types";

type Props = {
  clientes: Cliente[];
  onExcluir: (id: number) => void;
  onEditar: (cliente: Cliente) => void;
  onMensagem: (cliente: Cliente) => void;
};

function getInitials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function StatusBadge({ status }: { status: string }) {
  const ativa = status === "Ativa";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-bold ${
        ativa
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
          : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300"
      }`}
    >
      {status}
    </span>
  );
}

export default function ClienteTable({
  clientes,
  onExcluir,
  onEditar,
  onMensagem,
}: Props) {
  if (clientes.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-10">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
          <Eye size={22} />
        </div>
        <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
          Nenhuma cliente encontrada
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
          Ajuste os filtros ou cadastre uma nova cliente para ampliar sua base
          de relacionamento.
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.055]">
      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[1020px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[0.68rem] uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-white/[0.025] dark:text-slate-400">
            <tr>
              <th className="px-5 py-4 text-left font-bold">Cliente</th>
              <th className="px-5 py-4 text-left font-bold">Contato</th>
              <th className="px-5 py-4 text-left font-bold">Interesse</th>
              <th className="px-5 py-4 text-left font-bold">Valor gasto</th>
              <th className="px-5 py-4 text-left font-bold">Última visita</th>
              <th className="px-5 py-4 text-left font-bold">Status</th>
              <th className="px-5 py-4 text-right font-bold">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {clientes.map((cliente) => (
              <tr
                key={cliente.id}
                className="transition hover:bg-slate-50 dark:hover:bg-white/[0.035]"
              >
                <td className="px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-sm font-bold text-white shadow-md shadow-violet-600/20">
                      {getInitials(cliente.nome)}
                    </div>

                    <div className="min-w-0">
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="block truncate font-bold text-slate-900 transition hover:text-violet-700 dark:text-white dark:hover:text-violet-300"
                      >
                        {cliente.nome}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {cliente.cpf || cliente.origem || "Sem documento"}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone size={15} className="shrink-0 text-slate-400" />
                    <span className="truncate">
                      {cliente.whatsapp || cliente.telefone || "-"}
                    </span>
                  </div>
                </td>

                <td className="max-w-[220px] px-5 py-4 text-slate-700 dark:text-slate-300">
                  <span className="line-clamp-2">
                    {cliente.procedimentoInteresse ||
                      cliente.procedimento ||
                      "Não informado"}
                  </span>
                </td>

                <td className="px-5 py-4 font-bold text-emerald-700 dark:text-emerald-300">
                  {formatarMoeda(cliente.valorGasto)}
                </td>

                <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={15} className="shrink-0 text-slate-400" />
                    {formatarData(cliente.ultimaVisita)}
                  </div>
                </td>

                <td className="px-5 py-4">
                  <StatusBadge status={cliente.status} />
                </td>

                <td className="px-5 py-4">
                  <div className="flex justify-end gap-1.5">
                    <Button type="button" size="icon-sm" variant="outline" asChild>
                      <Link href={`/clientes/${cliente.id}`} aria-label="Ver prontuário">
                        <Eye size={16} />
                      </Link>
                    </Button>

                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      onClick={() => onMensagem(cliente)}
                      aria-label="Enviar mensagem pelo WhatsApp"
                    >
                      <MessageCircle size={16} />
                    </Button>

                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      onClick={() => onEditar(cliente)}
                      aria-label="Editar cliente"
                    >
                      <Pencil size={16} />
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
          <article
            key={cliente.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.035]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-sm font-bold text-white shadow-md shadow-violet-600/20">
                  {getInitials(cliente.nome)}
                </div>

                <div className="min-w-0">
                  <Link
                    href={`/clientes/${cliente.id}`}
                    className="block truncate font-bold text-slate-900 dark:text-white"
                  >
                    {cliente.nome}
                  </Link>
                  <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                    {cliente.whatsapp || cliente.telefone || "Sem telefone"}
                  </p>
                </div>
              </div>

              <StatusBadge status={cliente.status} />
            </div>

            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-white/[0.04] sm:grid-cols-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">Interesse</p>
                <p className="mt-1 line-clamp-2 text-slate-800 dark:text-slate-200">
                  {cliente.procedimentoInteresse ||
                    cliente.procedimento ||
                    "Não informado"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500">Valor gasto</p>
                <p className="mt-1 font-bold text-emerald-700 dark:text-emerald-300">
                  {formatarMoeda(cliente.valorGasto)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500">Última visita</p>
                <p className="mt-1 text-slate-800 dark:text-slate-200">
                  {formatarData(cliente.ultimaVisita)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href={`/clientes/${cliente.id}`}>
                  <Eye size={15} />
                  Prontuário
                </Link>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onMensagem(cliente)}
              >
                <MessageCircle size={15} />
                WhatsApp
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onEditar(cliente)}
              >
                <Pencil size={15} />
                Editar
              </Button>

              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => onExcluir(cliente.id)}
              >
                <Trash2 size={15} />
                Excluir
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
