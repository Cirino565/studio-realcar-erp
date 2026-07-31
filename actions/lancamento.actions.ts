"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import {
  arredondarMoeda,
  calcularTaxaRecebimento,
  resolverContextoFinanceiroVenda,
} from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";

type NovoLancamento = {
  descricao: string;
  valor: number;
  tipo: string;
  categoria?: string;
  observacoes?: string;
  data: string;
  formaPagamento?: string;
  formaPagamentoConfigId?: number | null;
  contaFinanceiraId?: number | null;
  campanhaId?: number | null;
  statusPagamento?: string;
  origem?: string;
  agendamentoId?: number;
  clienteId?: number;
};

function revalidarFinanceiro(clienteId?: number | null) {
  revalidatePath("/financeiro");
  revalidatePath("/gestao");
  revalidatePath("/vendas");
  revalidatePath("/marketing");
  revalidatePath("/");

  if (clienteId) {
    revalidatePath(`/clientes/${clienteId}`);
    revalidatePath("/clientes");
  }
}

export async function criarLancamento(dados: NovoLancamento) {
  await requirePermission("financeiro.gerenciar");

  const valor = arredondarMoeda(dados.valor);
  if (!dados.descricao.trim()) throw new Error("Informe a descrição do lançamento.");
  if (valor <= 0) throw new Error("Informe um valor maior que zero.");

  await prisma.$transaction(async (tx) => {
    const entrada = dados.tipo === "ENTRADA";
    const contexto = entrada
      ? await resolverContextoFinanceiroVenda(tx, {
          clienteId: dados.clienteId,
          formaPagamento: dados.formaPagamento,
          formaPagamentoConfigId: dados.formaPagamentoConfigId,
          contaFinanceiraId: dados.contaFinanceiraId,
          campanhaId: dados.campanhaId,
          valorBruto: valor,
        })
      : {
          formaPagamento: dados.formaPagamento?.trim() || "Não informado",
          formaPagamentoConfigId: null,
          contaFinanceiraId:
            dados.contaFinanceiraId ||
            (
              await tx.contaFinanceira.findFirst({
                where: { principal: true, status: "Ativa" },
                select: { id: true },
              })
            )?.id ||
            null,
          campanhaId: dados.campanhaId || null,
          taxaPagamento: 0,
          taxaPercentual: 0,
          taxaFixa: 0,
          valorLiquido: valor,
        };

    await tx.lancamento.create({
      data: {
        descricao: dados.descricao.trim(),
        valor,
        valorLiquido: entrada ? contexto.valorLiquido : valor,
        taxaPagamento: entrada ? contexto.taxaPagamento : 0,
        taxaPercentualAplicada: entrada ? contexto.taxaPercentual : 0,
        taxaFixaAplicada: entrada ? contexto.taxaFixa : 0,
        tipo: dados.tipo,
        categoria: dados.categoria || null,
        observacoes: dados.observacoes?.trim() || null,
        data: new Date(`${dados.data}T12:00:00-03:00`),
        formaPagamento: entrada ? contexto.formaPagamento : dados.formaPagamento || null,
        formaPagamentoConfigId: entrada ? contexto.formaPagamentoConfigId : null,
        contaFinanceiraId: contexto.contaFinanceiraId,
        campanhaId: contexto.campanhaId,
        statusPagamento: dados.statusPagamento || "Pago",
        origem: dados.origem || "Manual",
        agendamentoId: dados.agendamentoId || null,
        clienteId: dados.clienteId || null,
      },
    });
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
      formaPagamentoConfig: true,
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
  const forma = formaPagamento?.trim() || existente.formaPagamento || "Não informado";

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

    const formaConfig = await tx.formaPagamentoConfig.findFirst({
      where: { nome: forma, status: "Ativa" },
    });
    const calculo = calcularTaxaRecebimento(
      existente.valor,
      formaConfig?.taxaPercentual || existente.taxaPercentualAplicada,
      formaConfig?.taxaFixa || existente.taxaFixaAplicada,
    );
    const contaId =
      existente.contaFinanceiraId ||
      (
        await tx.contaFinanceira.findFirst({
          where: { principal: true, status: "Ativa" },
          select: { id: true },
        })
      )?.id ||
      null;

    if (existente.venda) {
      const vendaAtualizada = await tx.venda.updateMany({
        where: {
          id: existente.venda.id,
          situacao: { not: "CANCELADA" },
        },
        data: {
          statusPagamento: "Pago",
          formaPagamento: forma,
          formaPagamentoConfigId: formaConfig?.id || existente.formaPagamentoConfigId,
          contaFinanceiraId: contaId,
          taxaPagamento: calculo.taxaPagamento,
          taxaPercentualAplicada: calculo.taxaPercentual,
          taxaFixaAplicada: calculo.taxaFixa,
          valorLiquido: calculo.valorLiquido,
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
        formaPagamentoConfigId: formaConfig?.id || existente.formaPagamentoConfigId,
        contaFinanceiraId: contaId,
        categoria,
        taxaPagamento: calculo.taxaPagamento,
        taxaPercentualAplicada: calculo.taxaPercentual,
        taxaFixaAplicada: calculo.taxaFixa,
        valorLiquido: calculo.valorLiquido,
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
        detalhes: `Recebimento bruto de R$ ${existente.valor.toFixed(2)} via ${forma}. Taxa: R$ ${calculo.taxaPagamento.toFixed(2)}. Líquido: R$ ${calculo.valorLiquido.toFixed(2)}.`,
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
