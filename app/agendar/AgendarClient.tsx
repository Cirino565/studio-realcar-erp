"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listarHorariosPublicos } from "@/actions/agendamento.actions";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/** aaaa-mm-dd no fuso local, sem risco de virar o dia por causa de UTC. */
function paraChaveData(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Próximos 21 dias a partir de hoje, para a cliente escolher. */
function gerarProximosDias(quantidade: number) {
  const hoje = new Date();
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  return Array.from({ length: quantidade }, (_, indice) => {
    const data = new Date(base);
    data.setDate(base.getDate() + indice);

    return {
      chave: paraChaveData(data),
      diaSemana: DIAS_SEMANA[data.getDay()],
      dia: data.getDate(),
      mes: MESES[data.getMonth()],
      ehHoje: indice === 0,
    };
  });
}

export default function AgendarClient() {
  const dias = useMemo(() => gerarProximosDias(21), []);
  const [dataSelecionada, setDataSelecionada] = useState(dias[0]?.chave || "");
  const [horarios, setHorarios] = useState<string[]>([]);
  const [horaSelecionada, setHoraSelecionada] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const carregarHorarios = useCallback(async (data: string) => {
    if (!data) return;

    setCarregando(true);
    setErro("");
    setHoraSelecionada("");

    try {
      const resultado = await listarHorariosPublicos(data);
      setHorarios(resultado);
    } catch {
      setErro(
        "Não foi possível carregar os horários agora. Tente novamente em instantes.",
      );
      setHorarios([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarHorarios(dataSelecionada);
  }, [dataSelecionada, carregarHorarios]);

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
          Studio Realçar
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          Limpeza de Pele
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Escolha o dia e o horário que ficam melhores para você.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
          1. Escolha o dia
        </h2>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {dias.map((dia) => {
            const ativo = dia.chave === dataSelecionada;

            return (
              <button
                key={dia.chave}
                type="button"
                onClick={() => setDataSelecionada(dia.chave)}
                className={`flex min-w-[4.25rem] shrink-0 flex-col items-center rounded-2xl border px-3 py-2.5 transition ${
                  ativo
                    ? "border-violet-500 bg-violet-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                  {dia.ehHoje ? "hoje" : dia.diaSemana}
                </span>
                <span className="text-lg font-bold leading-tight">
                  {dia.dia}
                </span>
                <span className="text-[10px] font-semibold uppercase opacity-80">
                  {dia.mes}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
          2. Escolha o horário
        </h2>

        <div className="mt-3">
          {carregando ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Carregando horários...
            </p>
          ) : erro ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {erro}
            </p>
          ) : horarios.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
              Nenhum horário livre neste dia. Experimente outra data.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {horarios.map((hora) => {
                const ativo = hora === horaSelecionada;

                return (
                  <button
                    key={hora}
                    type="button"
                    onClick={() => setHoraSelecionada(hora)}
                    className={`min-h-11 rounded-2xl border text-sm font-bold transition ${
                      ativo
                        ? "border-violet-500 bg-violet-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50"
                    }`}
                  >
                    {hora}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {horaSelecionada ? (
        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-4 text-center sm:p-5">
          <p className="text-sm text-violet-900">
            Você escolheu{" "}
            <strong>
              {dias.find((dia) => dia.chave === dataSelecionada)?.dia}/
              {dias.find((dia) => dia.chave === dataSelecionada)?.mes} às{" "}
              {horaSelecionada}
            </strong>
            .
          </p>
          <p className="mt-2 text-xs leading-5 text-violet-800/80">
            Em breve você poderá enviar seus dados por aqui. Por enquanto, envie
            esse horário pelo WhatsApp para confirmar.
          </p>
        </section>
      ) : null}

      <p className="text-center text-xs leading-5 text-slate-500">
        O horário só fica garantido após a confirmação do sinal pelo WhatsApp.
      </p>
    </main>
  );
}