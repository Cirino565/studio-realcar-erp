import { ClienteClinicoTabs } from "@/app/(app)/clientes/components/ClienteClinicoTabs";
import type { ClienteClinicoData } from "@/app/(app)/clientes/types";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ClientePageProps = {
  params: Promise<{ id: string }> | { id: string };
};

function toIsoString(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : "";
}

function mapAnamnese(anamnese: NonNullable<Awaited<ReturnType<typeof getClienteClinico>>>["anamneses"][number]) {
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
    termoConsentimento: anamnese.termoConsentimento,
    profissional: anamnese.profissional,
    dataFicha: toIsoString(anamnese.dataFicha),
    updatedAt: toIsoString(anamnese.updatedAt),
  };
}

async function getClienteClinico(clienteId: number) {
  return prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      anamneses: {
        orderBy: [{ updatedAt: "desc" }, { dataFicha: "desc" }],
      },
      fotos: {
        orderBy: { dataRegistro: "desc" },
      },
      documentos: {
        orderBy: { dataRegistro: "desc" },
      },
      procedimentos: {
        orderBy: { dataProcedimento: "desc" },
      },
      evolucoes: {
        orderBy: { dataRegistro: "desc" },
      },
      anamneseRespostas: {
        orderBy: { dataResposta: "desc" },
      },
    },
  });
}

export default async function ClientePage({ params }: ClientePageProps) {
  await requirePagePermission("clientes.visualizar");

  const { id } = await params;
  const clienteId = Number(id);

  if (!id || !Number.isInteger(clienteId) || clienteId <= 0) {
    return (
      <div className="p-6 text-white">
        <h1>Cliente inválido</h1>
      </div>
    );
  }

  const [cliente, anamneseModelos] = await Promise.all([
    getClienteClinico(clienteId),
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
      <div className="p-6 text-white">
        <h1>Cliente não encontrado</h1>
      </div>
    );
  }

  const anamneses = cliente.anamneses.map(mapAnamnese);

  const data: ClienteClinicoData = {
    id: cliente.id,
    nome: cliente.nome,
    anamnese: anamneses[0] ?? null,
    anamneses,
    fotos: cliente.fotos.map((foto) => ({
      id: foto.id,
      titulo: foto.titulo,
      tipo: foto.tipo,
      url: foto.url,
      descricao: foto.descricao,
      dataRegistro: toIsoString(foto.dataRegistro),
    })),
    documentos: cliente.documentos.map((documento) => ({
      id: documento.id,
      titulo: documento.titulo,
      tipo: documento.tipo,
      url: documento.url,
      observacoes: documento.observacoes,
      dataRegistro: toIsoString(documento.dataRegistro),
    })),
    procedimentos: cliente.procedimentos.map((procedimento) => ({
      id: procedimento.id,
      nome: procedimento.nome,
      profissional: procedimento.profissional,
      valor: procedimento.valor,
      status: procedimento.status,
      dataProcedimento: toIsoString(procedimento.dataProcedimento),
      observacoes: procedimento.observacoes,
    })),
    evolucoes: cliente.evolucoes.map((evolucao) => ({
      id: evolucao.id,
      titulo: evolucao.titulo,
      descricao: evolucao.descricao,
      profissional: evolucao.profissional,
      dataRegistro: toIsoString(evolucao.dataRegistro),
    })),
    anamneseModelos: anamneseModelos.map((modelo) => ({
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
    })),
    anamneseRespostas: cliente.anamneseRespostas.map((resposta) => ({
      id: resposta.id,
      procedimento: resposta.procedimento,
      perguntaTexto: resposta.perguntaTexto,
      tipo: resposta.tipo,
      resposta: resposta.resposta,
      observacao: resposta.observacao,
      profissional: resposta.profissional,
      dataResposta: toIsoString(resposta.dataResposta),
    })),
  };

  return <ClienteClinicoTabs data={data} />;
}
