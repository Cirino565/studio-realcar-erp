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
    intervaloEntreAtendimentos: 30,
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
  const [configuracao, origens, procedimentosInteresse, servicos, anamneseModelos, motivosPerda] = await Promise.all([
    prisma.configuracaoClinica.findFirst(),
    prisma.origemCliente.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
    prisma.procedimentoInteresse.findMany({ orderBy: [{ nome: "asc" }, { id: "asc" }] }),
    prisma.procedimentoServico.findMany({ orderBy: [{ nome: "asc" }, { id: "asc" }] }),
    prisma.anamneseModelo.findMany({
      include: {
        perguntas: { orderBy: [{ ordem: "asc" }, { id: "asc" }] },
      },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
    prisma.motivoPerdaLead.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
  ]);

  // Quantos atendimentos/vendas ja usaram cada procedimento (para saber se
  // pode excluir ou so ocultar).
  const [usosAgenda, usosVenda] = await Promise.all([
    prisma.agendamento.groupBy({ by: ["procedimento"], _count: { _all: true } }),
    prisma.vendaItem.groupBy({
      by: ["procedimentoServicoId"],
      where: { procedimentoServicoId: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const chave = (texto: string) =>
    texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
  const agendaPorNome = new Map<string, number>();
  for (const item of usosAgenda) {
    const k = chave(item.procedimento);
    agendaPorNome.set(k, (agendaPorNome.get(k) ?? 0) + item._count._all);
  }
  const vendaPorId = new Map(usosVenda.map((item) => [item.procedimentoServicoId, item._count._all]));
  const usosServicos: Record<number, number> = Object.fromEntries(
    servicos.map((servico) => [
      servico.id,
      (agendaPorNome.get(chave(servico.nome)) ?? 0) + (vendaPorId.get(servico.id) ?? 0),
    ]),
  );

  return (
    <ConfiguracoesClient
      configuracao={configuracao ?? buildDefaultConfiguracao()}
      origens={origens}
      procedimentosInteresse={procedimentosInteresse}
      servicos={servicos}
      usosServicos={usosServicos}
      anamneseModelos={anamneseModelos}
      motivosPerda={motivosPerda}
    />
  );
}
