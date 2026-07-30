"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

function revalidarFinanceiro(clienteId?: number | null) {
  revalidatePath("/financeiro");
  revalidatePath("/gestao");
  revalidatePath("/vendas");
  revalidatePath("/");

  if (clienteId) {
    revalidatePath(`/clientes/${clienteId}`);
    revalidatePath("/clientes");
  }
}

export async function criarLancamento(dados: NovoLancamento) {
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

  revalidarFinanceiro(dados.clienteId);
}

export async function marcarLancamentoPago(
  id: number,
  formaPagamento?: string,
) {
  const usuario = await requirePermission("financeiro.gerenciar");

  const existente = await prisma.lancamento.findUnique({
    where: { id },
    include: {
      venda: {
        select: {
          id: true,
          totalServicos: true,
          totalProdutos: true,
          situacao: true,
        },
      },
    },
  });

  if (!existente) {
    return { ok: false, mensagem: "Lançamento não encontrado." };
  }

  if (existente.tipo !== "ENTRADA") {
    return {
      ok: false,
      mensagem: "Somente entradas pendentes podem ser marcadas como pagas.",
    };
  }

  if (
    existente.statusPagamento.toLowerCase() === "cancelado" ||
    existente.venda?.situacao === "CANCELADA"
  ) {
    return {
      ok: false,
      mensagem: "Este lançamento pertence a uma venda cancelada e não pode ser marcado como pago.",
    };
  }

  if (existente.statusPagamento.toLowerCase() === "pago") {
    return { ok: true, mensagem: "Este lançamento já está pago." };
  }

  const agora = new Date();
  const forma = formaPagamento?.trim() || existente.formaPagamento || null;

  await prisma.$transaction(async (tx) => {
    let categoria = existente.categoria;

    if (existente.venda) {
      if (
        existente.venda.totalServicos > 0 &&
        existente.venda.totalProdutos > 0
      ) {
        categoria = "Vendas mistas";
      } else if (existente.venda.totalProdutos > 0) {
        categoria = "Produtos";
      } else if (existente.venda.totalServicos > 0) {
        categoria = "Procedimentos";
      }
    }

    if (existente.venda) {
      const vendaAtualizada = await tx.venda.updateMany({
        where: {
          id: existente.venda.id,
          situacao: { not: "CANCELADA" },
        },
        data: {
          statusPagamento: "Pago",
          formaPagamento: forma,
        },
      });

      if (vendaAtualizada.count !== 1) {
        throw new Error(
          "A venda vinculada foi cancelada ou alterada por outro usuário.",
        );
      }
    }

    const lancamentoAtualizado = await tx.lancamento.updateMany({
      where: {
        id,
        statusPagamento: { not: "Cancelado" },
      },
      data: {
        statusPagamento: "Pago",
        formaPagamento: forma,
        categoria,
        // Para caixa realizado, a data financeira passa a ser a data do recebimento.
        // A data original da venda permanece preservada em Venda.data.
        data: agora,
      },
    });

    if (lancamentoAtualizado.count !== 1) {
      throw new Error(
        "O lançamento foi cancelado ou alterado por outro usuário.",
      );
    }

    await tx.auditoria.create({
      data: {
        modulo: "Financeiro",
        acao: "Marcou lançamento como pago",
        entidade: "Lancamento",
        entidadeId: String(id),
        usuario: usuario.email,
        detalhes: `Recebimento de R$ ${existente.valor.toFixed(2)}${forma ? ` via ${forma}` : ""}.`,
      },
    });
  });

  revalidarFinanceiro(existente.clienteId);

  return { ok: true, mensagem: "Pagamento confirmado com sucesso." };
}

export async function excluirLancamento(id: number) {
  await requirePermission("financeiro.gerenciar");

  const existente = await prisma.lancamento.findUnique({
    where: { id },
    select: {
      id: true,
      clienteId: true,
      venda: { select: { id: true } },
    },
  });

  if (!existente) {
    return { ok: false, mensagem: "Lançamento não encontrado." };
  }

  if (existente.venda) {
    return {
      ok: false,
      mensagem:
        "Este lançamento pertence a uma venda e não pode ser excluído isoladamente, pois isso quebraria o histórico de receita, custo e estoque.",
    };
  }

  await prisma.lancamento.delete({ where: { id } });
  revalidarFinanceiro(existente.clienteId);

  return { ok: true, mensagem: "Lançamento excluído." };
}
