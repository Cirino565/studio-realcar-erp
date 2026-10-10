import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Relatorio "por procedimento". Tudo e calculado DENTRO do banco (soma e
 * contagem em SQL) - nenhuma venda e carregada para a memoria. A lista de
 * nomes vem paginada (30 por vez).
 */

export const POR_PAGINA = 30;

export const GRUPOS_ORIGEM = [
  "Google Ads",
  "Instagram",
  "Indicação",
  "Espontâneo",
  "Retorno",
  "Outras / não informada",
] as const;

export type GrupoOrigem = (typeof GRUPOS_ORIGEM)[number];
export type TipoLista = "feitos" | "agendados" | "pendentes" | "semcobranca";

export type FiltroRelatorio = {
  procedimentoId: number | null;
  procedimentoNome: string | null;
  inicio: string; // yyyy-mm-dd (dia de Sao Paulo)
  fim: string; // yyyy-mm-dd, inclusive
};

export type LinhaOrigem = { grupo: GrupoOrigem; quantidade: number; valor: number };

export type ResumoRelatorio = {
  feitos: LinhaOrigem[];
  pendentes: LinhaOrigem[];
  agendados: LinhaOrigem[];
  // Atendimentos de venda paga com valor R$ 0 (ex.: sessao de pacote ja pago, retorno).
  semCobranca: number;
};

export type LinhaLista = {
  chave: string;
  data: string;
  cliente: string | null;
  procedimento: string;
  valor: number;
  grupo: GrupoOrigem;
  status: string;
};

export type PaginaLista = { linhas: LinhaLista[]; total: number; pagina: number; paginas: number };

const DATA_OK = /^\d{4}-\d{2}-\d{2}$/;

/** Hoje, no dia de Sao Paulo (yyyy-mm-dd). Fica aqui para as telas nao usarem Date.now(). */
export function hojeSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function primeiroDiaDoMes(dia: string): string {
  return `${dia.slice(0, 8)}01`;
}

export function dataValida(valor: string | undefined | null): valor is string {
  if (!valor || !DATA_OK.test(valor)) return false;
  const [a, m, d] = valor.split("-").map(Number);
  const teste = new Date(Date.UTC(a, m - 1, d));
  return teste.getUTCFullYear() === a && teste.getUTCMonth() === m - 1 && teste.getUTCDate() === d;
}

function limitesDoPeriodo(inicio: string, fim: string) {
  const de = new Date(`${inicio}T00:00:00-03:00`);
  const ate = new Date(`${fim}T00:00:00-03:00`);
  ate.setUTCDate(ate.getUTCDate() + 1); // fim inclusive
  return { de, ate };
}

/**
 * De onde a cliente veio. Google Ads quando: a venda/cliente esta ligada a uma
 * campanha do Google, a origem da cliente cita Google, ou algum contato dela
 * guardou o codigo de clique do Google (gclid).
 */
const GRUPO_SQL = Prisma.sql`
  CASE
    WHEN cm."canal" ILIKE '%google%'
      OR c."origem" ILIKE '%google%'
      OR EXISTS (
        SELECT 1 FROM "Lead" l
        WHERE l."clienteId" = c."id" AND l."gclid" IS NOT NULL AND l."gclid" <> ''
      ) THEN 'Google Ads'
    WHEN c."origem" ILIKE '%instagram%' OR cm."canal" ILIKE '%instagram%' THEN 'Instagram'
    WHEN c."origem" ILIKE '%indica%' THEN 'Indicação'
    WHEN c."origem" ILIKE '%espont%' THEN 'Espontâneo'
    WHEN c."origem" ILIKE '%retorno%' THEN 'Retorno'
    ELSE 'Outras / não informada'
  END`;

function filtroVendas(f: FiltroRelatorio) {
  const { de, ate } = limitesDoPeriodo(f.inicio, f.fim);
  return Prisma.sql`
    vi."procedimentoServicoId" IS NOT NULL
    AND (${f.procedimentoId}::int IS NULL OR vi."procedimentoServicoId" = ${f.procedimentoId}::int)
    AND v."situacao" = 'ATIVA'
    AND v."data" >= ${de} AND v."data" < ${ate}`;
}

function filtroAgenda(f: FiltroRelatorio) {
  const { de, ate } = limitesDoPeriodo(f.inicio, f.fim);
  return Prisma.sql`
    a."status" IN ('Agendado', 'Confirmado', 'Em atendimento')
    AND (${f.procedimentoNome}::text IS NULL OR a."procedimento" = ${f.procedimentoNome}::text)
    AND a."data" >= ${de} AND a."data" < ${ate}`;
}

const DE_VENDAS = Prisma.sql`
  FROM "VendaItem" vi
  JOIN "Venda" v ON v."id" = vi."vendaId"
  LEFT JOIN "Cliente" c ON c."id" = v."clienteId"
  LEFT JOIN "CampanhaMarketing" cm ON cm."id" = COALESCE(v."campanhaId", c."campanhaAquisicaoId")`;

const DE_AGENDA = Prisma.sql`
  FROM "Agendamento" a
  JOIN "Cliente" c ON c."id" = a."clienteId"
  LEFT JOIN "CampanhaMarketing" cm ON cm."id" = c."campanhaAquisicaoId"`;

type LinhaBruta = { grupo: string; quantidade: number; valor: number };

function organizar(linhas: LinhaBruta[]): LinhaOrigem[] {
  return GRUPOS_ORIGEM.map((grupo) => {
    const achada = linhas.find((l) => l.grupo === grupo);
    return { grupo, quantidade: achada?.quantidade ?? 0, valor: achada?.valor ?? 0 };
  });
}

export async function resumoPorProcedimento(f: FiltroRelatorio): Promise<ResumoRelatorio> {
  const [feitos, pendentes, agendados, gratis] = await Promise.all([
    prisma.$queryRaw<LinhaBruta[]>`
      SELECT ${GRUPO_SQL} AS "grupo",
             COALESCE(SUM(vi."quantidade"), 0)::int AS "quantidade",
             COALESCE(SUM(vi."valorTotal"), 0)::float8 AS "valor"
      ${DE_VENDAS}
      WHERE ${filtroVendas(f)} AND v."statusPagamento" = 'Pago' AND vi."valorTotal" > 0
      GROUP BY 1`,
    prisma.$queryRaw<LinhaBruta[]>`
      SELECT ${GRUPO_SQL} AS "grupo",
             COALESCE(SUM(vi."quantidade"), 0)::int AS "quantidade",
             COALESCE(SUM(vi."valorTotal"), 0)::float8 AS "valor"
      ${DE_VENDAS}
      WHERE ${filtroVendas(f)} AND v."statusPagamento" = 'Pendente' AND vi."valorTotal" > 0
      GROUP BY 1`,
    prisma.$queryRaw<LinhaBruta[]>`
      SELECT ${GRUPO_SQL} AS "grupo",
             COUNT(*)::int AS "quantidade",
             COALESCE(SUM(a."valor"), 0)::float8 AS "valor"
      ${DE_AGENDA}
      WHERE ${filtroAgenda(f)}
      GROUP BY 1`,
    prisma.$queryRaw<{ quantidade: number }[]>`
      SELECT COALESCE(SUM(vi."quantidade"), 0)::int AS "quantidade"
      ${DE_VENDAS}
      WHERE ${filtroVendas(f)} AND v."statusPagamento" = 'Pago' AND vi."valorTotal" <= 0`,
  ]);

  return { feitos: organizar(feitos), pendentes: organizar(pendentes), agendados: organizar(agendados),
    semCobranca: gratis[0]?.quantidade ?? 0,
  };
}

type LinhaListaBruta = {
  chave: string;
  data: Date;
  cliente: string | null;
  procedimento: string;
  valor: number;
  grupo: string;
  status: string;
  total: number;
};

/** Uma pagina (30) da lista de nomes. O total vem junto, na mesma consulta. */
export async function listaPorProcedimento(
  f: FiltroRelatorio,
  tipo: TipoLista,
  paginaPedida: number,
): Promise<PaginaLista> {
  const pagina = Math.max(1, Math.floor(paginaPedida) || 1);
  const deslocamento = (pagina - 1) * POR_PAGINA;

  const linhas =
    tipo === "agendados"
      ? await prisma.$queryRaw<LinhaListaBruta[]>`
          SELECT 'a' || a."id"::text AS "chave", a."data" AS "data", c."nome" AS "cliente",
                 a."procedimento" AS "procedimento", a."valor"::float8 AS "valor",
                 ${GRUPO_SQL} AS "grupo", a."status" AS "status",
                 (COUNT(*) OVER ())::int AS "total"
          ${DE_AGENDA}
          WHERE ${filtroAgenda(f)}
          ORDER BY a."data" ASC, a."id" ASC
          LIMIT ${POR_PAGINA} OFFSET ${deslocamento}`
      : await prisma.$queryRaw<LinhaListaBruta[]>`
          SELECT 'v' || vi."id"::text AS "chave", v."data" AS "data", c."nome" AS "cliente",
                 vi."descricao" AS "procedimento", vi."valorTotal"::float8 AS "valor",
                 ${GRUPO_SQL} AS "grupo", v."statusPagamento" AS "status",
                 (COUNT(*) OVER ())::int AS "total"
          ${DE_VENDAS}
          WHERE ${filtroVendas(f)}
            AND v."statusPagamento" = ${tipo === "pendentes" ? "Pendente" : "Pago"}
            AND ${tipo === "semcobranca" ? Prisma.sql`vi."valorTotal" <= 0` : Prisma.sql`vi."valorTotal" > 0`}
          ORDER BY v."data" DESC, vi."id" DESC
          LIMIT ${POR_PAGINA} OFFSET ${deslocamento}`;

  const total = linhas[0]?.total ?? 0;

  return {
    total,
    pagina,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    linhas: linhas.map((l) => ({
      chave: l.chave,
      data: l.data.toISOString(),
      cliente: l.cliente,
      procedimento: l.procedimento,
      valor: l.valor,
      grupo: l.grupo as GrupoOrigem,
      status: l.status,
    })),
  };
}
