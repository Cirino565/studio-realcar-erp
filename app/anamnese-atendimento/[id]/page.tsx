import type {
  ClienteAnamneseData,
  ClienteAnamneseModeloData,
  ClienteAnamneseRespostaData,
} from "@/app/(app)/clientes/types";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import AnamneseAtendimentoClient from "./AnamneseAtendimentoClient";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
  searchParams?:
    | Promise<{ procedimento?: string | string[] }>
    | { procedimento?: string | string[] };
};

function toIsoString(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : "";
}

async function getClienteAnamnese(clienteId: number) {
  return prisma.cliente.findUnique({
    where: { id: clienteId },
    select: {
      id: true,
      nome: true,
      telefone: true,
      whatsapp: true,
      anamneses: {
        orderBy: [{ updatedAt: "desc" }, { dataFicha: "desc" }],
      },
      procedimentos: {
        select: { nome: true },
        orderBy: { dataProcedimento: "desc" },
      },
      anamneseRespostas: {
        orderBy: { dataResposta: "desc" },
      },
    },
  });
}

function mapAnamnese(
  anamnese: NonNullable<Awaited<ReturnType<typeof getClienteAnamnese>>>["anamneses"][number],
): ClienteAnamneseData {
  return {
    id: anamnese.id,
    procedimento: anamnese.procedimento,
    queixaPrincipal: anamnese.queixaPrincipal,
    alergias: anamnese.alergias,
    medicamentos: anamnese.medicamentos,
    doencasPreExistentes: anamnese.doencasPreExistentes,
    procedimentosAnteriores: anamnese.procedimentosAnteriores,
    gestante: anamnese.gestante,
    lactante: anamnese.lactante,
    usaAcidos: anamnese.usaAcidos,
    possuiMarcapasso: anamnese.possuiMarcapasso,
    restricoes: anamnese.restricoes,
    objetivoTratamento: anamnese.objetivoTratamento,
    observacoesClinicas: anamnese.observacoesClinicas,
    respostasRapidas: anamnese.respostasRapidas,
    assinaturaCliente: anamnese.assinaturaCliente,
    assinaturaNome: anamnese.assinaturaNome,
    termoConsentimento: anamnese.termoConsentimento,
    declaracaoTexto: anamnese.declaracaoTexto,
    declaracaoVersao: anamnese.declaracaoVersao,
    status: anamnese.status,
    versao: anamnese.versao,
    finalizadaEm: anamnese.finalizadaEm ? toIsoString(anamnese.finalizadaEm) : null,
    assinadaEm: anamnese.assinadaEm ? toIsoString(anamnese.assinadaEm) : null,
    profissional: anamnese.profissional,
    dataFicha: toIsoString(anamnese.dataFicha),
    updatedAt: toIsoString(anamnese.updatedAt),
  };
}

export default async function AnamneseAtendimentoPage({
  params,
  searchParams,
}: PageProps) {
  await requirePagePermission("clientes.clinico");

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const clienteId = Number(id);
  const procedimentoParam = Array.isArray(resolvedSearchParams.procedimento)
    ? resolvedSearchParams.procedimento[0]
    : resolvedSearchParams.procedimento;

  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 p-5 text-slate-900">
        Cliente inválido.
      </div>
    );
  }

  const [cliente, modelos] = await Promise.all([
    getClienteAnamnese(clienteId),
    prisma.anamneseModelo.findMany({
      where: { status: "Ativo" },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      include: {
        perguntas: {
          where: { ativa: true },
          orderBy: [{ ordem: "asc" }, { id: "asc" }],
        },
      },
    }),
  ]);

  if (!cliente) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 p-5 text-slate-900">
        Cliente não encontrado.
      </div>
    );
  }

  const anamneses: ClienteAnamneseData[] = cliente.anamneses.map(mapAnamnese);
  const anamneseModelos: ClienteAnamneseModeloData[] = modelos.map((modelo) => ({
    id: modelo.id,
    nome: modelo.nome,
    procedimentoNome: modelo.procedimentoNome,
    status: modelo.status,
    perguntas: modelo.perguntas.map((pergunta) => ({
      id: pergunta.id,
      modeloId: pergunta.modeloId,
      pergunta: pergunta.pergunta,
      tipo: pergunta.tipo,
      opcoes: pergunta.opcoes,
      obrigatoria: pergunta.obrigatoria,
      ativa: pergunta.ativa,
      ordem: pergunta.ordem,
    })),
  }));
  const respostas: ClienteAnamneseRespostaData[] = cliente.anamneseRespostas.map(
    (resposta) => ({
      id: resposta.id,
      anamneseId: resposta.anamneseId,
      perguntaId: resposta.perguntaId,
      procedimento: resposta.procedimento,
      perguntaTexto: resposta.perguntaTexto,
      tipo: resposta.tipo,
      resposta: resposta.resposta,
      observacao: resposta.observacao,
      profissional: resposta.profissional,
      dataResposta: toIsoString(resposta.dataResposta),
    }),
  );

  return (
    <AnamneseAtendimentoClient
      clienteId={cliente.id}
      clienteNome={cliente.nome}
      clienteTelefone={cliente.whatsapp || cliente.telefone}
      procedimentoInicial={
        procedimentoParam || cliente.procedimentos[0]?.nome || anamneses[0]?.procedimento || ""
      }
      procedimentos={cliente.procedimentos.map((item) => item.nome)}
      anamneses={anamneses}
      modelos={anamneseModelos}
      respostas={respostas}
    />
  );
}
