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

export function leadTeveCliquePago(lead: {
  gclid?: string | null;
  origem?: string | null;
}): boolean {
  return Boolean(lead.gclid && lead.gclid.trim()) || origemEhGoogleAds(lead.origem);
}

/** Filtro de banco: contato com clique pago. */
export const LEAD_COM_CLIQUE_PAGO: Prisma.LeadWhereInput = {
  OR: [
    { AND: [{ gclid: { not: null } }, { gclid: { not: "" } }] },
    { origem: { contains: "google ads", mode: "insensitive" } },
  ],
};

/** Filtro de banco: cliente com algum clique pago (no contato ou na origem). */
export const CLIENTE_COM_CLIQUE_PAGO: Prisma.ClienteWhereInput = {
  OR: [
    { origem: { contains: "google ads", mode: "insensitive" } },
    { leads: { some: LEAD_COM_CLIQUE_PAGO } },
  ],
};

/**
 * Ids dos clientes com clique pago. A conta e feita no banco (com indices em
 * gclid/origem) e so os ids voltam.
 */
export async function buscarIdsClientesComCliquePago(): Promise<Set<number>> {
  const clientes = await prisma.cliente.findMany({
    where: CLIENTE_COM_CLIQUE_PAGO,
    select: { id: true },
  });
  return new Set(clientes.map((cliente) => cliente.id));
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
