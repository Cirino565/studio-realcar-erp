"use client";

import { useState, useTransition } from "react";
import { ClipboardList, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";

import {
  atualizarPerguntaAnamnese,
  criarModeloAnamnese,
  criarModelosAnamnesePadrao,
  criarPerguntaAnamnese,
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
  const [selectedModeloId, setSelectedModeloId] = useState(modelos[0]?.id ? String(modelos[0].id) : "");
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedModelo = modelos.find((modelo) => String(modelo.id) === selectedModeloId) ?? modelos[0] ?? null;
  const servicosSemModelo = servicos.filter((servico) => !modelos.some((modelo) => modelo.procedimentoNome === servico.nome));

  return (
    <section className="rounded-[2rem] border border-white/[0.10] bg-white/[0.06] p-5 shadow-xl shadow-black/10 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-200">
            <ClipboardList className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Modelos de anamnese</h2>
            <p className="text-sm text-slate-400">
              Configure as perguntas que aparecem no celular durante a consulta, separadas por procedimento.
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
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Criar modelos padrão
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <form action={criarModeloAnamnese} className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-sm font-semibold text-white">Novo modelo por procedimento</p>
            <div className="mt-4 space-y-3">
              <label className="space-y-2 block">
                <span className="text-xs text-slate-400">Procedimento cadastrado</span>
                <select name="procedimentoNome" className="premium-input w-full" defaultValue="">
                  <option value="">Selecione um procedimento</option>
                  {servicosSemModelo.map((servico) => (
                    <option key={servico.id} value={servico.nome}>{servico.nome}</option>
                  ))}
                </select>
              </label>
              <input name="nome" className="premium-input w-full" placeholder="Nome opcional do modelo" />
              <textarea name="descricao" className="premium-input min-h-20 w-full py-3" placeholder="Descrição opcional" />
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4" />
                Criar modelo
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            {modelos.length > 0 ? modelos.map((modelo) => (
              <button
                key={modelo.id}
                type="button"
                onClick={() => setSelectedModeloId(String(modelo.id))}
                className={`w-full rounded-3xl border p-4 text-left transition ${selectedModelo?.id === modelo.id ? "border-violet-300/35 bg-violet-500/15" : "border-white/[0.08] bg-white/[0.035] hover:bg-white/[0.06]"}`}
              >
                <p className="font-semibold text-white">{modelo.procedimentoNome || modelo.nome}</p>
                <p className="mt-1 text-xs text-slate-500">{modelo.perguntas.length} pergunta(s) · {modelo.status}</p>
              </button>
            )) : (
              <div className="rounded-3xl border border-dashed border-white/[0.10] p-5 text-sm text-slate-400">
                Nenhum modelo criado. Clique em criar modelos padrão.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4 sm:p-5">
          {selectedModelo ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedModelo.procedimentoNome || selectedModelo.nome}</h3>
                  <p className="mt-1 text-sm text-slate-400">Edite, desative ou adicione perguntas deste modelo.</p>
                </div>
                <span className="w-fit rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                  {selectedModelo.status}
                </span>
              </div>

              <form action={criarPerguntaAnamnese} className="rounded-3xl border border-violet-300/15 bg-violet-500/10 p-4">
                <input type="hidden" name="modeloId" value={selectedModelo.id} />
                <p className="text-sm font-semibold text-white">Adicionar pergunta</p>
                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_190px_100px]">
                  <input name="pergunta" required className="premium-input w-full" placeholder="Digite a pergunta" />
                  <select name="tipo" className="premium-input w-full" defaultValue="SIM_NAO">
                    {tipos.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
                  </select>
                  <input name="ordem" type="number" min="0" className="premium-input w-full" placeholder="Ordem" />
                </div>
                <textarea name="opcoes" className="premium-input mt-3 min-h-20 w-full py-3" placeholder="Opções para múltipla escolha, uma por linha" />
                <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                  <input name="obrigatoria" type="checkbox" className="size-4 accent-violet-500" />
                  Pergunta obrigatória
                </label>
                <Button type="submit" className="mt-4">
                  <Plus className="h-4 w-4" />
                  Adicionar pergunta
                </Button>
              </form>

              <div className="space-y-3">
                {selectedModelo.perguntas.length > 0 ? selectedModelo.perguntas.map((pergunta) => {
                  const editing = editingQuestionId === pergunta.id;
                  return (
                    <article key={pergunta.id} className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4">
                      {editing ? (
                        <form action={async (formData) => {
                          await atualizarPerguntaAnamnese(formData);
                          setEditingQuestionId(null);
                        }} className="space-y-3">
                          <input type="hidden" name="id" value={pergunta.id} />
                          <input name="pergunta" defaultValue={pergunta.pergunta} className="premium-input w-full" />
                          <div className="grid gap-3 sm:grid-cols-[190px_110px_1fr]">
                            <select name="tipo" className="premium-input w-full" defaultValue={pergunta.tipo}>
                              {tipos.map((tipo) => <option key={tipo.value} value={tipo.value}>{tipo.label}</option>)}
                            </select>
                            <input name="ordem" type="number" defaultValue={pergunta.ordem} className="premium-input w-full" />
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                              <label className="flex items-center gap-2"><input name="obrigatoria" type="checkbox" defaultChecked={pergunta.obrigatoria} className="size-4 accent-violet-500" /> Obrigatória</label>
                              <label className="flex items-center gap-2"><input name="ativa" type="checkbox" defaultChecked={pergunta.ativa} className="size-4 accent-violet-500" /> Ativa</label>
                            </div>
                          </div>
                          <textarea name="opcoes" defaultValue={pergunta.opcoes || ""} className="premium-input min-h-20 w-full py-3" />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setEditingQuestionId(null)}>Cancelar</Button>
                            <Button type="submit"><Save className="h-4 w-4" />Salvar</Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full border border-white/[0.10] bg-white/[0.05] px-2.5 py-1 text-[0.7rem] font-semibold text-slate-300">{tipoLabel(pergunta.tipo)}</span>
                              {pergunta.obrigatoria ? <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[0.7rem] font-semibold text-amber-200">Obrigatória</span> : null}
                              {!pergunta.ativa ? <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-[0.7rem] font-semibold text-rose-200">Inativa</span> : null}
                            </div>
                            <p className="mt-3 font-semibold text-white">{pergunta.ordem}. {pergunta.pergunta}</p>
                            {pergunta.opcoes ? <p className="mt-2 whitespace-pre-wrap text-xs text-slate-500">{pergunta.opcoes}</p> : null}
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setEditingQuestionId(pergunta.id)}>Editar</Button>
                            <Button type="button" variant="destructive" size="icon-sm" onClick={() => startTransition(() => void excluirPerguntaAnamnese(pergunta.id))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                }) : (
                  <div className="rounded-3xl border border-dashed border-white/[0.10] p-5 text-center text-sm text-slate-400">
                    Este modelo ainda não possui perguntas.
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
