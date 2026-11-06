"use server";

import { revalidatePath } from "next/cache";

import { CLIENTE_COM_CLIQUE_PAGO_DIRETO } from "@/lib/atribuicao-campanha";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * "Indicada por": a cliente que trouxe esta cliente. Se quem indicou veio de
 * anuncio (clique pago), a indicada entra na mesma campanha e o que ela
 * gastar conta no resultado da campanha (um nivel so). A origem continua
 * "Indicacao".
 */

export async function buscarClientesParaIndicacao(termo: string, ignorarId: number) {
  await requirePermission("clientes.visualizar");
  const texto = termo.trim();
  if (texto.length < 2) return [];
  const digitos = texto.replace(/\D/g, "");

  const clientes = await prisma.cliente.findMany({
    where: {
      id: { not: ignorarId },
      OR: [
        { nome: { contains: texto, mode: "insensitive" } },
        ...(digitos.length >= 4 ? [{ telefone: { contains: digitos.slice(-8) } }] : []),
      ],
    },
    select: { id: true, nome: true, telefone: true },
    orderBy: { nome: "asc" },
    take: 8,
  });
  return clientes;
}

export async function definirIndicacaoCliente(clienteId: number, indicadaPorId: number | null) {
  const usuario = await requirePermission("clientes.gerenciar");

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true, nome: true, origem: true, campanhaAquisicaoId: true, indicadaPorId: true },
  });
  if (!cliente) return { ok: false as const, erro: "Cliente não encontrada." };

  if (indicadaPorId === null) {
    await prisma.cliente.update({ where: { id: clienteId }, data: { indicadaPorId: null } });
    await prisma.auditoria.create({
      data: {
        modulo: "Clientes",
        acao: "Removeu indicação",
        entidade: "Cliente",
        entidadeId: String(clienteId),
        usuario: usuario.email,
        detalhes: cliente.nome,
      },
    });
    revalidatePath(`/clientes/${clienteId}`);
    revalidatePath("/marketing");
    return { ok: true as const, mensagem: "Indicação removida." };
  }

  if (indicadaPorId === clienteId) {
    return { ok: false as const, erro: "A cliente não pode indicar ela mesma." };
  }

  const quemIndicou = await prisma.cliente.findUnique({
    where: { id: indicadaPorId },
    select: {
      id: true,
      nome: true,
      campanhaAquisicaoId: true,
      leads: {
        where: { campanhaId: { not: null } },
        select: { campanhaId: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!quemIndicou) return { ok: false as const, erro: "Cliente que indicou não encontrada." };

  const indicadoraPaga =
    (await prisma.cliente.count({ where: { id: quemIndicou.id, ...CLIENTE_COM_CLIQUE_PAGO_DIRETO } })) > 0;
  const campanhaDaIndicadora = quemIndicou.campanhaAquisicaoId ?? quemIndicou.leads[0]?.campanhaId ?? null;
  // So herda a campanha se quem indicou veio de anuncio e esta cliente ainda
  // nao tem campanha propria.
  const herdarCampanha = indicadoraPaga && campanhaDaIndicadora && !cliente.campanhaAquisicaoId;

  await prisma.$transaction(async (tx) => {
    await tx.cliente.update({
      where: { id: clienteId },
      data: {
        indicadaPorId: quemIndicou.id,
        ...(cliente.origem?.trim() ? {} : { origem: "Indicação" }),
        ...(herdarCampanha ? { campanhaAquisicaoId: campanhaDaIndicadora } : {}),
      },
    });
    if (herdarCampanha) {
      // O que ela ja gastou (sem campanha) passa a contar na campanha.
      await tx.venda.updateMany({
        where: { clienteId, campanhaId: null },
        data: { campanhaId: campanhaDaIndicadora },
      });
      await tx.lancamento.updateMany({
        where: { clienteId, tipo: "ENTRADA", campanhaId: null },
        data: { campanhaId: campanhaDaIndicadora },
      });
    }
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Clientes",
      acao: "Registrou indicação",
      entidade: "Cliente",
      entidadeId: String(clienteId),
      usuario: usuario.email,
      detalhes: `${cliente.nome} indicada por ${quemIndicou.nome}${herdarCampanha ? " (entrou na campanha de quem indicou)" : ""}`,
    },
  });

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath(`/clientes/${quemIndicou.id}`);
  revalidatePath("/marketing");
  revalidatePath("/painel-dono");

  return {
    ok: true as const,
    mensagem: herdarCampanha
      ? `Indicada por ${quemIndicou.nome}. Como ${quemIndicou.nome} veio de anúncio, o que ${cliente.nome} gastar conta na mesma campanha.`
      : indicadoraPaga
        ? `Indicada por ${quemIndicou.nome}.`
        : `Indicada por ${quemIndicou.nome}. ${quemIndicou.nome} não veio de anúncio, então não conta em campanha.`,
  };
}
