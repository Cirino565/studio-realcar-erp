"use server";

import { buscarDisponibilidadeAgenda } from "@/actions/agendamento.actions";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { LeadEtapa } from "@/app/(app)/marketing/types";

// O codigo de atendimento vem do clique no botao de WhatsApp da landing page
// (ex.: SR-LIM-GPTPJ). Guardamos sempre em maiusculo e sem espacos para que a
// busca funcione independente de como foi digitado.
function normalizarCodigoAtendimento(valor?: string) {
  const limpo = (valor || "").trim().toUpperCase();
  return limpo || null;
}

export type CriarLeadInput = {
  nome: string;
  telefone?: string;
  origem?: string;
  interesse?: string;
  etapa: string;
  valorPrevisto: number;
  observacoes?: string;
  campanhaId?: number | null;
  codigoAtendimento?: string;
  resolucaoTelefone?: "vincular" | "pessoa_diferente";
  clienteIdVinculo?: number | null;
};

export type AtualizarLeadInput = CriarLeadInput & {
  id: number;
};

function normalizarUtmCampaign(valor?: string) {
  const limpo = (valor || "").trim().toLowerCase();
  return limpo || null;
}

export type CriarCampanhaInput = {
  nome: string;
  canal: string;
  utmCampaign?: string;
  investimento: number;
  leads?: number;
  status: string;
  inicio?: string;
  fim?: string;
  observacoes?: string;
};

export type AgendarAvaliacaoLeadInput = {
  leadId: number;
  profissionalId: number;
  procedimento: string;
  data: string;
  hora: string;
  duracao: number;
  valor: number;
  sinalPago?: boolean;
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

export async function verificarTelefoneLead(telefone?: string | null) {
  await requirePermission("marketing.gerenciar");

  const [clienteExistente, leadAtivo] = await Promise.all([
    localizarClientePorTelefone(telefone),
    localizarLeadAtivoDuplicado(telefone),
  ]);

  return {
    clienteExistente: clienteExistente
      ? {
          id: clienteExistente.id,
          nome: clienteExistente.nome,
          telefone: clienteExistente.telefone,
          whatsapp: clienteExistente.whatsapp,
        }
      : null,
    leadAtivo: leadAtivo
      ? {
          id: leadAtivo.id,
          nome: leadAtivo.nome,
          telefone: leadAtivo.telefone,
          etapa: leadAtivo.etapa,
        }
      : null,
  };
}

async function converterLeadInterno(id: number) {
  const lead = await prisma.lead.findUnique({ where: { id } });

  if (!lead) {
    throw new Error("Lead não encontrado.");
  }

  let clienteId = lead.clienteId;

  if (!clienteId && !lead.ignorarVinculoTelefone) {
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
          campanhaAquisicaoId: lead.campanhaId,
          observacoes: lead.observacoes
            ? `Convertido do CRM. Origem: ${lead.origem || "não informada"}. Observações: ${lead.observacoes}`
            : `Convertido do CRM. Origem: ${lead.origem || "não informada"}.`,
        },
      });
      clienteId = cliente.id;
    }

    if (clienteId && lead.campanhaId) {
      await tx.cliente.updateMany({
        where: { id: clienteId, campanhaAquisicaoId: null },
        data: { campanhaAquisicaoId: lead.campanhaId },
      });
    }

    const atualizado = await tx.lead.update({
      where: { id },
      data: {
        clienteId,
        etapa: "Convertido",
        convertidoEm: new Date(),
        proximoContatoEm: null,
        motivoPerda: null,
        ...chamouWhatsappSeAindaNaoMarcado(lead.chamouWhatsapp),
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

  const [duplicado, clienteExistente] = await Promise.all([
    localizarLeadAtivoDuplicado(dados.telefone),
    localizarClientePorTelefone(dados.telefone),
  ]);

  const pessoaDiferente = dados.resolucaoTelefone === "pessoa_diferente";

  if (duplicado && !pessoaDiferente) {
    throw new Error(
      `Já existe um lead ativo com este telefone: ${duplicado.nome} (${duplicado.etapa}). Confirme explicitamente se o novo cadastro representa outra pessoa que compartilha o mesmo número.`,
    );
  }

  let clienteId: number | null = null;
  let ignorarVinculoTelefone = false;

  if (clienteExistente) {
    if (dados.resolucaoTelefone === "vincular") {
      if (!dados.clienteIdVinculo || dados.clienteIdVinculo !== clienteExistente.id) {
        throw new Error("O cliente selecionado não corresponde ao telefone informado. Revise os dados antes de continuar.");
      }
      clienteId = clienteExistente.id;
    } else if (pessoaDiferente) {
      ignorarVinculoTelefone = true;
    } else {
      throw new Error(
        `Este telefone já pertence ao cliente ${clienteExistente.nome}. Confirme se deseja vincular a oportunidade ao cadastro existente ou cadastrar uma pessoa diferente.`,
      );
    }
  } else if (pessoaDiferente) {
    // Pode haver outro lead ativo com o mesmo telefone, por exemplo em número compartilhado por familiares.
    ignorarVinculoTelefone = Boolean(duplicado);
  }

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
        codigoAtendimento: normalizarCodigoAtendimento(dados.codigoAtendimento),
        clienteId,
        ignorarVinculoTelefone,
      },
    });

    const descricaoCriacao = clienteId
      ? `Lead criado e vinculado ao cliente existente ${clienteExistente?.nome || `#${clienteId}`}, após confirmação manual.`
      : ignorarVinculoTelefone
        ? "Lead criado como pessoa diferente apesar de o telefone também existir em outro cadastro. O vínculo automático por telefone foi desativado para esta oportunidade."
        : "Lead criado no CRM comercial.";

    await tx.leadInteracao.create({
      data: {
        leadId: criado.id,
        tipo: "Criação",
        descricao: descricaoCriacao,
      },
    });

    await tx.auditoria.create({
      data: {
        modulo: "Marketing",
        acao: "Criou lead",
        entidade: "Lead",
        entidadeId: String(criado.id),
        usuario: "Equipe Studio Realçar",
        detalhes: ignorarVinculoTelefone
          ? `${criado.nome} · telefone compartilhado confirmado manualmente`
          : criado.nome,
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
        codigoAtendimento: normalizarCodigoAtendimento(dados.codigoAtendimento),
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

export type ChamouWhatsappStatus = "Chamou" | "Não chamou" | "A verificar";

const CHAMOU_WHATSAPP_VALORES: ChamouWhatsappStatus[] = [
  "A verificar",
  "Chamou",
  "Não chamou",
];

/**
 * Marca se o lead de fato chamou no WhatsApp ou nao. O botao da landing page
 * so abre a conversa com o texto pronto - quem envia de verdade e a pessoa,
 * entao existe codigo gerado sem conversa nenhuma. Isso mede esse vazamento.
 */
export async function atualizarChamouWhatsapp(
  id: number,
  valor: ChamouWhatsappStatus,
) {
  await requirePermission("marketing.gerenciar");

  if (!CHAMOU_WHATSAPP_VALORES.includes(valor)) {
    throw new Error("Valor inválido para o campo Chamou no WhatsApp.");
  }

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: { nome: true, codigoAtendimento: true },
  });
  if (!lead) throw new Error("Lead não encontrado.");

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id },
      data: { chamouWhatsapp: valor },
    });

    await tx.leadInteracao.create({
      data: {
        leadId: id,
        tipo: "Atualização",
        descricao: `Marcado como "${valor}" no WhatsApp${lead.codigoAtendimento ? ` (código ${lead.codigoAtendimento})` : ""}.`,
      },
    });
  });

  revalidatePath("/marketing");
}

/**
 * Sempre que o lead sai de "Novo" por um caminho que so acontece depois de
 * uma conversa de verdade - mover a etapa a mao, agendar, converter - o
 * "Chamou no WhatsApp?" e marcado junto, se ainda estiver em "A verificar".
 * Poupa o segundo clique: quem move o lead ja confirmou que houve conversa.
 *
 * "Perdido" fica de fora de proposito. Ir pra Perdido pode ser porque a
 * pessoa nunca respondeu nada - marcar "Chamou" nesse caso estragaria
 * justamente a métrica que esse campo existe para medir.
 */
function chamouWhatsappSeAindaNaoMarcado(chamouAtual: string) {
  return chamouAtual === "A verificar" ? { chamouWhatsapp: "Chamou" } : {};
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

  const anterior = await prisma.lead.findUnique({
    where: { id },
    select: { etapa: true, nome: true, chamouWhatsapp: true },
  });
  if (!anterior) throw new Error("Lead não encontrado.");

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id },
      data: {
        etapa,
        motivoPerda: null,
        ...chamouWhatsappSeAindaNaoMarcado(anterior.chamouWhatsapp),
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
  const usuario = await requirePermission("marketing.gerenciar");

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new Error("Lead não encontrado.");

  const agora = new Date();
  const proximo = dataSeguimento(proximoContato);

  // Antes, registrar um contato movia sozinho o lead de "Novo" para a
  // proxima etapa - so porque o OPERADOR clicou em abrir o WhatsApp, sem
  // saber se a cliente respondeu de verdade. A regra combinada em 18/08 e
  // clara: o card so muda quando o CLIENTE muda de comportamento, nunca
  // por uma acao do operador. Quem decide mover para "Aguardando resposta"
  // agora e a pessoa que atende, pelo seletor de etapa no proprio cartao.
  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id },
      data: {
        ultimoContatoEm: agora,
        proximoContatoEm: proximo,
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

    await tx.comunicacaoRegistro.create({
      data: {
        clienteId: lead.clienteId,
        leadId: id,
        agendamentoId: lead.agendamentoId,
        destinatarioNome: lead.nome,
        telefone: lead.telefone,
        categoria: "Follow-up comercial",
        canal: "WhatsApp",
        mensagem: "Contato iniciado pelo WhatsApp a partir do CRM.",
        status: "Aberta",
        usuario: usuario.email,
        abertoEm: agora,
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

/**
 * Troca o cliente vinculado a um lead. Serve para corrigir o caso em que a
 * conversão criou um cadastro duplicado (por exemplo, o telefone do lead
 * não bateu com o telefone de um cliente que já existia) - aqui a família
 * escolhe o cliente certo à mão, sem precisar mexer no banco.
 *
 * Se o lead tiver campanha e o cliente escolhido ainda não tiver campanha de
 * aquisição, ela é propagada - mesma regra já usada na conversão normal.
 */
export async function vincularLeadAOutroCliente(leadId: number, clienteId: number) {
  await requirePermission("marketing.gerenciar");

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Lead não encontrado.");

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true, nome: true, campanhaAquisicaoId: true },
  });
  if (!cliente) throw new Error("Cliente não encontrado.");

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: { clienteId },
    });

    if (lead.campanhaId && !cliente.campanhaAquisicaoId) {
      await tx.cliente.update({
        where: { id: clienteId },
        data: { campanhaAquisicaoId: lead.campanhaId },
      });
    }

    await tx.leadInteracao.create({
      data: {
        leadId,
        tipo: "Atualização",
        descricao: `Vínculo corrigido manualmente para o cliente ${cliente.nome} (#${clienteId}).`,
      },
    });

    await tx.auditoria.create({
      data: {
        modulo: "Marketing",
        acao: "Trocou o cliente vinculado ao lead",
        entidade: "Lead",
        entidadeId: String(leadId),
        usuario: "Equipe Studio Realçar",
        detalhes: `${lead.nome} · agora vinculado a ${cliente.nome} (#${clienteId})`,
      },
    });
  });

  revalidatePath("/marketing");
  revalidatePath("/clientes");
  revalidatePath("/");
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
  if (!clienteId && !lead.ignorarVinculoTelefone) {
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
          campanhaAquisicaoId: lead.campanhaId,
          observacoes: `Cliente criado automaticamente a partir do CRM para agendamento de ${procedimento}.`,
        },
      });
      clienteId = cliente.id;
    }

    if (clienteId && lead.campanhaId) {
      await tx.cliente.updateMany({
        where: { id: clienteId, campanhaAquisicaoId: null },
        data: { campanhaAquisicaoId: lead.campanhaId },
      });
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
          data: {
            ...dadosAgendamento,
            ...(dados.sinalPago ? { sinalPago: true } : {}),
          },
        })
      : await tx.agendamento.create({
          data: {
            ...dadosAgendamento,
            sinalPago: Boolean(dados.sinalPago),
          },
        });

    await tx.lead.update({
      where: { id: lead.id },
      data: {
        clienteId,
        agendamentoId: agendamento.id,
        etapa: "Agendado",
        proximoContatoEm: null,
        ...chamouWhatsappSeAindaNaoMarcado(lead.chamouWhatsapp),
      },
    });

    await tx.leadInteracao.create({
      data: {
        leadId: lead.id,
        tipo: agendamentoEditavel ? "Reagendamento" : "Agendamento",
        descricao: `${procedimento} ${agendamentoEditavel ? "reagendado" : "agendado"} para ${dados.data} às ${dados.hora}. Agendamento #${agendamento.id}.${dados.sinalPago ? " Sinal marcado como pago." : ""}`,
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
      // Identificador que o anuncio manda no parametro utm_campaign.
      // E por ele que o clique acha a campanha certa no CRM, ja que o nome
      // aqui e escrito para humano e o do anuncio nao.
      utmCampaign: normalizarUtmCampaign(dados.utmCampaign),
      investimento: limparNumero(dados.investimento),
      leads: 0,
      status: dados.status || "Ativa",
      inicio: dados.inicio ? new Date(`${dados.inicio}T12:00:00-03:00`) : null,
      fim: dados.fim ? new Date(`${dados.fim}T12:00:00-03:00`) : null,
      observacoes: limparTexto(dados.observacoes),
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

export async function atualizarCampanha(dados: CriarCampanhaInput & { id: number }) {
  await requirePermission("marketing.gerenciar");

  const nome = dados.nome.trim();
  const canal = dados.canal.trim();

  if (!nome || !canal) {
    throw new Error("Nome e canal da campanha são obrigatórios.");
  }

  const campanha = await prisma.campanhaMarketing.update({
    where: { id: dados.id },
    data: {
      nome,
      canal,
      utmCampaign: normalizarUtmCampaign(dados.utmCampaign),
      investimento: limparNumero(dados.investimento),
      status: dados.status || "Ativa",
      inicio: dados.inicio ? new Date(`${dados.inicio}T12:00:00-03:00`) : null,
      fim: dados.fim ? new Date(`${dados.fim}T12:00:00-03:00`) : null,
      observacoes: limparTexto(dados.observacoes),
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Marketing",
      acao: "Atualizou campanha",
      entidade: "CampanhaMarketing",
      entidadeId: String(campanha.id),
      usuario: "Equipe Studio Realçar",
      detalhes: campanha.nome,
    },
  });

  revalidatePath("/marketing");
}

export async function vincularClienteCampanha(dados: {
  clienteId: number;
  campanhaId: number;
  vincularReceitasExistentes?: boolean;
}) {
  const usuario = await requirePermission("marketing.gerenciar");
  const clienteId = Math.trunc(Number(dados.clienteId));
  const campanhaId = Math.trunc(Number(dados.campanhaId));

  const [cliente, campanha] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true, nome: true } }),
    prisma.campanhaMarketing.findUnique({ where: { id: campanhaId }, select: { id: true, nome: true } }),
  ]);
  if (!cliente) throw new Error("Cliente não encontrada.");
  if (!campanha) throw new Error("Campanha não encontrada.");

  const resultado = await prisma.$transaction(async (tx) => {
    await tx.cliente.update({
      where: { id: cliente.id },
      data: { campanhaAquisicaoId: campanha.id },
    });

    let vendas = 0;
    let lancamentos = 0;
    if (dados.vincularReceitasExistentes) {
      vendas = (
        await tx.venda.updateMany({
          where: {
            clienteId: cliente.id,
            situacao: { not: "CANCELADA" },
            campanhaId: null,
          },
          data: { campanhaId: campanha.id },
        })
      ).count;

      lancamentos = (
        await tx.lancamento.updateMany({
          where: {
            clienteId: cliente.id,
            tipo: "ENTRADA",
            statusPagamento: { not: "Cancelado" },
            campanhaId: null,
          },
          data: { campanhaId: campanha.id },
        })
      ).count;
    }

    await tx.auditoria.create({
      data: {
        modulo: "Marketing",
        acao: "Vinculou cliente à campanha",
        entidade: "Cliente",
        entidadeId: String(cliente.id),
        usuario: usuario.email,
        detalhes: `${cliente.nome} -> ${campanha.nome}. Receitas retroativas: ${dados.vincularReceitasExistentes ? "sim" : "não"}. Vendas: ${vendas}. Lançamentos: ${lancamentos}.`,
      },
    });

    return { vendas, lancamentos };
  });

  revalidatePath("/marketing");
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${cliente.id}`);
  revalidatePath("/vendas");
  revalidatePath("/financeiro");
  revalidatePath("/");

  return { ok: true, ...resultado };
}

export async function vincularReceitaCampanha(dados: {
  lancamentoId: number;
  campanhaId: number;
}) {
  const usuario = await requirePermission("marketing.gerenciar");
  const lancamentoId = Math.trunc(Number(dados.lancamentoId));
  const campanhaId = Math.trunc(Number(dados.campanhaId));

  const [lancamento, campanha] = await Promise.all([
    prisma.lancamento.findUnique({
      where: { id: lancamentoId },
      select: {
        id: true,
        descricao: true,
        valor: true,
        tipo: true,
        statusPagamento: true,
        campanhaId: true,
        venda: { select: { id: true } },
      },
    }),
    prisma.campanhaMarketing.findUnique({
      where: { id: campanhaId },
      select: { id: true, nome: true },
    }),
  ]);

  if (!lancamento) throw new Error("Receita não encontrada.");
  if (!campanha) throw new Error("Campanha não encontrada.");
  if (lancamento.tipo !== "ENTRADA") throw new Error("Somente receitas podem ser vinculadas à campanha.");
  if (lancamento.statusPagamento.toLowerCase() === "cancelado") {
    throw new Error("Uma receita cancelada não pode ser vinculada.");
  }
  if (lancamento.campanhaId && lancamento.campanhaId !== campanha.id) {
    throw new Error("Esta receita já pertence a outra campanha.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.lancamento.update({
      where: { id: lancamento.id },
      data: { campanhaId: campanha.id },
    });

    if (lancamento.venda) {
      await tx.venda.updateMany({
        where: { id: lancamento.venda.id, situacao: { not: "CANCELADA" } },
        data: { campanhaId: campanha.id },
      });
    }

    await tx.auditoria.create({
      data: {
        modulo: "Marketing",
        acao: "Vinculou receita à campanha",
        entidade: "Lancamento",
        entidadeId: String(lancamento.id),
        usuario: usuario.email,
        detalhes: `${lancamento.descricao} · R$ ${lancamento.valor.toFixed(2)} -> ${campanha.nome}.`,
      },
    });
  });

  revalidatePath("/marketing");
  revalidatePath("/financeiro");
  revalidatePath("/vendas");
  revalidatePath("/gestao");
  revalidatePath("/");

  return { ok: true };
}

export async function registrarCustoCampanha(dados: {
  campanhaId: number;
  descricao: string;
  valor: number;
  data: string;
  contaFinanceiraId?: number | null;
  observacoes?: string;
}) {
  const usuario = await requirePermission("marketing.gerenciar");
  await requirePermission("financeiro.gerenciar");

  const campanhaId = Math.trunc(Number(dados.campanhaId));
  const valor = Math.round(Math.max(0, Number(dados.valor) || 0) * 100) / 100;
  if (valor <= 0) throw new Error("Informe um custo maior que zero.");
  if (!dados.descricao.trim()) throw new Error("Informe a descrição do custo.");

  const campanha = await prisma.campanhaMarketing.findUnique({
    where: { id: campanhaId },
    select: { id: true, nome: true },
  });
  if (!campanha) throw new Error("Campanha não encontrada.");

  const contaId =
    dados.contaFinanceiraId ||
    (
      await prisma.contaFinanceira.findFirst({
        where: { principal: true, status: "Ativa" },
        select: { id: true },
      })
    )?.id ||
    null;

  if (!contaId) {
    throw new Error("Cadastre e selecione uma conta financeira antes de lançar o custo da campanha.");
  }

  const lancamento = await prisma.lancamento.create({
    data: {
      descricao: dados.descricao.trim(),
      valor,
      valorLiquido: valor,
      tipo: "SAIDA",
      categoria: "Marketing",
      observacoes: limparTexto(dados.observacoes),
      data: new Date(`${dados.data}T12:00:00-03:00`),
      statusPagamento: "Pago",
      origem: "Marketing",
      campanhaId: campanha.id,
      contaFinanceiraId: contaId,
    },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Marketing",
      acao: "Lançou custo de campanha",
      entidade: "Lancamento",
      entidadeId: String(lancamento.id),
      usuario: usuario.email,
      detalhes: `${campanha.nome}. R$ ${valor.toFixed(2)}.`,
    },
  });

  revalidatePath("/marketing");
  revalidatePath("/financeiro");
  revalidatePath("/gestao");
  revalidatePath("/");

  return { ok: true, lancamentoId: lancamento.id };
}

export async function excluirCampanha(id: number) {
  await requirePermission("marketing.gerenciar");
  const [clientes, leads, vendas, lancamentos] = await Promise.all([
    prisma.cliente.count({ where: { campanhaAquisicaoId: id } }),
    prisma.lead.count({ where: { campanhaId: id } }),
    prisma.venda.count({ where: { campanhaId: id } }),
    prisma.lancamento.count({ where: { campanhaId: id } }),
  ]);
  if (clientes + leads + vendas + lancamentos > 0) {
    throw new Error("A campanha possui clientes, leads, vendas ou custos vinculados. Pause ou finalize a campanha em vez de excluí-la.");
  }
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