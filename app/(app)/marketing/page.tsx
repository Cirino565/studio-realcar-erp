import { canAccess, requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MarketingClient from "./components/MarketingClient";

export default async function MarketingPage() {
  const usuario = await requirePagePermission("marketing.visualizar");

  const [leadsBase, campanhas, profissionais, servicos] = await Promise.all([
    prisma.lead.findMany({
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
          },
        },
        agendamento: {
          select: {
            id: true,
            data: true,
            status: true,
            procedimento: true,
            profissional: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
        campanha: {
          select: {
            id: true,
            nome: true,
            canal: true,
          },
        },
        interacoes: {
          orderBy: { createdAt: "desc" },
          take: 12,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campanhaMarketing.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.profissional.findMany({
      where: { status: "Ativa" },
      select: { id: true, nome: true },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
    prisma.procedimentoServico.findMany({
      where: { status: "Ativo" },
      select: {
        id: true,
        nome: true,
        duracaoPadrao: true,
        valorPadrao: true,
      },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
  ]);

  const agendamentoIds = leadsBase
    .map((lead) => lead.agendamentoId)
    .filter((id): id is number => Boolean(id));

  const lancamentos = agendamentoIds.length
    ? await prisma.lancamento.findMany({
        where: {
          agendamentoId: { in: agendamentoIds },
          tipo: "ENTRADA",
          statusPagamento: "Pago",
        },
        select: {
          agendamentoId: true,
          valor: true,
        },
      })
    : [];

  const receitaPorAgendamento = new Map<number, number>();
  for (const lancamento of lancamentos) {
    if (!lancamento.agendamentoId) continue;
    receitaPorAgendamento.set(
      lancamento.agendamentoId,
      (receitaPorAgendamento.get(lancamento.agendamentoId) || 0) + lancamento.valor,
    );
  }

  const leads = leadsBase.map((lead) => ({
    ...lead,
    receitaRastreada: lead.agendamentoId
      ? receitaPorAgendamento.get(lead.agendamentoId) || 0
      : 0,
  }));

  return (
    <MarketingClient
      leads={leads}
      campanhas={campanhas}
      profissionais={profissionais}
      servicos={servicos}
      podeGerenciarMarketing={canAccess(usuario, "marketing.gerenciar")}
      podeGerenciarAgenda={canAccess(usuario, "agenda.gerenciar")}
    />
  );
}
