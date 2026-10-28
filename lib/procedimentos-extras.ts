/**
 * Procedimentos extras de um agendamento (alem do principal).
 *
 * A Vivian marca, na mesma tela, mais de um procedimento no mesmo horario
 * (ex.: Botox + Limpeza de pele). O agendamento continua com UM procedimento
 * principal; os demais ficam guardados aqui. "valor" e "duracao" do
 * agendamento sao sempre o TOTAL da visita, entao a agenda, os conflitos de
 * horario e a previsao de receita continuam corretos sem mudar nada.
 *
 * Na hora de finalizar, os extras ja vem preenchidos no fechamento.
 */

export type ProcedimentoExtraAgenda = {
  servicoId: number | null;
  nome: string;
  valor: number;
  duracao: number; // minutos
};

const MAX_EXTRAS = 8;

function numeroSeguro(valor: unknown, padrao = 0) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : padrao;
}

/** Limpa uma lista vinda da tela ou do banco: sem nomes vazios, valores validos. */
export function normalizarProcedimentosExtras(entrada: unknown): ProcedimentoExtraAgenda[] {
  if (!Array.isArray(entrada)) return [];

  const lista: ProcedimentoExtraAgenda[] = [];

  for (const bruto of entrada) {
    if (!bruto || typeof bruto !== "object") continue;
    const item = bruto as Record<string, unknown>;
    const nome = String(item.nome ?? "").trim().slice(0, 160);
    if (!nome) continue;

    const servicoId = numeroSeguro(item.servicoId, 0);
    lista.push({
      servicoId: servicoId > 0 ? Math.trunc(servicoId) : null,
      nome,
      valor: Math.max(0, Math.round(numeroSeguro(item.valor) * 100) / 100),
      duracao: Math.min(720, Math.max(5, Math.trunc(numeroSeguro(item.duracao, 30)) || 30)),
    });

    if (lista.length >= MAX_EXTRAS) break;
  }

  return lista;
}

/** Texto guardado no banco (ou null quando nao ha extras). */
export function serializarProcedimentosExtras(entrada: unknown): string | null {
  const lista = normalizarProcedimentosExtras(entrada);
  return lista.length > 0 ? JSON.stringify(lista) : null;
}

/** Le o texto do banco. Nunca lanca erro: texto invalido vira lista vazia. */
export function lerProcedimentosExtras(texto: string | null | undefined): ProcedimentoExtraAgenda[] {
  if (!texto) return [];

  try {
    return normalizarProcedimentosExtras(JSON.parse(texto));
  } catch {
    return [];
  }
}

export function somaValorExtras(extras: ProcedimentoExtraAgenda[]) {
  return Math.round(extras.reduce((total, item) => total + item.valor, 0) * 100) / 100;
}

export function somaDuracaoExtras(extras: ProcedimentoExtraAgenda[]) {
  return extras.reduce((total, item) => total + item.duracao, 0);
}

/** "A + B + C" (principal primeiro). */
export function nomesComExtras(principal: string, extras: ProcedimentoExtraAgenda[]) {
  return [principal, ...extras.map((item) => item.nome)].filter(Boolean).join(" + ");
}

/** "A, B e C" - para mensagens ao cliente. */
export function nomesParaMensagem(principal: string, extras: ProcedimentoExtraAgenda[]) {
  const nomes = [principal, ...extras.map((item) => item.nome)].filter(Boolean);
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}
