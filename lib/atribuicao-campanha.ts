import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Regra de atribuicao: so vira resultado de CAMPANHA PAGA quem teve um clique
 * pago de verdade - tem o codigo de clique do Google (gclid) OU a origem
 * detectada e "Google Ads".
 *
 * Quem apenas caiu na pagina da campanha por outro caminho (Direto, Organico,
 * Instagram, Perfil da Empresa...) continua ligado a pagina (nada e apagado) e
 * continua com a origem real, mas NAO soma nos clientes, leads e receita da
 * campanha. Se a pessoa tiver QUALQUER clique pago, vale o pago.
 */

export function origemEhGoogleAds(origem: string | null | undefined): boolean {
  return /google\s*ads/i.test(origem ?? "");
}

// Anuncio pago do Instagram (clique pro WhatsApp). "Instagram" sozinho
// continua sendo organico (perfil, stories, direct).
export const ORIGEM_INSTAGRAM_ADS = "Instagram Ads";

export function origemEhInstagramAds(origem: string | null | undefined): boolean {
  return /instagram\s*ads/i.test(origem ?? "");
}

/** Origem de anuncio pago: Google Ads ou Instagram Ads. */
export function origemEhAnuncioPago(origem: string | null | undefined): boolean {
  return origemEhGoogleAds(origem) || origemEhInstagramAds(origem);
}

export function leadTeveCliquePago(lead: {
  gclid?: string | null;
  origem?: string | null;
}): boolean {
  return Boolean(lead.gclid && lead.gclid.trim()) || origemEhAnuncioPago(lead.origem);
}

/** Filtro de banco: contato com clique pago. */
export const LEAD_COM_CLIQUE_PAGO: Prisma.LeadWhereInput = {
  OR: [
    { AND: [{ gclid: { not: null } }, { gclid: { not: "" } }] },
    { origem: { contains: "google ads", mode: "insensitive" } },
    { origem: { contains: "instagram ads", mode: "insensitive" } },
  ],
};

/** Filtro de banco: cliente com clique pago dela mesma (no contato ou na origem). */
export const CLIENTE_COM_CLIQUE_PAGO_DIRETO: Prisma.ClienteWhereInput = {
  OR: [
    { origem: { contains: "google ads", mode: "insensitive" } },
    { origem: { contains: "instagram ads", mode: "insensitive" } },
    { leads: { some: LEAD_COM_CLIQUE_PAGO } },
  ],
};

/**
 * Filtro de banco: cliente que conta como resultado de anuncio - clique pago
 * dela mesma OU indicada por uma cliente que teve clique pago (um nivel so).
 */
export const CLIENTE_COM_CLIQUE_PAGO: Prisma.ClienteWhereInput = {
  OR: [
    CLIENTE_COM_CLIQUE_PAGO_DIRETO,
    { indicadaPor: { is: CLIENTE_COM_CLIQUE_PAGO_DIRETO } },
  ],
};

/**
 * Ids dos clientes com clique pago (inclui as indicadas por cliente de
 * anuncio). A conta e feita no banco e so os ids voltam.
 */
export async function buscarIdsClientesComCliquePago(): Promise<Set<number>> {
  return (await buscarAtribuicaoPaga()).todos;
}

/** Clique pago separado: todos que contam e quais contam so por indicacao. */
export async function buscarAtribuicaoPaga(): Promise<{ todos: Set<number>; porIndicacao: Set<number> }> {
  const [diretos, indicadas] = await Promise.all([
    prisma.cliente.findMany({ where: CLIENTE_COM_CLIQUE_PAGO_DIRETO, select: { id: true } }),
    prisma.cliente.findMany({
      where: { indicadaPorId: { not: null }, indicadaPor: { is: CLIENTE_COM_CLIQUE_PAGO_DIRETO } },
      select: { id: true },
    }),
  ]);
  const todos = new Set(diretos.map((cliente) => cliente.id));
  const porIndicacao = new Set<number>();
  for (const cliente of indicadas) {
    if (!todos.has(cliente.id)) porIndicacao.add(cliente.id);
  }
  for (const id of porIndicacao) todos.add(id);
  return { todos, porIndicacao };
}

/**
 * Venda ou entrada sem cliente (ligada a campanha a mao) nao tem como ser
 * julgada: continua valendo, como antes.
 */
export function movimentoEhDeCliquePago(
  clienteId: number | null | undefined,
  idsPagos: Set<number>,
): boolean {
  return clienteId == null ? true : idsPagos.has(clienteId);
}
