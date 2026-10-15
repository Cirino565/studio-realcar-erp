import { headers } from "next/headers";

import { canAccess, requirePagePermission } from "@/lib/auth";
import { diaDe, somarDias } from "@/lib/gasto-google-ads";
import { prisma } from "@/lib/prisma";

import GastoGoogleAdsPainel, {
  type CampanhaGoogle,
  type CampanhaSistema,
} from "./components/GastoGoogleAdsPainel";

export const dynamic = "force-dynamic";

function arredondar(valor: number) {
  return Math.round(valor * 100) / 100;
}

export default async function GastoGoogleAdsPage() {
  const usuario = await requirePagePermission("marketing.visualizar");
  const podeGerenciar =
    canAccess(usuario, "marketing.gerenciar") && canAccess(usuario, "financeiro.gerenciar");

  const hoje = diaDe();
  const inicio30 = somarDias(hoje, -30);

  const [porCampanha, ultimos30, nomes, ultimoRecebimento, campanhas, manuais, automaticos] =
    await Promise.all([
      prisma.gastoGoogleAdsDia.groupBy({
        by: ["googleCampanhaId"],
        _min: { data: true },
        _max: { data: true },
        _sum: { custo: true },
      }),
      prisma.gastoGoogleAdsDia.groupBy({
        by: ["googleCampanhaId"],
        where: { data: { gte: inicio30 } },
        _sum: { custo: true },
      }),
      prisma.gastoGoogleAdsDia.findMany({
        orderBy: { data: "desc" },
        distinct: ["googleCampanhaId"],
        select: { googleCampanhaId: true, campanhaNome: true },
      }),
      prisma.auditoria.findFirst({
        where: {
          modulo: "Marketing",
          acao: { in: ["Gasto do Google Ads recebido", "Falha ao receber gasto do Google Ads"] },
        },
        orderBy: { createdAt: "desc" },
        select: { acao: true, detalhes: true, createdAt: true },
      }),
      prisma.campanhaMarketing.findMany({
        orderBy: [{ status: "asc" }, { nome: "asc" }],
        select: {
          id: true,
          nome: true,
          canal: true,
          status: true,
          googleAdsCampanhaId: true,
          gastoAutomaticoDesde: true,
        },
      }),
      // Gastos lancados a mao (blocos) ligados a campanhas.
      prisma.lancamento.findMany({
        where: {
          campanhaId: { not: null },
          tipo: "SAIDA",
          statusPagamento: "Pago",
          chaveGasto: null,
          venda: { is: null },
        },
        select: { campanhaId: true, data: true, valor: true },
      }),
      prisma.lancamento.findMany({
        where: {
          campanhaId: { not: null },
          statusPagamento: "Pago",
          chaveGasto: { startsWith: "gads:" },
        },
        select: { campanhaId: true, valor: true },
      }),
    ]);

  const nomePorId = new Map(nomes.map((item) => [item.googleCampanhaId, item.campanhaNome]));
  const trintaPorId = new Map(ultimos30.map((item) => [item.googleCampanhaId, item._sum.custo ?? 0]));

  const campanhasGoogle: CampanhaGoogle[] = porCampanha
    .map((item) => ({
      googleCampanhaId: item.googleCampanhaId,
      nome: nomePorId.get(item.googleCampanhaId) ?? `Campanha ${item.googleCampanhaId}`,
      primeiroDia: item._min.data ?? hoje,
      ultimoDia: item._max.data ?? hoje,
      total: arredondar(item._sum.custo ?? 0),
      ultimos30: arredondar(trintaPorId.get(item.googleCampanhaId) ?? 0),
    }))
    .sort((a, b) => b.ultimos30 - a.ultimos30 || a.nome.localeCompare(b.nome));

  const campanhasSistema: CampanhaSistema[] = campanhas.map((campanha) => {
    const doCampanha = manuais.filter((item) => item.campanhaId === campanha.id);
    const ultimoManual = doCampanha.reduce<Date | null>(
      (maior, item) => (!maior || item.data > maior ? item.data : maior),
      null,
    );
    const desde = campanha.gastoAutomaticoDesde;
    const limite = desde ? new Date(`${desde}T00:00:00-03:00`) : null;
    const antes = limite ? doCampanha.filter((item) => item.data < limite) : [];
    const depois = limite ? doCampanha.filter((item) => item.data >= limite) : [];
    const autos = automaticos.filter((item) => item.campanhaId === campanha.id);

    return {
      id: campanha.id,
      nome: campanha.nome,
      canal: campanha.canal,
      status: campanha.status,
      googleAdsCampanhaId: campanha.googleAdsCampanhaId,
      gastoAutomaticoDesde: desde,
      ultimoManualDia: ultimoManual ? diaDe(ultimoManual) : null,
      manuaisAntes: {
        quantidade: antes.length,
        total: arredondar(antes.reduce((soma, item) => soma + item.valor, 0)),
      },
      manuaisDepois: {
        quantidade: depois.length,
        total: arredondar(depois.reduce((soma, item) => soma + item.valor, 0)),
      },
      automaticos: {
        quantidade: autos.length,
        total: arredondar(autos.reduce((soma, item) => soma + item.valor, 0)),
      },
    };
  });

  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "app.studiorealcar.com.br";
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? "https";

  return (
    <GastoGoogleAdsPainel
      campanhasGoogle={campanhasGoogle}
      campanhasSistema={campanhasSistema}
      endereco={`${protocolo}://${host}/api/marketing/gasto-google-ads`}
      ultimoRecebimento={
        ultimoRecebimento
          ? {
              ok: ultimoRecebimento.acao === "Gasto do Google Ads recebido",
              detalhes: ultimoRecebimento.detalhes,
              data: ultimoRecebimento.createdAt.toISOString(),
            }
          : null
      }
      hoje={hoje}
      podeGerenciar={podeGerenciar}
    />
  );
}
