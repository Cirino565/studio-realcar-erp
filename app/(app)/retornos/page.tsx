import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import RetornosClient from "./components/RetornosClient";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

export default async function RetornosPage() {
  await requirePagePermission("clientes.visualizar");

  // Só procedimentos que têm intervalo de retorno configurado geram
  // lembrete. Sem nenhum configurado, a tela explica o que fazer.
  const procedimentosComRetorno = await prisma.procedimentoServico.findMany({
    where: { intervaloRetornoDias: { not: null } },
    select: { nome: true, intervaloRetornoDias: true },
  });

  if (procedimentosComRetorno.length === 0) {
    return <RetornosClient itens={[]} semConfiguracao />;
  }

  const agora = new Date();

  // Janela máxima: o maior intervalo configurado. Não adianta buscar
  // atendimentos mais antigos que isso.
  const maiorIntervalo = Math.max(
    ...procedimentosComRetorno.map((item) => item.intervaloRetornoDias || 0),
  );

  const limiteBusca = new Date(agora.getTime() - maiorIntervalo * 3 * UM_DIA_MS);

  // Busca só o necessário: atendimentos concluídos dos procedimentos que
  // têm retorno configurado, dentro da janela relevante.
  const atendimentos = await prisma.agendamento.findMany({
    where: {
      status: "Atendido",
      data: { gte: limiteBusca, lte: agora },
      procedimento: { in: procedimentosComRetorno.map((item) => item.nome) },
    },
    select: {
      clienteId: true,
      procedimento: true,
      data: true,
      cliente: {
        select: {
          id: true,
          nome: true,
          whatsapp: true,
          telefone: true,
          status: true,
        },
      },
    },
    orderBy: { data: "desc" },
  });

  // Quem já tem horário marcado para frente não precisa ser lembrado.
  const comAgendamentoFuturo = new Set(
    (
      await prisma.agendamento.findMany({
        where: { data: { gt: agora }, status: { not: "Cancelado" } },
        select: { clienteId: true },
        distinct: ["clienteId"],
      })
    ).map((item) => item.clienteId),
  );

  const intervaloPorProcedimento = new Map<string, number>(
    procedimentosComRetorno.map(
      (item) => [item.nome, item.intervaloRetornoDias || 0] as [string, number],
    ),
  );

  // Para cada cliente + procedimento, guarda apenas o atendimento MAIS
  // RECENTE (a lista já vem ordenada do mais novo para o mais antigo).
  const ultimoPorClienteProcedimento = new Map<
    string,
    (typeof atendimentos)[number]
  >();

  for (const atendimento of atendimentos) {
    const chave = `${atendimento.clienteId}::${atendimento.procedimento}`;
    if (!ultimoPorClienteProcedimento.has(chave)) {
      ultimoPorClienteProcedimento.set(chave, atendimento);
    }
  }

  // Agrupa por cliente: cada cliente aparece UMA vez, com todos os
  // procedimentos em que está atrasado.
  const porCliente = new Map<
    number,
    {
      clienteId: number;
      nome: string;
      whatsapp: string | null;
      telefone: string;
      procedimentos: Array<{
        nome: string;
        ultimaVez: string;
        diasAtraso: number;
      }>;
    }
  >();

  for (const atendimento of ultimoPorClienteProcedimento.values()) {
    if (comAgendamentoFuturo.has(atendimento.clienteId)) continue;
    if (atendimento.cliente.status === "Inativa") continue;

    const intervalo = intervaloPorProcedimento.get(atendimento.procedimento);
    if (!intervalo) continue;

    const diasDesde = Math.floor(
      (agora.getTime() - atendimento.data.getTime()) / UM_DIA_MS,
    );

    const diasAtraso = diasDesde - intervalo;
    if (diasAtraso < 0) continue;

    const atual = porCliente.get(atendimento.clienteId) || {
      clienteId: atendimento.clienteId,
      nome: atendimento.cliente.nome,
      whatsapp: atendimento.cliente.whatsapp,
      telefone: atendimento.cliente.telefone,
      procedimentos: [],
    };

    atual.procedimentos.push({
      nome: atendimento.procedimento,
      ultimaVez: atendimento.data.toISOString(),
      diasAtraso,
    });

    porCliente.set(atendimento.clienteId, atual);
  }

  const itens = Array.from(porCliente.values())
    .map((cliente) => ({
      ...cliente,
      procedimentos: cliente.procedimentos.sort(
        (a, b) => b.diasAtraso - a.diasAtraso,
      ),
      maiorAtraso: Math.max(
        ...cliente.procedimentos.map((item) => item.diasAtraso),
      ),
    }))
    .sort((a, b) => b.maiorAtraso - a.maiorAtraso);

  return <RetornosClient itens={itens} semConfiguracao={false} />;
}
