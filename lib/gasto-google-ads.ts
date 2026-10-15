import { prisma } from "@/lib/prisma";

/**
 * Gasto diario do Google Ads.
 *
 * Um script agendado DENTRO do Google Ads manda, todo dia, quanto cada
 * campanha gastou em cada um dos ultimos dias. Aqui o sistema:
 *  1) guarda o que chegou (GastoGoogleAdsDia), sem duplicar o mesmo dia;
 *  2) para cada campanha do sistema ligada a uma campanha do Google, lanca no
 *     Financeiro UMA saida paga por dia, na data certa, a partir do dia
 *     escolhido ("gastoAutomaticoDesde"). Se o Google corrigir um dia, o mesmo
 *     lancamento e atualizado (chave unica por campanha + dia).
 *
 * Os blocos manuais antigos (varios dias num lancamento so) podem ser
 * substituidos pelo gasto de cada dia SEM mudar o saldo: o mesmo total lancado
 * a mao e redistribuido pelos dias, na proporcao do que o Google mostra.
 */

export const ORIGEM_GASTO_AUTOMATICO = "Google Ads (automático)";
export const ORIGEM_GASTO_AJUSTE = "Google Ads (ajuste dos blocos)";
const FUSO = "America/Sao_Paulo";
const MAXIMO_LINHAS = 20000;

export type LinhaGastoRecebida = {
  googleCampanhaId: string;
  campanha: string;
  data: string;
  custo: number;
};

/* ------------------------------------------------------------------ datas */

export function diaValido(valor: unknown): valor is string {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  );
}

export function somarDias(dia: string, quantidade: number): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, d + quantidade));
  return data.toISOString().slice(0, 10);
}

/** Dia de hoje (ou da data informada) no horario de Brasilia, "2026-10-15". */
export function diaDe(data: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

/** Meio-dia do dia em Brasilia: o mesmo horario usado no "Lancar custo". */
export function dataDoDia(dia: string): Date {
  return new Date(`${dia}T12:00:00-03:00`);
}

export function diaFormatado(dia: string): string {
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

export function diasEntre(inicio: string, fim: string): string[] {
  const dias: string[] = [];
  let atual = inicio;
  while (atual <= fim && dias.length < 1000) {
    dias.push(atual);
    atual = somarDias(atual, 1);
  }
  return dias;
}

/**
 * Divide um total (em reais) em partes proporcionais aos pesos, em centavos,
 * de forma que a soma das partes seja EXATAMENTE o total. Sem pesos validos,
 * divide por igual.
 */
export function distribuirValor(total: number, pesos: number[]): number[] {
  if (pesos.length === 0) return [];
  const totalCentavos = Math.round(total * 100);
  const somaPesos = pesos.reduce((soma, peso) => soma + Math.max(0, peso), 0);
  const base = somaPesos > 0 ? pesos.map((peso) => Math.max(0, peso)) : pesos.map(() => 1);
  const somaBase = somaPesos > 0 ? somaPesos : pesos.length;

  const exatos = base.map((peso) => (totalCentavos * peso) / somaBase);
  const partes = exatos.map((valor) => Math.floor(valor));
  let sobra = totalCentavos - partes.reduce((soma, valor) => soma + valor, 0);

  // Os centavos que sobraram vao para quem tinha a maior fracao.
  const ordem = exatos
    .map((valor, indice) => ({ indice, fracao: valor - Math.floor(valor) }))
    .sort((a, b) => b.fracao - a.fracao || a.indice - b.indice);
  for (let i = 0; sobra > 0 && i < ordem.length; i += 1, sobra -= 1) {
    partes[ordem[i].indice] += 1;
  }

  return partes.map((centavos) => centavos / 100);
}

/* --------------------------------------------------------------- recebimento */

/** Confere e limpa o que o script do Google Ads mandou. */
export function normalizarLinhasRecebidas(corpo: unknown): {
  linhas: LinhaGastoRecebida[];
  ignoradas: number;
} {
  const lista =
    corpo && typeof corpo === "object" && Array.isArray((corpo as { linhas?: unknown }).linhas)
      ? ((corpo as { linhas: unknown[] }).linhas)
      : [];

  const porChave = new Map<string, LinhaGastoRecebida>();
  let ignoradas = 0;

  for (const item of lista.slice(0, MAXIMO_LINHAS)) {
    const linha = item as Record<string, unknown>;
    const googleCampanhaId = String(linha?.googleCampanhaId ?? "").trim();
    const campanha = String(linha?.campanha ?? "").trim().slice(0, 200);
    const data = String(linha?.data ?? "").trim();
    const custo = Number(linha?.custo);

    if (!/^\d{1,20}$/.test(googleCampanhaId) || !diaValido(data) || !Number.isFinite(custo) || custo < 0) {
      ignoradas += 1;
      continue;
    }

    // Se o mesmo dia vier repetido, soma (pode acontecer se o Google separar linhas).
    const chave = `${googleCampanhaId}:${data}`;
    const existente = porChave.get(chave);
    if (existente) {
      existente.custo = Math.round((existente.custo + custo) * 100) / 100;
    } else {
      porChave.set(chave, {
        googleCampanhaId,
        campanha: campanha || `Campanha ${googleCampanhaId}`,
        data,
        custo: Math.round(custo * 100) / 100,
      });
    }
  }

  ignoradas += Math.max(0, lista.length - MAXIMO_LINHAS);
  return { linhas: Array.from(porChave.values()), ignoradas };
}

/** Guarda os dias recebidos (atualiza o dia se ja existia). */
export async function salvarGastosRecebidos(linhas: LinhaGastoRecebida[]) {
  const TAMANHO_LOTE = 200;
  for (let i = 0; i < linhas.length; i += TAMANHO_LOTE) {
    const lote = linhas.slice(i, i + TAMANHO_LOTE);
    await prisma.$transaction(
      lote.map((linha) =>
        prisma.gastoGoogleAdsDia.upsert({
          where: {
            googleCampanhaId_data: { googleCampanhaId: linha.googleCampanhaId, data: linha.data },
          },
          create: {
            googleCampanhaId: linha.googleCampanhaId,
            campanhaNome: linha.campanha,
            data: linha.data,
            custo: linha.custo,
          },
          update: { campanhaNome: linha.campanha, custo: linha.custo },
        }),
      ),
    );
  }
  return linhas.length;
}

/* ------------------------------------------------------------ lancamentos */

async function contaPrincipalId() {
  const conta = await prisma.contaFinanceira.findFirst({
    where: { principal: true, status: "Ativa" },
    select: { id: true },
  });
  return conta?.id ?? null;
}

export type ResultadoAplicacao = {
  criados: number;
  atualizados: number;
  removidos: number;
  semConta: boolean;
};

/**
 * Lanca (ou atualiza) uma saida paga por dia para cada campanha ligada ao
 * Google Ads, a partir do dia escolhido. Nunca duplica o mesmo dia.
 * Um lancamento que alguem cancelou no Financeiro continua cancelado.
 */
export async function aplicarGastoAutomatico(somenteCampanhaId?: number): Promise<ResultadoAplicacao> {
  const resultado: ResultadoAplicacao = { criados: 0, atualizados: 0, removidos: 0, semConta: false };

  const campanhas = await prisma.campanhaMarketing.findMany({
    where: {
      googleAdsCampanhaId: { not: null },
      gastoAutomaticoDesde: { not: null },
      ...(somenteCampanhaId ? { id: somenteCampanhaId } : {}),
    },
    select: { id: true, nome: true, googleAdsCampanhaId: true, gastoAutomaticoDesde: true },
  });

  if (campanhas.length === 0) return resultado;

  const contaId = await contaPrincipalId();
  if (!contaId) {
    resultado.semConta = true;
    return resultado;
  }

  for (const campanha of campanhas) {
    const desde = campanha.gastoAutomaticoDesde;
    if (!campanha.googleAdsCampanhaId || !diaValido(desde)) continue;

    const prefixo = `gads:${campanha.id}:`;
    const [dias, existentes] = await Promise.all([
      prisma.gastoGoogleAdsDia.findMany({
        where: { googleCampanhaId: campanha.googleAdsCampanhaId, data: { gte: desde } },
        select: { data: true, custo: true },
      }),
      prisma.lancamento.findMany({
        where: { chaveGasto: { startsWith: prefixo } },
        select: { id: true, chaveGasto: true, valor: true, statusPagamento: true, descricao: true },
      }),
    ]);

    const porChave = new Map(existentes.map((item) => [item.chaveGasto as string, item]));

    // Se a data de inicio foi mudada para mais tarde, tira os automaticos de antes.
    for (const item of existentes) {
      const dia = (item.chaveGasto as string).slice(prefixo.length);
      if (dia < desde) {
        await prisma.lancamento.delete({ where: { id: item.id } });
        porChave.delete(item.chaveGasto as string);
        resultado.removidos += 1;
      }
    }

    for (const dia of dias) {
      const chave = `${prefixo}${dia.data}`;
      const existente = porChave.get(chave);
      const valor = Math.round(dia.custo * 100) / 100;
      const descricao = `Google Ads · ${campanha.nome} · ${diaFormatado(dia.data)}`;

      if (valor <= 0) {
        if (existente && existente.statusPagamento !== "Cancelado") {
          await prisma.lancamento.delete({ where: { id: existente.id } });
          resultado.removidos += 1;
        }
        continue;
      }

      if (existente) {
        if (existente.statusPagamento === "Cancelado") continue;
        if (existente.valor !== valor || existente.descricao !== descricao) {
          await prisma.lancamento.update({
            where: { id: existente.id },
            data: { valor, valorLiquido: valor, descricao },
          });
          resultado.atualizados += 1;
        }
        continue;
      }

      await prisma.lancamento.create({
        data: {
          descricao,
          valor,
          valorLiquido: valor,
          tipo: "SAIDA",
          categoria: "Marketing",
          data: dataDoDia(dia.data),
          statusPagamento: "Pago",
          origem: ORIGEM_GASTO_AUTOMATICO,
          campanhaId: campanha.id,
          contaFinanceiraId: contaId,
          chaveGasto: chave,
          observacoes: "Gasto do dia enviado pelo Google Ads (lançado automaticamente).",
        },
      });
      resultado.criados += 1;
    }
  }

  return resultado;
}

/* ------------------------------------------- substituir os blocos manuais */

export type BlocoManual = {
  id: number;
  data: string;
  descricao: string;
  valor: number;
  contaFinanceiraId: number | null;
};

export type PreviaSubstituicao = {
  campanhaId: number;
  campanhaNome: string;
  inicio: string;
  fim: string;
  blocos: BlocoManual[];
  totalBlocos: number;
  totalGoogle: number;
  diasComGasto: number;
};

/**
 * Lancamentos manuais (blocos) de gasto da campanha ANTES do inicio do
 * automatico: saida paga, ligada a campanha, que nao foi lancada sozinha.
 */
async function buscarBlocosManuais(campanhaId: number, antesDe: string) {
  const blocos = await prisma.lancamento.findMany({
    where: {
      campanhaId,
      tipo: "SAIDA",
      statusPagamento: "Pago",
      chaveGasto: null,
      venda: { is: null },
      data: { lt: new Date(`${antesDe}T00:00:00-03:00`) },
    },
    orderBy: [{ data: "asc" }, { id: "asc" }],
    select: { id: true, data: true, descricao: true, valor: true, contaFinanceiraId: true, observacoes: true },
  });
  return blocos;
}

export async function montarPreviaSubstituicao(campanhaId: number): Promise<PreviaSubstituicao> {
  const campanha = await prisma.campanhaMarketing.findUnique({
    where: { id: campanhaId },
    select: { id: true, nome: true, googleAdsCampanhaId: true, gastoAutomaticoDesde: true },
  });
  if (!campanha) throw new Error("Campanha não encontrada.");
  if (!campanha.googleAdsCampanhaId || !diaValido(campanha.gastoAutomaticoDesde)) {
    throw new Error("Ligue esta campanha ao Google Ads e escolha o dia de início antes.");
  }

  const desde = campanha.gastoAutomaticoDesde;
  const fim = somarDias(desde, -1);
  const blocos = await buscarBlocosManuais(campanha.id, desde);

  const primeiroGoogle = await prisma.gastoGoogleAdsDia.findFirst({
    where: { googleCampanhaId: campanha.googleAdsCampanhaId, data: { lte: fim }, custo: { gt: 0 } },
    orderBy: { data: "asc" },
    select: { data: true },
  });
  const primeiroBloco = blocos[0] ? diaDe(blocos[0].data) : null;
  const candidatos = [primeiroGoogle?.data, primeiroBloco].filter(
    (dia): dia is string => Boolean(dia),
  );
  const inicio = candidatos.length > 0 ? candidatos.sort()[0] : fim;

  const diasGoogle = await prisma.gastoGoogleAdsDia.findMany({
    where: {
      googleCampanhaId: campanha.googleAdsCampanhaId,
      data: { gte: inicio, lte: fim },
      custo: { gt: 0 },
    },
    select: { data: true, custo: true },
  });

  return {
    campanhaId: campanha.id,
    campanhaNome: campanha.nome,
    inicio,
    fim,
    blocos: blocos.map((bloco) => ({
      id: bloco.id,
      data: diaDe(bloco.data),
      descricao: bloco.descricao,
      valor: bloco.valor,
      contaFinanceiraId: bloco.contaFinanceiraId,
    })),
    totalBlocos: Math.round(blocos.reduce((soma, bloco) => soma + bloco.valor, 0) * 100) / 100,
    totalGoogle: Math.round(diasGoogle.reduce((soma, dia) => soma + dia.custo, 0) * 100) / 100,
    diasComGasto: diasGoogle.length,
  };
}

/**
 * Troca os blocos manuais por lancamentos de cada dia com o MESMO total (por
 * conta financeira), espalhado na proporcao do gasto real de cada dia. Os
 * blocos ficam guardados como "Cancelado" (nao contam mais), com o motivo.
 * Resultado: o saldo de cada conta continua exatamente igual.
 */
export async function substituirBlocosManuais(campanhaId: number, usuario: string) {
  const previa = await montarPreviaSubstituicao(campanhaId);
  if (previa.blocos.length === 0) {
    return { substituidos: 0, criados: 0, total: 0 };
  }

  const campanha = await prisma.campanhaMarketing.findUnique({
    where: { id: campanhaId },
    select: { googleAdsCampanhaId: true },
  });

  const diasGoogle = await prisma.gastoGoogleAdsDia.findMany({
    where: {
      googleCampanhaId: campanha?.googleAdsCampanhaId ?? "",
      data: { gte: previa.inicio, lte: previa.fim },
      custo: { gt: 0 },
    },
    orderBy: { data: "asc" },
    select: { data: true, custo: true },
  });

  // Sem gasto do Google nesse periodo: divide por igual entre os dias.
  const dias = diasGoogle.length > 0 ? diasGoogle.map((dia) => dia.data) : diasEntre(previa.inicio, previa.fim);
  const pesos = diasGoogle.length > 0 ? diasGoogle.map((dia) => dia.custo) : dias.map(() => 1);

  const porConta = new Map<number | null, BlocoManual[]>();
  for (const bloco of previa.blocos) {
    const lista = porConta.get(bloco.contaFinanceiraId) ?? [];
    lista.push(bloco);
    porConta.set(bloco.contaFinanceiraId, lista);
  }

  const hoje = diaFormatado(diaDe());
  const idsCriados: number[] = [];

  await prisma.$transaction(
    async (tx) => {
      for (const [contaId, blocosDaConta] of porConta) {
        const totalConta = blocosDaConta.reduce((soma, bloco) => soma + bloco.valor, 0);
        const partes = distribuirValor(totalConta, pesos);

        for (let i = 0; i < dias.length; i += 1) {
          const valor = partes[i];
          if (valor <= 0) continue;
          const chave = `gads-ajuste:${previa.campanhaId}:${dias[i]}:${contaId ?? 0}`;

          const existente = await tx.lancamento.findUnique({
            where: { chaveGasto: chave },
            select: { id: true, valor: true },
          });

          if (existente) {
            const novoValor = Math.round((existente.valor + valor) * 100) / 100;
            await tx.lancamento.update({
              where: { id: existente.id },
              data: { valor: novoValor, valorLiquido: novoValor },
            });
            idsCriados.push(existente.id);
            continue;
          }

          const criado = await tx.lancamento.create({
            data: {
              descricao: `Google Ads · ${previa.campanhaNome} · ${diaFormatado(dias[i])}`,
              valor,
              valorLiquido: valor,
              tipo: "SAIDA",
              categoria: "Marketing",
              data: dataDoDia(dias[i]),
              statusPagamento: "Pago",
              origem: ORIGEM_GASTO_AJUSTE,
              campanhaId: previa.campanhaId,
              contaFinanceiraId: contaId,
              chaveGasto: chave,
              observacoes:
                "Parte dos lançamentos manuais antigos desta campanha, redistribuída pelo gasto real de cada dia (o total continua o mesmo).",
            },
            select: { id: true },
          });
          idsCriados.push(criado.id);
        }

        for (const bloco of blocosDaConta) {
          const atual = await tx.lancamento.findUnique({
            where: { id: bloco.id },
            select: { observacoes: true, statusPagamento: true },
          });
          if (!atual || atual.statusPagamento !== "Pago") {
            throw new Error("Algum lançamento mudou enquanto a troca era feita. Abra a tela de novo e tente outra vez.");
          }
          await tx.lancamento.update({
            where: { id: bloco.id },
            data: {
              statusPagamento: "Cancelado",
              observacoes: [
                atual.observacoes?.trim(),
                `[Substituído em ${hoje} pelo gasto de cada dia do Google Ads (mesmo total, redistribuído por dia).]`,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          });
        }
      }

      await tx.auditoria.create({
        data: {
          modulo: "Marketing",
          acao: "Substituiu blocos de custo pelo gasto diário",
          entidade: "CampanhaMarketing",
          entidadeId: String(previa.campanhaId),
          usuario,
          detalhes: JSON.stringify({
            campanha: previa.campanhaNome,
            periodo: [previa.inicio, previa.fim],
            total: previa.totalBlocos,
            blocosCancelados: previa.blocos.map((bloco) => bloco.id),
            lancamentosDiarios: Array.from(new Set(idsCriados)),
          }),
        },
      });
    },
    { timeout: 60000, maxWait: 15000 },
  );

  return {
    substituidos: previa.blocos.length,
    criados: new Set(idsCriados).size,
    total: previa.totalBlocos,
  };
}
