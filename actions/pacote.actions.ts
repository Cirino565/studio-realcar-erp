"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { resolverContextoFinanceiroVenda } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getNumber(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) return 0;

  const normalized = value.replace(".", "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getClienteId(formData: FormData) {
  const clienteId = Number(formData.get("clienteId"));

  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    throw new Error("Cliente inválido.");
  }

  return clienteId;
}

function getDate(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value ? new Date(`${value}T12:00:00-03:00`) : new Date();
}

/**
 * Cria um pacote novo para a cliente (ex.: "Pacote Criolipólise 5 sessões",
 * valor total R$ 600) e, se um valor de adiantamento for informado, já
 * registra esse primeiro pagamento como um Lancamento de verdade - assim
 * ele entra no Financeiro normalmente, com forma de pagamento e taxa
 * calculadas do mesmo jeito que qualquer outra entrada.
 */
export async function criarPacoteCliente(formData: FormData) {
  await requirePermission("financeiro.gerenciar");

  const clienteId = getClienteId(formData);
  const descricao = getString(formData, "descricao");
  const valorTotal = getNumber(formData, "valorTotal");
  const valorAdiantado = getNumber(formData, "valorAdiantado");
  const formaPagamentoConfigId = Number(formData.get("formaPagamentoConfigId")) || null;
  const contaFinanceiraId = Number(formData.get("contaFinanceiraId")) || null;
  const data = getDate(formData, "data");
  const observacoes = getString(formData, "observacoes");

  if (!descricao) {
    throw new Error("Informe uma descrição para o pacote (ex.: Pacote Criolipólise).");
  }

  if (valorTotal <= 0) {
    throw new Error("Informe o valor total do pacote.");
  }

  if (valorAdiantado < 0) {
    throw new Error("O valor adiantado não pode ser negativo.");
  }

  if (valorAdiantado > valorTotal) {
    throw new Error("O valor adiantado não pode ser maior que o valor total do pacote.");
  }

  await prisma.$transaction(async (tx) => {
    const pacote = await tx.pacoteCliente.create({
      data: {
        clienteId,
        descricao,
        valorTotal,
        valorPago: 0,
        observacoes,
      },
    });

    if (valorAdiantado > 0) {
      const contexto = await resolverContextoFinanceiroVenda(tx, {
        clienteId,
        formaPagamentoConfigId,
        contaFinanceiraId,
        valorBruto: valorAdiantado,
      });

      await tx.lancamento.create({
        data: {
          descricao: `Adiantamento - ${descricao}`,
          valor: valorAdiantado,
          valorLiquido: contexto.valorLiquido,
          taxaPagamento: contexto.taxaPagamento,
          taxaPercentualAplicada: contexto.taxaPercentual,
          taxaFixaAplicada: contexto.taxaFixa,
          tipo: "ENTRADA",
          categoria: "Pacotes",
          data,
          formaPagamento: contexto.formaPagamento,
          formaPagamentoConfigId: contexto.formaPagamentoConfigId,
          contaFinanceiraId: contexto.contaFinanceiraId,
          statusPagamento: "Pago",
          origem: "Manual",
          clienteId,
          pacoteClienteId: pacote.id,
        },
      });

      await tx.pacoteCliente.update({
        where: { id: pacote.id },
        data: {
          valorPago: valorAdiantado,
          status: valorAdiantado >= valorTotal ? "Quitado" : "Aberto",
        },
      });
    }
  });

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/financeiro");
  revalidatePath("/gestao");
}

/**
 * Registra mais um pagamento num pacote já existente (ex.: quando a cliente
 * paga uma parte a mais numa sessão seguinte). Cria um Lancamento de
 * verdade vinculado ao pacote e atualiza o valor já pago. Quando o total
 * pago alcança o valor do pacote, ele é marcado como Quitado sozinho.
 */
export async function registrarPagamentoPacote(formData: FormData) {
  await requirePermission("financeiro.gerenciar");

  const pacoteId = Number(formData.get("pacoteId"));
  if (!Number.isInteger(pacoteId) || pacoteId <= 0) {
    throw new Error("Pacote inválido.");
  }

  const valor = getNumber(formData, "valor");
  const formaPagamentoConfigId = Number(formData.get("formaPagamentoConfigId")) || null;
  const contaFinanceiraId = Number(formData.get("contaFinanceiraId")) || null;
  const data = getDate(formData, "data");

  if (valor <= 0) {
    throw new Error("Informe um valor maior que zero.");
  }

  const clienteId = await prisma.$transaction(async (tx) => {
    const pacote = await tx.pacoteCliente.findUnique({
      where: { id: pacoteId },
      select: { id: true, clienteId: true, descricao: true, valorTotal: true, valorPago: true, status: true },
    });

    if (!pacote) {
      throw new Error("Pacote não encontrado.");
    }

    if (pacote.status !== "Aberto") {
      throw new Error("Este pacote já está quitado ou cancelado.");
    }

    const novoValorPago = pacote.valorPago + valor;

    // Trava para não deixar pagar mais do que falta por engano - a
    // diferença fica visível antes de confirmar.
    if (novoValorPago > pacote.valorTotal + 0.01) {
      const faltava = Math.max(0, pacote.valorTotal - pacote.valorPago);
      throw new Error(
        `Esse valor é maior do que o saldo em aberto (R$ ${faltava.toFixed(2).replace(".", ",")}). Ajuste o valor ou registre um novo pacote.`,
      );
    }

    const contexto = await resolverContextoFinanceiroVenda(tx, {
      clienteId: pacote.clienteId,
      formaPagamentoConfigId,
      contaFinanceiraId,
      valorBruto: valor,
    });

    await tx.lancamento.create({
      data: {
        descricao: `Pagamento - ${pacote.descricao}`,
        valor,
        valorLiquido: contexto.valorLiquido,
        taxaPagamento: contexto.taxaPagamento,
        taxaPercentualAplicada: contexto.taxaPercentual,
        taxaFixaAplicada: contexto.taxaFixa,
        tipo: "ENTRADA",
        categoria: "Pacotes",
        data,
        formaPagamento: contexto.formaPagamento,
        formaPagamentoConfigId: contexto.formaPagamentoConfigId,
        contaFinanceiraId: contexto.contaFinanceiraId,
        statusPagamento: "Pago",
        origem: "Manual",
        clienteId: pacote.clienteId,
        pacoteClienteId: pacote.id,
      },
    });

    await tx.pacoteCliente.update({
      where: { id: pacote.id },
      data: {
        valorPago: novoValorPago,
        status: novoValorPago >= pacote.valorTotal - 0.01 ? "Quitado" : "Aberto",
      },
    });

    return pacote.clienteId;
  });

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/financeiro");
  revalidatePath("/gestao");
}

/**
 * Cancela um pacote em aberto (ex.: a cliente desistiu). O dinheiro já
 * recebido não é estornado automaticamente - os lançamentos continuam no
 * Financeiro normalmente, só o pacote deixa de aparecer como pendência.
 */
export async function cancelarPacoteCliente(formData: FormData) {
  await requirePermission("financeiro.gerenciar");

  const pacoteId = Number(formData.get("pacoteId"));
  if (!Number.isInteger(pacoteId) || pacoteId <= 0) {
    throw new Error("Pacote inválido.");
  }

  const pacote = await prisma.pacoteCliente.update({
    where: { id: pacoteId },
    data: { status: "Cancelado" },
    select: { clienteId: true },
  });

  revalidatePath(`/clientes/${pacote.clienteId}`);
}
