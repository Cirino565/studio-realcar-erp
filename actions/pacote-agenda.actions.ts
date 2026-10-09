"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { resolverContextoFinanceiroVenda } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";

// Acoes de pacote usadas direto da AGENDA (na finalizacao do atendimento).
// Usam a permissao da agenda, a mesma de finalizar um atendimento, para que
// quem atende consiga fechar o pacote e receber o restante sem precisar
// entrar no Financeiro. Os lancamentos gerados sao os mesmos da aba Pacotes
// da ficha da cliente.

function dinheiro(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : 0;
}

export type PacoteSalvoNaAgenda = {
  pacoteId: number;
  descricao: string;
  valorTotal: number;
  valorPago: number;
  quitado: boolean;
};

export async function fecharPacoteNaAgenda(dados: {
  clienteId: number;
  descricao: string;
  valorTotal: number;
  valorSinal: number;
  formaPagamentoConfigId?: number | null;
}): Promise<PacoteSalvoNaAgenda> {
  await requirePermission("agenda.gerenciar");

  const clienteId = Math.trunc(Number(dados.clienteId));
  const descricao = String(dados.descricao || "").trim();
  const valorTotal = dinheiro(dados.valorTotal);
  const valorSinal = dinheiro(dados.valorSinal);

  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    throw new Error("Cliente inválido.");
  }
  if (!descricao) {
    throw new Error("Informe o nome do pacote (ex.: Pacote Criolipólise).");
  }
  if (valorTotal <= 0) {
    throw new Error("Informe o valor total do pacote.");
  }
  if (valorSinal < 0) {
    throw new Error("O sinal não pode ser negativo.");
  }
  if (valorSinal > valorTotal + 0.001) {
    throw new Error("O sinal não pode ser maior que o valor total do pacote.");
  }
  if (valorSinal > 0 && !dados.formaPagamentoConfigId) {
    throw new Error("Escolha a forma de pagamento do sinal.");
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const cliente = await tx.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true },
    });
    if (!cliente) throw new Error("Cliente não encontrada.");

    const pacote = await tx.pacoteCliente.create({
      data: { clienteId, descricao, valorTotal, valorPago: 0 },
    });

    if (valorSinal <= 0) {
      return { pacote, valorPago: 0, quitado: false };
    }

    const contexto = await resolverContextoFinanceiroVenda(tx, {
      clienteId,
      formaPagamentoConfigId: dados.formaPagamentoConfigId || null,
      valorBruto: valorSinal,
    });

    await tx.lancamento.create({
      data: {
        descricao: `Adiantamento - ${descricao}`,
        valor: valorSinal,
        valorLiquido: contexto.valorLiquido,
        taxaPagamento: contexto.taxaPagamento,
        taxaPercentualAplicada: contexto.taxaPercentual,
        taxaFixaAplicada: contexto.taxaFixa,
        prazoRecebimentoDias: contexto.prazoRecebimentoDias,
        recebimentoPrevistoEm: new Date(
          Date.now() + contexto.prazoRecebimentoDias * 86_400_000,
        ),
        tipo: "ENTRADA",
        categoria: "Pacotes",
        data: new Date(),
        formaPagamento: contexto.formaPagamento,
        formaPagamentoConfigId: contexto.formaPagamentoConfigId,
        contaFinanceiraId: contexto.contaFinanceiraId,
        statusPagamento: "Pago",
        origem: "Agenda - Pacote",
        clienteId,
        pacoteClienteId: pacote.id,
      },
    });

    const quitado = valorSinal >= valorTotal - 0.01;
    await tx.pacoteCliente.update({
      where: { id: pacote.id },
      data: { valorPago: valorSinal, status: quitado ? "Quitado" : "Aberto" },
    });

    return { pacote, valorPago: valorSinal, quitado };
  });

  revalidatePath("/agenda");
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/financeiro");
  revalidatePath("/gestao");

  return {
    pacoteId: resultado.pacote.id,
    descricao,
    valorTotal,
    valorPago: resultado.valorPago,
    quitado: resultado.quitado,
  };
}

export async function receberRestantePacoteNaAgenda(dados: {
  pacoteId: number;
  valor?: number;
  formaPagamentoConfigId: number | null;
}): Promise<PacoteSalvoNaAgenda> {
  await requirePermission("agenda.gerenciar");

  const pacoteId = Math.trunc(Number(dados.pacoteId));
  if (!Number.isInteger(pacoteId) || pacoteId <= 0) {
    throw new Error("Pacote inválido.");
  }
  if (!dados.formaPagamentoConfigId) {
    throw new Error("Escolha a forma de pagamento.");
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const pacote = await tx.pacoteCliente.findUnique({
      where: { id: pacoteId },
      select: {
        id: true,
        clienteId: true,
        descricao: true,
        valorTotal: true,
        valorPago: true,
        status: true,
      },
    });

    if (!pacote) throw new Error("Pacote não encontrado.");
    if (pacote.status !== "Aberto") {
      throw new Error("Este pacote já está quitado ou cancelado.");
    }

    const falta = dinheiro(pacote.valorTotal - pacote.valorPago);
    const valor = dados.valor === undefined ? falta : dinheiro(dados.valor);

    if (valor <= 0) throw new Error("Informe um valor maior que zero.");
    if (valor > falta + 0.01) {
      throw new Error(
        `Esse valor é maior do que falta cobrar (R$ ${falta.toFixed(2).replace(".", ",")}).`,
      );
    }

    const contexto = await resolverContextoFinanceiroVenda(tx, {
      clienteId: pacote.clienteId,
      formaPagamentoConfigId: dados.formaPagamentoConfigId,
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
        prazoRecebimentoDias: contexto.prazoRecebimentoDias,
        recebimentoPrevistoEm: new Date(
          Date.now() + contexto.prazoRecebimentoDias * 86_400_000,
        ),
        tipo: "ENTRADA",
        categoria: "Pacotes",
        data: new Date(),
        formaPagamento: contexto.formaPagamento,
        formaPagamentoConfigId: contexto.formaPagamentoConfigId,
        contaFinanceiraId: contexto.contaFinanceiraId,
        statusPagamento: "Pago",
        origem: "Agenda - Pacote",
        clienteId: pacote.clienteId,
        pacoteClienteId: pacote.id,
      },
    });

    const novoValorPago = dinheiro(pacote.valorPago + valor);
    const quitado = novoValorPago >= pacote.valorTotal - 0.01;

    await tx.pacoteCliente.update({
      where: { id: pacote.id },
      data: { valorPago: novoValorPago, status: quitado ? "Quitado" : "Aberto" },
    });

    return { pacote, novoValorPago, quitado };
  });

  revalidatePath("/agenda");
  revalidatePath(`/clientes/${resultado.pacote.clienteId}`);
  revalidatePath("/financeiro");
  revalidatePath("/gestao");

  return {
    pacoteId: resultado.pacote.id,
    descricao: resultado.pacote.descricao,
    valorTotal: resultado.pacote.valorTotal,
    valorPago: resultado.novoValorPago,
    quitado: resultado.quitado,
  };
}
