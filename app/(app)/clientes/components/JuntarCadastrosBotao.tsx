"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Merge, Search, TriangleAlert, X } from "lucide-react";

import {
  buscarCadastrosParaJuntar,
  juntarCadastros,
  resumoJuntarCadastros,
  type CadastroParaJuntar,
  type ResumoJuncao,
} from "@/actions/cliente-juntar.actions";

type Props = {
  clienteId: number;
  clienteNome: string;
};

function mensagemDeErro(erro: unknown) {
  return erro instanceof Error && erro.message
    ? erro.message
    : "Não foi possível concluir. Tente de novo.";
}

function formatarDataCurta(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default function JuntarCadastrosBotao({ clienteId, clienteNome }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<CadastroParaJuntar[] | null>(null);
  const [escolhido, setEscolhido] = useState<CadastroParaJuntar | null>(null);
  const [resumo, setResumo] = useState<ResumoJuncao | null>(null);
  const [entendi, setEntendi] = useState(false);
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState<number | null>(null);
  const [ocupado, iniciar] = useTransition();

  function abrir() {
    setAberto(true);
    setTermo("");
    setResultados(null);
    setEscolhido(null);
    setResumo(null);
    setEntendi(false);
    setErro("");
    setPronto(null);
  }

  function fechar() {
    if (ocupado) return;
    setAberto(false);
    if (pronto !== null) router.refresh();
  }

  function buscar() {
    setErro("");
    setEscolhido(null);
    setResumo(null);
    setEntendi(false);
    iniciar(async () => {
      try {
        setResultados(await buscarCadastrosParaJuntar(clienteId, termo));
      } catch (e) {
        setErro(mensagemDeErro(e));
      }
    });
  }

  function escolher(cadastro: CadastroParaJuntar) {
    setErro("");
    setEscolhido(cadastro);
    setResumo(null);
    setEntendi(false);
    iniciar(async () => {
      try {
        setResumo(await resumoJuntarCadastros(clienteId, cadastro.id));
      } catch (e) {
        setErro(mensagemDeErro(e));
        setEscolhido(null);
      }
    });
  }

  function confirmar() {
    if (!escolhido || !entendi) return;
    setErro("");
    iniciar(async () => {
      try {
        const resposta = await juntarCadastros(clienteId, escolhido.id);
        setPronto(resposta.total);
      } catch (e) {
        setErro(mensagemDeErro(e));
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15 sm:col-span-1"
      >
        <Merge className="size-4" />
        Juntar cadastro duplicado
      </button>

      {aberto ? (
        <div className="app-modal-backdrop fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl dark:border-white/10 dark:bg-slate-900 dark:text-white sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">Juntar cadastro duplicado</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Este cadastro <strong>fica</strong>:{" "}
                  <span className="break-words font-semibold">
                    #{clienteId} · {clienteNome}
                  </span>
                  . Tudo do cadastro duplicado vai para ele.
                </p>
              </div>
              <button
                type="button"
                onClick={fechar}
                aria-label="Fechar"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>

            {pronto !== null ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                <p className="flex items-center gap-2 font-bold">
                  <Check className="size-4" />
                  Cadastros juntados.
                </p>
                <p className="mt-1">
                  {pronto === 1
                    ? "1 registro foi passado"
                    : `${pronto} registros foram passados`}{" "}
                  para este cadastro. O duplicado ficou guardado como inativo, marcado com
                  [JUNTADO].
                </p>
                <button
                  type="button"
                  onClick={fechar}
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Ver a ficha atualizada
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Qual é o cadastro duplicado?
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      value={termo}
                      onChange={(evento) => setTermo(evento.target.value)}
                      onKeyDown={(evento) => {
                        if (evento.key === "Enter") {
                          evento.preventDefault();
                          buscar();
                        }
                      }}
                      placeholder="Digite o nome ou o número do cadastro (ex.: 127)"
                      className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 dark:border-white/10 dark:bg-white/[0.06]"
                    />
                    <button
                      type="button"
                      onClick={buscar}
                      disabled={ocupado || termo.trim().length === 0}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
                    >
                      <Search className="size-4" />
                      Buscar
                    </button>
                  </div>
                </div>

                {resultados !== null && !escolhido ? (
                  resultados.length === 0 ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                      Nenhum cadastro encontrado.
                    </p>
                  ) : (
                    <ul className="max-h-64 space-y-2 overflow-y-auto">
                      {resultados.map((cadastro) => (
                        <li key={cadastro.id}>
                          <button
                            type="button"
                            onClick={() => escolher(cadastro)}
                            disabled={ocupado}
                            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-sm transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-violet-500/10"
                          >
                            <span className="block font-semibold">
                              #{cadastro.id} · {cadastro.nome}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                              {cadastro.telefone || "Sem telefone"} · cadastro de{" "}
                              {formatarDataCurta(cadastro.criadoEm)} · {cadastro.status}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )
                ) : null}

                {escolhido && ocupado && !resumo ? (
                  <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <LoaderCircle className="size-4 animate-spin" />
                    Conferindo o que tem no cadastro #{escolhido.id}...
                  </p>
                ) : null}

                {escolhido && resumo ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                      <p className="font-bold">
                        Vai passar de #{resumo.id} · {resumo.nome}
                      </p>
                      {resumo.itens.length === 0 ? (
                        <p className="mt-1 text-slate-600 dark:text-slate-300">
                          Esse cadastro não tem fotos, evoluções nem histórico. Só os dados de
                          contato em branco serão completados.
                        </p>
                      ) : (
                        <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                          {resumo.itens.map((item) => (
                            <li key={item.rotulo} className="flex justify-between gap-2">
                              <span className="text-slate-600 dark:text-slate-300">
                                {item.rotulo}
                              </span>
                              <span className="font-bold">{item.quantidade}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
                      <p className="flex items-center gap-2 font-bold">
                        <TriangleAlert className="size-4" />
                        Antes de confirmar
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>
                          O cadastro #{resumo.id} fica guardado como <strong>inativo</strong>, com
                          [JUNTADO] no nome e sem telefone.
                        </li>
                        <li>Os dados em branco deste cadastro são completados com os dele.</li>
                        <li>Esta tela não tem botão de desfazer.</li>
                      </ul>
                      <label className="mt-3 flex items-start gap-2 font-semibold">
                        <input
                          type="checkbox"
                          checked={entendi}
                          onChange={(evento) => setEntendi(evento.target.checked)}
                          className="mt-0.5 size-4"
                        />
                        Conferi: é a mesma pessoa e quero juntar.
                      </label>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setEscolhido(null);
                          setResumo(null);
                          setEntendi(false);
                        }}
                        disabled={ocupado}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/10"
                      >
                        Escolher outro
                      </button>
                      <button
                        type="button"
                        onClick={confirmar}
                        disabled={!entendi || ocupado}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        {ocupado ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Merge className="size-4" />
                        )}
                        Juntar agora
                      </button>
                    </div>
                  </div>
                ) : null}

                {erro ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
                    {erro}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
