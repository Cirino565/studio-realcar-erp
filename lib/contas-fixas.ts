import { prisma } from "@/lib/prisma";

/**
 * Contas fixas: cadastradas uma vez, o sistema lanca sozinho todo mes como
 * "a pagar" (Pendente). A conta a pagar NAO entra no saldo ate ser paga.
 *
 * Nao precisa de robo: as contas do mes sao criadas quando alguem abre o
 * Financeiro. Cada conta tem no maximo UM lancamento por mes (chave unica
 * conta + mes no banco), entao nunca duplica.
 */

export const ORIGEM_CONTA_FIXA = "Conta fixa";
const FUSO = "America/Sao_Paulo";
// Se o Financeiro ficar muito tempo sem ser aberto, recupera no maximo 12 meses.
const MAXIMO_MESES_ATRASADOS = 12;

/** Mes de hoje (Brasilia) no formato "2026-10". */
export function competenciaAtual(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
  })
    .format(agora)
    .slice(0, 7);
}

export function proximaCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes, 1));
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function competenciaValida(valor: string | null | undefined): valor is string {
  return Boolean(valor && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor));
}

/** Dia de vencimento naquele mes (31 em fevereiro vira o ultimo dia). */
export function vencimentoNaCompetencia(competencia: string, diaVencimento: number): Date {
  const [ano, mes] = competencia.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const dia = Math.min(Math.max(1, Math.trunc(diaVencimento) || 1), ultimoDia);
  return new Date(`${competencia}-${String(dia).padStart(2, "0")}T12:00:00-03:00`);
}

function mesesEntre(de: string, ate: string): string[] {
  const lista: string[] = [];
  let atual = de;
  while (atual <= ate && lista.length < 240) {
    lista.push(atual);
    atual = proximaCompetencia(atual);
  }
  return lista.slice(-MAXIMO_MESES_ATRASADOS);
}

/**
 * Cria os lancamentos "a pagar" que faltam (do mes de inicio de cada conta
 * ativa ate o mes atual). Leve: so grava o que falta. Nunca derruba a tela.
 */
export async function gerarContasFixasPendentes(agora: Date = new Date()): Promise<number> {
  try {
    const ate = competenciaAtual(agora);
    const contas = await prisma.contaFixa.findMany({
      where: { status: "Ativa", inicioCompetencia: { lte: ate } },
    });
    if (contas.length === 0) return 0;

    const existentes = await prisma.lancamento.findMany({
      where: { contaFixaId: { in: contas.map((conta) => conta.id) } },
      select: { contaFixaId: true, competencia: true },
    });
    const jaTem = new Set(existentes.map((item) => `${item.contaFixaId}|${item.competencia}`));

    const novos = contas.flatMap((conta) =>
      mesesEntre(conta.inicioCompetencia, ate)
        .filter((competencia) => !jaTem.has(`${conta.id}|${competencia}`))
        .map((competencia) => {
          const vencimento = vencimentoNaCompetencia(competencia, conta.diaVencimento);
          return {
            descricao: conta.nome,
            valor: conta.valor,
            valorLiquido: conta.valor,
            tipo: "SAIDA",
            categoria: conta.categoria,
            observacoes: conta.valorVariavel
              ? "Conta fixa com valor estimado - confira o valor ao pagar."
              : null,
            data: vencimento,
            vencimento,
            competencia,
            contaFixaId: conta.id,
            formaPagamento: conta.formaPagamento,
            contaFinanceiraId: conta.contaFinanceiraId,
            statusPagamento: "Pendente",
            origem: ORIGEM_CONTA_FIXA,
          };
        }),
    );

    if (novos.length === 0) return 0;

    const criados = await prisma.lancamento.createMany({ data: novos, skipDuplicates: true });
    return criados.count;
  } catch (erro) {
    console.error("Falha ao gerar contas fixas do mes", erro);
    return 0;
  }
}
