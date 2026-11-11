import type { Prisma } from "@prisma/client";

import { CLIENTE_COM_CLIQUE_PAGO_DIRETO } from "@/lib/atribuicao-campanha";

/**
 * Grava "indicada por" numa cliente recem-criada (agenda ou cadastro).
 * Se quem indicou veio de anuncio e a cliente ainda nao tem campanha, ela
 * entra na mesma campanha (um nivel so). Nunca troca a origem informada.
 */
export async function aplicarIndicacaoNoTx(
  tx: Prisma.TransactionClient,
  clienteId: number,
  indicadaPorId: number | null | undefined,
) {
  const id = Math.trunc(Number(indicadaPorId));
  if (!id || id === clienteId) return;

  const [cliente, quemIndicou, indicadoraPaga] = await Promise.all([
    tx.cliente.findUnique({ where: { id: clienteId }, select: { campanhaAquisicaoId: true } }),
    tx.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        campanhaAquisicaoId: true,
        leads: {
          where: { campanhaId: { not: null } },
          select: { campanhaId: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    tx.cliente.count({ where: { id, ...CLIENTE_COM_CLIQUE_PAGO_DIRETO } }),
  ]);
  if (!cliente || !quemIndicou) return;

  const campanha = quemIndicou.campanhaAquisicaoId ?? quemIndicou.leads[0]?.campanhaId ?? null;
  await tx.cliente.update({
    where: { id: clienteId },
    data: {
      indicadaPorId: quemIndicou.id,
      ...(indicadoraPaga > 0 && campanha && !cliente.campanhaAquisicaoId
        ? { campanhaAquisicaoId: campanha }
        : {}),
    },
  });
}
