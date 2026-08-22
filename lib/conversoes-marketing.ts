import { prisma } from "@/lib/prisma";

export type LinhaConversaoGerada = {
  vendaId: number;
  gclid: string;
  nomeConversao: string;
  dataHora: string;
  valor: number;
  moeda: string;
};

const NOME_CONVERSAO = "Venda Real";
const MOEDA = "BRL";

/**
 * Formata a data no formato exato que o Google Ads espera para importação
 * de conversão: "yyyy/MM/dd HH:mm:ss-0300", sem espaço antes do fuso.
 * São Paulo não observa horário de verão desde 2019, então o deslocamento
 * -0300 é fixo.
 */
function formatarDataConversao(data: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).formatToParts(data);

  const buscar = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "00";

  return `${buscar("year")}/${buscar("month")}/${buscar("day")} ${buscar("hour")}:${buscar("minute")}:${buscar("second")}-0300`;
}

/**
 * Monta a lista de conversões prontas para a planilha do Google Ads.
 *
 * Regra de atribuição: para cada venda paga vinculada a uma campanha, busca
 * o lead mais antigo daquele cliente que está vinculado à MESMA campanha e
 * que tem um GCLID guardado (o clique original que trouxe esse cliente para
 * aquela campanha específica). Se não encontrar, a venda fica de fora - é
 * melhor não reportar do que reportar uma conversão com origem incerta.
 *
 * Só entram vendas com "conversaoAdsEnviadaEm" vazio - ou seja, que ainda
 * não foram confirmadas como enviadas. Isso é o que evita a planilha subir
 * sempre inteira, do zero, todo dia. Depois que o envio é confirmado com
 * sucesso, quem chama esta função é responsável por marcar essas vendas
 * como enviadas (ver marcarVendasComoEnviadasAds).
 */
export async function gerarConversoesGoogleAds(
  diasJanela = 90,
): Promise<LinhaConversaoGerada[]> {
  const limite = new Date(Date.now() - diasJanela * 24 * 60 * 60 * 1000);

  const vendas = await prisma.venda.findMany({
    where: {
      statusPagamento: "Pago",
      situacao: "ATIVA",
      campanhaId: { not: null },
      clienteId: { not: null },
      data: { gte: limite },
      conversaoAdsEnviadaEm: null,
    },
    select: {
      id: true,
      clienteId: true,
      campanhaId: true,
      valorTotal: true,
      data: true,
    },
    orderBy: { data: "asc" },
  });

  const resultado: LinhaConversaoGerada[] = [];

  for (const venda of vendas) {
    if (!venda.clienteId || !venda.campanhaId) continue;

    const lead = await prisma.lead.findFirst({
      where: {
        clienteId: venda.clienteId,
        campanhaId: venda.campanhaId,
        gclid: { not: null },
      },
      orderBy: { createdAt: "asc" },
      select: { gclid: true },
    });

    if (!lead?.gclid) continue;

    resultado.push({
      vendaId: venda.id,
      gclid: lead.gclid,
      nomeConversao: NOME_CONVERSAO,
      dataHora: formatarDataConversao(venda.data),
      valor: venda.valorTotal,
      moeda: MOEDA,
    });
  }

  return resultado;
}

/**
 * Marca as vendas como "conversão já enviada ao Google Ads" - só deve ser
 * chamada depois que a planilha foi atualizada com sucesso. Se o envio
 * falhar antes disso, as vendas continuam com conversaoAdsEnviadaEm vazio
 * e entram automaticamente na próxima tentativa.
 */
export async function marcarVendasComoEnviadasAds(vendaIds: number[]) {
  if (vendaIds.length === 0) return;

  await prisma.venda.updateMany({
    where: { id: { in: vendaIds } },
    data: { conversaoAdsEnviadaEm: new Date() },
  });
}
