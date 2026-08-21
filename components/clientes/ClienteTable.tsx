import Link from "next/link";
import {
  CalendarClock,
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

type ClienteAgendamentoResumo = {
  id: number;
  procedimento: string;
  data: string | Date;
  status: string;
};

type ClienteComAgenda = Cliente & {
  agendamentos?: ClienteAgendamentoResumo[];
};

/**
 * Proximo agendamento futuro da cliente, ignorando os cancelados.
 * Devolve null quando nao ha nada marcado daqui pra frente.
 */
function toAgendaDate(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(new Date(value));

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) return "";

  return `${year}-${month}-${day}`;
}

function proximoAgendamento(cliente: ClienteComAgenda) {
  const agora = new Date();

  const futuros = (cliente.agendamentos ?? [])
    .filter(
      (agendamento) =>
        agendamento.status !== "Cancelado" &&
        new Date(agendamento.data).getTime() > agora.getTime(),
    )
    .sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
    );

  return futuros[0] ?? null;
}

function ProximoAgendamento({ cliente }: { cliente: ClienteComAgenda }) {
  const proximo = proximoAgendamento(cliente);

  if (!proximo) {
    return (
      <span className="text-slate-400 dark:text-slate-500">Sem agendamento</span>
    );
  }

  const dataAgenda = toAgendaDate(proximo.data);

  return (
    <Link
      href={`/agenda?data=${dataAgenda}&agendamentoId=${proximo.id}`}
      className="group inline-flex max-w-full flex-col rounded-lg px-1.5 py-1 -mx-1.5 -my-1 transition hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400/40 dark:hover:bg-violet-500/10"
      title="Abrir este agendamento na agenda"
      aria-label={`Abrir agendamento de ${formatarData(proximo.data)} na agenda`}
    >
      <span className="font-bold text-violet-700 transition group-hover:text-violet-900 group-hover:underline dark:text-violet-300 dark:group-hover:text-violet-200">
        {formatarData(proximo.data)}
      </span>

      <span className="truncate text-xs text-slate-500 transition group-hover:text-slate-700 dark:group-hover:text-slate-300">
        {proximo.procedimento}
      </span>
    </Link>
  );
}

type Props = {
  clientes: ClienteComAgenda[];
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


function AreaBadges({
  areaEstetica,
  areaCilios,
}: {
  areaEstetica: boolean;
  areaCilios: boolean;
}) {
  if (areaEstetica && areaCilios) {
    return (
      <span className="inline-flex rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1 text-[0.68rem] font-bold text-fuchsia-700 dark:border-fuchsia-400/20 dark:bg-fuchsia-400/10 dark:text-fuchsia-300">
        Ambas
      </span>
    );
  }

  if (areaEstetica) {
    return (
      <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[0.68rem] font-bold text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300">
        Estética
      </span>
    );
  }

  if (areaCilios) {
    return (
      <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[0.68rem] font-bold text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300">
        Cílios
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
      Sem área definida
    </span>
  );
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
        <table className="w-full min-w-[1140px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[0.68rem] uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-white/[0.025] dark:text-slate-400">
            <tr>
              <th className="px-5 py-4 text-left font-bold">Cliente</th>
              <th className="px-5 py-4 text-left font-bold">Contato</th>
              <th className="px-5 py-4 text-left font-bold">Interesse</th>
              <th className="px-5 py-4 text-left font-bold">Áreas</th>
              <th className="px-5 py-4 text-left font-bold">Valor gasto</th>
              <th className="px-5 py-4 text-left font-bold">Última visita</th>
              <th className="px-5 py-4 text-left font-bold">Próximo agendamento</th>
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

                <td className="px-5 py-4">
                  <AreaBadges
                    areaEstetica={cliente.areaEstetica}
                    areaCilios={cliente.areaCilios}
                  />
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

                <td className="px-5 py-4 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={15} className="shrink-0 text-slate-400" />
                    <ProximoAgendamento cliente={cliente} />
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
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.035]"
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

            <div className="mt-3">
              <AreaBadges
                areaEstetica={cliente.areaEstetica}
                areaCilios={cliente.areaCilios}
              />
            </div>

            <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex min-w-0 items-start gap-2.5">
                <CalendarClock
                  size={15}
                  className="mt-0.5 shrink-0 text-violet-600"
                />

                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Próximo agendamento
                  </p>

                  <div className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">
                    <ProximoAgendamento cliente={cliente} />
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-2.5 border-t border-slate-100 pt-2 dark:border-white/10">
                <CalendarDays
                  size={15}
                  className="shrink-0 text-slate-400"
                />

                <p className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold">Última visita:</span>{" "}
                  <span className="text-slate-700 dark:text-slate-200">
                    {formatarData(cliente.ultimaVisita)}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                asChild
                className="min-w-0 px-2"
              >
                <Link href={`/clientes/${cliente.id}`}>
                  <Eye size={15} />
                  <span className="truncate">Prontuário</span>
                </Link>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onMensagem(cliente)}
                className="min-w-0 px-2"
              >
                <MessageCircle size={15} />
                <span className="truncate">WhatsApp</span>
              </Button>

              <details className="relative">
                <summary
                  className="flex h-9 w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-base font-black tracking-[0.08em] text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 [&::-webkit-details-marker]:hidden"
                  aria-label="Mais opções da cliente"
                  title="Mais opções"
                >
                  •••
                </summary>

                <div className="absolute bottom-[calc(100%+0.4rem)] right-0 z-30 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => onEditar(cliente)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.06]"
                  >
                    <Pencil size={14} />
                    Editar cliente
                  </button>

                  <button
                    type="button"
                    onClick={() => onExcluir(cliente.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 size={14} />
                    Excluir cliente
                  </button>
                </div>
              </details>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}