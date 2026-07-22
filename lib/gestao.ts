import { prisma } from "@/lib/prisma";

const TIMEZONE = "America/Sao_Paulo";
const DIA_MS = 24 * 60 * 60 * 1000;

export type GestaoPeriodoKey =
  | "hoje"
  | "7d"
  | "30d"
  | "mes"
  | "anterior"
  | "personalizado";

export type GestaoRankingItem = {
  label: string;
  valor: number;
  detalhe?: string;
};

export type GestaoInsight = {
  titulo: string;
  descricao: string;
  href?: string;
  tone: "violet" | "emerald" | "amber" | "rose" | "cyan" | "blue";
};

export type GestaoData = {
  periodo: {
    chave: GestaoPeriodoKey;
    inicioISO: string;
    fimISO: string;
    label: string;
    dias: number;
  };
  financeiro: {
    receitaRecebida: number;
    despesasPagas: number;
    saldoRealizado: number;
    comprasEstoqueInsumosPagas: number;
    despesasOperacionaisPagas: number;
    receitaServicos: number;
    receitaProdutos: number;
    receitaSemClassificacao: number;
    custoDiretoServicos: number;
    custoProdutosVendidos: number;
    custoDiretoTotal: number;
    margemDireta: number;
    margemDiretaPercentual: number;
    resultadoGerencial: number;
    resultadoGerencialPercentual: number;
    aReceber: number;
    quantidadeAReceber: number;
    ticketMedioAtendimento: number;
    receitaAgenda: number;
    variacaoReceita: number | null;
  };
  agenda: {
    total: number;
    atendidos: number;
    faltas: number;
    cancelados: number;
    taxaComparecimento: number;
    taxaAgendaOcupada: number | null;
    horasOciosasEstimadas: number | null;
    horasReservadas: number;
    variacaoAtendidos: number | null;
  };
  clientes: {
    novos: number;
    atendidosUnicos: number;
    retornaram: number;
    taxaRetorno: number;
    elegiveisReativacao: number;
    variacaoNovos: number | null;
  };
  crm: {
    leadsRecebidos: number;
    leadsContatados: number;
    taxaContato: number;
    avaliacoesVinculadas: number;
    convertidosDaCoorte: number;
    taxaConversaoCoorte: number;
    conversoesNoPeriodo: number;
    perdidosDaCoorte: number;
    followUpsVencidos: number;
    variacaoLeads: number | null;
  };
  comunicacao: {
    abertasNoPeriodo: number;
    marcadasEnviadas: number;
    categorias: GestaoRankingItem[];
  };
  rankings: {
    receitaPorProfissional: GestaoRankingItem[];
    receitaPorProcedimento: GestaoRankingItem[];
    margemPorProcedimento: GestaoRankingItem[];
    receitaPorProduto: GestaoRankingItem[];
    margemPorProduto: GestaoRankingItem[];
    leadsPorOrigem: GestaoRankingItem[];
    receitaPorCampanha: GestaoRankingItem[];
  };
  insights: GestaoInsight[];
};

type ParametrosGestao = {
  periodo?: string;
  inicio?: string;
  fim?: string;
};

type HorarioFuncionamento = {
  abertura: string;
  fechamento: string;
} | null;

type ConfiguracaoHorarioAgenda = {
  semana: HorarioFuncionamento;
  sabado: HorarioFuncionamento;
  domingo: HorarioFuncionamento;
};

function dataISOEmSaoPaulo(data: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIMEZONE,
  }).formatToParts(data);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function validarDataISO(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function somarDiasISO(dataISO: string, dias: number) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return data.toISOString().slice(0, 10);
}

function inicioDiaSaoPaulo(dataISO: string) {
  return new Date(`${dataISO}T00:00:00-03:00`);
}

function primeiroDiaMes(dataISO: string) {
  return `${dataISO.slice(0, 7)}-01`;
}

function primeiroDiaMesAnterior(dataISO: string) {
  const [ano, mes] = dataISO.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 2, 1));
  return data.toISOString().slice(0, 10);
}

function formatarPeriodo(inicioISO: string, fimInclusivoISO: string) {
  const inicio = inicioDiaSaoPaulo(inicioISO);
  const fim = inicioDiaSaoPaulo(fimInclusivoISO);

  const formatador = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIMEZONE,
  });

  if (inicioISO === fimInclusivoISO) {
    return formatador.format(inicio);
  }

  return `${formatador.format(inicio)} a ${formatador.format(fim)}`;
}

export function resolverPeriodoGestao(
  parametros: ParametrosGestao,
): {
  chave: GestaoPeriodoKey;
  inicioISO: string;
  fimExclusivoISO: string;
  fimInclusivoISO: string;
  label: string;
  dias: number;
  inicio: Date;
  fim: Date;
  inicioAnterior: Date;
  fimAnterior: Date;
} {
  const hojeISO = dataISOEmSaoPaulo(new Date());
  const amanhaISO = somarDiasISO(hojeISO, 1);
  const chaveSolicitada = parametros.periodo as GestaoPeriodoKey | undefined;

  let chave: GestaoPeriodoKey = [
    "hoje",
    "7d",
    "30d",
    "mes",
    "anterior",
    "personalizado",
  ].includes(chaveSolicitada || "")
    ? (chaveSolicitada as GestaoPeriodoKey)
    : "mes";

  let inicioISO = primeiroDiaMes(hojeISO);
  let fimExclusivoISO = amanhaISO;
  let labelPrefixo = "Este mês";

  if (chave === "hoje") {
    inicioISO = hojeISO;
    fimExclusivoISO = amanhaISO;
    labelPrefixo = "Hoje";
  } else if (chave === "7d") {
    inicioISO = somarDiasISO(hojeISO, -6);
    fimExclusivoISO = amanhaISO;
    labelPrefixo = "Últimos 7 dias";
  } else if (chave === "30d") {
    inicioISO = somarDiasISO(hojeISO, -29);
    fimExclusivoISO = amanhaISO;
    labelPrefixo = "Últimos 30 dias";
  } else if (chave === "mes") {
    inicioISO = primeiroDiaMes(hojeISO);
    fimExclusivoISO = amanhaISO;
    labelPrefixo = "Este mês até hoje";
  } else if (chave === "anterior") {
    inicioISO = primeiroDiaMesAnterior(hojeISO);
    fimExclusivoISO = primeiroDiaMes(hojeISO);
    labelPrefixo = "Mês anterior";
  } else if (chave === "personalizado") {
    if (
      validarDataISO(parametros.inicio) &&
      validarDataISO(parametros.fim) &&
      parametros.inicio! <= parametros.fim!
    ) {
      inicioISO = parametros.inicio!;
      fimExclusivoISO = somarDiasISO(parametros.fim!, 1);

      const diasSolicitados = Math.round(
        (inicioDiaSaoPaulo(fimExclusivoISO).getTime() -
          inicioDiaSaoPaulo(inicioISO).getTime()) /
          DIA_MS,
      );

      if (diasSolicitados > 366) {
        inicioISO = somarDiasISO(parametros.fim!, -365);
      }

      labelPrefixo = "Período personalizado";
    } else {
      chave = "mes";
      inicioISO = primeiroDiaMes(hojeISO);
      fimExclusivoISO = amanhaISO;
      labelPrefixo = "Este mês até hoje";
    }
  }

  const fimInclusivoISO = somarDiasISO(fimExclusivoISO, -1);
  const inicio = inicioDiaSaoPaulo(inicioISO);
  const fim = inicioDiaSaoPaulo(fimExclusivoISO);
  const duracaoMs = Math.max(DIA_MS, fim.getTime() - inicio.getTime());
  const inicioAnterior = new Date(inicio.getTime() - duracaoMs);
  const fimAnterior = inicio;
  const dias = Math.max(1, Math.round(duracaoMs / DIA_MS));

  return {
    chave,
    inicioISO,
    fimExclusivoISO,
    fimInclusivoISO,
    label: `${labelPrefixo}, ${formatarPeriodo(inicioISO, fimInclusivoISO)}`,
    dias,
    inicio,
    fim,
    inicioAnterior,
    fimAnterior,
  };
}

function somarValores<T>(itens: T[], obterValor: (item: T) => number) {
  return itens.reduce((total, item) => total + obterValor(item), 0);
}

function variacaoPercentual(atual: number, anterior: number) {
  if (anterior === 0) {
    return atual === 0 ? 0 : null;
  }

  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

function normalizarTexto(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isPago(status?: string | null) {
  return normalizarTexto(status) === "pago";
}

function minutosDoHorario(value: string) {
  const [hora, minuto] = value.split(":").map(Number);
  return hora * 60 + minuto;
}

function parseHorarioFuncionamento(
  value: string | null | undefined,
): ConfiguracaoHorarioAgenda {
  const padrao: ConfiguracaoHorarioAgenda = {
    semana: { abertura: "09:00", fechamento: "19:00" },
    sabado: { abertura: "09:00", fechamento: "17:00" },
    domingo: null,
  };

  if (!value) return padrao;

  const semana = value.match(
    /SEG-SEX=(\d{2}:\d{2})-(\d{2}:\d{2})/i,
  );
  const sabado = value.match(
    /SAB=(FECHADO|(\d{2}:\d{2})-(\d{2}:\d{2}))/i,
  );
  const domingo = value.match(
    /DOM=(FECHADO|(\d{2}:\d{2})-(\d{2}:\d{2}))/i,
  );

  return {
    semana: semana
      ? { abertura: semana[1], fechamento: semana[2] }
      : padrao.semana,
    sabado:
      sabado?.[1]?.toUpperCase() === "FECHADO"
        ? null
        : sabado?.[2] && sabado?.[3]
          ? { abertura: sabado[2], fechamento: sabado[3] }
          : padrao.sabado,
    domingo:
      domingo?.[1]?.toUpperCase() === "FECHADO"
        ? null
        : domingo?.[2] && domingo?.[3]
          ? { abertura: domingo[2], fechamento: domingo[3] }
          : padrao.domingo,
  };
}

function diaSemanaISO(dataISO: string) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

function minutosFuncionamentoDia(
  dataISO: string,
  configuracao: ConfiguracaoHorarioAgenda,
) {
  const diaSemana = diaSemanaISO(dataISO);
  const horario =
    diaSemana === 0
      ? configuracao.domingo
      : diaSemana === 6
        ? configuracao.sabado
        : configuracao.semana;

  if (!horario) return 0;

  return Math.max(
    0,
    minutosDoHorario(horario.fechamento) -
      minutosDoHorario(horario.abertura),
  );
}

function calcularCapacidadeMinutos(
  inicioISO: string,
  fimExclusivoISO: string,
  profissionaisAtivos: number,
  configuracao: ConfiguracaoHorarioAgenda,
) {
  if (profissionaisAtivos <= 0) return 0;

  let total = 0;
  let cursor = inicioISO;

  while (cursor < fimExclusivoISO) {
    total += minutosFuncionamentoDia(cursor, configuracao) * profissionaisAtivos;
    cursor = somarDiasISO(cursor, 1);
  }

  return total;
}

function agruparRanking(
  entradas: Array<{ label: string; valor: number }>,
  limite = 6,
): GestaoRankingItem[] {
  const mapa = new Map<string, number>();

  for (const entrada of entradas) {
    const label = entrada.label.trim() || "Não informado";
    mapa.set(label, (mapa.get(label) || 0) + entrada.valor);
  }

  return Array.from(mapa.entries())
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limite);
}

export async function obterDadosGestao(
  parametros: ParametrosGestao,
): Promise<GestaoData> {
  const periodo = resolverPeriodoGestao(parametros);
  const agora = new Date();
  const hojeISO = dataISOEmSaoPaulo(agora);
  const inicioHoje = inicioDiaSaoPaulo(hojeISO);
  const sessentaDiasAtras = new Date(inicioHoje.getTime() - 60 * DIA_MS);

  const [
    lancamentos,
    lancamentosAnteriores,
    agendamentos,
    agendamentosAnteriores,
    clientesNovos,
    clientesNovosAnteriores,
    leadsCriados,
    leadsCriadosAnteriores,
    conversoesNoPeriodo,
    profissionaisAtivos,
    bloqueios,
    configuracaoClinica,
    comunicacoesAbertas,
    comunicacoesEnviadas,
    vendas,
    clientesReativacao,
    followUpsVencidos,
  ] = await Promise.all([
    prisma.lancamento.findMany({
      where: { data: { gte: periodo.inicio, lt: periodo.fim } },
      select: {
        id: true,
        valor: true,
        tipo: true,
        statusPagamento: true,
        agendamentoId: true,
        clienteId: true,
        categoria: true,
        data: true,
      },
    }),
    prisma.lancamento.findMany({
      where: {
        data: { gte: periodo.inicioAnterior, lt: periodo.fimAnterior },
      },
      select: {
        valor: true,
        tipo: true,
        statusPagamento: true,
      },
    }),
    prisma.agendamento.findMany({
      where: { data: { gte: periodo.inicio, lt: periodo.fim } },
      select: {
        id: true,
        clienteId: true,
        procedimento: true,
        data: true,
        duracao: true,
        status: true,
        profissionalId: true,
        profissional: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    }),
    prisma.agendamento.findMany({
      where: {
        data: { gte: periodo.inicioAnterior, lt: periodo.fimAnterior },
      },
      select: {
        status: true,
      },
    }),
    prisma.cliente.count({
      where: { createdAt: { gte: periodo.inicio, lt: periodo.fim } },
    }),
    prisma.cliente.count({
      where: {
        createdAt: {
          gte: periodo.inicioAnterior,
          lt: periodo.fimAnterior,
        },
      },
    }),
    prisma.lead.findMany({
      where: { createdAt: { gte: periodo.inicio, lt: periodo.fim } },
      select: {
        id: true,
        etapa: true,
        origem: true,
        ultimoContatoEm: true,
        agendamentoId: true,
        motivoPerda: true,
      },
    }),
    prisma.lead.findMany({
      where: {
        createdAt: {
          gte: periodo.inicioAnterior,
          lt: periodo.fimAnterior,
        },
      },
      select: {
        id: true,
      },
    }),
    prisma.lead.count({
      where: {
        convertidoEm: { gte: periodo.inicio, lt: periodo.fim },
      },
    }),
    prisma.profissional.findMany({
      where: { status: "Ativa" },
      select: { id: true, nome: true },
    }),
    prisma.bloqueioAgenda.findMany({
      where: {
        data: { gte: periodo.inicio, lt: periodo.fim },
        status: "Ativo",
        profissional: { status: "Ativa" },
      },
      select: {
        profissionalId: true,
        duracao: true,
        data: true,
      },
    }),
    prisma.configuracaoClinica.findFirst({
      select: {
        horarioAtendimento: true,
      },
    }),
    prisma.comunicacaoRegistro.count({
      where: {
        abertoEm: { gte: periodo.inicio, lt: periodo.fim },
      },
    }),
    prisma.comunicacaoRegistro.findMany({
      where: {
        enviadoEm: { gte: periodo.inicio, lt: periodo.fim },
      },
      select: {
        categoria: true,
        enviadoEm: true,
      },
    }),
    prisma.venda.findMany({
      where: {
        statusPagamento: "Pago",
        lancamento: {
          is: {
            statusPagamento: "Pago",
            data: { gte: periodo.inicio, lt: periodo.fim },
          },
        },
      },
      select: {
        id: true,
        lancamentoId: true,
        agendamentoId: true,
        totalServicos: true,
        totalProdutos: true,
        custoServicos: true,
        custoProdutos: true,
        valorTotal: true,
        custoTotal: true,
        statusPagamento: true,
        itens: {
          select: {
            tipo: true,
            descricao: true,
            valorTotal: true,
            custoTotal: true,
          },
        },
      },
    }),
    prisma.cliente.count({
      where: {
        ultimaVisita: { lt: sessentaDiasAtras },
        status: { not: "Inativa" },
        agendamentos: {
          none: {
            data: { gte: inicioHoje },
            status: { not: "Cancelado" },
          },
        },
      },
    }),
    prisma.lead.count({
      where: {
        proximoContatoEm: { lt: inicioHoje },
        etapa: { notIn: ["Convertido", "Perdido"] },
      },
    }),
  ]);

  const lancamentosPagos = lancamentos.filter((item) =>
    isPago(item.statusPagamento),
  );
  const receitaRecebida = somarValores(
    lancamentosPagos.filter((item) => item.tipo === "ENTRADA"),
    (item) => item.valor,
  );
  const despesasPagas = somarValores(
    lancamentosPagos.filter((item) => item.tipo === "SAIDA"),
    (item) => item.valor,
  );
  const aReceberLancamentos = lancamentos.filter(
    (item) => item.tipo === "ENTRADA" && !isPago(item.statusPagamento),
  );
  const aReceber = somarValores(aReceberLancamentos, (item) => item.valor);

  const vendasPagas = vendas.filter((venda) => isPago(venda.statusPagamento));
  const receitaServicos = somarValores(
    vendasPagas,
    (venda) => venda.totalServicos,
  );
  const receitaProdutos = somarValores(
    vendasPagas,
    (venda) => venda.totalProdutos,
  );
  const custoDiretoServicos = somarValores(
    vendasPagas,
    (venda) => venda.custoServicos,
  );
  const custoProdutosVendidos = somarValores(
    vendasPagas,
    (venda) => venda.custoProdutos,
  );
  const custoDiretoTotal = custoDiretoServicos + custoProdutosVendidos;
  const receitaVendasClassificada = somarValores(
    vendasPagas,
    (venda) => venda.valorTotal,
  );
  const receitaSemClassificacao = Math.max(
    0,
    receitaRecebida - receitaVendasClassificada,
  );

  const saidasPagas = lancamentosPagos.filter((item) => item.tipo === "SAIDA");
  const comprasEstoqueInsumosPagas = somarValores(
    saidasPagas.filter(
      (item) => normalizarTexto(item.categoria) === "produtos e insumos",
    ),
    (item) => item.valor,
  );
  const despesasOperacionaisPagas = somarValores(
    saidasPagas.filter(
      (item) => normalizarTexto(item.categoria) !== "produtos e insumos",
    ),
    (item) => item.valor,
  );

  const margemDireta = receitaRecebida - custoDiretoTotal;
  const margemDiretaPercentual =
    receitaRecebida > 0 ? (margemDireta / receitaRecebida) * 100 : 0;
  const resultadoGerencial =
    receitaRecebida - custoDiretoTotal - despesasOperacionaisPagas;
  const resultadoGerencialPercentual =
    receitaRecebida > 0 ? (resultadoGerencial / receitaRecebida) * 100 : 0;

  const receitaAnterior = somarValores(
    lancamentosAnteriores.filter(
      (item) => item.tipo === "ENTRADA" && isPago(item.statusPagamento),
    ),
    (item) => item.valor,
  );

  const agendamentosAtendidos = agendamentos.filter(
    (item) => item.status === "Atendido",
  );
  const agendamentosFaltas = agendamentos.filter(
    (item) => item.status === "Faltou",
  );
  const agendamentosCancelados = agendamentos.filter(
    (item) => item.status === "Cancelado",
  );
  const agendamentosQueOcuparamAgenda = agendamentos.filter(
    (item) => item.status !== "Cancelado",
  );

  const atendidosAnteriores = agendamentosAnteriores.filter(
    (item) => item.status === "Atendido",
  ).length;

  const baseComparecimento =
    agendamentosAtendidos.length + agendamentosFaltas.length;
  const taxaComparecimento =
    baseComparecimento > 0
      ? (agendamentosAtendidos.length / baseComparecimento) * 100
      : 0;

  const idsAgendamentoComReceita = Array.from(
    new Set(
      lancamentosPagos
        .filter(
          (item) =>
            item.tipo === "ENTRADA" &&
            typeof item.agendamentoId === "number",
        )
        .map((item) => item.agendamentoId as number),
    ),
  );

  const agendamentosFinanceiros =
    idsAgendamentoComReceita.length > 0
      ? await prisma.agendamento.findMany({
          where: { id: { in: idsAgendamentoComReceita } },
          select: {
            id: true,
            procedimento: true,
            profissional: {
              select: {
                nome: true,
              },
            },
          },
        })
      : [];

  const agendamentoFinanceiroPorId = new Map(
    agendamentosFinanceiros.map((item) => [item.id, item]),
  );

  const lancamentosAgendaPagos = lancamentosPagos.filter(
    (item) =>
      item.tipo === "ENTRADA" &&
      typeof item.agendamentoId === "number" &&
      agendamentoFinanceiroPorId.has(item.agendamentoId),
  );

  const receitaAgenda = somarValores(
    lancamentosAgendaPagos,
    (item) => item.valor,
  );
  const atendimentosPagosUnicos = new Set(
    lancamentosAgendaPagos
      .map((item) => item.agendamentoId)
      .filter((id): id is number => typeof id === "number"),
  ).size;
  const ticketMedioAtendimento =
    atendimentosPagosUnicos > 0
      ? receitaAgenda / atendimentosPagosUnicos
      : 0;

  const receitaPorProfissional = agruparRanking(
    lancamentosAgendaPagos.map((lancamento) => {
      const agendamento = agendamentoFinanceiroPorId.get(
        lancamento.agendamentoId as number,
      );

      return {
        label: agendamento?.profissional?.nome || "Sem profissional",
        valor: lancamento.valor,
      };
    }),
  );

  const lancamentoIdsVendasPagas = new Set(
    vendasPagas
      .map((venda) => venda.lancamentoId)
      .filter((id): id is number => typeof id === "number"),
  );

  const lancamentosAgendaLegados = lancamentosAgendaPagos.filter(
    (lancamento) => !lancamentoIdsVendasPagas.has(lancamento.id),
  );

  const itensServicoVendas = vendasPagas.flatMap((venda) =>
    venda.itens.filter((item) => item.tipo === "SERVICO"),
  );
  const itensProdutoVendas = vendasPagas.flatMap((venda) =>
    venda.itens.filter((item) => item.tipo === "PRODUTO"),
  );

  const receitaPorProcedimento = agruparRanking([
    ...lancamentosAgendaLegados.map((lancamento) => {
      const agendamento = agendamentoFinanceiroPorId.get(
        lancamento.agendamentoId as number,
      );

      return {
        label: agendamento?.procedimento || "Sem procedimento",
        valor: lancamento.valor,
      };
    }),
    ...itensServicoVendas.map((item) => ({
      label: item.descricao || "Sem procedimento",
      valor: item.valorTotal,
    })),
  ]);

  const margemPorProcedimento = agruparRanking(
    itensServicoVendas.map((item) => ({
      label: item.descricao || "Sem procedimento",
      valor: item.valorTotal - item.custoTotal,
    })),
  );

  const receitaPorProduto = agruparRanking(
    itensProdutoVendas.map((item) => ({
      label: item.descricao || "Sem produto",
      valor: item.valorTotal,
    })),
  );

  const margemPorProduto = agruparRanking(
    itensProdutoVendas.map((item) => ({
      label: item.descricao || "Sem produto",
      valor: item.valorTotal - item.custoTotal,
    })),
  );

  const leadsPorAgendamento =
    idsAgendamentoComReceita.length > 0
      ? await prisma.lead.findMany({
          where: {
            agendamentoId: { in: idsAgendamentoComReceita },
            campanhaId: { not: null },
          },
          select: {
            agendamentoId: true,
            campanha: {
              select: {
                nome: true,
              },
            },
          },
        })
      : [];

  const campanhaPorAgendamento = new Map<number, string>();

  for (const lead of leadsPorAgendamento) {
    if (!lead.agendamentoId || !lead.campanha?.nome) continue;
    campanhaPorAgendamento.set(lead.agendamentoId, lead.campanha.nome);
  }

  const receitaPorCampanha = agruparRanking(
    lancamentosAgendaPagos
      .filter(
        (item) =>
          item.agendamentoId &&
          campanhaPorAgendamento.has(item.agendamentoId),
      )
      .map((item) => ({
        label:
          campanhaPorAgendamento.get(item.agendamentoId as number) ||
          "Sem campanha",
        valor: item.valor,
      })),
  );

  const clientesAtendidosIds = Array.from(
    new Set(agendamentosAtendidos.map((item) => item.clienteId)),
  );

  const clientesComHistoricoAnterior =
    clientesAtendidosIds.length > 0
      ? await prisma.agendamento.findMany({
          where: {
            clienteId: { in: clientesAtendidosIds },
            status: "Atendido",
            data: { lt: periodo.inicio },
          },
          select: {
            clienteId: true,
          },
          distinct: ["clienteId"],
        })
      : [];

  const clientesRetornaram = clientesComHistoricoAnterior.length;
  const taxaRetorno =
    clientesAtendidosIds.length > 0
      ? (clientesRetornaram / clientesAtendidosIds.length) * 100
      : 0;

  const leadsContatados = leadsCriados.filter(
    (lead) => lead.ultimoContatoEm || lead.etapa !== "Novo",
  ).length;
  const avaliacoesVinculadas = leadsCriados.filter(
    (lead) => typeof lead.agendamentoId === "number",
  ).length;
  const convertidosDaCoorte = leadsCriados.filter(
    (lead) => lead.etapa === "Convertido",
  ).length;
  const perdidosDaCoorte = leadsCriados.filter(
    (lead) => lead.etapa === "Perdido",
  ).length;

  const taxaContato =
    leadsCriados.length > 0
      ? (leadsContatados / leadsCriados.length) * 100
      : 0;
  const taxaConversaoCoorte =
    leadsCriados.length > 0
      ? (convertidosDaCoorte / leadsCriados.length) * 100
      : 0;

  const leadsPorOrigem = agruparRanking(
    leadsCriados.map((lead) => ({
      label: lead.origem || "Não informada",
      valor: 1,
    })),
  );

  const categoriasComunicacao = agruparRanking(
    comunicacoesEnviadas.map((item) => ({
      label: item.categoria || "Sem categoria",
      valor: 1,
    })),
  );

  const configuracaoHorario = parseHorarioFuncionamento(
    configuracaoClinica?.horarioAtendimento,
  );

  const capacidadeBrutaMinutos = calcularCapacidadeMinutos(
    periodo.inicioISO,
    periodo.fimExclusivoISO,
    profissionaisAtivos.length,
    configuracaoHorario,
  );

  const bloqueiosMinutos = somarValores(
    bloqueios,
    (bloqueio) => bloqueio.duracao,
  );
  const capacidadeLiquidaMinutos = Math.max(
    0,
    capacidadeBrutaMinutos - bloqueiosMinutos,
  );
  const minutosReservados = somarValores(
    agendamentosQueOcuparamAgenda,
    (item) => item.duracao,
  );
  const taxaAgendaOcupada =
    capacidadeLiquidaMinutos > 0
      ? Math.min(
          100,
          (minutosReservados / capacidadeLiquidaMinutos) * 100,
        )
      : null;
  const minutosOciosos =
    capacidadeLiquidaMinutos > 0
      ? Math.max(0, capacidadeLiquidaMinutos - minutosReservados)
      : null;

  const insights: GestaoInsight[] = [];

  if (aReceber > 0) {
    insights.push({
      titulo: "Valores a receber registrados",
      descricao: `${aReceberLancamentos.length} lançamento(s) de entrada ainda não estão marcados como pagos.`,
      href: "/financeiro",
      tone: "amber",
    });
  }

  if (clientesReativacao > 0) {
    insights.push({
      titulo: "Base disponível para reativação",
      descricao: `${clientesReativacao} cliente(s) estão há mais de 60 dias sem visita e sem agendamento futuro ativo.`,
      href: "/clientes",
      tone: "cyan",
    });
  }

  if (followUpsVencidos > 0) {
    insights.push({
      titulo: "Follow-ups comerciais vencidos",
      descricao: `${followUpsVencidos} oportunidade(s) possuem próximo contato anterior a hoje.`,
      href: "/marketing",
      tone: "blue",
    });
  }

  if (receitaPorProcedimento[0]) {
    insights.push({
      titulo: "Procedimento líder em receita rastreada",
      descricao: `${receitaPorProcedimento[0].label} lidera as entradas pagas vinculadas a agendamentos no período.`,
      href: "/financeiro",
      tone: "emerald",
    });
  }

  if (minutosOciosos !== null && minutosOciosos > 0) {
    insights.push({
      titulo: "Capacidade disponível na agenda",
      descricao: `A estimativa indica ${(minutosOciosos / 60).toFixed(1).replace(".", ",")} hora(s) não reservadas no período, considerando expediente, profissionais ativos e bloqueios reais.`,
      href: "/agenda",
      tone: "violet",
    });
  }

  if (insights.length === 0) {
    insights.push({
      titulo: "Sem alertas relevantes neste recorte",
      descricao:
        "Os indicadores disponíveis não geraram pendências operacionais adicionais para destacar neste período.",
      tone: "emerald",
    });
  }

  return {
    periodo: {
      chave: periodo.chave,
      inicioISO: periodo.inicioISO,
      fimISO: periodo.fimInclusivoISO,
      label: periodo.label,
      dias: periodo.dias,
    },
    financeiro: {
      receitaRecebida,
      despesasPagas,
      saldoRealizado: receitaRecebida - despesasPagas,
      comprasEstoqueInsumosPagas,
      despesasOperacionaisPagas,
      receitaServicos,
      receitaProdutos,
      receitaSemClassificacao,
      custoDiretoServicos,
      custoProdutosVendidos,
      custoDiretoTotal,
      margemDireta,
      margemDiretaPercentual,
      resultadoGerencial,
      resultadoGerencialPercentual,
      aReceber,
      quantidadeAReceber: aReceberLancamentos.length,
      ticketMedioAtendimento,
      receitaAgenda,
      variacaoReceita: variacaoPercentual(
        receitaRecebida,
        receitaAnterior,
      ),
    },
    agenda: {
      total: agendamentos.length,
      atendidos: agendamentosAtendidos.length,
      faltas: agendamentosFaltas.length,
      cancelados: agendamentosCancelados.length,
      taxaComparecimento,
      taxaAgendaOcupada,
      horasOciosasEstimadas:
        minutosOciosos === null ? null : minutosOciosos / 60,
      horasReservadas: minutosReservados / 60,
      variacaoAtendidos: variacaoPercentual(
        agendamentosAtendidos.length,
        atendidosAnteriores,
      ),
    },
    clientes: {
      novos: clientesNovos,
      atendidosUnicos: clientesAtendidosIds.length,
      retornaram: clientesRetornaram,
      taxaRetorno,
      elegiveisReativacao: clientesReativacao,
      variacaoNovos: variacaoPercentual(
        clientesNovos,
        clientesNovosAnteriores,
      ),
    },
    crm: {
      leadsRecebidos: leadsCriados.length,
      leadsContatados,
      taxaContato,
      avaliacoesVinculadas,
      convertidosDaCoorte,
      taxaConversaoCoorte,
      conversoesNoPeriodo,
      perdidosDaCoorte,
      followUpsVencidos,
      variacaoLeads: variacaoPercentual(
        leadsCriados.length,
        leadsCriadosAnteriores.length,
      ),
    },
    comunicacao: {
      abertasNoPeriodo: comunicacoesAbertas,
      marcadasEnviadas: comunicacoesEnviadas.length,
      categorias: categoriasComunicacao,
    },
    rankings: {
      receitaPorProfissional,
      receitaPorProcedimento,
      margemPorProcedimento,
      receitaPorProduto,
      margemPorProduto,
      leadsPorOrigem,
      receitaPorCampanha,
    },
    insights: insights.slice(0, 6),
  };
}
