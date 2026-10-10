import { canAccess, requirePagePermission } from "@/lib/auth";
import {
  inicioDaJanelaVendas,
  NOME_CONVERSAO,
  avaliarVendasGoogleAds,
  nomeConversaoProcedimento,
} from "@/lib/conversoes-marketing";
import { isGoogleDriveConfigured } from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";

import GoogleAdsClient from "./components/GoogleAdsClient";

export const dynamic = "force-dynamic";

export default async function GoogleAdsPage() {
  const usuario = await requirePagePermission("marketing.visualizar");

  const desde = inicioDaJanelaVendas();

  const [{ avaliacoes, porProcedimento }, procedimentos, ultimaExecucao, leadsComCodigo] =
    await Promise.all([
      avaliarVendasGoogleAds({ desde }),
      prisma.procedimentoServico.findMany({
        where: { status: "Ativo" },
        select: { nome: true },
        orderBy: { nome: "asc" },
      }),
      prisma.auditoria.findFirst({
        where: {
          modulo: "Marketing",
          acao: { in: ["Exportação de conversões atualizada", "Falha na exportação de conversões"] },
        },
        orderBy: { createdAt: "desc" },
        select: { acao: true, detalhes: true, usuario: true, createdAt: true },
      }),
      // Cliques que viraram lead pelo botao do WhatsApp da pagina do anuncio.
      prisma.lead.findMany({
        where: { createdAt: { gte: desde }, codigoAtendimento: { not: null } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          nome: true,
          origem: true,
          gclid: true,
          codigoAtendimento: true,
          createdAt: true,
          cliente: { select: { nome: true } },
        },
      }),
    ]);

  const vendas = avaliacoes
    .filter((item) => item.status !== "NAO_SE_APLICA")
    .sort((a, b) => b.data.getTime() - a.data.getTime())
    .map((item) => ({
      vendaId: item.vendaId,
      clienteNome: item.clienteNome,
      data: item.data.toISOString(),
      valor: item.valor,
      status: item.status,
      motivo: item.motivo,
    }));

  const cliques = {
    total: leadsComCodigo.length,
    comGclid: leadsComCodigo.filter((lead) => lead.gclid).length,
    semGclid: leadsComCodigo
      .filter((lead) => !lead.gclid)
      .slice(0, 30)
      .map((lead) => ({
        id: lead.id,
        codigo: lead.codigoAtendimento,
        origem: lead.origem,
        cliente: lead.cliente?.nome ?? null,
        data: lead.createdAt.toISOString(),
      })),
  };

  return (
    <GoogleAdsClient
      vendas={vendas}
      cliques={cliques}
      nomeConversao={NOME_CONVERSAO}
      nomesPorProcedimento={procedimentos.map((item) => nomeConversaoProcedimento(item.nome))}
      porProcedimento={porProcedimento}
      driveConfigurado={isGoogleDriveConfigured()}
      ultimaExecucao={
        ultimaExecucao
          ? {
              ok: ultimaExecucao.acao === "Exportação de conversões atualizada",
              detalhes: ultimaExecucao.detalhes,
              usuario: ultimaExecucao.usuario,
              data: ultimaExecucao.createdAt.toISOString(),
            }
          : null
      }
      podeGerenciar={canAccess(usuario, "marketing.gerenciar")}
    />
  );
}
