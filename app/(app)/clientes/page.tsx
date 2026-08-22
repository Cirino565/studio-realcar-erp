import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ClientesClient from "./components/ClientesClient";

const CLIENTES_POR_PAGINA = 20;

type ClientesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

// Mesma lógica de busca tolerante a acento e maiúscula/minúscula que a tela
// sempre usou — só que agora roda sobre uma lista bem mais leve (poucos
// campos), não a base inteira com todo o histórico de agendamentos junto.
function normalizarBusca(valor?: string | null) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function somenteDigitos(valor?: string | null) {
  return (valor ?? "").replace(/\D/g, "");
}

function intersectarIds(a: number[] | null, b: number[] | null) {
  if (a === null) return b;
  if (b === null) return a;
  const conjuntoB = new Set(b);
  return a.filter((id) => conjuntoB.has(id));
}

export default async function ClientesPage({
  searchParams,
}: ClientesPageProps) {
  await requirePagePermission("clientes.visualizar");

  const params = (await searchParams) ?? {};

  const busca = getParam(params, "busca") ?? "";
  const status = getParam(params, "status") ?? "todos";
  const procedimentoFiltro = getParam(params, "procedimento") ?? "todos";
  const retornoFiltro = getParam(params, "retorno") ?? "todos";
  const areaFiltro = getParam(params, "area") ?? "todas";
  const ordenacao = getParam(params, "ordenacao") ?? "nome-asc";
  const paginaParam = Number(getParam(params, "pagina"));
  const paginaAtual =
    Number.isFinite(paginaParam) && paginaParam > 0 ? paginaParam : 1;

  const agora = new Date();

  // 1) Filtros simples: aplicados direto no banco, sem precisar olhar
  // o histórico de agendamentos de cada cliente.
  const condicoes: any[] = [];

  if (status !== "todos") {
    condicoes.push({ status });
  }

  if (areaFiltro === "estetica") {
    condicoes.push({ areaEstetica: true, areaCilios: false });
  } else if (areaFiltro === "cilios") {
    condicoes.push({ areaCilios: true, areaEstetica: false });
  } else if (areaFiltro === "ambas") {
    condicoes.push({ areaEstetica: true, areaCilios: true });
  } else if (areaFiltro === "sem-area") {
    condicoes.push({ areaEstetica: false, areaCilios: false });
  }

  if (procedimentoFiltro !== "todos") {
    condicoes.push({
      OR: [
        {
          procedimentoInteresse: {
            equals: procedimentoFiltro,
            mode: "insensitive",
          },
        },
        { procedimento: { equals: procedimentoFiltro, mode: "insensitive" } },
        {
          agendamentos: {
            some: {
              procedimento: {
                equals: procedimentoFiltro,
                mode: "insensitive",
              },
              status: { not: "Cancelado" },
            },
          },
        },
      ],
    });
  }

  const whereBase: any = condicoes.length > 0 ? { AND: condicoes } : {};

  // 2) Busca por texto: mesma lógica de sempre, só que sobre uma lista leve.
  let idsDaBusca: number[] | null = null;

  if (busca.trim()) {
    const texto = normalizarBusca(busca);
    const textoDigitos = somenteDigitos(busca);
    const temDigitos = textoDigitos.length >= 3;

    const candidatos = await prisma.cliente.findMany({
      where: whereBase,
      select: {
        id: true,
        nome: true,
        procedimentoInteresse: true,
        telefone: true,
        whatsapp: true,
        cpf: true,
      },
    });

    idsDaBusca = candidatos
      .filter((cliente) => {
        return (
          normalizarBusca(cliente.nome).includes(texto) ||
          normalizarBusca(cliente.procedimentoInteresse).includes(texto) ||
          (temDigitos &&
            (somenteDigitos(cliente.telefone).includes(textoDigitos) ||
              somenteDigitos(cliente.whatsapp).includes(textoDigitos) ||
              somenteDigitos(cliente.cpf).includes(textoDigitos)))
        );
      })
      .map((cliente) => cliente.id);
  }

  // 3) Filtro "precisa retornar": esse sim depende do histórico de
  // agendamentos, então fica isolado aqui e só roda quando está ativo.
  let idsRetorno: number[] | null = null;

  type ClienteIdRow = { clienteId: number };
  type UltimaVisitaPorCliente = { clienteId: number; _max: { data: Date | null } };

  if (retornoFiltro !== "todos") {
    const dias = Number(retornoFiltro);
    const limite = new Date(agora);
    limite.setDate(agora.getDate() - dias);

    const usaProcedimentoEspecifico = procedimentoFiltro !== "todos";

    const idsComOProcedimento: Set<number> = usaProcedimentoEspecifico
      ? new Set<number>(
          (
            (await prisma.agendamento.findMany({
              where: {
                status: { not: "Cancelado" },
                procedimento: {
                  equals: procedimentoFiltro,
                  mode: "insensitive",
                },
              },
              select: { clienteId: true },
              distinct: ["clienteId"],
            })) as ClienteIdRow[]
          ).map((item) => item.clienteId),
        )
      : new Set<number>();
    const ultimasGeral = await prisma.agendamento.groupBy({
      by: ["clienteId"],
      where: { status: { not: "Cancelado" }, data: { lte: agora } },
      _max: { data: true },
    });

    const futurosGeral = (await prisma.agendamento.findMany({
      where: { status: { not: "Cancelado" }, data: { gt: agora } },
      select: { clienteId: true },
      distinct: ["clienteId"],
    })) as ClienteIdRow[];

    const ultimasDoProcedimento = usaProcedimentoEspecifico
      ? await prisma.agendamento.groupBy({
          by: ["clienteId"],
          where: {
            status: { not: "Cancelado" },
            procedimento: {
              equals: procedimentoFiltro,
              mode: "insensitive",
            },
            data: { lte: agora },
          },
          _max: { data: true },
        })
      : [];

    const futurosDoProcedimento: ClienteIdRow[] = usaProcedimentoEspecifico
      ? ((await prisma.agendamento.findMany({
          where: {
            status: { not: "Cancelado" },
            procedimento: {
              equals: procedimentoFiltro,
              mode: "insensitive",
            },
            data: { gt: agora },
          },
          select: { clienteId: true },
          distinct: ["clienteId"],
        })) as ClienteIdRow[])
      : [];

    const mapaUltimaGeral = new Map<number, Date | null>(
      ultimasGeral.map((item) => [item.clienteId, item._max.data]),
    );
    const idsFuturoGeral = new Set<number>(
      futurosGeral.map((item) => item.clienteId),
    );
    const mapaUltimaProcedimento = new Map<number, Date | null>(
      ultimasDoProcedimento.map((item) => [item.clienteId, item._max.data]),
    );
    const idsFuturoProcedimento = new Set<number>(
      futurosDoProcedimento.map((item) => item.clienteId),
    );

    const todosOsIdsEnvolvidos = new Set<number>([
      ...mapaUltimaGeral.keys(),
      ...idsFuturoGeral,
      ...mapaUltimaProcedimento.keys(),
      ...idsFuturoProcedimento,
      ...idsComOProcedimento,
    ]);

    idsRetorno = Array.from(todosOsIdsEnvolvidos).filter((clienteId) => {
      const usaHistoricoDoProcedimento =
        usaProcedimentoEspecifico && idsComOProcedimento.has(clienteId);

      const ultimaVisitaRelevante = usaHistoricoDoProcedimento
        ? mapaUltimaProcedimento.get(clienteId)
        : mapaUltimaGeral.get(clienteId);

      const temRetornoFuturo = usaHistoricoDoProcedimento
        ? idsFuturoProcedimento.has(clienteId)
        : idsFuturoGeral.has(clienteId);

      return Boolean(
        ultimaVisitaRelevante &&
          ultimaVisitaRelevante <= limite &&
          !temRetornoFuturo,
      );
    });
  }

  const idsFinais = intersectarIds(idsDaBusca, idsRetorno);

  const whereFinal = {
    ...whereBase,
    ...(idsFinais ? { id: { in: idsFinais } } : {}),
  };

  const orderBy =
    ordenacao === "recentes"
      ? { createdAt: "desc" as const }
      : ordenacao === "maior-valor"
        ? { valorGasto: "desc" as const }
        : ordenacao === "ultima-visita"
          ? { ultimaVisita: "desc" as const }
          : { nome: "asc" as const };

  const limite60Dias = new Date(agora);
  limite60Dias.setDate(agora.getDate() - 60);

  const [
    clientes,
    totalFiltrado,
    totalGeral,
    ativosFiltrado,
    somaValorGasto,
    oportunidadesRetorno,
    origens,
    procedimentosInteresse,
    campanhas,
    procedimentosDeAgendamento,
    procedimentosInteresseDistintos,
    procedimentosClienteDistintos,
  ] = await Promise.all([
    prisma.cliente.findMany({
      where: whereFinal,
      orderBy,
      skip: (paginaAtual - 1) * CLIENTES_POR_PAGINA,
      take: CLIENTES_POR_PAGINA,
      include: {
        agendamentos: {
          where: { status: { not: "Cancelado" } },
          orderBy: { data: "desc" },
          select: {
            id: true,
            procedimento: true,
            data: true,
            status: true,
          },
        },
      },
    }),

    prisma.cliente.count({ where: whereFinal }),
    prisma.cliente.count(),
    prisma.cliente.count({ where: { ...whereFinal, status: "Ativa" } }),
    prisma.cliente.aggregate({
      where: whereFinal,
      _sum: { valorGasto: true },
    }),
    prisma.cliente.count({
      where: {
        ...whereFinal,
        status: "Ativa",
        OR: [{ ultimaVisita: null }, { ultimaVisita: { lte: limite60Dias } }],
      },
    }),

    prisma.origemCliente.findMany({
      where: { status: "Ativa" },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),

    prisma.procedimentoInteresse.findMany({
      where: { status: "Ativo" },
      orderBy: [{ nome: "asc" }, { id: "asc" }],
    }),

    prisma.campanhaMarketing.findMany({
      orderBy: [{ status: "asc" }, { inicio: "desc" }, { nome: "asc" }],
    }),

    prisma.agendamento.findMany({
      where: { status: { not: "Cancelado" }, procedimento: { not: "" } },
      select: { procedimento: true },
      distinct: ["procedimento"],
    }),

    prisma.cliente.findMany({
      where: { procedimentoInteresse: { not: null } },
      select: { procedimentoInteresse: true },
      distinct: ["procedimentoInteresse"],
    }),

    prisma.cliente.findMany({
      where: { procedimento: { not: null } },
      select: { procedimento: true },
      distinct: ["procedimento"],
    }),
  ]);

  const procedimentosRealizados = Array.from(
    new Set(
      [
        ...procedimentosDeAgendamento.map((item) => item.procedimento),
        ...procedimentosInteresseDistintos.map(
          (item) => item.procedimentoInteresse,
        ),
        ...procedimentosClienteDistintos.map((item) => item.procedimento),
      ].filter((valor): valor is string => Boolean(valor)),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const totalPaginas = Math.max(
    1,
    Math.ceil(totalFiltrado / CLIENTES_POR_PAGINA),
  );

  return (
    <ClientesClient
      clientes={clientes}
      origens={origens ?? []}
      procedimentosInteresse={procedimentosInteresse ?? []}
      campanhas={campanhas ?? []}
      procedimentosRealizados={procedimentosRealizados}
      filtros={{
        busca,
        status,
        procedimento: procedimentoFiltro,
        retorno: retornoFiltro,
        area: areaFiltro,
        ordenacao,
      }}
      paginaAtual={paginaAtual}
      totalPaginas={totalPaginas}
      resumo={{
        totalGeral,
        totalFiltrado,
        ativos: ativosFiltrado,
        faturamento: somaValorGasto._sum.valorGasto ?? 0,
        oportunidadesRetorno,
      }}
    />
  );
}

