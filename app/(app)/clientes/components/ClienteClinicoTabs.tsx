/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ClipboardList,
  FileText,
  ImageIcon,
  Loader2,
  Plus,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from "lucide-react";

import {
  criarDocumentoCliente,
  criarEvolucaoCliente,
  criarFotoCliente,
  criarProcedimentoCliente,
  excluirRegistroClinico,
} from "@/actions/cliente-clinico.actions";
import { salvarRespostasAnamneseRapida } from "@/actions/anamnese-config.actions";
import { Button } from "@/components/ui/button";
import { formatarData, formatarMoeda } from "@/lib/format";
import type { ClienteClinicoData } from "../types";

type AbaClinica =
  | "anamnese"
  | "fotos"
  | "evolucao"
  | "procedimentos"
  | "documentos";

type Props = {
  data: ClienteClinicoData;
  initialTab?: AbaClinica;
};

const procedimentosAnamnesePadrao = [
  "Avaliação",
  "Limpeza de pele",
  "Peeling",
  "Microagulhamento",
  "Botox",
  "Preenchimento",
  "Bioestimulador",
  "Cílios fio a fio",
  "Manutenção de cílios",
  "Design de sobrancelhas",
  "Outro",
];

const abas: { id: AbaClinica; label: string; icon: LucideIcon }[] = [
  { id: "anamnese", label: "Anamnese", icon: ClipboardList },
  { id: "fotos", label: "Fotos", icon: ImageIcon },
  { id: "evolucao", label: "Evolução", icon: Activity },
  { id: "procedimentos", label: "Procedimentos", icon: Stethoscope },
  { id: "documentos", label: "Documentos", icon: FileText },
];

function dateInputValue(date: string | null | undefined) {
  if (!date) return new Date().toISOString().slice(0, 10);

  return new Date(date).toISOString().slice(0, 10);
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
        {label}
      </span>

      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-300/40 dark:focus:bg-white/[0.075] dark:focus:ring-violet-500/10"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 4,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
        {label}
      </span>

      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-violet-300/40 dark:focus:bg-white/[0.075] dark:focus:ring-violet-500/10"
      />
    </label>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 border-b border-slate-200 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-start gap-3">
        <div className="shrink-0 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200">
          <Icon size={20} />
        </div>

        <div className="min-w-0">
          <h2 className="break-words text-base font-bold text-slate-900 dark:text-white sm:text-lg">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function DeleteButton({
  clienteId,
  tipo,
  id,
}: {
  clienteId: number;
  tipo: "foto" | "evolucao" | "procedimento" | "documento";
  id: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="destructive"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          void excluirRegistroClinico(clienteId, tipo, id);
        });
      }}
      aria-label="Excluir registro"
    >
      {isPending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Trash2 />
      )}
    </Button>
  );
}

export function ClienteClinicoTabs({
  data,
  initialTab = "anamnese",
}: Props) {
  const [activeTab, setActiveTab] =
    useState<AbaClinica>(initialTab);

  const [procedimentoAnamnese, setProcedimentoAnamnese] =
    useState(
      data.anamnese?.procedimento ||
        data.procedimentos[0]?.nome ||
        "Limpeza de pele",
    );

  function ativarAba(tab: AbaClinica) {
    setActiveTab(tab);

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${tab}`);
    }
  }

  useEffect(() => {
    const hash = window.location.hash.replace(
      "#",
      "",
    ) as AbaClinica;

    if (abas.some((aba) => aba.id === hash)) {
      setActiveTab(hash);
    }
  }, []);

  const resumo = useMemo(() => {
    const totalProcedimentos = data.procedimentos.length;
    const totalEvolucoes = data.evolucoes.length;
    const totalFotos = data.fotos.length;

    const valorProcedimentos = data.procedimentos.reduce(
      (total, item) => total + item.valor,
      0,
    );

    return {
      totalProcedimentos,
      totalEvolucoes,
      totalFotos,
      valorProcedimentos,
    };
  }, [data]);

  const procedimentosDisponiveis = Array.from(
    new Set([
      ...data.procedimentos.map(
        (procedimento) => procedimento.nome,
      ),
      ...(data.anamneses
        .map((ficha) => ficha.procedimento)
        .filter(Boolean) as string[]),
      ...(data.anamneseModelos
        .map((modelo) => modelo.procedimentoNome)
        .filter(Boolean) as string[]),
      ...procedimentosAnamnesePadrao,
    ]),
  );

  const anamneseAtual =
    data.anamneses.find(
      (ficha) =>
        ficha.procedimento === procedimentoAnamnese,
    ) ?? null;

  const modeloAnamneseAtual =
    data.anamneseModelos.find(
      (modelo) =>
        modelo.procedimentoNome === procedimentoAnamnese,
    ) ??
    data.anamneseModelos[0] ??
    null;

  const perguntasConfiguradas =
    modeloAnamneseAtual?.perguntas ?? [];

  const respostasDoProcedimento =
    data.anamneseRespostas.filter(
      (resposta) =>
        resposta.procedimento === procedimentoAnamnese,
    );

  return (
    <section className="app-mobile-safe space-y-5 sm:space-y-6">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Anamnese
            </p>

            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              <ClipboardList size={17} />
            </div>
          </div>

          <h3 className="mt-3 break-words text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            {data.anamneses.length > 0
              ? `${data.anamneses.length} ficha(s)`
              : "Pendente"}
          </h3>

          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {data.anamnese
              ? `Última atualização em ${formatarData(
                  data.anamnese.updatedAt,
                )}`
              : "Ficha clínica ainda não registrada"}
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Procedimentos
            </p>

            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Stethoscope size={17} />
            </div>
          </div>

          <h3 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {resumo.totalProcedimentos}
          </h3>

          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {formatarMoeda(
              resumo.valorProcedimentos,
            )}{" "}
            registrados
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Evoluções
            </p>

            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
              <Activity size={17} />
            </div>
          </div>

          <h3 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {resumo.totalEvolucoes}
          </h3>

          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Acompanhamentos clínicos
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Fotos
            </p>

            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300">
              <ImageIcon size={17} />
            </div>
          </div>

          <h3 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {resumo.totalFotos}
          </h3>

          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Antes, depois e evolução
          </p>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.055]">
        <div className="touch-scroll-x scrollbar-premium flex max-w-full gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.025] sm:p-4">
          {abas.map((aba) => {
            const Icon = aba.icon;
            const selected = activeTab === aba.id;

            return (
              <button
                key={aba.id}
                type="button"
                onClick={() => ativarAba(aba.id)}
                data-mobile-action="true"
                aria-pressed={selected}
                className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                  selected
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/20 dark:bg-violet-500 dark:text-white"
                    : "text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
                }`}
              >
                <Icon size={16} />
                {aba.label}
              </button>
            );
          })}
        </div>

        {activeTab === "anamnese" && (
          <div id="anamnese">
            <SectionHeader
              icon={ClipboardList}
              title="Anamnese do procedimento"
              description="Uma única ficha por procedimento, com respostas rápidas e observações condicionais para uso no celular."
            />

            <div className="min-w-0 space-y-5 p-4 sm:p-6">
              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <label className="space-y-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Procedimento da anamnese
                  </span>

                  <select
                    name="procedimentoVisual"
                    value={procedimentoAnamnese}
                    onChange={(event) =>
                      setProcedimentoAnamnese(
                        event.target.value,
                      )
                    }
                    className="premium-input w-full"
                  >
                    {procedimentosDisponiveis.map(
                      (procedimento) => (
                        <option
                          key={procedimento}
                          value={procedimento}
                        >
                          {procedimento}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-5 text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100">
                  As perguntas são gerenciadas em
                  Configurações &gt; Anamnese. Para perguntas
                  de Sim/Não, o campo de observação aparece
                  quando a resposta é Sim.
                </div>
              </div>

              {perguntasConfiguradas.length > 0 ? (
                <form
                  action={salvarRespostasAnamneseRapida}
                  className="rounded-3xl border border-cyan-200 bg-cyan-50/70 p-4 dark:border-cyan-300/20 dark:bg-cyan-400/10 sm:p-5"
                >
                  <input
                    type="hidden"
                    name="clienteId"
                    value={data.id}
                  />

                  <input
                    type="hidden"
                    name="modeloId"
                    value={modeloAnamneseAtual?.id ?? ""}
                  />

                  <input
                    type="hidden"
                    name="procedimento"
                    value={procedimentoAnamnese}
                  />

                  <input
                    type="hidden"
                    name="totalPerguntas"
                    value={perguntasConfiguradas.length}
                  />

                  <div className="mb-5 grid gap-4 md:grid-cols-2">
                    <Field
                      label="Profissional responsável"
                      name="profissional"
                      defaultValue={
                        anamneseAtual?.profissional
                      }
                      placeholder="Nome da profissional"
                    />

                    <Field
                      label="Data da ficha"
                      name="dataFicha"
                      type="date"
                      defaultValue={dateInputValue(
                        anamneseAtual?.dataFicha,
                      )}
                    />
                  </div>

                  <div className="space-y-3">
                    {perguntasConfiguradas.map(
                      (pergunta, index) => {
                        const respostaAnterior =
                          data.anamneseRespostas.find(
                            (resposta) =>
                              resposta.procedimento ===
                                procedimentoAnamnese &&
                              resposta.perguntaTexto ===
                                pergunta.pergunta,
                          );

                        return (
                          <div
                            key={pergunta.id}
                            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/25 sm:p-5"
                          >
                            <input
                              type="hidden"
                              name={`perguntaId_${index}`}
                              value={pergunta.id}
                            />

                            <input
                              type="hidden"
                              name={`perguntaTexto_${index}`}
                              value={pergunta.pergunta}
                            />

                            <input
                              type="hidden"
                              name={`tipo_${index}`}
                              value={pergunta.tipo}
                            />

                            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <p className="text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                                {pergunta.ordem}.{" "}
                                {pergunta.pergunta}
                              </p>

                              {pergunta.obrigatoria ? (
                                <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[0.65rem] font-bold text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                                  Obrigatória
                                </span>
                              ) : null}
                            </div>

                            <DynamicAnswerField
                              pergunta={pergunta}
                              index={index}
                              respostaAnterior={
                                respostaAnterior?.resposta ??
                                null
                              }
                              observacaoAnterior={
                                respostaAnterior?.observacao ??
                                null
                              }
                            />
                          </div>
                        );
                      },
                    )}
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-cyan-800/80 dark:text-cyan-100/80">
                      Ao salvar, a ficha anterior deste mesmo
                      procedimento é atualizada para evitar
                      duplicidade no histórico.
                    </p>

                    <Button
                      type="submit"
                      className="w-full sm:w-auto"
                    >
                      <ShieldCheck size={17} />
                      Salvar anamnese
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                  Nenhuma pergunta configurada para este
                  procedimento. Acesse Configurações &gt;
                  Anamnese para criar ou ativar perguntas.
                </div>
              )}

              {respostasDoProcedimento.length > 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.035] sm:p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Últimas respostas salvas
                  </h3>

                  <div className="mt-4 grid gap-3">
                    {respostasDoProcedimento
                      .slice(0, 8)
                      .map((resposta) => (
                        <div
                          key={resposta.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
                        >
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {resposta.perguntaTexto}
                          </p>

                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                            Resposta:{" "}
                            {resposta.resposta || "-"}
                          </p>

                          {resposta.observacao ? (
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              Observação:{" "}
                              {resposta.observacao}
                            </p>
                          ) : null}

                          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                            {formatarData(
                              resposta.dataResposta,
                            )}{" "}
                            {resposta.profissional
                              ? `• ${resposta.profissional}`
                              : ""}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {activeTab === "fotos" && (
          <div id="fotos">
            <SectionHeader
              icon={ImageIcon}
              title="Fotos da cliente"
              description="Registro visual de antes, depois e evolução."
            />

            <div className="grid min-w-0 gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
              <form
                action={criarFotoCliente}
                className="h-fit space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <input
                  type="hidden"
                  name="clienteId"
                  value={data.id}
                />

                <Field
                  label="Título"
                  name="titulo"
                  required
                  placeholder="Ex: Antes da limpeza de pele"
                />

                <Field
                  label="Tipo"
                  name="tipo"
                  defaultValue="Evolução"
                  placeholder="Antes, Depois, Evolução"
                />

                <Field
                  label="Link da foto"
                  name="url"
                  required
                  placeholder="Cole a URL ou caminho da imagem"
                />

                <Field
                  label="Data"
                  name="dataRegistro"
                  type="date"
                  defaultValue={dateInputValue(
                    new Date().toISOString(),
                  )}
                />

                <TextArea
                  label="Descrição"
                  name="descricao"
                  rows={3}
                />

                <Button type="submit" className="w-full">
                  <Plus size={17} />
                  Adicionar foto
                </Button>
              </form>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.fotos.length > 0 ? (
                  data.fotos.map((foto) => (
                    <article
                      key={foto.id}
                      className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-950/60">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={foto.url}
                          alt={foto.titulo}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words font-semibold text-slate-900 dark:text-white">
                              {foto.titulo}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {foto.tipo} •{" "}
                              {formatarData(
                                foto.dataRegistro,
                              )}
                            </p>
                          </div>

                          <DeleteButton
                            clienteId={data.id}
                            tipo="foto"
                            id={foto.id}
                          />
                        </div>

                        {foto.descricao ? (
                          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                            {foto.descricao}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  ))
                ) : (
                  <EmptyState
                    icon={ImageIcon}
                    title="Nenhuma foto registrada"
                    text="Adicione links de fotos para criar o histórico visual da cliente."
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "evolucao" && (
          <div id="evolucao">
            <SectionHeader
              icon={Activity}
              title="Evolução clínica"
              description="Acompanhamento técnico e observações de cada etapa."
            />

            <div className="grid min-w-0 gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
              <form
                action={criarEvolucaoCliente}
                className="h-fit space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <input
                  type="hidden"
                  name="clienteId"
                  value={data.id}
                />

                <Field
                  label="Título"
                  name="titulo"
                  required
                  placeholder="Ex: Evolução após 7 dias"
                />

                <Field
                  label="Profissional"
                  name="profissional"
                  placeholder="Responsável pelo registro"
                />

                <Field
                  label="Data"
                  name="dataRegistro"
                  type="date"
                  defaultValue={dateInputValue(
                    new Date().toISOString(),
                  )}
                />

                <TextArea
                  label="Descrição da evolução"
                  name="descricao"
                  required
                  rows={5}
                />

                <Button type="submit" className="w-full">
                  <Plus size={17} />
                  Registrar evolução
                </Button>
              </form>

              <div className="min-w-0 space-y-4">
                {data.evolucoes.length > 0 ? (
                  data.evolucoes.map((evolucao) => (
                    <article
                      key={evolucao.id}
                      className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-5"
                    >
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-slate-900 dark:text-white">
                            {evolucao.titulo}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatarData(
                              evolucao.dataRegistro,
                            )}{" "}
                            {evolucao.profissional
                              ? `• ${evolucao.profissional}`
                              : ""}
                          </p>
                        </div>

                        <DeleteButton
                          clienteId={data.id}
                          tipo="evolucao"
                          id={evolucao.id}
                        />
                      </div>

                      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                        {evolucao.descricao}
                      </p>
                    </article>
                  ))
                ) : (
                  <EmptyState
                    icon={Activity}
                    title="Nenhuma evolução registrada"
                    text="Registre observações clínicas ao longo dos atendimentos."
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "procedimentos" && (
          <div id="procedimentos">
            <SectionHeader
              icon={Stethoscope}
              title="Procedimentos"
              description="Histórico de procedimentos, valores e profissional responsável."
            />

            <div className="grid min-w-0 gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
              <form
                action={criarProcedimentoCliente}
                className="h-fit space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <input
                  type="hidden"
                  name="clienteId"
                  value={data.id}
                />

                <Field
                  label="Procedimento"
                  name="nome"
                  required
                  placeholder="Ex: Limpeza de pele"
                />

                <Field
                  label="Profissional"
                  name="profissional"
                />

                <Field
                  label="Valor"
                  name="valor"
                  type="text"
                  placeholder="0,00"
                />

                <Field
                  label="Status"
                  name="status"
                  defaultValue="Realizado"
                />

                <Field
                  label="Data"
                  name="dataProcedimento"
                  type="date"
                  defaultValue={dateInputValue(
                    new Date().toISOString(),
                  )}
                />

                <TextArea
                  label="Observações"
                  name="observacoes"
                  rows={3}
                />

                <Button type="submit" className="w-full">
                  <Plus size={17} />
                  Registrar procedimento
                </Button>
              </form>

              <div className="min-w-0 space-y-4">
                {data.procedimentos.length > 0 ? (
                  data.procedimentos.map(
                    (procedimento) => (
                      <article
                        key={procedimento.id}
                        className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-5"
                      >
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="min-w-0">
                            <p className="break-words font-semibold text-slate-900 dark:text-white">
                              {procedimento.nome}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatarData(
                                procedimento.dataProcedimento,
                              )}{" "}
                              {procedimento.profissional
                                ? `• ${procedimento.profissional}`
                                : ""}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
                              {procedimento.status}
                            </span>

                            <DeleteButton
                              clienteId={data.id}
                              tipo="procedimento"
                              id={procedimento.id}
                            />
                          </div>
                        </div>

                        <p className="mt-4 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                          {formatarMoeda(
                            procedimento.valor,
                          )}
                        </p>

                        {procedimento.observacoes ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400">
                            {procedimento.observacoes}
                          </p>
                        ) : null}
                      </article>
                    ),
                  )
                ) : (
                  <EmptyState
                    icon={Stethoscope}
                    title="Nenhum procedimento registrado"
                    text="Cadastre procedimentos clínicos diretamente no perfil da cliente."
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "documentos" && (
          <div id="documentos">
            <SectionHeader
              icon={FileText}
              title="Documentos"
              description="Termos, fichas, contratos e links úteis da cliente."
            />

            <div className="grid min-w-0 gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
              <form
                action={criarDocumentoCliente}
                className="h-fit space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <input
                  type="hidden"
                  name="clienteId"
                  value={data.id}
                />

                <Field
                  label="Título"
                  name="titulo"
                  required
                  placeholder="Ex: Termo de consentimento"
                />

                <Field
                  label="Tipo"
                  name="tipo"
                  defaultValue="Documento"
                />

                <Field
                  label="Link do documento"
                  name="url"
                  placeholder="URL do arquivo, se houver"
                />

                <Field
                  label="Data"
                  name="dataRegistro"
                  type="date"
                  defaultValue={dateInputValue(
                    new Date().toISOString(),
                  )}
                />

                <TextArea
                  label="Observações"
                  name="observacoes"
                  rows={4}
                />

                <Button type="submit" className="w-full">
                  <Plus size={17} />
                  Adicionar documento
                </Button>
              </form>

              <div className="min-w-0 space-y-4">
                {data.documentos.length > 0 ? (
                  data.documentos.map((documento) => (
                    <article
                      key={documento.id}
                      className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-5"
                    >
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-slate-900 dark:text-white">
                            {documento.titulo}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {documento.tipo} •{" "}
                            {formatarData(
                              documento.dataRegistro,
                            )}
                          </p>
                        </div>

                        <DeleteButton
                          clienteId={data.id}
                          tipo="documento"
                          id={documento.id}
                        />
                      </div>

                      {documento.url ? (
                        <a
                          href={documento.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex text-sm font-semibold text-violet-700 transition hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200"
                        >
                          Abrir documento
                        </a>
                      ) : null}

                      {documento.observacoes ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400">
                          {documento.observacoes}
                        </p>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <EmptyState
                    icon={FileText}
                    title="Nenhum documento registrado"
                    text="Adicione termos, fichas e documentos importantes da cliente."
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function DynamicAnswerField({
  pergunta,
  index,
  respostaAnterior,
  observacaoAnterior,
}: {
  pergunta: {
    tipo: string;
    opcoes: string | null;
  };
  index: number;
  respostaAnterior?: string | null;
  observacaoAnterior?: string | null;
}) {
  const [respostaSimNao, setRespostaSimNao] =
    useState(
      respostaAnterior === "Sim"
        ? "Sim"
        : respostaAnterior === "Não"
          ? "Não"
          : "",
    );

  if (pergunta.tipo === "SIM_NAO") {
    return (
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className={`flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              respostaSimNao === "Sim"
                ? "border-violet-300 bg-violet-50 text-violet-800 ring-2 ring-violet-100 dark:border-violet-300/40 dark:bg-violet-500/15 dark:text-white dark:ring-violet-500/10"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.07]"
            }`}
          >
            <input
              type="radio"
              name={`resposta_${index}`}
              value="Sim"
              defaultChecked={respostaAnterior === "Sim"}
              onChange={() => setRespostaSimNao("Sim")}
              className="accent-violet-600"
            />
            Sim
          </label>

          <label
            className={`flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              respostaSimNao === "Não"
                ? "border-violet-300 bg-violet-50 text-violet-800 ring-2 ring-violet-100 dark:border-violet-300/40 dark:bg-violet-500/15 dark:text-white dark:ring-violet-500/10"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.07]"
            }`}
          >
            <input
              type="radio"
              name={`resposta_${index}`}
              value="Não"
              defaultChecked={respostaAnterior === "Não"}
              onChange={() => setRespostaSimNao("Não")}
              className="accent-violet-600"
            />
            Não
          </label>
        </div>

        {respostaSimNao === "Sim" ? (
          <textarea
            name={`observacao_${index}`}
            rows={3}
            defaultValue={observacaoAnterior ?? ""}
            className="premium-input min-h-24 w-full py-3"
            placeholder="Descreva a observação. Ex: qual alergia, qual medicamento, quando aconteceu..."
          />
        ) : null}
      </div>
    );
  }

  if (pergunta.tipo === "MULTIPLA_ESCOLHA") {
    const opcoes =
      pergunta.opcoes
        ?.split("\n")
        .map((opcao) => opcao.trim())
        .filter(Boolean) ?? [];

    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          name={`resposta_${index}`}
          defaultValue={respostaAnterior ?? ""}
          className="premium-input w-full"
        >
          <option value="">Selecione</option>

          {opcoes.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>

        <input
          name={`observacao_${index}`}
          defaultValue={observacaoAnterior ?? ""}
          className="premium-input w-full"
          placeholder="Observação"
        />
      </div>
    );
  }

  if (pergunta.tipo === "ACEITE") {
    return (
      <div className="space-y-3">
        <label className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-50">
          <input
            type="checkbox"
            name={`resposta_${index}`}
            value="Aceito"
            defaultChecked={
              respostaAnterior === "Aceito"
            }
            className="mt-1 size-4 accent-emerald-600"
          />

          Cliente declara estar ciente e de acordo com
          esta orientação/termo.
        </label>

        <input
          name={`observacao_${index}`}
          defaultValue={observacaoAnterior ?? ""}
          className="premium-input w-full"
          placeholder="Observação opcional"
        />
      </div>
    );
  }

  if (pergunta.tipo === "TEXTO_LONGO") {
    return (
      <textarea
        name={`resposta_${index}`}
        rows={4}
        defaultValue={respostaAnterior ?? ""}
        className="premium-input min-h-28 w-full py-3"
        placeholder="Resposta da cliente"
      />
    );
  }

  return (
    <input
      name={`resposta_${index}`}
      defaultValue={respostaAnterior ?? ""}
      className="premium-input w-full"
      placeholder="Resposta da cliente"
    />
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-white/10 dark:bg-white/[0.025] sm:p-8">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 dark:bg-white/[0.06] dark:text-slate-500 dark:ring-white/10">
        <Icon size={20} />
      </div>

      <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
        {text}
      </p>
    </div>
  );
}