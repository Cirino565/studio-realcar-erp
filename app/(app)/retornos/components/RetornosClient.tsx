"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, MessageCircle, Search } from "lucide-react";

type ProcedimentoAtrasado = {
  nome: string;
  ultimaVez: string;
  diasAtraso: number;
};

type ClienteRetorno = {
  clienteId: number;
  nome: string;
  whatsapp: string | null;
  telefone: string;
  procedimentos: ProcedimentoAtrasado[];
  maiorAtraso: number;
};

type Props = {
  itens: ClienteRetorno[];
  semConfiguracao: boolean;
};

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatarData(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function textoAtraso(dias: number) {
  if (dias === 0) return "vence hoje";
  if (dias < 30) return `${dias} dia${dias === 1 ? "" : "s"} atrás do previsto`;
  const meses = Math.floor(dias / 30);
  return `${meses} ${meses === 1 ? "mês" : "meses"} atrás do previsto`;
}

function linkWhatsApp(cliente: ClienteRetorno) {
  const numero = (cliente.whatsapp || cliente.telefone || "").replace(/\D/g, "");
  if (!numero) return null;

  const comPais = numero.startsWith("55") ? numero : `55${numero}`;
  const primeiroNome = cliente.nome.split(" ")[0];
  const procedimento = cliente.procedimentos[0]?.nome || "seu procedimento";

  const mensagem = `Oi, ${primeiroNome}! Tudo bem? Passando para lembrar que já está na época de repetir ${procedimento}. Quer que eu veja um horário para você?`;

  return `https://wa.me/${comPais}?text=${encodeURIComponent(mensagem)}`;
}

export default function RetornosClient({ itens, semConfiguracao }: Props) {
  const [busca, setBusca] = useState("");
  const [contatados, setContatados] = useState<number[]>([]);

  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    if (!termo) return itens;

    return itens.filter(
      (cliente) =>
        normalizarBusca(cliente.nome).includes(termo) ||
        cliente.procedimentos.some((item) =>
          normalizarBusca(item.nome).includes(termo),
        ),
    );
  }, [itens, busca]);

  return (
    <div className="app-mobile-safe space-y-4 pb-6 sm:space-y-6 sm:pb-0">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.12),transparent_36%)]" />

        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:border-teal-400/20 dark:bg-teal-500/15 dark:text-teal-200">
              <CalendarClock size={14} />
              Relacionamento
            </div>

            <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Retornos previstos
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Clientes que já passaram do intervalo de retorno do procedimento
              que fizeram e ainda não têm horário marcado. Quem já remarcou não
              aparece aqui.
            </p>
          </div>

          {!semConfiguracao ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {itens.length}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                para contatar
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {semConfiguracao ? (
        <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/70 p-8 text-center dark:border-amber-400/20 dark:bg-amber-500/10">
          <CalendarClock className="mx-auto size-7 text-amber-600 dark:text-amber-300" />
          <p className="mt-3 text-sm font-semibold text-amber-900 dark:text-amber-200">
            Nenhum procedimento tem intervalo de retorno configurado ainda.
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-amber-700 dark:text-amber-300">
            Vá em Configurações, procure a lista de serviços e preencha o campo
            &quot;Lembrar retorno após&quot; nos procedimentos que se repetem.
            Por exemplo: 90 dias na limpeza de pele, 150 no botox. Os que ficarem
            vazios simplesmente não geram lembrete.
          </p>
        </div>
      ) : (
        <>
          <label className="relative block min-w-0">
            <span className="sr-only">Buscar por cliente ou procedimento</span>

            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por cliente ou procedimento"
              className="premium-input w-full pl-11"
            />
          </label>

          {filtrados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/70 p-8 text-center dark:border-emerald-400/20 dark:bg-emerald-500/10">
              <CheckCircle2 className="mx-auto size-7 text-emerald-600 dark:text-emerald-300" />
              <p className="mt-3 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                {busca
                  ? "Nenhum resultado para essa busca."
                  : "Nenhum retorno atrasado no momento."}
              </p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                {busca
                  ? "Tente buscar por outro nome ou procedimento."
                  : "Todo mundo está em dia ou já tem horário marcado."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtrados.map((cliente) => {
                const jaContatado = contatados.includes(cliente.clienteId);
                const url = linkWhatsApp(cliente);

                return (
                  <div
                    key={cliente.clienteId}
                    className={`rounded-2xl border bg-white p-4 shadow-sm transition dark:bg-white/[0.04] ${
                      jaContatado
                        ? "border-slate-200 opacity-60 dark:border-white/10"
                        : "border-teal-200 dark:border-teal-400/25"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">
                          {cliente.nome}
                        </p>

                        <div className="mt-2 space-y-1">
                          {cliente.procedimentos.map((procedimento) => (
                            <p
                              key={procedimento.nome}
                              className="text-sm text-slate-600 dark:text-slate-300"
                            >
                              <span className="font-medium">
                                {procedimento.nome}
                              </span>{" "}
                              <span className="text-slate-400 dark:text-slate-500">
                                · última vez em{" "}
                                {formatarData(procedimento.ultimaVez)} ·{" "}
                                {textoAtraso(procedimento.diasAtraso)}
                              </span>
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            setContatados((atuais) =>
                              atuais.includes(cliente.clienteId)
                                ? atuais
                                : [...atuais, cliente.clienteId],
                            )
                          }
                          className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                        >
                          <MessageCircle className="size-4" />
                          {jaContatado ? "Enviado" : "WhatsApp"}
                        </a>
                      ) : (
                        <span className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400 dark:bg-white/[0.06]">
                          Sem telefone cadastrado
                        </span>
                      )}

                      <a
                        href={`/clientes/${cliente.clienteId}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                      >
                        Ver ficha
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
