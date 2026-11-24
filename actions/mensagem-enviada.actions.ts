"use server";

import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CATEGORIAS = new Set(["Aniversário", "Pós-atendimento"]);

/**
 * Marca que a mensagem do Dashboard (aniversario, pos-atendimento) foi
 * aberta no WhatsApp, para o botao ficar cinza ("Enviada") para todos.
 * Usa o mesmo registro da tela Comunicacoes, entao la tambem aparece.
 * Nao repete no mesmo dia.
 */
export async function registrarMensagemEnviada(dados: {
  categoria: string;
  clienteId: number;
  agendamentoId?: number | null;
  destinatarioNome: string;
  telefone?: string | null;
}) {
  const usuario = await requireCurrentUser();
  if (!CATEGORIAS.has(dados.categoria)) return { ok: false as const };
  const clienteId = Number(dados.clienteId);
  if (!Number.isInteger(clienteId) || clienteId <= 0) return { ok: false as const };

  const inicio = new Date(
    `${new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })}T00:00:00-03:00`,
  );
  const identidade = dados.agendamentoId ? { agendamentoId: Number(dados.agendamentoId) } : { clienteId };
  const existente = await prisma.comunicacaoRegistro.findFirst({
    where: { ...identidade, categoria: dados.categoria, status: "Enviada", createdAt: { gte: inicio } },
    select: { id: true },
  });
  if (existente) return { ok: true as const };

  const agora = new Date();
  await prisma.comunicacaoRegistro.create({
    data: {
      clienteId,
      agendamentoId: dados.agendamentoId ? Number(dados.agendamentoId) : null,
      destinatarioNome: dados.destinatarioNome.trim() || "Cliente",
      telefone: dados.telefone?.trim() || null,
      categoria: dados.categoria,
      canal: "WhatsApp",
      mensagem: `${dados.categoria}: mensagem aberta no WhatsApp pelo Dashboard.`,
      status: "Enviada",
      usuario: usuario.email,
      abertoEm: agora,
      enviadoEm: agora,
    },
  });
  return { ok: true as const };
}
