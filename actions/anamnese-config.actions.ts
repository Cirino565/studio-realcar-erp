"use server";

import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

const TIPOS_PERGUNTA = new Set(["SIM_NAO", "TEXTO_CURTO", "TEXTO_LONGO", "MULTIPLA_ESCOLHA", "ACEITE"]);

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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

export async function criarModelosAnamnesePadrao() {
  await requirePermission("configuracoes.gerenciar");
  const servicos = await prisma.procedimentoServico.findMany({
    where: { status: "Ativo" },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  });

  const base = servicos.length > 0
    ? servicos
    : [
        { id: null, nome: "Limpeza de pele", ordem: 1 },
        { id: null, nome: "Botox", ordem: 2 },
        { id: null, nome: "Cílios", ordem: 3 },
        { id: null, nome: "Sobrancelha", ordem: 4 },
      ];

  const perguntasPorProcedimento: Record<string, { pergunta: string; tipo?: string; obrigatoria?: boolean; opcoes?: string }[]> = {
    "Limpeza de pele": [
      { pergunta: "Usa ácidos, retinol ou produtos sensibilizantes nos últimos 7 dias?", tipo: "SIM_NAO", obrigatoria: true },
      { pergunta: "Fez peeling, laser, microagulhamento ou procedimento recente no rosto?", tipo: "SIM_NAO", obrigatoria: true },
      { pergunta: "Tem alergia a cosméticos, anestésicos ou algum ativo?", tipo: "SIM_NAO", obrigatoria: true },
      { pergunta: "Está em uso de isotretinoína ou medicamento sensibilizante?", tipo: "SIM_NAO", obrigatoria: true },
      { pergunta: "Principal queixa", tipo: "MULTIPLA_ESCOLHA", obrigatoria: true, opcoes: "Acne\nOleosidade\nManchas\nCravos\nSensibilidade\nOutro" },
      { pergunta: "Cliente recebeu orientações de cuidados pós-procedimento", tipo: "ACEITE", obrigatoria: true },
    ],
    Botox: [
      { pergunta: "Está gestante ou lactante?", tipo: "SIM_NAO", obrigatoria: true },
      { pergunta: "Possui doença neuromuscular ou usa anticoagulante?", tipo: "SIM_NAO", obrigatoria: true },
      { pergunta: "Já realizou aplicação anterior?", tipo: "SIM_NAO" },
      { pergunta: "Tem alergia conhecida a algum componente?", tipo: "SIM_NAO", obrigatoria: true },
      { pergunta: "Cliente está ciente das orientações e cuidados pós-procedimento", tipo: "ACEITE", obrigatoria: true },
    ],
    Cílios: [
      { pergunta: "Tem alergia a cola ou histórico de irritação ocular?", tipo: "SIM_NAO", obrigatoria: true },
      { pergunta: "Usa lente de contato?", tipo: "SIM_NAO" },
      { pergunta: "Está com conjuntivite, sensibilidade ou inflamação nos olhos?", tipo: "SIM_NAO", obrigatoria: true },
      { pergunta: "Já fez extensão de cílios antes?", tipo: "SIM_NAO" },
      { pergunta: "Cliente recebeu orientações de manutenção e higienização", tipo: "ACEITE", obrigatoria: true },
    ],
    Sobrancelha: [
      { pergunta: "Tem alergia a henna, tintura, cera ou pigmentos?", tipo: "SIM_NAO", obrigatoria: true },
      { pergunta: "Fez procedimento recente na pele da região?", tipo: "SIM_NAO" },
      { pergunta: "Usa ácidos ou produtos sensibilizantes no rosto?", tipo: "SIM_NAO" },
      { pergunta: "Formato desejado ou observação estética", tipo: "TEXTO_LONGO" },
    ],
  };

  for (const [index, servico] of base.entries()) {
    const nome = servico.nome;
    const modeloExistente = await prisma.anamneseModelo.findFirst({
      where: { procedimentoNome: nome },
    });

    const modelo = modeloExistente ?? await prisma.anamneseModelo.create({
      data: {
        nome: `Anamnese - ${nome}`,
        procedimentoId: servico.id ?? null,
        procedimentoNome: nome,
        status: "Ativo",
        ordem: index + 1,
        descricao: `Modelo padrão de anamnese para ${nome}.`,
      },
    });

    const chave = Object.keys(perguntasPorProcedimento).find((item) =>
      nome.toLowerCase().includes(item.toLowerCase()) || item.toLowerCase().includes(nome.toLowerCase())
    );
    const perguntas = perguntasPorProcedimento[chave || ""] || [
      { pergunta: "Qual é a principal queixa ou objetivo do cliente?", tipo: "TEXTO_LONGO", obrigatoria: true },
      { pergunta: "Possui alergias, restrições ou medicamentos em uso?", tipo: "SIM_NAO", obrigatoria: true },
      { pergunta: "Existe alguma contraindicação para o procedimento?", tipo: "SIM_NAO", obrigatoria: true },
      { pergunta: "Cliente recebeu orientações e concorda com o procedimento", tipo: "ACEITE", obrigatoria: true },
    ];

    const existentes = await prisma.anamnesePergunta.count({ where: { modeloId: modelo.id } });
    if (existentes === 0) {
      await prisma.anamnesePergunta.createMany({
        data: perguntas.map((pergunta, perguntaIndex) => ({
          modeloId: modelo.id,
          pergunta: pergunta.pergunta,
          tipo: pergunta.tipo || "SIM_NAO",
          obrigatoria: Boolean(pergunta.obrigatoria),
          opcoes: pergunta.opcoes || null,
          ativa: true,
          ordem: perguntaIndex + 1,
        })),
      });
    }
  }

  await auditar("Criou modelos de anamnese padrão", "AnamneseModelo", "Modelos e perguntas padrão");
  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
}

export async function criarModeloAnamnese(formData: FormData) {
  await requirePermission("configuracoes.gerenciar");
  const procedimentoNome = getString(formData, "procedimentoNome");
  const nomeInformado = getString(formData, "nome");
  const procedimentoId = getNumber(formData, "procedimentoId") || null;

  const nome = nomeInformado || (procedimentoNome ? `Anamnese - ${procedimentoNome}` : null);
  if (!nome) return;

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
  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
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
      ativa: getBoolean(formData, "ativa") || true,
      ordem: getNumber(formData, "ordem"),
    },
  });

  await auditar("Criou pergunta de anamnese", "AnamnesePergunta", pergunta);
  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
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
  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
}

export async function excluirPerguntaAnamnese(id: number) {
  await requirePermission("configuracoes.gerenciar");
  const pergunta = await prisma.anamnesePergunta.findUnique({ where: { id } });
  if (!pergunta) return;

  const possuiRespostas = await prisma.clienteAnamneseResposta.count({ where: { perguntaId: id } });

  if (possuiRespostas > 0) {
    await prisma.anamnesePergunta.update({ where: { id }, data: { ativa: false } });
    await auditar("Desativou pergunta de anamnese com histórico", "AnamnesePergunta", pergunta.pergunta);
  } else {
    await prisma.anamnesePergunta.delete({ where: { id } });
    await auditar("Excluiu pergunta de anamnese", "AnamnesePergunta", pergunta.pergunta);
  }

  revalidatePath("/configuracoes");
  revalidatePath("/clientes");
}

export async function salvarRespostasAnamneseRapida(formData: FormData) {
  await requirePermission("clientes.clinico");
  const clienteId = getNumber(formData, "clienteId");
  const modeloId = getNumber(formData, "modeloId") || null;
  const procedimento = getString(formData, "procedimento");
  const profissional = getString(formData, "profissional");
  const dataFichaTexto = getString(formData, "dataFicha");
  const dataFicha = dataFichaTexto ? new Date(`${dataFichaTexto}T12:00:00`) : new Date();
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
    .map((item) => `${item.perguntaTexto}\nResposta: ${item.resposta || "-"}${item.observacao ? `\nObservação: ${item.observacao}` : ""}`)
    .join("\n\n---\n\n");

  const termoConsentimento = respostas.some((item) => item.tipo === "ACEITE" && item.resposta === "Aceito");

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

  await auditar("Salvou anamnese do cliente", "ClienteAnamnese", `${clienteId} - ${procedimento || "Sem procedimento"}`);
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
}
