"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import {
  ORIGEM_CONTA_FIXA,
  competenciaAtual,
  gerarContasFixasPendentes,
  proximaCompetencia,
  vencimentoNaCompetencia,
} from "@/lib/contas-fixas";
import { prisma } from "@/lib/prisma";

function revalidar() {
  revalidatePath("/financeiro");
  revalidatePath("/gestao");
  revalidatePath("/relatorios");
  revalidatePath("/");
}

function arredondar(valor: number) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

export type SalvarContaFixaInput = {
  id?: number | null;
  nome: string;
  valor: number;
  diaVencimento: number;
  categoria?: string | null;
  contaFinanceiraId?: number | null;
  valorVariavel?: boolean;
  // So no cadastro: comecar a lancar neste mes ou so a partir do proximo.
  comecar?: "este" | "proximo";
  observacoes?: string | null;
};

export async function salvarContaFixa(dados: SalvarContaFixaInput) {
  const usuario = await requirePermission("financeiro.gerenciar");

  const nome = dados.nome?.trim();
  const valor = arredondar(dados.valor);
  const dia = Math.trunc(Number(dados.diaVencimento));
  if (!nome) throw new Error("Informe o nome da conta (ex.: Aluguel).");
  if (valor <= 0) throw new Error("Informe um valor maior que zero.");
  if (!dia || dia < 1 || dia > 31) throw new Error("O dia do vencimento vai de 1 a 31.");

  const base = {
    nome,
    valor,
    diaVencimento: dia,
    categoria: dados.categoria?.trim() || null,
    contaFinanceiraId: dados.contaFinanceiraId || null,
    valorVariavel: Boolean(dados.valorVariavel),
    observacoes: dados.observacoes?.trim() || null,
  };

  if (dados.id) {
    const id = Math.trunc(Number(dados.id));
    await prisma.$transaction(async (tx) => {
      await tx.contaFixa.update({ where: { id }, data: base });

      // As contas ainda NAO pagas acompanham a mudanca (valor, nome, dia).
      const pendentes = await tx.lancamento.findMany({
        where: { contaFixaId: id, statusPagamento: "Pendente" },
        select: { id: true, competencia: true },
      });
      for (const item of pendentes) {
        const vencimento = item.competencia
          ? vencimentoNaCompetencia(item.competencia, dia)
          : undefined;
        await tx.lancamento.update({
          where: { id: item.id },
          data: {
            descricao: nome,
            valor,
            valorLiquido: valor,
            categoria: base.categoria,
            contaFinanceiraId: base.contaFinanceiraId,
            ...(vencimento ? { vencimento, data: vencimento } : {}),
          },
        });
      }

      await tx.auditoria.create({
        data: {
          modulo: "Financeiro",
          acao: "Conta fixa alterada",
          entidade: "ContaFixa",
          entidadeId: String(id),
          usuario: usuario.email,
          detalhes: `${nome} · R$ ${valor.toFixed(2)} · todo dia ${dia}.`,
        },
      });
    });
  } else {
    const atual = competenciaAtual();
    const criada = await prisma.contaFixa.create({
      data: {
        ...base,
        status: "Ativa",
        inicioCompetencia: dados.comecar === "proximo" ? proximaCompetencia(atual) : atual,
      },
    });
    await prisma.auditoria.create({
      data: {
        modulo: "Financeiro",
        acao: "Conta fixa cadastrada",
        entidade: "ContaFixa",
        entidadeId: String(criada.id),
        usuario: usuario.email,
        detalhes: `${nome} · R$ ${valor.toFixed(2)} · todo dia ${dia}.`,
      },
    });
    await gerarContasFixasPendentes();
  }

  revalidar();
  return { ok: true };
}

/**
 * Pausar ou encerrar: as contas ainda nao pagas sao canceladas (ficam no
 * historico, fora do saldo). Reativar volta a lancar a partir deste mes.
 */
export async function alterarSituacaoContaFixa(id: number, situacao: "Ativa" | "Pausada" | "Encerrada") {
  const usuario = await requirePermission("financeiro.gerenciar");
  const contaId = Math.trunc(Number(id));
  if (!["Ativa", "Pausada", "Encerrada"].includes(situacao)) throw new Error("Situação inválida.");

  await prisma.$transaction(async (tx) => {
    const conta = await tx.contaFixa.findUnique({ where: { id: contaId } });
    if (!conta) throw new Error("Conta fixa não encontrada.");

    if (situacao === "Ativa") {
      await tx.contaFixa.update({
        where: { id: contaId },
        data: { status: "Ativa", inicioCompetencia: competenciaAtual() },
      });
    } else {
      await tx.contaFixa.update({ where: { id: contaId }, data: { status: situacao } });
      await tx.lancamento.updateMany({
        where: { contaFixaId: contaId, statusPagamento: "Pendente" },
        data: {
          statusPagamento: "Cancelado",
          observacoes: `Conta fixa ${situacao === "Pausada" ? "pausada" : "encerrada"} antes do pagamento.`,
        },
      });
    }

    await tx.auditoria.create({
      data: {
        modulo: "Financeiro",
        acao: `Conta fixa ${situacao === "Ativa" ? "reativada" : situacao.toLowerCase()}`,
        entidade: "ContaFixa",
        entidadeId: String(contaId),
        usuario: usuario.email,
        detalhes: conta.nome,
      },
    });
  });

  if (situacao === "Ativa") await gerarContasFixasPendentes();
  revalidar();
  return { ok: true };
}

/** "Paguei": confirma a conta do mes com o valor real e a data do pagamento. */
export async function pagarContaFixa(dados: {
  lancamentoId: number;
  valor: number;
  data: string; // aaaa-mm-dd
  contaFinanceiraId?: number | null;
  formaPagamento?: string | null;
}) {
  const usuario = await requirePermission("financeiro.gerenciar");
  const id = Math.trunc(Number(dados.lancamentoId));
  const valor = arredondar(dados.valor);
  if (valor <= 0) throw new Error("Informe o valor pago.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data || "")) throw new Error("Informe a data do pagamento.");

  const existente = await prisma.lancamento.findUnique({
    where: { id },
    select: { id: true, contaFixaId: true, statusPagamento: true, descricao: true, contaFinanceiraId: true, formaPagamento: true },
  });
  if (!existente || !existente.contaFixaId) throw new Error("Conta não encontrada.");
  if (existente.statusPagamento !== "Pendente") {
    return { ok: false, mensagem: "Esta conta já foi paga ou cancelada." };
  }

  const atualizado = await prisma.lancamento.updateMany({
    where: { id, statusPagamento: "Pendente" },
    data: {
      statusPagamento: "Pago",
      valor,
      valorLiquido: valor,
      data: new Date(`${dados.data}T12:00:00-03:00`),
      contaFinanceiraId: dados.contaFinanceiraId || existente.contaFinanceiraId,
      formaPagamento: dados.formaPagamento?.trim() || existente.formaPagamento,
      origem: ORIGEM_CONTA_FIXA,
    },
  });
  if (atualizado.count !== 1) {
    return { ok: false, mensagem: "Esta conta foi alterada por outra pessoa. Atualize a página." };
  }

  await prisma.auditoria.create({
    data: {
      modulo: "Financeiro",
      acao: "Conta fixa paga",
      entidade: "Lancamento",
      entidadeId: String(id),
      usuario: usuario.email,
      detalhes: `${existente.descricao} · R$ ${valor.toFixed(2)} em ${dados.data}.`,
    },
  });

  revalidar();
  return { ok: true, mensagem: `${existente.descricao} marcada como paga.` };
}
