import { prisma } from "@/lib/prisma";
import { atualizarPlanilhaConversoesAds } from "@/lib/google-drive";

export type LinhaConversaoGerada = {
  vendaId: number;
  gclid: string;
  nomeConversao: string;
  dataHora: string;
  valor: number;
  moeda: string;
};

// Nome da conversao no Google Ads. Precisa ser IGUAL (letra por letra) ao
// nome da acao de conversao criada la.
export const NOME_CONVERSAO = "Venda Real";
const MOEDA = "BRL";

// Vendas dos ultimos N dias entram na planilha. O Google ignora o que ja
// recebeu (mesmo clique + mesmo nome + mesmo horario), entao reenviar nao
// conta em dobro - e assim nada se perde se uma importacao falhar.
export const DIAS_JANELA_VENDAS = 90;

export function inicioDaJanelaVendas(): Date {
  return new Date(Date.now() - DIAS_JANELA_VENDAS * 24 * 60 * 60 * 1000);
}

// O Google so aceita conversao ate 90 dias depois do clique.
const DIAS_MAXIMOS_DO_CLIQUE = 90;

const DIA_EM_MS = 24 * 60 * 60 * 1000;

/**
 * Nome da conversao "por procedimento", ex.: "Venda Real - Criolipólise".
 * Cada nome desses precisa existir como conversao no Google Ads.
 */
export function nomeConversaoProcedimento(nomeProcedimento: string) {
  const limpo = nomeProcedimento.replace(/\s+/g, " ").trim();
  return `${NOME_CONVERSAO} - ${limpo}`.slice(0, 100);
}

/**
 * Formata a data no formato documentado pelo Google Ads para importacao de
 * conversao: "yyyy-MM-dd HH:mm:ss-0300" (data, hora e fuso juntos, sem
 * espaco antes do fuso). Sao Paulo nao tem horario de verao desde 2019, entao
 * -0300 e fixo.
 */
export function formatarDataConversao(data: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(data);

  const buscar = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "00";

  return `${buscar("year")}-${buscar("month")}-${buscar("day")} ${buscar("hour")}:${buscar("minute")}:${buscar("second")}-0300`;
}

export type StatusGoogleAds =
  | "ENVIADA"
  | "AGUARDANDO"
  | "ERRO"
  | "NAO_ENVIADA"
  | "NAO_SE_APLICA";

export type AvaliacaoGoogleAds = {
  vendaId: number;
  status: StatusGoogleAds;
  // Explicacao em linguagem simples do porque (principalmente quando NAO subiu).
  motivo: string;
  // Linhas que vao para a planilha (vazio quando a venda nao e elegivel).
  linhas: LinhaConversaoGerada[];
  data: Date;
  valor: number;
  clienteId: number | null;
  clienteNome: string | null;
};

export type VendaParaAvaliar = {
  id: number;
  clienteId: number | null;
  campanhaId: number | null;
  valorTotal: number;
  data: Date;
  statusPagamento: string;
  situacao: string;
  conversaoAdsEnviadaEm: Date | null;
  conversaoAdsErro: string | null;
  cliente: { nome: string } | null;
  itens: {
    valorTotal: number;
    procedimentoServico: { id: number; nome: string } | null;
  }[];
};

export type LeadParaAvaliar = {
  id: number;
  clienteId: number | null;
  campanhaId: number | null;
  origem: string | null;
  gclid: string | null;
  createdAt: Date;
};

function dataCurta(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(data);
}

/**
 * Decide, para UMA venda, se ela sobe para o Google Ads e - quando nao sobe -
 * explica o motivo. E a mesma regra para a tela e para a planilha, entao o
 * que a tela mostra e exatamente o que o envio faz.
 *
 * Atribuicao: usa o clique (gclid) de um contato (lead) da mesma cliente.
 * Prefere o contato da mesma campanha da venda; se nao houver, usa o contato
 * mais antigo que tenha clique - ter o gclid ja prova que veio de anuncio.
 */
export function avaliarVendaGoogleAds(
  venda: VendaParaAvaliar,
  leadsDaCliente: LeadParaAvaliar[],
  porProcedimento: boolean,
): AvaliacaoGoogleAds {
  const base = {
    vendaId: venda.id,
    linhas: [] as LinhaConversaoGerada[],
    data: venda.data,
    valor: venda.valorTotal,
    clienteId: venda.clienteId,
    clienteNome: venda.cliente?.nome ?? null,
  };

  if (venda.situacao !== "ATIVA") {
    return { ...base, status: "NAO_SE_APLICA", motivo: "Venda cancelada." };
  }

  if (!venda.clienteId) {
    return {
      ...base,
      status: "NAO_SE_APLICA",
      motivo: "Venda sem cliente vinculada, não dá para saber se veio de anúncio.",
    };
  }

  const comClique = leadsDaCliente.filter((lead) => Boolean(lead.gclid));
  const veioDeAnuncio =
    venda.campanhaId != null ||
    leadsDaCliente.some(
      (lead) => lead.campanhaId != null || /google/i.test(lead.origem || ""),
    );

  if (comClique.length === 0) {
    return veioDeAnuncio
      ? {
          ...base,
          status: "NAO_ENVIADA",
          motivo:
            "A cliente está ligada a uma campanha, mas nenhum contato dela guardou o código de clique do Google (gclid). Sem ele o Google não consegue ligar a venda ao anúncio.",
        }
      : {
          ...base,
          status: "NAO_SE_APLICA",
          motivo: "Cliente não veio de anúncio.",
        };
  }

  if (venda.valorTotal <= 0) {
    return { ...base, status: "NAO_SE_APLICA", motivo: "Venda sem valor." };
  }

  if (venda.statusPagamento !== "Pago") {
    return {
      ...base,
      status: "AGUARDANDO",
      motivo: "A venda ainda não foi paga. Sobe depois que for baixada como paga.",
    };
  }

  const lead =
    comClique.find((item) => venda.campanhaId != null && item.campanhaId === venda.campanhaId) ??
    comClique[0];

  if (venda.data.getTime() < lead.createdAt.getTime()) {
    return {
      ...base,
      status: "NAO_ENVIADA",
      motivo:
        "A venda é anterior ao clique do anúncio (a cliente já comprava antes). O Google não aceita conversão antes do clique.",
    };
  }

  if (venda.data.getTime() - lead.createdAt.getTime() > DIAS_MAXIMOS_DO_CLIQUE * DIA_EM_MS) {
    return {
      ...base,
      status: "NAO_ENVIADA",
      motivo: `O clique foi em ${dataCurta(lead.createdAt)}, há mais de ${DIAS_MAXIMOS_DO_CLIQUE} dias da venda. O Google não aceita.`,
    };
  }

  const gclid = lead.gclid as string;
  const dataHora = formatarDataConversao(venda.data);

  const linhas: LinhaConversaoGerada[] = [
    {
      vendaId: venda.id,
      gclid,
      nomeConversao: NOME_CONVERSAO,
      dataHora,
      valor: venda.valorTotal,
      moeda: MOEDA,
    },
  ];

  if (porProcedimento) {
    const porServico = new Map<number, { nome: string; valor: number }>();

    for (const item of venda.itens) {
      if (!item.procedimentoServico) continue;
      const atual = porServico.get(item.procedimentoServico.id) ?? {
        nome: item.procedimentoServico.nome,
        valor: 0,
      };
      atual.valor += item.valorTotal;
      porServico.set(item.procedimentoServico.id, atual);
    }

    for (const servico of porServico.values()) {
      if (servico.valor <= 0) continue;
      linhas.push({
        vendaId: venda.id,
        gclid,
        nomeConversao: nomeConversaoProcedimento(servico.nome),
        dataHora,
        valor: Math.round(servico.valor * 100) / 100,
        moeda: MOEDA,
      });
    }
  }

  if (venda.conversaoAdsErro && !venda.conversaoAdsEnviadaEm) {
    return {
      ...base,
      linhas,
      status: "ERRO",
      motivo: `Falhou ao escrever na planilha: ${venda.conversaoAdsErro}`,
    };
  }

  if (venda.conversaoAdsEnviadaEm) {
    return {
      ...base,
      linhas,
      status: "ENVIADA",
      motivo: `Está na planilha do Google Ads desde ${dataCurta(venda.conversaoAdsEnviadaEm)}.`,
    };
  }

  return {
    ...base,
    linhas,
    status: "AGUARDANDO",
    motivo: "Pronta para subir. Vai na próxima atualização da planilha (todo dia às 4h) ou ao tocar em Enviar agora.",
  };
}

/**
 * Carrega as vendas (por ids, ou as dos ultimos dias) com os contatos das
 * clientes e devolve a avaliacao de cada uma.
 */
export async function avaliarVendasGoogleAds(filtro: {
  ids?: number[];
  desde?: Date;
}): Promise<{ avaliacoes: AvaliacaoGoogleAds[]; porProcedimento: boolean }> {
  const configuracao = await prisma.configuracaoClinica.findFirst({
    select: { googleAdsPorProcedimento: true },
  });
  const porProcedimento = Boolean(configuracao?.googleAdsPorProcedimento);

  const vendas = await prisma.venda.findMany({
    where: filtro.ids
      ? { id: { in: filtro.ids } }
      : { data: { gte: filtro.desde ?? new Date(Date.now() - DIAS_JANELA_VENDAS * DIA_EM_MS) } },
    select: {
      id: true,
      clienteId: true,
      campanhaId: true,
      valorTotal: true,
      data: true,
      statusPagamento: true,
      situacao: true,
      conversaoAdsEnviadaEm: true,
      conversaoAdsErro: true,
      cliente: { select: { nome: true } },
      itens: {
        where: { tipo: "SERVICO" },
        select: {
          valorTotal: true,
          procedimentoServico: { select: { id: true, nome: true } },
        },
      },
    },
    orderBy: { data: "asc" },
  });

  const clienteIds = [
    ...new Set(vendas.map((venda) => venda.clienteId).filter((id): id is number => id != null)),
  ];

  const leads = clienteIds.length
    ? await prisma.lead.findMany({
        where: { clienteId: { in: clienteIds } },
        select: {
          id: true,
          clienteId: true,
          campanhaId: true,
          origem: true,
          gclid: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const leadsPorCliente = new Map<number, LeadParaAvaliar[]>();
  for (const lead of leads) {
    if (lead.clienteId == null) continue;
    const lista = leadsPorCliente.get(lead.clienteId) ?? [];
    lista.push(lead);
    leadsPorCliente.set(lead.clienteId, lista);
  }

  return {
    porProcedimento,
    avaliacoes: vendas.map((venda) =>
      avaliarVendaGoogleAds(
        venda,
        venda.clienteId != null ? leadsPorCliente.get(venda.clienteId) ?? [] : [],
        porProcedimento,
      ),
    ),
  };
}

export type ResultadoExportacaoGoogleAds =
  | {
      ok: true;
      linhas: number;
      vendas: number;
      novas: number;
      planilha: string;
    }
  | { ok: false; erro: string };

/**
 * Atualiza a planilha do Google Ads com TODAS as vendas elegiveis dos ultimos
 * 90 dias (nao so as novas) e registra, em cada venda, que ela foi para a
 * planilha - ou o erro, quando falha. Quem importa e o Google Ads, na agenda
 * dele; aqui garantimos que a planilha esta sempre completa.
 */
export async function executarExportacaoGoogleAds(
  usuario: string,
): Promise<ResultadoExportacaoGoogleAds> {
  const { avaliacoes } = await avaliarVendasGoogleAds({});
  const elegiveis = avaliacoes.filter((item) => item.linhas.length > 0);
  const linhas = elegiveis.flatMap((item) => item.linhas);
  const novas = elegiveis.filter(
    (item) => item.status === "AGUARDANDO" || item.status === "ERRO",
  );

  try {
    const resultado = await atualizarPlanilhaConversoesAds(linhas);

    if (elegiveis.length > 0) {
      await prisma.venda.updateMany({
        where: { id: { in: elegiveis.map((item) => item.vendaId) }, conversaoAdsEnviadaEm: null },
        data: { conversaoAdsEnviadaEm: new Date() },
      });
      await prisma.venda.updateMany({
        where: {
          id: { in: elegiveis.map((item) => item.vendaId) },
          conversaoAdsErro: { not: null },
        },
        data: { conversaoAdsErro: null },
      });
    }

    await prisma.auditoria.create({
      data: {
        modulo: "Marketing",
        acao: "Exportação de conversões atualizada",
        entidade: "CampanhaMarketing",
        usuario,
        detalhes: `${linhas.length} linha(s) na planilha, de ${elegiveis.length} venda(s) (${novas.length} nova(s)). Planilha: ${resultado.url}`,
      },
    });

    return {
      ok: true,
      linhas: linhas.length,
      vendas: elegiveis.length,
      novas: novas.length,
      planilha: resultado.url,
    };
  } catch (erro) {
    const mensagem = (erro instanceof Error ? erro.message : "Erro desconhecido.").slice(0, 300);

    const aindaNaoEnviadas = elegiveis.filter((item) => item.status !== "ENVIADA");
    if (aindaNaoEnviadas.length > 0) {
      await prisma.venda.updateMany({
        where: {
          id: { in: aindaNaoEnviadas.map((item) => item.vendaId) },
          conversaoAdsEnviadaEm: null,
        },
        data: { conversaoAdsErro: mensagem },
      });
    }

    await prisma.auditoria
      .create({
        data: {
          modulo: "Marketing",
          acao: "Falha na exportação de conversões",
          entidade: "CampanhaMarketing",
          usuario,
          detalhes: mensagem,
        },
      })
      .catch(() => undefined);

    return { ok: false, erro: mensagem };
  }
}
