"use client";

import {
  CalendarDays,
  Loader2,
  Search,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  buscarAgendamentosAgendaPorClientes,
  type ResultadoBuscaAgendamentoAgenda,
} from "@/actions/agendamento.actions";

type ClienteBusca = {
  id: number;
  nome: string;
  telefone: string;
  whatsapp: string | null;
};

type Props = {
  clientes: ClienteBusca[];
  onSelect: (
    resultado: ResultadoBuscaAgendamentoAgenda,
  ) => void;
};

function normalizarBusca(valor?: string | null) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function somenteDigitos(valor?: string | null) {
  return (valor ?? "").replace(/\D/g, "");
}

// Mesmas cores de status usadas no resto da Agenda, para dar identidade
// visual imediata a cada agendamento listado na busca.
function statusBadgeClass(status: string) {
  switch (status) {
    case "Confirmado":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "Em atendimento":
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300";
    case "Atendido":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
    case "Faltou":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case "Cancelado":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

function formatarDataHora(value: string) {
  const data = new Date(value);

  const dia = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(data);

  const hora = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).format(data);

  return { dia, hora };
}

export default function AgendaSearch({
  clientes,
  onSelect,
}: Props) {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<
    ResultadoBuscaAgendamentoAgenda[]
  >([]);
  const [clientesEncontrados, setClientesEncontrados] =
    useState<ClienteBusca[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [aberta, setAberta] = useState(false);

  const versaoBuscaRef = useRef(0);

  useEffect(() => {
    const texto = normalizarBusca(busca);
    const digitos = somenteDigitos(busca);

    const buscaValida =
      texto.length >= 2 || digitos.length >= 3;

    if (!buscaValida) {
      versaoBuscaRef.current += 1;
      setClientesEncontrados([]);
      setResultados([]);
      setCarregando(false);
      return;
    }

    const encontrados = clientes
      .filter((cliente) => {
        const porNome =
          normalizarBusca(cliente.nome).includes(texto);

        const porTelefone =
          digitos.length >= 3 &&
          (
            somenteDigitos(cliente.telefone).includes(digitos) ||
            somenteDigitos(cliente.whatsapp).includes(digitos)
          );

        return porNome || porTelefone;
      })
      .slice(0, 8);

    setClientesEncontrados(encontrados);

    if (encontrados.length === 0) {
      versaoBuscaRef.current += 1;
      setResultados([]);
      setCarregando(false);
      return;
    }

    const versao = ++versaoBuscaRef.current;

    const timer = window.setTimeout(async () => {
      setCarregando(true);
      setResultados([]);

      try {
        const resposta =
          await buscarAgendamentosAgendaPorClientes(
            encontrados.map((cliente) => cliente.id),
          );

        if (versao === versaoBuscaRef.current) {
          setResultados(resposta);
        }
      } catch (error) {
        console.error(
          "Erro ao buscar agendamentos na Agenda:",
          error,
        );

        if (versao === versaoBuscaRef.current) {
          setResultados([]);
        }
      } finally {
        if (versao === versaoBuscaRef.current) {
          setCarregando(false);
        }
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [busca, clientes]);

  const texto = normalizarBusca(busca);
  const digitos = somenteDigitos(busca);

  const buscaValida =
    texto.length >= 2 || digitos.length >= 3;

  const agora = Date.now();

  const grupos = clientesEncontrados.map((cliente) => {
    const doCliente = resultados.filter(
      (resultado) => resultado.clienteId === cliente.id,
    );

    const proximos = doCliente
      .filter(
        (resultado) =>
          new Date(resultado.data).getTime() >= agora,
      )
      .slice(0, 5);

    const historico = doCliente
      .filter(
        (resultado) =>
          new Date(resultado.data).getTime() < agora,
      )
      .slice(0, 3);

    return {
      cliente,
      proximos,
      historico,
    };
  });

  function limparBusca() {
    versaoBuscaRef.current += 1;
    setBusca("");
    setResultados([]);
    setClientesEncontrados([]);
    setCarregando(false);
    setAberta(false);
  }

  return (
    <div className="relative z-[60] mb-3 px-1 sm:mb-4">
      <div className="relative">
        <Search
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="search"
          value={busca}
          onFocus={() => setAberta(true)}
          onChange={(event) => {
            setBusca(event.target.value);
            setAberta(true);
          }}
          placeholder="Buscar cliente na agenda..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />

        {busca ? (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={limparBusca}
            className="absolute right-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      {aberta && buscaValida ? (
        <div className="absolute left-1 right-1 z-[70] top-[calc(100%+0.35rem)] max-h-[min(30rem,70vh)] overflow-y-auto rounded-2xl border border-slate-300 bg-white p-2 shadow-2xl shadow-slate-950/25 sm:right-auto sm:w-[720px] sm:max-w-[calc(100vw-6rem)] dark:border-slate-700 dark:bg-slate-950">

          {carregando ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-slate-500 dark:text-slate-400">
              <Loader2
                size={17}
                className="animate-spin"
              />
              Buscando agendamentos...
            </div>
          ) : clientesEncontrados.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Nenhum cliente encontrado.
              </p>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Confira o nome ou o telefone digitado.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {grupos.map(
                ({
                  cliente,
                  proximos,
                  historico,
                }) => (
                  <div
                    key={cliente.id}
                    className={`overflow-hidden rounded-xl border-y border-r border-l-4 border-slate-200 bg-white shadow-sm dark:border-y-slate-800 dark:border-r-slate-800 dark:bg-slate-900 ${
                      proximos.length > 0
                        ? "border-l-emerald-400 dark:border-l-emerald-500"
                        : "border-l-slate-200 dark:border-l-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 border-b border-violet-100 bg-violet-50 px-3 py-2.5 dark:border-violet-500/20 dark:bg-violet-500/10">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                        <UserRound size={15} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {cliente.nome}
                        </p>

                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {cliente.whatsapp ||
                            cliente.telefone}
                        </p>
                      </div>
                    </div>

                    {proximos.length === 0 &&
                    historico.length === 0 ? (
                      <div className="px-3 py-4">
                        <p className="text-sm text-slate-400 dark:text-slate-500">
                          Cliente cadastrado, mas sem agendamentos.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="px-3 pb-1 pt-3">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-400">
                            Próximos agendamentos
                          </p>
                        </div>

                        {proximos.length > 0 ? (
                          <div className="space-y-1 px-1.5 pb-2">
                            {proximos.map(
                              (resultado, index) => {
                                const { dia, hora } =
                                  formatarDataHora(
                                    resultado.data,
                                  );

                                return (
                                  <button
                                    key={resultado.id}
                                    type="button"
                                    onClick={() =>
                                      onSelect(resultado)
                                    }
                                    className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-violet-50 dark:hover:bg-violet-500/10"
                                  >
                                    <CalendarDays
                                      size={16}
                                      className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-300"
                                    />

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                          {dia} • {hora}
                                        </span>

                                        {index === 0 ? (
                                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                                            Próximo
                                          </span>
                                        ) : null}
                                      </div>

                                      <p className="mt-0.5 truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                                        {
                                          resultado.procedimento
                                        }
                                      </p>

                                      <div className="mt-1 flex items-center gap-1.5">
                                        <p className="min-w-0 truncate text-[11px] text-slate-500 dark:text-slate-400">
                                          {resultado.profissionalNome ||
                                            "Profissional não definida"}
                                        </p>

                                        <span
                                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusBadgeClass(
                                            resultado.status,
                                          )}`}
                                        >
                                          {resultado.status}
                                        </span>
                                      </div>
                                    </div>
                                  </button>
                                );
                              },
                            )}
                          </div>
                        ) : (
                          <div className="px-3 pb-3 pt-1">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Nenhum próximo agendamento.
                            </p>
                          </div>
                        )}

                        {historico.length > 0 ? (
                          <>
                            <div className="border-t border-slate-100 px-3 pb-1 pt-3 dark:border-slate-800">
                              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                Histórico recente
                              </p>
                            </div>

                            <div className="space-y-1 px-1.5 pb-2">
                              {historico.map(
                                (resultado) => {
                                  const { dia, hora } =
                                    formatarDataHora(
                                      resultado.data,
                                    );

                                  return (
                                    <button
                                      key={resultado.id}
                                      type="button"
                                      onClick={() =>
                                        onSelect(resultado)
                                      }
                                      className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
                                    >
                                      <CalendarDays
                                        size={14}
                                        className="mt-0.5 shrink-0 text-slate-400"
                                      />

                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                          {dia} • {hora}
                                        </p>

                                        <div className="mt-0.5 flex items-center gap-1.5">
                                          <p className="min-w-0 truncate text-[11px] text-slate-500 dark:text-slate-400">
                                            {resultado.procedimento}
                                          </p>

                                          <span
                                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusBadgeClass(
                                              resultado.status,
                                            )}`}
                                          >
                                            {resultado.status}
                                          </span>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                },
                              )}
                            </div>
                          </>
                        ) : null}
                      </>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
