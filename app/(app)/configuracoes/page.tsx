import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ConfiguracoesClient from "./components/ConfiguracoesClient";
import type { ConfiguracaoClinicaView } from "./types";

function buildDefaultConfiguracao(): ConfiguracaoClinicaView {
  const now = new Date();

  return {
    id: 0,
    nome: "Studio Realçar",
    razaoSocial: null,
    cnpj: null,
    telefone: null,
    whatsapp: null,
    email: null,
    site: null,
    instagram: null,
    endereco: null,
    bairro: null,
    cidade: null,
    estado: null,
    cep: null,
    responsavelTecnico: null,
    registroProfissional: null,
    especialidadePrincipal: null,
    horarioAtendimento: null,
    intervaloAgenda: 30,
    antecedenciaLembrete: 24,
    toleranciaAtraso: 10,
    moeda: "BRL",
    timezone: "America/Sao_Paulo",
    logoUrl: null,
    corPrincipal: "violet",
    assinaturaMensagem: null,
    mensagemConfirmacao: null,
    mensagemLembrete: null,
    mensagemRetorno: null,
    politicaCancelamento: null,
    observacoesInternas: null,
    createdAt: now,
    updatedAt: now,
  };
}

export default async function ConfiguracoesPage() {
  await requirePagePermission("configuracoes.gerenciar");
  const [configuracao, origens, procedimentosInteresse, servicos, anamneseModelos] = await Promise.all([
    prisma.configuracaoClinica.findFirst(),
    prisma.origemCliente.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
    prisma.procedimentoInteresse.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
    prisma.procedimentoServico.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
    prisma.anamneseModelo.findMany({
      include: {
        perguntas: { orderBy: [{ ordem: "asc" }, { id: "asc" }] },
      },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
  ]);

  return (
    <ConfiguracoesClient
      configuracao={configuracao ?? buildDefaultConfiguracao()}
      origens={origens}
      procedimentosInteresse={procedimentosInteresse}
      servicos={servicos}
      anamneseModelos={anamneseModelos}
    />
  );
}
