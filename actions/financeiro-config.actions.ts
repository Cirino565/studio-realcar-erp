"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { arredondarMoeda, numeroFinanceiro } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";

export type SalvarContaFinanceiraInput = {
  id?: number | null;
  nome: string;
  banco?: string;
  tipo?: string;
  saldoInicial: number;
  principal?: boolean;
  observacoes?: string;
};

export type SalvarFormaPagamentoInput = {
  id?: number | null;
  nome: string;
  taxaPercentual: number;
  taxaFixa: number;
  prazoDias: number;
  status?: string;
  ordem?: number;
};

function textoOpcional(value?: string | null) {
  const texto = value?.trim();
  return texto || null;
}

function revalidar() {
  revalidatePath("/financeiro");
  revalidatePath("/vendas");
  revalidatePath("/marketing");
  revalidatePath("/gestao");
  revalidatePath("/");
}

export async function salvarContaFinanceira(dados: SalvarContaFinanceiraInput) {
  const usuario = await requirePermission("financeiro.gerenciar");
  const nome = dados.nome.trim();
  if (!nome) throw new Error("Informe o nome da conta financeira.");

  const id = Math.trunc(Number(dados.id || 0));
  const principal = dados.principal !== false;
  const saldoInicial = arredondarMoeda(dados.saldoInicial);

  const conta = await prisma.$transaction(async (tx) => {
    if (principal) {
      await tx.contaFinanceira.updateMany({
        where: id > 0 ? { id: { not: id } } : undefined,
        data: { principal: false },
      });
    }

    const salva = id > 0
      ? await tx.contaFinanceira.update({
          where: { id },
          data: {
            nome,
            banco: textoOpcional(dados.banco),
            tipo: textoOpcional(dados.tipo) || "Conta corrente",
            saldoInicial,
            principal,
            status: "Ativa",
            observacoes: textoOpcional(dados.observacoes),
          },
        })
      : await tx.contaFinanceira.create({
          data: {
            nome,
            banco: textoOpcional(dados.banco),
            tipo: textoOpcional(dados.tipo) || "Conta corrente",
            saldoInicial,
            saldoBancoInformado: saldoInicial,
            conciliadoEm: new Date(),
            principal,
            status: "Ativa",
            observacoes: textoOpcional(dados.observacoes),
          },
        });

    await tx.auditoria.create({
      data: {
        modulo: "Financeiro",
        acao: id > 0 ? "Atualizou conta financeira" : "Criou conta financeira",
        entidade: "ContaFinanceira",
        entidadeId: String(salva.id),
        usuario: usuario.email,
        detalhes: `${salva.nome}. Saldo inicial: R$ ${saldoInicial.toFixed(2)}.`,
      },
    });

    return salva;
  });

  revalidar();
  return { ok: true, conta };
}

export async function salvarFormaPagamentoConfig(dados: SalvarFormaPagamentoInput) {
  const usuario = await requirePermission("financeiro.gerenciar");
  const nome = dados.nome.trim();
  if (!nome) throw new Error("Informe o nome da forma de pagamento.");

  const taxaPercentual = Math.max(0, numeroFinanceiro(dados.taxaPercentual));
  const taxaFixa = Math.max(0, arredondarMoeda(dados.taxaFixa));
  const prazoDias = Math.max(0, Math.trunc(numeroFinanceiro(dados.prazoDias)));
  const ordem = Math.max(0, Math.trunc(numeroFinanceiro(dados.ordem)));
  const id = Math.trunc(Number(dados.id || 0));

  const existenteMesmoNome = await prisma.formaPagamentoConfig.findFirst({
    where: {
      nome: { equals: nome, mode: "insensitive" },
      ...(id > 0 ? { id: { not: id } } : {}),
    },
    select: { id: true },
  });
  if (existenteMesmoNome) {
    throw new Error("Já existe uma forma de pagamento com esse nome.");
  }

  const forma = id > 0
    ? await prisma.formaPagamentoConfig.update({
        where: { id },
        data: {
          nome,
          taxaPercentual,
          taxaFixa,
          prazoDias,
          status: dados.status || "Ativa",
          ordem,
        },
      })
    : await prisma.formaPagamentoConfig.create({
        data: {
          nome,
          taxaPercentual,
          taxaFixa,
          prazoDias,
          status: dados.status || "Ativa",
          ordem,
        },
      });

  await prisma.auditoria.create({
    data: {
      modulo: "Financeiro",
      acao: id > 0 ? "Atualizou taxa de pagamento" : "Criou taxa de pagamento",
      entidade: "FormaPagamentoConfig",
      entidadeId: String(forma.id),
      usuario: usuario.email,
      detalhes: `${forma.nome}. ${taxaPercentual.toFixed(2)}% + R$ ${taxaFixa.toFixed(2)}. Prazo: ${prazoDias} dia(s).`,
    },
  });

  revalidar();
  return { ok: true, forma };
}

export async function registrarConciliacaoConta(dados: {
  contaId: number;
  saldoBancoInformado: number;
}) {
  const usuario = await requirePermission("financeiro.gerenciar");
  const contaId = Math.trunc(Number(dados.contaId));
  if (contaId <= 0) throw new Error("Conta financeira inválida.");

  const saldoBancoInformado = arredondarMoeda(dados.saldoBancoInformado);
  const conciliadoEm = new Date();
  const conta = await prisma.contaFinanceira.update({
    where: { id: contaId },
    data: { saldoBancoInformado, conciliadoEm },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Financeiro",
      acao: "Registrou conferência bancária",
      entidade: "ContaFinanceira",
      entidadeId: String(conta.id),
      usuario: usuario.email,
      detalhes: `${conta.nome}. Saldo informado pelo banco: R$ ${saldoBancoInformado.toFixed(2)}.`,
    },
  });

  revalidar();
  return { ok: true };
}
