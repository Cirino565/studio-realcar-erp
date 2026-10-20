import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  CATEGORIA_REATIVACAO_PERDIDOS,
  CHAVE_MODELO_PADRAO,
  POR_PAGINA,
  PREFIXO_MODELO,
  TEXTO_PADRAO,
  chaveModeloDoServico,
  inicioDoDiaSaoPaulo,
  montarMensagem,
  servicoDoInteresse,
  somenteDigitos,
  type ResultadoReativacao,
} from "@/lib/reativacao-perdidos";

export const SEM_SERVICO = "Sem serviço informado";

export type FiltrosReativacao = {
  aba: "lista" | "enviadas";
  servico: string;
  dias: number; // 0 = qualquer data
  origem: string;
  pagina: number;
};

export type ItemReativacao = {
  id: number;
  nome: string;
  telefone: string;
  servico: string | null;
  origem: string | null;
  motivoPerda: string | null;
  perdidoEm: string | null;
  mensagem: string;
  // Mesmo telefone de alguem que ja recebeu (outro cadastro da mesma pessoa).
  jaRecebeuPorOutroCadastro: boolean;
};

export type ItemEnviado = {
  id: number;
  nome: string;
  telefone: string | null;
  servico: string | null;
  enviadaEm: string;
  resultado: ResultadoReativacao | null;
  // Agendou depois da mensagem (o sistema percebe sozinho).
  agendouSozinho: boolean;
  etapa: string;
  clienteId: number | null;
};

export type DadosReativacao = {
  filtros: FiltrosReativacao;
  servicos: Array<{ nome: string; quantidade: number }>;
  origens: Array<{ nome: string; quantidade: number }>;
  totalLista: number;
  itens: ItemReativacao[];
  totalEnviadas: number;
  enviadas: ItemEnviado[];
  resumo: { enviadas: number; responderam: number; voltaram: number; enviadasHoje: number };
  limiteDiario: number;
  ultimoEnvioEm: string | null;
  modelos: Array<{ servico: string | null; chave: string; texto: string; personalizado: boolean }>;
};

function lerNumero(valor: string | undefined, padrao: number) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : padrao;
}

export function lerFiltros(params: Record<string, string | undefined>): FiltrosReativacao {
  const dias = lerNumero(params.dias, 0);
  return {
    aba: params.aba === "enviadas" ? "enviadas" : "lista",
    servico: (params.servico || "").trim(),
    dias: [0, 30, 60, 90, 180, 365].includes(dias) ? dias : 0,
    origem: (params.origem || "").trim(),
    pagina: Math.max(1, Math.floor(lerNumero(params.pagina, 1))),
  };
}

export async function carregarReativacao(filtros: FiltrosReativacao): Promise<DadosReativacao> {
  const agora = new Date();

  // Quem pode receber: perdido, com telefone, nunca recebeu e sem horario marcado.
  const base: Prisma.LeadWhereInput = {
    etapa: "Perdido",
    reativacaoEnviadaEm: null,
    telefone: { not: null },
    NOT: [
      { telefone: "" },
      {
        cliente: {
          is: { agendamentos: { some: { data: { gt: agora }, status: { notIn: ["Cancelado", "Faltou"] } } } },
        },
      },
    ],
  };

  const [servicosCadastrados, porInteresse, porOrigem, config, enviadasHoje, ultimoEnvio, modelosSalvos] =
    await Promise.all([
      prisma.procedimentoServico.findMany({ select: { nome: true } }),
      prisma.lead.groupBy({ by: ["interesse"], where: base, _count: { _all: true } }),
      prisma.lead.groupBy({ by: ["origem"], where: base, _count: { _all: true } }),
      prisma.configuracaoClinica.findFirst({ select: { reativacaoLimiteDiario: true } }),
      prisma.comunicacaoRegistro.count({
        where: { categoria: CATEGORIA_REATIVACAO_PERDIDOS, enviadoEm: { gte: inicioDoDiaSaoPaulo(agora) } },
      }),
      prisma.comunicacaoRegistro.findFirst({
        where: { categoria: CATEGORIA_REATIVACAO_PERDIDOS },
        orderBy: { enviadoEm: "desc" },
        select: { enviadoEm: true },
      }),
      prisma.mensagemModelo.findMany({
        where: { chave: { startsWith: PREFIXO_MODELO } },
        select: { chave: true, nome: true, corpo: true },
      }),
    ]);

  const nomesServicos = servicosCadastrados.map((item) => item.nome);

  // Agrupa os interesses escritos de jeitos diferentes no mesmo servico.
  const brutosPorServico = new Map<string, Array<string | null>>();
  const quantidadePorServico = new Map<string, number>();
  for (const grupo of porInteresse) {
    const servico = servicoDoInteresse(grupo.interesse, nomesServicos) ?? SEM_SERVICO;
    brutosPorServico.set(servico, [...(brutosPorServico.get(servico) ?? []), grupo.interesse]);
    quantidadePorServico.set(servico, (quantidadePorServico.get(servico) ?? 0) + grupo._count._all);
  }
  const servicos = Array.from(quantidadePorServico.entries())
    .map(([nome, quantidade]) => ({ nome, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR"));

  const origens = porOrigem
    .map((grupo) => ({ nome: grupo.origem || "Sem origem", quantidade: grupo._count._all }))
    .sort((a, b) => b.quantidade - a.quantidade);

  // Filtros escolhidos na tela (tudo resolvido no banco).
  const filtrosLista: Prisma.LeadWhereInput[] = [base];
  if (filtros.servico) {
    const brutos = brutosPorServico.get(filtros.servico) ?? [];
    const comTexto = brutos.filter((item): item is string => Boolean(item));
    filtrosLista.push({
      OR: [
        ...(comTexto.length > 0 ? [{ interesse: { in: comTexto } }] : []),
        ...(brutos.includes(null) ? [{ interesse: null }] : []),
        ...(brutos.length === 0 ? [{ id: -1 }] : []),
      ],
    });
  }
  if (filtros.dias > 0) {
    filtrosLista.push({ perdidoEm: { gte: new Date(agora.getTime() - filtros.dias * 86_400_000) } });
  }
  if (filtros.origem) {
    filtrosLista.push(filtros.origem === "Sem origem" ? { origem: null } : { origem: filtros.origem });
  }
  const whereLista: Prisma.LeadWhereInput = { AND: filtrosLista };

  // Modelos de texto: um por servico (ou o padrao).
  const modeloPorChave = new Map(modelosSalvos.map((item) => [item.chave, item.corpo]));
  const textoDoServico = (servico: string | null) =>
    modeloPorChave.get(chaveModeloDoServico(servico)) ?? modeloPorChave.get(CHAVE_MODELO_PADRAO) ?? TEXTO_PADRAO;

  // Telefones de quem ja recebeu (para nao mandar de novo por outro cadastro).
  const jaEnviados = await prisma.lead.findMany({
    where: { reativacaoEnviadaEm: { not: null } },
    select: {
      id: true,
      nome: true,
      telefone: true,
      interesse: true,
      etapa: true,
      clienteId: true,
      reativacaoEnviadaEm: true,
      reativacaoResultado: true,
    },
    orderBy: { reativacaoEnviadaEm: "desc" },
  });
  const telefonesEnviados = new Set(jaEnviados.map((item) => somenteDigitos(item.telefone)).filter(Boolean));

  const [totalLista, pagina] = await Promise.all([
    prisma.lead.count({ where: whereLista }),
    filtros.aba === "lista"
      ? prisma.lead.findMany({
          where: whereLista,
          orderBy: [{ perdidoEm: { sort: "desc", nulls: "last" } }, { id: "desc" }],
          skip: (filtros.pagina - 1) * POR_PAGINA,
          take: POR_PAGINA,
          select: { id: true, nome: true, telefone: true, interesse: true, origem: true, motivoPerda: true, perdidoEm: true },
        })
      : Promise.resolve([]),
  ]);

  const vistosNaPagina = new Set<string>();
  const itens: ItemReativacao[] = pagina.map((lead) => {
    const servico = servicoDoInteresse(lead.interesse, nomesServicos);
    const digitos = somenteDigitos(lead.telefone);
    const repetido = Boolean(digitos) && (telefonesEnviados.has(digitos) || vistosNaPagina.has(digitos));
    if (digitos) vistosNaPagina.add(digitos);
    return {
      id: lead.id,
      nome: lead.nome,
      telefone: lead.telefone || "",
      servico,
      origem: lead.origem,
      motivoPerda: lead.motivoPerda,
      perdidoEm: lead.perdidoEm?.toISOString() ?? null,
      mensagem: montarMensagem(textoDoServico(servico), { nome: lead.nome, servico }),
      jaRecebeuPorOutroCadastro: repetido,
    };
  });

  // Resultado: quem agendou depois da mensagem (o sistema percebe sozinho).
  const clienteIds = Array.from(new Set(jaEnviados.map((item) => item.clienteId).filter((id): id is number => Boolean(id))));
  const maisAntigo = jaEnviados.at(-1)?.reativacaoEnviadaEm ?? agora;
  const agendamentosDepois = clienteIds.length
    ? await prisma.agendamento.findMany({
        where: { clienteId: { in: clienteIds }, createdAt: { gte: maisAntigo }, status: { not: "Cancelado" } },
        select: { clienteId: true, createdAt: true },
      })
    : [];

  const enviadasTodas: ItemEnviado[] = jaEnviados.map((lead) => {
    const enviadaEm = lead.reativacaoEnviadaEm as Date;
    const agendouSozinho =
      ["Agendado", "Convertido"].includes(lead.etapa) ||
      agendamentosDepois.some((item) => item.clienteId === lead.clienteId && item.createdAt > enviadaEm);
    return {
      id: lead.id,
      nome: lead.nome,
      telefone: lead.telefone,
      servico: servicoDoInteresse(lead.interesse, nomesServicos),
      enviadaEm: enviadaEm.toISOString(),
      resultado: (lead.reativacaoResultado as ResultadoReativacao | null) ?? null,
      agendouSozinho,
      etapa: lead.etapa,
      clienteId: lead.clienteId,
    };
  });

  const voltaram = enviadasTodas.filter((item) => item.resultado === "AGENDOU" || item.agendouSozinho).length;
  const responderam = enviadasTodas.filter(
    (item) => item.resultado === "RESPONDEU" || item.resultado === "AGENDOU" || item.agendouSozinho,
  ).length;

  const servicosDosModelos = new Set<string | null>([null, ...servicos.map((item) => (item.nome === SEM_SERVICO ? null : item.nome))]);
  const modelos = Array.from(servicosDosModelos).map((servico) => {
    const chave = chaveModeloDoServico(servico);
    return {
      servico,
      chave,
      texto: modeloPorChave.get(chave) ?? (servico ? textoDoServico(null) : TEXTO_PADRAO),
      personalizado: modeloPorChave.has(chave),
    };
  });

  return {
    filtros,
    servicos,
    origens,
    totalLista,
    itens,
    totalEnviadas: enviadasTodas.length,
    enviadas:
      filtros.aba === "enviadas"
        ? enviadasTodas.slice((filtros.pagina - 1) * POR_PAGINA, filtros.pagina * POR_PAGINA)
        : [],
    resumo: { enviadas: enviadasTodas.length, responderam, voltaram, enviadasHoje },
    limiteDiario: config?.reativacaoLimiteDiario ?? 15,
    ultimoEnvioEm: ultimoEnvio?.enviadoEm?.toISOString() ?? null,
    modelos,
  };
}
