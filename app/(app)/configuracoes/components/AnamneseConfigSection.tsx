"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ClipboardCopy,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import {
  atualizarModeloAnamnese,
  atualizarPerguntaAnamnese,
  criarModeloAnamnese,
  criarModelosAnamnesePadrao,
  criarPerguntaAnamnese,
  duplicarModeloAnamnese,
  excluirModeloAnamnese,
  excluirPerguntaAnamnese,
} from "@/actions/anamnese-config.actions";
import { Button } from "@/components/ui/button";
import type { AnamneseModeloView, ProcedimentoServicoView } from "../types";

type Props = {
  modelos: AnamneseModeloView[];
  servicos: ProcedimentoServicoView[];
};

const tipos = [
  { value: "SIM_NAO", label: "Sim / Não" },
  { value: "TEXTO_CURTO", label: "Texto curto" },
  { value: "TEXTO_LONGO", label: "Texto longo" },
  { value: "MULTIPLA_ESCOLHA", label: "Múltipla escolha" },
  { value: "ACEITE", label: "Aceite / Termo" },
];

function tipoLabel(value: string) {
  return tipos.find((tipo) => tipo.value === value)?.label || value;
}

export default function AnamneseConfigSection({ modelos, servicos }: Props) {
  const [selectedModeloId, setSelectedModeloId] = useState(
    modelos[0]?.id ? String(modelos[0].id) : "",
  );
  const [editingModelId, setEditingModelId] = useState<number | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedModelo =
    modelos.find((modelo) => String(modelo.id) === selectedModeloId) ??
    modelos[0] ??
    null;

  const nomesProcedimentos = useMemo(
    () =>
      Array.from(
        new Set(
          servicos
            .map((servico) => servico.nome?.trim())
            .filter((nome): nome is string => Boolean(nome)),
        ),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [servicos],
  );

  function confirmarExclusaoModelo(modelo: AnamneseModeloView) {
    const confirmado = window.confirm(
      `Excluir o modelo "${modelo.procedimentoNome || modelo.nome}"?\n\nSe já existir histórico de respostas, o sistema não apagará o histórico e apenas desativará o modelo.`,
    );

    if (!confirmado) return;

    startTransition(async () => {
      await excluirModeloAnamnese(modelo.id);
      setEditingModelId(null);
      setEditingQuestionId(null);
    });
  }

  function confirmarExclusaoPergunta(id: number, texto: string) {
    const confirmado = window.confirm(
      `Excluir a pergunta/frase "${texto}"?\n\nSe já houver respostas vinculadas, ela será apenas desativada para preservar o histórico.`,
    );

    if (!confirmado) return;

    startTransition(() => void excluirPerguntaAnamnese(id));
  }

  return (
    <section className="rounded-[2rem] border border-white/[0.10] bg-white/[0.06] p-5 shadow-xl shadow-black/10 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-200">
            <ClipboardList className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Modelos de anamnese
            </h2>
            <p className="text-sm text-slate-400">
              Crie fichas por procedimento e gerencie perguntas, frases, termos,
              ordem e status sem alterar o código.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            startTransition(async () => {
              await criarModelosAnamnesePadrao();
            });
          }}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Criar 17 modelos Studio Realçar
        </Button>
      </div>

      <div className="mb-5 rounded-3xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
        Os 17 modelos são criados sem duplicar os já existentes. As perguntas
        iniciais são genéricas e totalmente editáveis. Perguntas clínicas,
        contraindicações e termos específicos de cada procedimento devem ser
        revisados pela responsável técnica antes do uso definitivo.
      </div>

      <datalist id="anamnese-procedimentos-cadastrados">
        {nomesProcedimentos.map((nome) => (
          <option key={nome} value={nome} />
        ))}
      </datalist>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <form
            action={criarModeloAnamnese}
            className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4"
          >
            <p className="text-sm font-semibold text-white">Novo modelo</p>
            <div className="mt-4 space-y-3">
              <label className="block space-y-2">
                <span className="text-xs text-slate-400">
                  Procedimento / nome da ficha
                </span>
                <input
                  name="procedimentoNome"
                  list="anamnese-procedimentos-cadastrados"
                  className="premium-input w-full"
                  placeholder="Ex.: Microlabial"
                />
              </label>
              <input
                name="nome"
                className="premium-input w-full"
                placeholder="Nome opcional do modelo"
              />
              <textarea
                name="descricao"
                className="premium-input min-h-20 w-full py-3"
                placeholder="Descrição opcional"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  name="status"
                  className="premium-input w-full"
                  defaultValue="Ativo"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
                <input
                  name="ordem"
                  type="number"
                  min="0"
                  className="premium-input w-full"
                  placeholder="Ordem"
                />
              </div>
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4" />
                Criar modelo
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            {modelos.length > 0 ? (
              modelos.map((modelo) => (
                <button
                  key={modelo.id}
                  type="button"
                  onClick={() => {
                    setSelectedModeloId(String(modelo.id));
                    setEditingModelId(null);
                    setEditingQuestionId(null);
                  }}
                  className={`w-full rounded-3xl border p-4 text-left transition ${
                    selectedModelo?.id === modelo.id
                      ? "border-violet-300/35 bg-violet-500/15"
                      : "border-white/[0.08] bg-white/[0.035] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-white">
                        {modelo.procedimentoNome || modelo.nome}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {modelo.perguntas.length} pergunta(s) · {modelo.status}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-500">
                      #{modelo.ordem}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-white/[0.10] p-5 text-sm text-slate-400">
                Nenhum modelo criado. Use o botão dos 17 modelos ou crie um
                manualmente.
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4 sm:p-5">
          {selectedModelo ? (
            <div className="space-y-5">
              {editingModelId === selectedModelo.id ? (
                <form
                  action={async (formData) => {
                    await atualizarModeloAnamnese(formData);
                    setEditingModelId(null);
                  }}
                  className="rounded-3xl border border-violet-300/20 bg-violet-500/10 p-4"
                >
                  <input type="hidden" name="id" value={selectedModelo.id} />
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">Editar modelo</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Altere nome, vínculo, descrição, status e ordem.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setEditingModelId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-xs text-slate-400">
                        Nome interno do modelo
                      </span>
                      <input
                        name="nome"
                        required
                        defaultValue={selectedModelo.nome}
                        className="premium-input w-full"
                      />
                    </label>

                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-xs text-slate-400">
                        Procedimento / nome exibido na ficha
                      </span>
                      <input
                        name="procedimentoNome"
                        list="anamnese-procedimentos-cadastrados"
                        defaultValue={selectedModelo.procedimentoNome || ""}
                        className="premium-input w-full"
                      />
                    </label>

                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-xs text-slate-400">Descrição</span>
                      <textarea
                        name="descricao"
                        defaultValue={selectedModelo.descricao || ""}
                        className="premium-input min-h-24 w-full py-3"
                      />
                    </label>

                    <select
                      name="status"
                      className="premium-input w-full"
                      defaultValue={selectedModelo.status}
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>

                    <input
                      name="ordem"
                      type="number"
                      min="0"
                      defaultValue={selectedModelo.ordem}
                      className="premium-input w-full"
                      placeholder="Ordem"
                    />
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingModelId(null)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      <Save className="h-4 w-4" />
                      Salvar modelo
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-lg font-semibold text-white">
                        {selectedModelo.procedimentoNome || selectedModelo.nome}
                      </h3>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          selectedModelo.status === "Ativo"
                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                            : "border-slate-400/20 bg-slate-400/10 text-slate-300"
                        }`}
                      >
                        {selectedModelo.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {selectedModelo.descricao ||
                        "Edite o modelo e gerencie perguntas, frases e termos."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingModelId(selectedModelo.id)}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar modelo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(() =>
                          void duplicarModeloAnamnese(selectedModelo.id),
                        )
                      }
                    >
                      <ClipboardCopy className="h-4 w-4" />
                      Duplicar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={isPending}
                      onClick={() => confirmarExclusaoModelo(selectedModelo)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </div>
              )}

              <form
                action={criarPerguntaAnamnese}
                className="rounded-3xl border border-violet-300/15 bg-violet-500/10 p-4"
              >
                <input type="hidden" name="modeloId" value={selectedModelo.id} />
                <p className="text-sm font-semibold text-white">
                  Adicionar pergunta, frase ou termo
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Para uma frase de consentimento, escolha “Aceite / Termo”. Para
                  respostas prontas, use “Múltipla escolha” e informe uma opção
                  por linha.
                </p>
                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_100px]">
                  <input
                    name="pergunta"
                    required
                    className="premium-input w-full"
                    placeholder="Digite a pergunta, declaração ou termo"
                  />
                  <select
                    name="tipo"
                    className="premium-input w-full"
                    defaultValue="SIM_NAO"
                  >
                    {tipos.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                  <input
                    name="ordem"
                    type="number"
                    min="0"
                    className="premium-input w-full"
                    placeholder="Ordem"
                  />
                </div>
                <textarea
                  name="opcoes"
                  className="premium-input mt-3 min-h-20 w-full py-3"
                  placeholder="Opções para múltipla escolha, uma por linha"
                />
                <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                  <input
                    name="obrigatoria"
                    type="checkbox"
                    className="size-4 accent-violet-500"
                  />
                  Obrigatória
                </label>
                <Button type="submit" className="mt-4">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </form>

              <div className="space-y-3">
                {selectedModelo.perguntas.length > 0 ? (
                  selectedModelo.perguntas.map((pergunta) => {
                    const editing = editingQuestionId === pergunta.id;

                    return (
                      <article
                        key={pergunta.id}
                        className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4"
                      >
                        {editing ? (
                          <form
                            action={async (formData) => {
                              await atualizarPerguntaAnamnese(formData);
                              setEditingQuestionId(null);
                            }}
                            className="space-y-3"
                          >
                            <input type="hidden" name="id" value={pergunta.id} />
                            <input
                              name="pergunta"
                              required
                              defaultValue={pergunta.pergunta}
                              className="premium-input w-full"
                            />
                            <div className="grid gap-3 sm:grid-cols-[190px_110px_minmax(0,1fr)]">
                              <select
                                name="tipo"
                                className="premium-input w-full"
                                defaultValue={pergunta.tipo}
                              >
                                {tipos.map((tipo) => (
                                  <option key={tipo.value} value={tipo.value}>
                                    {tipo.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                name="ordem"
                                type="number"
                                min="0"
                                defaultValue={pergunta.ordem}
                                className="premium-input w-full"
                              />
                              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                                <label className="flex items-center gap-2">
                                  <input
                                    name="obrigatoria"
                                    type="checkbox"
                                    defaultChecked={pergunta.obrigatoria}
                                    className="size-4 accent-violet-500"
                                  />
                                  Obrigatória
                                </label>
                                <label className="flex items-center gap-2">
                                  <input
                                    name="ativa"
                                    type="checkbox"
                                    defaultChecked={pergunta.ativa}
                                    className="size-4 accent-violet-500"
                                  />
                                  Ativa
                                </label>
                              </div>
                            </div>
                            <textarea
                              name="opcoes"
                              defaultValue={pergunta.opcoes || ""}
                              className="premium-input min-h-20 w-full py-3"
                              placeholder="Opções, uma por linha"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingQuestionId(null)}
                              >
                                Cancelar
                              </Button>
                              <Button type="submit">
                                <Save className="h-4 w-4" />
                                Salvar
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-white/[0.10] bg-white/[0.05] px-2.5 py-1 text-[0.7rem] font-semibold text-slate-300">
                                  {tipoLabel(pergunta.tipo)}
                                </span>
                                {pergunta.obrigatoria ? (
                                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[0.7rem] font-semibold text-amber-200">
                                    Obrigatória
                                  </span>
                                ) : null}
                                {!pergunta.ativa ? (
                                  <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-[0.7rem] font-semibold text-rose-200">
                                    Inativa
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-3 break-words font-semibold text-white">
                                {pergunta.ordem}. {pergunta.pergunta}
                              </p>
                              {pergunta.opcoes ? (
                                <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-500">
                                  {pergunta.opcoes}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingQuestionId(pergunta.id)}
                              >
                                <Pencil className="h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon-sm"
                                disabled={isPending}
                                onClick={() =>
                                  confirmarExclusaoPergunta(
                                    pergunta.id,
                                    pergunta.pergunta,
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/[0.10] p-5 text-center text-sm text-slate-400">
                    Este modelo ainda não possui perguntas, frases ou termos.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/[0.10] p-8 text-center text-sm text-slate-400">
              Crie ou selecione um modelo de anamnese.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
