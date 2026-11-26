"use server";

import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIA_AVALIACAO_GOOGLE } from "@/lib/avaliacao-google";

/**
 * "Ja pedi": registra que a cliente recebeu o pedido de avaliacao no Google.
 * Uma vez por cliente (ela some da lista e nao entra de novo).
 */
export async function marcarAvaliacaoPedida(dados: { clienteId: number; agendamentoId?: number | null }) {
  const usuario = await requireCurrentUser();
  const clienteId = Number(dados.clienteId);
  if (!Number.isInteger(clienteId) || clienteId <= 0) return { ok: false as const };

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: {
      nome: true,
      whatsapp: true,
      telefone: true,
      comunicacoes: { where: { categoria: CATEGORIA_AVALIACAO_GOOGLE }, select: { id: true }, take: 1 },
    },
  });
  if (!cliente) return { ok: false as const };
  if (cliente.comunicacoes.length > 0) return { ok: true as const };

  const agora = new Date();
  await prisma.comunicacaoRegistro.create({
    data: {
      clienteId,
      agendamentoId: dados.agendamentoId ? Number(dados.agendamentoId) : null,
      destinatarioNome: cliente.nome,
      telefone: cliente.whatsapp || cliente.telefone || null,
      categoria: CATEGORIA_AVALIACAO_GOOGLE,
      canal: "WhatsApp",
      mensagem: "Pedido de avaliação no Google (marcado como já pedido no Dashboard).",
      status: "Enviada",
      usuario: usuario.email,
      abertoEm: agora,
      enviadoEm: agora,
    },
  });
  return { ok: true as const };
}
