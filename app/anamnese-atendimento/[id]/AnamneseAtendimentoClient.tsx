"use client";

import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";

import AnamneseMobileForm from "@/app/(app)/clientes/components/AnamneseMobileForm";
import type {
  ClienteAnamneseData,
  ClienteAnamneseModeloData,
  ClienteAnamneseRespostaData,
} from "@/app/(app)/clientes/types";

type Props = {
  clienteId: number;
  clienteNome: string;
  clienteTelefone: string;
  procedimentoInicial: string;
  procedimentos: string[];
  anamneses: ClienteAnamneseData[];
  modelos: ClienteAnamneseModeloData[];
  respostas: ClienteAnamneseRespostaData[];
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

const PROCEDIMENTOS_PADRAO = [
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

function nomeCanonicoAnamnese(nome: string | null | undefined) {
  if (!nome) return "";
  return ALIASES_ANAMNESE[nome.trim().toLocaleLowerCase("pt-BR")] ?? nome;
}

export default function AnamneseAtendimentoClient({
  clienteId,
  clienteNome,
  clienteTelefone,
  procedimentoInicial,
  procedimentos,
  anamneses,
  modelos,
  respostas,
}: Props) {
  const [procedimento, setProcedimento] = useState(
    nomeCanonicoAnamnese(procedimentoInicial || anamneses[0]?.procedimento || "Limpeza de pele"),
  );

  const procedimentosDisponiveis = useMemo(
    () =>
      Array.from(
        new Set(
          [
            procedimentoInicial,
            ...procedimentos,
            ...(anamneses.map((ficha) => ficha.procedimento).filter(Boolean) as string[]),
            ...(modelos.map((modelo) => modelo.procedimentoNome).filter(Boolean) as string[]),
            ...PROCEDIMENTOS_PADRAO,
          ]
            .map((item) => nomeCanonicoAnamnese(item))
            .filter(Boolean),
        ),
      ),
    [anamneses, modelos, procedimentoInicial, procedimentos],
  );

  const fichaAtual =
    anamneses.find(
      (ficha) => nomeCanonicoAnamnese(ficha.procedimento) === nomeCanonicoAnamnese(procedimento),
    ) ?? null;

  const modeloAtual =
    modelos.find(
      (modelo) =>
        nomeCanonicoAnamnese(modelo.procedimentoNome) === nomeCanonicoAnamnese(procedimento),
    ) ?? null;

  const historico = anamneses.filter(
    (ficha) => nomeCanonicoAnamnese(ficha.procedimento) === nomeCanonicoAnamnese(procedimento),
  );

  return (
    <main className="min-h-[100dvh] min-w-0 overflow-x-hidden bg-slate-50 px-3 py-3 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-5 sm:py-5">
      <div className="mx-auto w-full max-w-5xl min-w-0 space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.055]">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
              <ClipboardList size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold text-slate-950 dark:text-white">
                {clienteNome}
              </h1>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Preencha a ficha sem sair do atendimento. Use o botão Voltar no topo ao concluir ou salvar o rascunho.
              </p>
            </div>
          </div>

          <label className="mt-4 block space-y-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Procedimento da anamnese
            </span>
            <select
              value={procedimento}
              onChange={(event) => setProcedimento(event.target.value)}
              className="premium-input h-13 w-full text-base"
            >
              {procedimentosDisponiveis.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </section>

        <AnamneseMobileForm
          key={procedimento}
          clienteId={clienteId}
          clienteNome={clienteNome}
          clienteTelefone={clienteTelefone}
          procedimento={procedimento}
          modelo={modeloAtual}
          fichaAtual={fichaAtual}
          historico={historico}
          respostas={respostas}
        />
      </div>
    </main>
  );
}
