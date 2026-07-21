"use server";

import { buscarDisponibilidadeAgenda } from "@/actions/agendamento.actions";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { LeadEtapa } from "@/app/(app)/marketing/types";

export type CriarLeadInput = {
  nome: string;
  telefone?: string;
  origem?: string;
  interesse?: string;
  etapa: string;
  valorPrevisto: number;
  observacoes?: string;
  campanhaId?: number | null;
};

export type AtualizarLeadInput = CriarLeadInput & {
  id: number;
};

export type CriarCampanhaInput = {
  nome: string;
  canal: string;
  investimento: number;
  leads?: number;
  status: string;
  inicio?: string;
  fim?: string;
};

export type AgendarAvaliacaoLeadInput = {
  leadId: number;
  profissionalId: number;
  procedimento: string;
  data: string;
  hora: string;
  duracao: number;
  valor: number;
};

function limparTexto(value?: string | null) {
  const texto = value?.trim();
  return texto ? texto : null;
}

function limparNumero(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function normalizarTelefone(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

function dataSeguimento(value?: string | null) {
  if (!value) return null;
  return new Date(`${value}T12:00:00-03:00`);
}

async function localizarClientePorTelefone(telefone?: string | null) {
  const alvo = normalizarTelefone(telefone);
  if (alvo.length < 8) return null;

  const candidatos = await prisma.cliente.findMany({
    where: {
      OR: [{ telefone: { not: "" } }, { whatsapp: { not: null } }],
    },
    select: {
      id: true,
      nome: true,
      telefone: true,
      whatsapp: true,
    },
    take: 1500,
  });

  return (
    candidatos.find((cliente) => {
      const telefoneCliente = normalizarTelefone(cliente.telefone);
      const whatsappCliente = normalizarTelefone(cliente.whatsapp);
      return telefoneCliente === alvo || whatsappCliente === alvo;
    }) || null
  );
}

async function localizarLeadAtivoDuplicado(telefone?: string | null, ignoreId?: number) {
  const alvo = normalizarTelefone(telefone);
  if (alvo.length < 8) return null;

  const candidatos = await prisma.lead.findMany({
    where: {
      telefone: { not: null },
      etapa: { notIn: ["Convertido", "Perdido"] },
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
    },
    select: {
      id: true,
      nome: true,
      telefone: true,
      etapa: true,
    },
    take: 1500,
  });

  return candidatos.find((lead) => normalizarTelefone(lead.telefone) === alvo) || null;
}

async function registrarInteracao(leadId: number, tipo: string, descricao?: string | null) {
  await prisma.leadInteracao.create({
    data: {
      leadId,
      tipo,
      descricao: limparTexto(descricao),
    },
  });
}

async function converterLeadInterno(id: number) {
  const lead = await prisma.lead.findUnique({ where: { id } });

  if (!lead) {
    throw new Error("Lead não encontrado.");
  }

  let clienteId = lead.clienteId;

  if (!clienteId) {
    const existente = await localizarClientePorTelefone(lead.telefone);
    clienteId = existente?.id || null;
  }

  const resultado = await prisma.$transaction(async (tx) => {
    if (!clienteId) {
      const cliente = await tx.cliente.create({
        data: {
          nome: lead.nome,
          telefone: lead.telefone?.trim() || "Não informado",
          whatsapp: limparTexto(lead.telefone),
          origem: limparTexto(lead.origem),
          procedimentoInteresse: limparTexto(lead.interesse),
          procedimento: limparTexto(lead.interesse),
          valorGasto: 0,
          status: "Ativa",
          observacoes: lead.observacoes
            ? `Convertido do CRM. Origem: ${lead.origem || "não informada"}. Observações: ${lead.observacoes}`
            : `Convertido do CRM. Origem: ${lead.origem || "não informada"}.`,
        },
      });
      clienteId = cliente.id;
    }

    const atualizado = await tx.lead.update({
      where: { id },
      data: {
        clienteId,
        etapa: "Convertido",
        convertidoEm: new Date(),
        proximoContatoEm: null,
        motivoPerda: null,
      },
    });

    await tx.leadInteracao.create({
      data: {
        leadId: id,
        tipo: "Conversão",
        descricao: `Lead convertido e vinculado ao cliente #${clienteId}.`,
      },
    });

    await tx.auditoria.create({
      data: {
        modulo: "Marketing",
        acao: "Converteu lead em cliente",
        entidade: "Lead",
        entidadeId: String(id),
        usuario: "Equipe Studio Realçar",
        detalhes: `${lead.nome} · cliente #${clienteId}`,
      },
    });

    return atualizado;
  });

  return { lead: resultado, clienteId: clienteId! };
}

export async function criarLead(dados: CriarLeadInput) {
  await requirePermission("marketing.gerenciar");
  const nome = dados.nome.trim();

  if (!nome) {
    throw new Error("Nome do lead é obrigatório.");
  }

  const duplicado = await localizarLeadAtivoDuplicado(dados.telefone);
  if (duplicado) {
    throw new Error(
      `Já existe um lead ativo com este telefone: ${duplicado.nome} (${duplicado.etapa}). Abra o cadastro existente em vez de duplicar.`,
    );
  }

  const clienteExistente = await localizarClientePorTelefone(dados.telefone);

  const lead = await prisma.$transaction(async (tx) => {
    const criado = await tx.lead.create({
      data: {
        nome,
        telefone: limparTexto(dados.telefone),
        origem: limparTexto(dados.origem),
        interesse: limparTexto(dados.interesse),
        etapa: dados.etapa || "Novo",
        valorPrevisto: limparNumero(dados.valorPrevisto),
        observacoes: limparTexto(dados.observacoes),
        campanhaId: dados.campanhaId || null,
        clienteId: clienteExistente?.id || null,
      },
    });

    await tx.leadInteracao.create({
      data: {
        leadId: criado.id,
        tipo: "Criação",
        descricao: clienteExistente
          ? `Lead criado e vinculado ao cliente existente ${clienteExistente.nome}.`
          : "Lead criado no CRM comercial.",
      },
    });

    await tx.auditoria.create({
      data: {
        modulo: "Marketing",
        acao: "Criou lead",
        entidade: "Lead",
        entidadeId: String(criado.id),
        usuario: "Equipe Studio Realçar",
        detalhes: criado.nome,
      },
    });

    return criado;
  });

  revalidatePath("/marketing");
  revalidatePath("/");
  return lead;
}

export async function atualizarLead(dados: AtualizarLeadInput) {
  await requirePermission("marketing.gerenciar");

  if (!dados.id || !dados.nome.trim()) {
    throw new Error("Lead inválido ou nome não informado.");
  }

  const duplicado = await localizarLeadAtivoDuplicado(dados.telefone, dados.id);
  if (duplicado) {
    throw new Error(
      `Já existe outro lead ativo com este telefone: ${duplicado.nome} (${duplicado.etapa}).`,
    );
  }

  const lead = await prisma.$transaction(async (tx) => {
    const atualizado = await tx.lead.update({
      where: { id: dados.id },
      data: {
        nome: dados.nome.trim(),
        telefone: limparTexto(dados.telefone),
        origem: limparTexto(dados.origem),
        interesse: limparTexto(dados.interesse),
        valorPrevisto: limparNumero(dados.valorPrevisto),
        observacoes: limparTexto(dados.observacoes),
        campanhaId: dados.campanhaId || null,
      },
    });

    await tx.leadInteracao.create({
      data: {
        leadId: dados.id,
        tipo: "Atualização",
        descricao: "Dados comerciais do lead atualizados.",
      },
    });

    return atualizado;
  });

  revalidatePath("/marketing");
  revalidatePath("/");
  return lead;
}

export async function atualizarEtapaLead(id: number, etapa: LeadEtapa) {
  await requirePermission("marketing.gerenciar");

  if (etapa === "Convertido") {
    await converterLeadInterno(id);
    revalidatePath("/marketing");
    revalidatePath("/clientes");
    revalidatePath("/");
    return;
  }

  if (etapa === "Perdido") {
    throw new Error("Informe o motivo da perda para encerrar este lead.");
  }

  const anterior = await prisma.lead.findUnique({ where: { id }, select: { etapa: true, nome: true } });
  if (!anterior) throw new Error("Lead não encontrado.");

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id },
      data: {
        etapa,
        motivoPerda: null,
      },
    });

    if (anterior.etapa !== etapa) {
      await tx.leadInteracao.create({
        data: {
          leadId: id,
          tipo: "Etapa",
          descricao: `${anterior.etapa} → ${etapa}`,
        },
      });
    }
  });

  revalidatePath("/marketing");
  revalidatePath("/");
}

export async function marcarLeadPerdido(id: number, motivo: string) {
  await requirePermission("marketing.gerenciar");
  const motivoLimpo = motivo.trim();

  if (!motivoLimpo) {
    throw new Error("Informe o motivo da perda.");
  }

  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.update({
      where: { id },
      data: {
        etapa: "Perdido",
        motivoPerda: motivoLimpo,
        proximoContatoEm: null,
      },
    });

    await tx.leadInteracao.create({
      data: {
        leadId: id,
        tipo: "Perda",
        descricao: motivoLimpo,
      },
    });

    await tx.auditoria.create({
      data: {
        modulo: "Marketing",
        acao: "Marcou lead como perdido",
        entidade: "Lead",
        entidadeId: String(id),
        usuario: "Equipe Studio Realçar",
        detalhes: `${lead.nome} · ${motivoLimpo}`,
      },
    });
  });

  revalidatePath("/marketing");
  revalidatePath("/");
}

export async function registrarContatoLead(id: number, proximoContato?: string | null) {
  await requirePermission("marketing.gerenciar");

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new Error("Lead não encontrado.");

  const agora = new Date();
  const proximo = dataSeguimento(proximoContato);
  const novaEtapa = lead.etapa === "Novo" ? "Contato" : lead.etapa;

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id },
      data: {
        ultimoContatoEm: agora,
        proximoContatoEm: proximo,
        etapa: novaEtapa,
      },
    });

    await tx.leadInteracao.create({
      data: {
        leadId: id,
        tipo: "WhatsApp",
        descricao: proximo
          ? `Contato iniciado pelo WhatsApp. Próximo acompanhamento programado para ${proximoContato}.`
          : "Contato iniciado pelo WhatsApp.",
      },
    });
  });

  revalidatePath("/marketing");
  revalidatePath("/");
}

export async function definirProximoContatoLead(id: number, data?: string | null) {
  await requirePermission("marketing.gerenciar");
  const proximo = dataSeguimento(data);

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id },
      data: { proximoContatoEm: proximo },
    });

    await tx.leadInteracao.create({
      data: {
        leadId: id,
        tipo: "Follow-up",
        descricao: proximo
          ? `Próximo contato programado para ${data}.`
          : "Programação de próximo contato removida.",
      },
    });
  });

  revalidatePath("/marketing");
  revalidatePath("/");
}

export async function registrarObservacaoLead(id: number, descricao: string) {
  await requirePermission("marketing.gerenciar");
  const texto = descricao.trim();
  if (!texto) throw new Error("Digite uma observação.");

  await registrarInteracao(id, "Observação", texto);
  revalidatePath("/marketing");
}

export async function converterLeadEmCliente(id: number) {
  await requirePermission("marketing.gerenciar");
  const resultado = await converterLeadInterno(id);

  revalidatePath("/marketing");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${resultado.clienteId}`);
  revalidatePath("/");

  return resultado;
}

export async function agendarAvaliacaoLead(dados: AgendarAvaliacaoLeadInput) {
  await requirePermission("marketing.gerenciar");
  await requirePermission("agenda.gerenciar");

  if (!dados.leadId || !dados.profissionalId || !dados.data || !dados.hora) {
    throw new Error("Preencha profissional, data e horário da avaliação.");
  }

  const procedimento = dados.procedimento.trim() || "Avaliação";
  const duracao = Math.max(15, Math.trunc(Number(dados.duracao) || 30));
  const valor = Math.max(0, Number(dados.valor) || 0);

  const lead = await prisma.lead.findUnique({
    where: { id: dados.leadId },
    include: {
      agendamento: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });
  if (!lead) throw new Error("Lead não encontrado.");
  if (["Convertido", "Perdido"].includes(lead.etapa)) {
    throw new Error("Este lead já está encerrado. Reabra a oportunidade antes de agendar.");
  }

  const agendamentoEditavel =
    lead.agendamento &&
    !["Atendido", "Em atendimento", "Cancelado"].includes(lead.agendamento.status)
      ? lead.agendamento
      : null;

  const disponibilidade = await buscarDisponibilidadeAgenda({
    profissionalId: dados.profissionalId,
    data: dados.data,
    duracao,
    ignoreId: agendamentoEditavel?.id,
  });

  const horario = disponibilidade.find((item) => item.hora === dados.hora);
  if (!horario) {
    throw new Error("O horário escolhido está fora do expediente ou não corresponde ao intervalo configurado da agenda.");
  }
  if (!horario.disponivel) {
    throw new Error(`Horário indisponível: ${horario.motivo || "já existe um compromisso neste período"}.`);
  }

  let clienteId = lead.clienteId;
  if (!clienteId) {
    const existente = await localizarClientePorTelefone(lead.telefone);
    clienteId = existente?.id || null;
  }

  const dataHora = new Date(`${dados.data}T${dados.hora}:00-03:00`);

  const resultado = await prisma.$transaction(async (tx) => {
    if (!clienteId) {
      const cliente = await tx.cliente.create({
        data: {
          nome: lead.nome,
          telefone: lead.telefone?.trim() || "Não informado",
          whatsapp: limparTexto(lead.telefone),
          origem: limparTexto(lead.origem),
          procedimentoInteresse: limparTexto(lead.interesse) || procedimento,
          valorGasto: 0,
          status: "Ativa",
          observacoes: `Cliente criado automaticamente a partir do CRM para agendamento de ${procedimento}.`,
        },
      });
      clienteId = cliente.id;
    }

    const dadosAgendamento = {
      clienteId: clienteId!,
      profissionalId: dados.profissionalId,
      procedimento,
      data: dataHora,
      duracao,
      valor,
      status: "Agendado",
      observacoes: `Originado do CRM comercial. Lead #${lead.id}.`,
    };

    const agendamento = agendamentoEditavel
      ? await tx.agendamento.update({
          where: { id: agendamentoEditavel.id },
          data: dadosAgendamento,
        })
      : await tx.agendamento.create({
          data: dadosAgendamento,
        });

    await tx.lead.update({
      where: { id: lead.id },
      data: {
        clienteId,
        agendamentoId: agendamento.id,
        etapa: "Avaliação",
        proximoContatoEm: null,
      },
    });

    await tx.leadInteracao.create({
      data: {
        leadId: lead.id,
        tipo: agendamentoEditavel ? "Reagendamento" : "Agendamento",
        descricao: `${procedimento} ${agendamentoEditavel ? "reagendado" : "agendado"} para ${dados.data} às ${dados.hora}. Agendamento #${agendamento.id}.`,
      },
    });

    await tx.auditoria.create({
      data: {
        modulo: "Marketing",
        acao: agendamentoEditavel ? "Reagendou avaliação de lead" : "Agendou avaliação de lead",
        entidade: "Lead",
        entidadeId: String(lead.id),
        usuario: "Equipe Studio Realçar",
        detalhes: `${lead.nome} · ${procedimento} · ${dados.data} ${dados.hora}`,
      },
    });

    return { agendamentoId: agendamento.id, clienteId: clienteId! };
  });

  revalidatePath("/marketing");
  revalidatePath("/agenda");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${resultado.clienteId}`);
  revalidatePath("/");

  return resultado;
}

export async function excluirLead(id: number) {
  await requirePermission("marketing.gerenciar");
  const lead = await prisma.lead.delete({ where: { id } });

  await prisma.auditoria.create({
    data: {
      modulo: "Marketing",
      acao: "Excluiu lead",
      entidade: "Lead",
      entidadeId: String(id),
      usuario: "Equipe Studio Realçar",
      detalhes: lead.nome,
    },
  });

  revalidatePath("/marketing");
  revalidatePath("/");
}

export async function criarCampanha(dados: CriarCampanhaInput) {
  await requirePermission("marketing.gerenciar");
  const nome = dados.nome.trim();
  const canal = dados.canal.trim();

  if (!nome || !canal) {
    throw new Error("Nome e canal da campanha são obrigatórios.");
  }

  const campanha = await prisma.campanhaMarketing.create({
    data: {
      nome,
      canal,
      investimento: limparNumero(dados.investimento),
      leads: 0,
      status: dados.status || "Ativa",
      inicio: dados.inicio ? new Date(`${dados.inicio}T12:00:00-03:00`) : null,
      fim: dados.fim ? new Date(`${dados.fim}T12:00:00-03:00`) : null,
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Marketing",
      acao: "Criou campanha",
      entidade: "CampanhaMarketing",
      entidadeId: String(campanha.id),
      usuario: "Equipe Studio Realçar",
      detalhes: campanha.nome,
    },
  });

  revalidatePath("/marketing");
}

export async function excluirCampanha(id: number) {
  await requirePermission("marketing.gerenciar");
  const campanha = await prisma.campanhaMarketing.delete({ where: { id } });

  await prisma.auditoria.create({
    data: {
      modulo: "Marketing",
      acao: "Excluiu campanha",
      entidade: "CampanhaMarketing",
      entidadeId: String(id),
      usuario: "Equipe Studio Realçar",
      detalhes: campanha.nome,
    },
  });

  revalidatePath("/marketing");
}
