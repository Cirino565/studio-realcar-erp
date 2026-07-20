"use server";

import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

const TIPOS_PERGUNTA = new Set([
  "SIM_NAO",
  "TEXTO_CURTO",
  "TEXTO_LONGO",
  "MULTIPLA_ESCOLHA",
  "ACEITE",
]);

const MODELOS_STUDIO_REALCAR = [
  "Microlabial",
  "Intradermoterapia",
  "Hidratação facial",
  "Protocolo clareamento",
  "Protocolo secativo",
  "Endermoterapia facial ou corporal",
  "Ultrassom facial ou corporal",
  "Microagulhamento",
  "Limpeza de pele",
  "Facial",
  "Despigmentação micropigmentação ND YAG",
  "Ultrassom microfocado",
  "Laser",
  "Criolipólise",
  "Drenagem corporal",
  "Fios de PDO Liso",
  "PEIM",
] as const;

const PERGUNTAS_INICIAIS = [
  {
    pergunta: "Qual é a principal queixa, objetivo ou expectativa para este atendimento?",
    tipo: "TEXTO_LONGO",
    obrigatoria: true,
  },
  {
    pergunta: "Possui alergias conhecidas ou já apresentou reação adversa a algum produto ou procedimento?",
    tipo: "SIM_NAO",
    obrigatoria: true,
  },
  {
    pergunta: "Faz uso contínuo de medicamentos ou realizou algum tratamento recente que deva ser informado?",
    tipo: "SIM_NAO",
    obrigatoria: true,
  },
  {
    pergunta: "Existe alguma informação de saúde, sensibilidade, restrição ou observação importante para este atendimento?",
    tipo: "TEXTO_LONGO",
    obrigatoria: false,
  },
  {
    pergunta: "Declaro que as informações prestadas nesta ficha são verdadeiras e que recebi as orientações referentes ao atendimento.",
    tipo: "ACEITE",
    obrigatoria: true,
  },
] as const;

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
) {
  if (procedimentoIdInformado) return procedimentoIdInformado;
  if (!procedimentoNome) return null;

  const servico = await prisma.procedimentoServico.findFirst({
    where: {
      nome: {
        equals: procedimentoNome,
        mode: "insensitive",
      },
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
  await requirePermission("configuracoes.gerenciar");

  for (const [index, procedimentoNome] of MODELOS_STUDIO_REALCAR.entries()) {
    const modeloExistente = await prisma.anamneseModelo.findFirst({
      where: {
        procedimentoNome: {
          equals: procedimentoNome,
          mode: "insensitive",
        },
      },
      include: {
        perguntas: { select: { id: true } },
      },
    });

    const procedimentoId = await resolverProcedimentoId(procedimentoNome);

    const modelo = modeloExistente
      ? await prisma.anamneseModelo.update({
          where: { id: modeloExistente.id },
          data: {
            procedimentoId,
            status: modeloExistente.status || "Ativo",
            ordem: modeloExistente.ordem || index + 1,
          },
        })
      : await prisma.anamneseModelo.create({
          data: {
            nome: `Anamnese - ${procedimentoNome}`,
            procedimentoId,
            procedimentoNome,
            status: "Ativo",
            ordem: index + 1,
            descricao: `Modelo inicial editável para ${procedimentoNome}. Revise perguntas, termos e contraindicações com a responsável técnica antes do uso definitivo.`,
          },
        });

    const totalPerguntas = modeloExistente?.perguntas.length ?? 0;

    if (totalPerguntas === 0) {
      await prisma.anamnesePergunta.createMany({
        data: PERGUNTAS_INICIAIS.map((item, perguntaIndex) => ({
          modeloId: modelo.id,
          pergunta: item.pergunta,
          tipo: item.tipo,
          obrigatoria: item.obrigatoria,
          opcoes: null,
          ativa: true,
          ordem: perguntaIndex + 1,
        })),
      });
    }
  }

  await auditar(
    "Criou modelos de anamnese Studio Realçar",
    "AnamneseModelo",
    `${MODELOS_STUDIO_REALCAR.length} modelos verificados/criados sem duplicar modelos existentes`,
  );
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

export async function salvarRespostasAnamneseRapida(formData: FormData) {
  await requirePermission("clientes.clinico");
  const clienteId = getNumber(formData, "clienteId");
  const modeloId = getNumber(formData, "modeloId") || null;
  const procedimento = getString(formData, "procedimento");
  const profissional = getString(formData, "profissional");
  const dataFichaTexto = getString(formData, "dataFicha");
  const dataFicha = dataFichaTexto
    ? new Date(`${dataFichaTexto}T12:00:00`)
    : new Date();
  const total = getNumber(formData, "totalPerguntas");

  if (!clienteId || !total) return;

  const respostas = Array.from({ length: total }, (_, index) => {
    const perguntaId = getNumber(formData, `perguntaId_${index}`) || null;
    const perguntaTexto = getString(formData, `perguntaTexto_${index}`);
    const tipo = getString(formData, `tipo_${index}`) || "TEXTO_CURTO";
    const resposta = getString(formData, `resposta_${index}`);
    const observacao = getString(formData, `observacao_${index}`);

    if (!perguntaTexto || (!resposta && !observacao)) return null;

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
    };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));

  const resumoRespostas = respostas
    .map(
      (item) =>
        `${item.perguntaTexto}\nResposta: ${item.resposta || "-"}${
          item.observacao ? `\nObservação: ${item.observacao}` : ""
        }`,
    )
    .join("\n\n---\n\n");

  const termoConsentimento = respostas.some(
    (item) => item.tipo === "ACEITE" && item.resposta === "Aceito",
  );

  await prisma.$transaction(async (tx) => {
    await tx.clienteAnamneseResposta.deleteMany({
      where: {
        clienteId,
        modeloId: modeloId ?? undefined,
        procedimento: procedimento ?? undefined,
      },
    });

    if (respostas.length > 0) {
      await tx.clienteAnamneseResposta.createMany({ data: respostas });
    }

    const fichaExistente = await tx.clienteAnamnese.findFirst({
      where: {
        clienteId,
        procedimento: procedimento ?? undefined,
      },
      orderBy: { updatedAt: "desc" },
    });

    const dataFichaClinica = {
      procedimento,
      profissional,
      respostasRapidas: resumoRespostas || null,
      termoConsentimento,
      dataFicha,
    };

    if (fichaExistente) {
      await tx.clienteAnamnese.update({
        where: { id: fichaExistente.id },
        data: dataFichaClinica,
      });
    } else {
      await tx.clienteAnamnese.create({
        data: {
          clienteId,
          ...dataFichaClinica,
        },
      });
    }
  });

  await auditar(
    "Salvou anamnese do cliente",
    "ClienteAnamnese",
    `${clienteId} - ${procedimento || "Sem procedimento"}`,
  );
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
}
