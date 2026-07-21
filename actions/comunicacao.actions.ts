"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TIMEZONE_OFFSET = "-03:00";

function hojeRange() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).formatToParts(new Date());

  const ano = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;
  const dia = partes.find((parte) => parte.type === "day")?.value;
  const iso = `${ano}-${mes}-${dia}`;
  const inicio = new Date(`${iso}T00:00:00${TIMEZONE_OFFSET}`);
  const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);

  return { inicio, fim };
}

export type RegistrarComunicacaoInput = {
  modeloId?: number | null;
  clienteId?: number | null;
  leadId?: number | null;
  agendamentoId?: number | null;
  destinatarioNome: string;
  telefone?: string | null;
  categoria: string;
  mensagem: string;
};

function validarComunicacao(dados: RegistrarComunicacaoInput) {
  if (!dados.destinatarioNome.trim()) {
    throw new Error("Destinatário não informado.");
  }

  if (!dados.categoria.trim()) {
    throw new Error("Categoria da comunicação não informada.");
  }

  if (!dados.mensagem.trim()) {
    throw new Error("A mensagem está vazia.");
  }
}

function identidadeComunicacao(dados: RegistrarComunicacaoInput) {
  if (dados.agendamentoId) return { agendamentoId: dados.agendamentoId };
  if (dados.leadId) return { leadId: dados.leadId };
  if (dados.clienteId) return { clienteId: dados.clienteId };
  return {};
}

export async function registrarAberturaComunicacao(dados: RegistrarComunicacaoInput) {
  const usuario = await requirePermission("marketing.gerenciar");
  validarComunicacao(dados);

  const registro = await prisma.comunicacaoRegistro.create({
    data: {
      modeloId: dados.modeloId || null,
      clienteId: dados.clienteId || null,
      leadId: dados.leadId || null,
      agendamentoId: dados.agendamentoId || null,
      destinatarioNome: dados.destinatarioNome.trim(),
      telefone: dados.telefone?.trim() || null,
      categoria: dados.categoria.trim(),
      canal: "WhatsApp",
      mensagem: dados.mensagem.trim(),
      status: "Aberta",
      usuario: usuario.email,
      abertoEm: new Date(),
    },
  });

  revalidatePath("/comunicacoes");
  return { id: registro.id };
}

export async function marcarComunicacaoEnviada(
  dados: RegistrarComunicacaoInput & { forcarDuplicado?: boolean },
) {
  const usuario = await requirePermission("marketing.gerenciar");
  validarComunicacao(dados);

  const { inicio, fim } = hojeRange();
  const identidade = identidadeComunicacao(dados);

  if (!dados.forcarDuplicado && Object.keys(identidade).length > 0) {
    const existente = await prisma.comunicacaoRegistro.findFirst({
      where: {
        ...identidade,
        categoria: dados.categoria.trim(),
        status: "Enviada",
        createdAt: { gte: inicio, lt: fim },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existente) {
      return {
        duplicada: true,
        existenteEm: existente.enviadoEm || existente.createdAt,
      };
    }
  }

  const agora = new Date();

  const registro = await prisma.$transaction(async (tx) => {
    const novoRegistro = await tx.comunicacaoRegistro.create({
      data: {
        modeloId: dados.modeloId || null,
        clienteId: dados.clienteId || null,
        leadId: dados.leadId || null,
        agendamentoId: dados.agendamentoId || null,
        destinatarioNome: dados.destinatarioNome.trim(),
        telefone: dados.telefone?.trim() || null,
        categoria: dados.categoria.trim(),
        canal: "WhatsApp",
        mensagem: dados.mensagem.trim(),
        status: "Enviada",
        usuario: usuario.email,
        abertoEm: agora,
        enviadoEm: agora,
      },
    });

    if (dados.leadId) {
      const lead = await tx.lead.findUnique({ where: { id: dados.leadId } });

      if (lead && !["Convertido", "Perdido"].includes(lead.etapa)) {
        await tx.lead.update({
          where: { id: dados.leadId },
          data: {
            ultimoContatoEm: agora,
            etapa: lead.etapa === "Novo" ? "Contato" : lead.etapa,
          },
        });

        await tx.leadInteracao.create({
          data: {
            leadId: dados.leadId,
            tipo: "WhatsApp",
            descricao: `Comunicação marcada como enviada pela Central de Comunicação: ${dados.categoria}.`,
          },
        });
      }
    }

    await tx.auditoria.create({
      data: {
        modulo: "Comunicação",
        acao: "Registrou comunicação enviada",
        entidade: "ComunicacaoRegistro",
        entidadeId: String(novoRegistro.id),
        usuario: usuario.email,
        detalhes: `${dados.categoria}: ${dados.destinatarioNome.trim()}`,
      },
    });

    return novoRegistro;
  });

  revalidatePath("/comunicacoes");
  revalidatePath("/");
  if (dados.clienteId) revalidatePath(`/clientes/${dados.clienteId}`);
  if (dados.leadId) revalidatePath("/marketing");

  return { duplicada: false, id: registro.id };
}

export async function salvarMensagemModelo(dados: {
  id: number;
  nome: string;
  corpo: string;
  ativo: boolean;
}) {
  const usuario = await requirePermission("marketing.gerenciar");
  const nome = dados.nome.trim();
  const corpo = dados.corpo.trim();

  if (!nome || !corpo) {
    throw new Error("Nome e texto do modelo são obrigatórios.");
  }

  const modelo = await prisma.mensagemModelo.update({
    where: { id: dados.id },
    data: {
      nome,
      corpo,
      ativo: dados.ativo,
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Comunicação",
      acao: "Atualizou modelo de mensagem",
      entidade: "MensagemModelo",
      entidadeId: String(modelo.id),
      usuario: usuario.email,
      detalhes: modelo.nome,
    },
  });

  revalidatePath("/comunicacoes");
  return modelo;
}
