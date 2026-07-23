"use server";

import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { MODELOS_ANAMNESE_STUDIO } from "@/lib/anamnese-modelos-studio";

const TIPOS_PERGUNTA = new Set([
  "SECAO",
  "SIM_NAO",
  "TEXTO_CURTO",
  "TEXTO_LONGO",
  "MULTIPLA_ESCOLHA",
  "MULTIPLA_SELECAO",
  "ACEITE",
  "NUMERO",
]);

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getNumber(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) return 0;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

async function auditar(acao: string, entidade: string, detalhes: string) {
  await prisma.auditoria.create({
    data: {
      modulo: "Configurações",
      acao,
      entidade,
      usuario: "Sistema",
      detalhes,
    },
  });
}

async function resolverProcedimentoId(
  procedimentoNome: string | null,
  procedimentoIdInformado?: number | null,
  aliases: string[] = [],
) {
  if (procedimentoIdInformado) return procedimentoIdInformado;
  if (!procedimentoNome) return null;

  const nomes = [procedimentoNome, ...aliases].filter(Boolean);
  const servico = await prisma.procedimentoServico.findFirst({
    where: {
      OR: nomes.map((nome) => ({
        nome: { equals: nome, mode: "insensitive" as const },
      })),
    },
    select: { id: true },
  });

  return servico?.id ?? null;
}

function revalidarAnamnese() {
  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
}

export async function criarModelosAnamnesePadrao() {
  const usuario = await requirePermission("configuracoes.gerenciar");

  for (const [index, definicao] of MODELOS_ANAMNESE_STUDIO.entries()) {
    const nomesBusca = [definicao.procedimentoNome, ...(definicao.aliases ?? [])];

    const modeloExistente = await prisma.anamneseModelo.findFirst({
      where: {
        OR: nomesBusca.map((nome) => ({
          procedimentoNome: { equals: nome, mode: "insensitive" as const },
        })),
      },
      include: {
        perguntas: { orderBy: [{ ordem: "asc" }, { id: "asc" }] },
      },
    });

    const procedimentoId = await resolverProcedimentoId(
      definicao.procedimentoNome,
      null,
      definicao.aliases ?? [],
    );

    const modelo = modeloExistente
      ? await prisma.anamneseModelo.update({
          where: { id: modeloExistente.id },
          data: {
            nome: `Anamnese - ${definicao.procedimentoNome}`,
            procedimentoId,
            procedimentoNome: definicao.procedimentoNome,
            descricao: definicao.descricao,
            status: "Ativo",
            ordem: index + 1,
          },
        })
      : await prisma.anamneseModelo.create({
          data: {
            nome: `Anamnese - ${definicao.procedimentoNome}`,
            procedimentoId,
            procedimentoNome: definicao.procedimentoNome,
            descricao: definicao.descricao,
            status: "Ativo",
            ordem: index + 1,
          },
        });

    const existentes = modeloExistente?.perguntas ?? [];
    const textosNovos = new Set(definicao.perguntas.map((item) => item.pergunta));

    for (const perguntaExistente of existentes) {
      if (textosNovos.has(perguntaExistente.pergunta)) continue;

      const possuiHistorico =
        (await prisma.clienteAnamneseResposta.count({
          where: { perguntaId: perguntaExistente.id },
        })) > 0;

      if (possuiHistorico) {
        await prisma.anamnesePergunta.update({
          where: { id: perguntaExistente.id },
          data: { ativa: false },
        });
      } else {
        await prisma.anamnesePergunta.delete({ where: { id: perguntaExistente.id } });
      }
    }

    for (const [perguntaIndex, item] of definicao.perguntas.entries()) {
      const existente = existentes.find(
        (pergunta) => pergunta.pergunta === item.pergunta,
      );
      const data = {
        modeloId: modelo.id,
        pergunta: item.pergunta,
        tipo: item.tipo,
        opcoes: item.opcoes?.join("\n") ?? null,
        obrigatoria: item.tipo === "SECAO" ? false : Boolean(item.obrigatoria),
        ativa: true,
        ordem: perguntaIndex + 1,
      };

      if (existente) {
        await prisma.anamnesePergunta.update({
          where: { id: existente.id },
          data,
        });
      } else {
        await prisma.anamnesePergunta.create({ data });
      }
    }
  }

  await prisma.auditoria.create({
    data: {
      modulo: "Configurações",
      acao: "Sincronizou modelos de anamnese Studio Realçar",
      entidade: "AnamneseModelo",
      usuario: usuario.nome || usuario.email,
      detalhes: `${MODELOS_ANAMNESE_STUDIO.length} modelos clínicos sincronizados com preservação do histórico`,
    },
  });

  revalidarAnamnese();
}

export async function criarModeloAnamnese(formData: FormData) {
  await requirePermission("configuracoes.gerenciar");

  const procedimentoNome = getString(formData, "procedimentoNome");
  const nomeInformado = getString(formData, "nome");
  const procedimentoIdInformado = getNumber(formData, "procedimentoId") || null;
  const nome =
    nomeInformado ||
    (procedimentoNome ? `Anamnese - ${procedimentoNome}` : null);

  if (!nome) return;

  const procedimentoId = await resolverProcedimentoId(
    procedimentoNome,
    procedimentoIdInformado,
  );

  await prisma.anamneseModelo.create({
    data: {
      nome,
      procedimentoId,
      procedimentoNome,
      descricao: getString(formData, "descricao"),
      status: getString(formData, "status") || "Ativo",
      ordem: getNumber(formData, "ordem"),
    },
  });

  await auditar("Criou modelo de anamnese", "AnamneseModelo", nome);
  revalidarAnamnese();
}

export async function atualizarModeloAnamnese(formData: FormData) {
  await requirePermission("configuracoes.gerenciar");

  const id = getNumber(formData, "id");
  const nome = getString(formData, "nome");
  const procedimentoNome = getString(formData, "procedimentoNome");
  const procedimentoIdInformado = getNumber(formData, "procedimentoId") || null;

  if (!id || !nome) return;

  const procedimentoId = await resolverProcedimentoId(
    procedimentoNome,
    procedimentoIdInformado,
  );

  await prisma.anamneseModelo.update({
    where: { id },
    data: {
      nome,
      procedimentoId,
      procedimentoNome,
      descricao: getString(formData, "descricao"),
      status: getString(formData, "status") || "Ativo",
      ordem: getNumber(formData, "ordem"),
    },
  });

  await auditar("Atualizou modelo de anamnese", "AnamneseModelo", nome);
  revalidarAnamnese();
}

export async function duplicarModeloAnamnese(id: number) {
  await requirePermission("configuracoes.gerenciar");
  if (!id) return;

  const origem = await prisma.anamneseModelo.findUnique({
    where: { id },
    include: {
      perguntas: { orderBy: [{ ordem: "asc" }, { id: "asc" }] },
    },
  });

  if (!origem) return;

  const copia = await prisma.anamneseModelo.create({
    data: {
      nome: `${origem.nome} (Cópia)`,
      procedimentoId: null,
      procedimentoNome: null,
      descricao: origem.descricao,
      status: "Inativo",
      ordem: origem.ordem + 1,
    },
  });

  if (origem.perguntas.length > 0) {
    await prisma.anamnesePergunta.createMany({
      data: origem.perguntas.map((pergunta) => ({
        modeloId: copia.id,
        pergunta: pergunta.pergunta,
        tipo: pergunta.tipo,
        opcoes: pergunta.opcoes,
        obrigatoria: pergunta.obrigatoria,
        ativa: pergunta.ativa,
        ordem: pergunta.ordem,
      })),
    });
  }

  await auditar(
    "Duplicou modelo de anamnese",
    "AnamneseModelo",
    `${origem.nome} -> ${copia.nome}`,
  );
  revalidarAnamnese();
}

export async function excluirModeloAnamnese(id: number) {
  await requirePermission("configuracoes.gerenciar");
  if (!id) return;

  const modelo = await prisma.anamneseModelo.findUnique({
    where: { id },
    select: { id: true, nome: true, status: true },
  });

  if (!modelo) return;

  const possuiHistorico =
    (await prisma.clienteAnamneseResposta.count({
      where: { modeloId: id },
    })) > 0;

  if (possuiHistorico) {
    await prisma.$transaction([
      prisma.anamneseModelo.update({
        where: { id },
        data: { status: "Inativo" },
      }),
      prisma.anamnesePergunta.updateMany({
        where: { modeloId: id },
        data: { ativa: false },
      }),
    ]);

    await auditar(
      "Desativou modelo de anamnese com histórico",
      "AnamneseModelo",
      modelo.nome,
    );
  } else {
    await prisma.anamneseModelo.delete({ where: { id } });
    await auditar(
      "Excluiu modelo de anamnese",
      "AnamneseModelo",
      modelo.nome,
    );
  }

  revalidarAnamnese();
}

export async function criarPerguntaAnamnese(formData: FormData) {
  await requirePermission("configuracoes.gerenciar");
  const modeloId = getNumber(formData, "modeloId");
  const pergunta = getString(formData, "pergunta");
  const tipo = getString(formData, "tipo") || "SIM_NAO";

  if (!modeloId || !pergunta) return;

  await prisma.anamnesePergunta.create({
    data: {
      modeloId,
      pergunta,
      tipo: TIPOS_PERGUNTA.has(tipo) ? tipo : "SIM_NAO",
      opcoes: getString(formData, "opcoes"),
      obrigatoria: getBoolean(formData, "obrigatoria"),
      ativa: true,
      ordem: getNumber(formData, "ordem"),
    },
  });

  await auditar("Criou pergunta de anamnese", "AnamnesePergunta", pergunta);
  revalidarAnamnese();
}

export async function atualizarPerguntaAnamnese(formData: FormData) {
  await requirePermission("configuracoes.gerenciar");
  const id = getNumber(formData, "id");
  const pergunta = getString(formData, "pergunta");
  const tipo = getString(formData, "tipo") || "SIM_NAO";

  if (!id || !pergunta) return;

  await prisma.anamnesePergunta.update({
    where: { id },
    data: {
      pergunta,
      tipo: TIPOS_PERGUNTA.has(tipo) ? tipo : "SIM_NAO",
      opcoes: getString(formData, "opcoes"),
      obrigatoria: getBoolean(formData, "obrigatoria"),
      ativa: getBoolean(formData, "ativa"),
      ordem: getNumber(formData, "ordem"),
    },
  });

  await auditar("Atualizou pergunta de anamnese", "AnamnesePergunta", pergunta);
  revalidarAnamnese();
}

export async function excluirPerguntaAnamnese(id: number) {
  await requirePermission("configuracoes.gerenciar");
  const pergunta = await prisma.anamnesePergunta.findUnique({ where: { id } });
  if (!pergunta) return;

  const possuiRespostas =
    (await prisma.clienteAnamneseResposta.count({
      where: { perguntaId: id },
    })) > 0;

  if (possuiRespostas) {
    await prisma.anamnesePergunta.update({
      where: { id },
      data: { ativa: false },
    });
    await auditar(
      "Desativou pergunta de anamnese com histórico",
      "AnamnesePergunta",
      pergunta.pergunta,
    );
  } else {
    await prisma.anamnesePergunta.delete({ where: { id } });
    await auditar(
      "Excluiu pergunta de anamnese",
      "AnamnesePergunta",
      pergunta.pergunta,
    );
  }

  revalidarAnamnese();
}

type RespostaRecebida = {
  clienteId: number;
  modeloId: number | null;
  perguntaId: number | null;
  procedimento: string | null;
  perguntaTexto: string;
  tipo: string;
  resposta: string | null;
  observacao: string | null;
  profissional: string | null;
  dataResposta: Date;
};

function lerRespostasFormulario(
  formData: FormData,
  clienteId: number,
  modeloId: number | null,
  procedimento: string | null,
  profissional: string | null,
  dataFicha: Date,
  total: number,
) {
  return Array.from({ length: total }, (_, index) => {
    const perguntaId = getNumber(formData, `perguntaId_${index}`) || null;
    const perguntaTexto = getString(formData, `perguntaTexto_${index}`);
    const tipo = getString(formData, `tipo_${index}`) || "TEXTO_CURTO";

    if (!perguntaTexto || tipo === "SECAO") return null;

    const valores = formData
      .getAll(`resposta_${index}`)
      .filter((valor): valor is string => typeof valor === "string")
      .map((valor) => valor.trim())
      .filter(Boolean);

    const resposta = valores.length > 0 ? valores.join(" | ") : null;
    const observacao = getString(formData, `observacao_${index}`);

    if (!resposta && !observacao) return null;

    return {
      clienteId,
      modeloId,
      perguntaId,
      procedimento,
      perguntaTexto,
      tipo,
      resposta,
      observacao,
      profissional,
      dataResposta: dataFicha,
    } satisfies RespostaRecebida;
  }).filter((item): item is RespostaRecebida => Boolean(item));
}

function montarResumoRespostas(respostas: RespostaRecebida[]) {
  return respostas
    .map(
      (item) =>
        `${item.perguntaTexto}\nResposta: ${item.resposta || "-"}${
          item.observacao ? `\nObservação: ${item.observacao}` : ""
        }`,
    )
    .join("\n\n---\n\n");
}

async function validarObrigatorias(
  modeloId: number | null,
  respostas: RespostaRecebida[],
) {
  if (!modeloId) return;

  const obrigatorias = await prisma.anamnesePergunta.findMany({
    where: {
      modeloId,
      ativa: true,
      obrigatoria: true,
      NOT: { tipo: "SECAO" },
    },
    select: { id: true, pergunta: true, tipo: true },
  });

  const respondidas = new Map(
    respostas.map((resposta) => [resposta.perguntaId, resposta]),
  );

  const faltantes = obrigatorias.filter((pergunta) => {
    const resposta = respondidas.get(pergunta.id);
    if (!resposta?.resposta && !resposta?.observacao) return true;
    if (pergunta.tipo === "ACEITE" && resposta.resposta !== "Aceito") return true;
    return false;
  });

  if (faltantes.length > 0) {
    throw new Error(
      `Preencha os campos obrigatórios antes de finalizar: ${faltantes
        .slice(0, 3)
        .map((item) => item.pergunta)
        .join("; ")}${faltantes.length > 3 ? "..." : ""}`,
    );
  }
}

async function obterOuCriarRascunho(
  clienteId: number,
  procedimento: string | null,
  profissional: string | null,
  dataFicha: Date,
) {
  const ultimaFicha = await prisma.clienteAnamnese.findFirst({
    where: { clienteId, procedimento: procedimento ?? undefined },
    orderBy: [{ versao: "desc" }, { updatedAt: "desc" }],
  });

  if (ultimaFicha?.status !== "FINALIZADA") {
    if (ultimaFicha) {
      return prisma.clienteAnamnese.update({
        where: { id: ultimaFicha.id },
        data: { profissional, dataFicha, status: "RASCUNHO" },
      });
    }
  }

  return prisma.clienteAnamnese.create({
    data: {
      clienteId,
      procedimento,
      profissional,
      dataFicha,
      status: "RASCUNHO",
      versao: (ultimaFicha?.versao ?? 0) + 1,
    },
  });
}

export async function salvarRespostasAnamneseRapida(formData: FormData) {
  const usuario = await requirePermission("clientes.clinico");
  const clienteId = getNumber(formData, "clienteId");
  const modeloId = getNumber(formData, "modeloId") || null;
  const procedimento = getString(formData, "procedimento");
  const profissional = getString(formData, "profissional") || usuario.nome;
  const dataFichaTexto = getString(formData, "dataFicha");
  const dataFicha = dataFichaTexto
    ? new Date(`${dataFichaTexto}T12:00:00`)
    : new Date();
  const total = getNumber(formData, "totalPerguntas");
  const intencao = getString(formData, "intencao") || "rascunho";

  if (!clienteId || !total) {
    throw new Error("Dados da anamnese incompletos.");
  }

  const respostas = lerRespostasFormulario(
    formData,
    clienteId,
    modeloId,
    procedimento,
    profissional,
    dataFicha,
    total,
  );

  if (intencao === "finalizar") {
    await validarObrigatorias(modeloId, respostas);
  }

  const resumoRespostas = montarResumoRespostas(respostas);
  const termoConsentimento = formData.get("declaracaoFinal") === "on";
  const assinaturaCliente = getString(formData, "assinaturaCliente");

  if (intencao === "finalizar") {
    if (!termoConsentimento) {
      throw new Error("Confirme a declaração final antes da assinatura.");
    }
    if (!assinaturaCliente?.startsWith("data:image/")) {
      throw new Error("A assinatura do cliente é obrigatória para finalizar.");
    }
    if (assinaturaCliente.length > 750_000) {
      throw new Error("A assinatura ficou muito grande. Limpe e assine novamente.");
    }
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { nome: true },
  });

  const ficha = await obterOuCriarRascunho(
    clienteId,
    procedimento,
    profissional,
    dataFicha,
  );

  await prisma.$transaction(async (tx) => {
    await tx.clienteAnamneseResposta.deleteMany({
      where: { anamneseId: ficha.id },
    });

    if (respostas.length > 0) {
      await tx.clienteAnamneseResposta.createMany({
        data: respostas.map((resposta) => ({
          ...resposta,
          anamneseId: ficha.id,
        })),
      });
    }

    await tx.clienteAnamnese.update({
      where: { id: ficha.id },
      data: {
        procedimento,
        profissional,
        respostasRapidas: resumoRespostas || null,
        termoConsentimento,
        dataFicha,
        status: intencao === "finalizar" ? "FINALIZADA" : "RASCUNHO",
        assinaturaCliente:
          intencao === "finalizar" ? assinaturaCliente : null,
        assinaturaNome:
          intencao === "finalizar" ? cliente?.nome ?? null : null,
        assinadaEm: intencao === "finalizar" ? new Date() : null,
        finalizadaEm: intencao === "finalizar" ? new Date() : null,
      },
    });
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Clientes",
      acao:
        intencao === "finalizar"
          ? "Finalizou e assinou anamnese"
          : "Salvou rascunho de anamnese",
      entidade: "ClienteAnamnese",
      usuario: usuario.nome || usuario.email,
      detalhes: `${clienteId} - ${procedimento || "Sem procedimento"} - versão ${ficha.versao}`,
    },
  });

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
}

export async function criarNovaRevisaoAnamnese(
  clienteId: number,
  procedimento: string,
) {
  const usuario = await requirePermission("clientes.clinico");
  if (!Number.isInteger(clienteId) || clienteId <= 0 || !procedimento.trim()) {
    throw new Error("Dados inválidos para criar nova versão da anamnese.");
  }

  const ultimaFicha = await prisma.clienteAnamnese.findFirst({
    where: { clienteId, procedimento },
    orderBy: [{ versao: "desc" }, { updatedAt: "desc" }],
  });

  if (ultimaFicha && ultimaFicha.status !== "FINALIZADA") {
    return;
  }

  await prisma.clienteAnamnese.create({
    data: {
      clienteId,
      procedimento,
      profissional: usuario.nome,
      status: "RASCUNHO",
      versao: (ultimaFicha?.versao ?? 0) + 1,
      dataFicha: new Date(),
    },
  });

  revalidatePath(`/clientes/${clienteId}`);
}
