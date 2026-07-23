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
import { Button } from "@/components/ui/button";
import AnamneseMobileForm from "./AnamneseMobileForm";
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


const ALIASES_ANAMNESE: Record<string, string> = {
  botox: "Toxina Botulínica",
  preenchimento: "Preenchimento com Ácido Hialurônico",
  "design sobrancelhas": "Design de Sobrancelhas",
  "design de sobrancelhas": "Design de Sobrancelhas",
  auricoloterapia: "Auriculoterapia",
  "ultrasom microfocado": "Ultrassom microfocado",
  "ultrasom facial ou corporal": "Ultrassom facial ou corporal",
};

function nomeCanonicoAnamnese(nome: string | null | undefined) {
  if (!nome) return "";
  return ALIASES_ANAMNESE[nome.trim().toLocaleLowerCase("pt-BR")] ?? nome;
}

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
      nomeCanonicoAnamnese(
        data.anamnese?.procedimento ||
          data.procedimentos[0]?.nome ||
          "Limpeza de pele",
      ),
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
        nomeCanonicoAnamnese(ficha.procedimento) ===
        nomeCanonicoAnamnese(procedimentoAnamnese),
    ) ?? null;

  const modeloAnamneseAtual =
    data.anamneseModelos.find(
      (modelo) =>
        modelo.procedimentoNome === nomeCanonicoAnamnese(procedimentoAnamnese),
    ) ?? null;

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
              description="Preenchimento otimizado para celular, com perguntas em sequência, rascunho, assinatura, PDF e histórico por versão."
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
                    onChange={(event) => setProcedimentoAnamnese(event.target.value)}
                    className="premium-input h-13 w-full text-base"
                  >
                    {procedimentosDisponiveis.map((procedimento) => (
                      <option key={procedimento} value={procedimento}>
                        {procedimento}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-5 text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-100">
                  Toque nas respostas e role a tela normalmente. Todas as perguntas ficam uma abaixo da outra, e os campos de detalhe aparecem somente quando necessários.
                </div>
              </div>

              <AnamneseMobileForm
                clienteId={data.id}
                clienteNome={data.nome}
                clienteTelefone={data.whatsapp || data.telefone}
                procedimento={procedimentoAnamnese}
                modelo={modeloAnamneseAtual}
                fichaAtual={anamneseAtual}
                historico={data.anamneses.filter(
                  (ficha) =>
                    nomeCanonicoAnamnese(ficha.procedimento) ===
                    nomeCanonicoAnamnese(procedimentoAnamnese),
                )}
                respostas={data.anamneseRespostas}
              />
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