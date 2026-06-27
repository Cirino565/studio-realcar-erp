"use server";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type NovoLancamento = {
  descricao: string;
  valor: number;
  tipo: string;
  categoria?: string;
  observacoes?: string;
  data: string;
  formaPagamento?: string;
  statusPagamento?: string;
  origem?: string;
  agendamentoId?: number;
  clienteId?: number;
};

export async function criarLancamento(
  dados: NovoLancamento
) {
  await requirePermission("financeiro.gerenciar");
  await prisma.lancamento.create({
    data: {
      descricao: dados.descricao,
      valor: dados.valor,
      tipo: dados.tipo,
      categoria: dados.categoria || null,
      observacoes: dados.observacoes || null,
      data: new Date(dados.data),
      formaPagamento: dados.formaPagamento || null,
      statusPagamento: dados.statusPagamento || "Pago",
      origem: dados.origem || "Manual",
      agendamentoId: dados.agendamentoId || null,
      clienteId: dados.clienteId || null,
    },
  });

  revalidatePath("/financeiro");
}

export async function excluirLancamento(
  id: number
) {
  await requirePermission("financeiro.gerenciar");
  await prisma.lancamento.delete({
    where: {
      id,
    },
  });

  revalidatePath("/financeiro");
}