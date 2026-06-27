"use server";

import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function getDate(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value ? new Date(`${value}T12:00:00`) : new Date();
}

function getNumber(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) return 0;

  const normalized = value.replace(".", "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getClienteId(formData: FormData) {
  const clienteId = Number(formData.get("clienteId"));

  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    throw new Error("Cliente inválido.");
  }

  return clienteId;
}

function buildRespostasRapidas(formData: FormData) {
  const total = Number(formData.get("perguntasRapidasTotal"));

  if (!Number.isInteger(total) || total <= 0) {
    return null;
  }

  const respostas = Array.from({ length: total }, (_, index) => {
    const pergunta = getString(formData, `perguntaRapida_${index}`);
    const resposta = getString(formData, `respostaRapida_${index}`);
    const observacao = getString(formData, `observacaoRapida_${index}`);

    if (!pergunta && !resposta && !observacao) {
      return null;
    }

    return [
      pergunta ? `Pergunta: ${pergunta}` : null,
      resposta ? `Resposta: ${resposta}` : null,
      observacao ? `Observação: ${observacao}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }).filter(Boolean);

  return respostas.length > 0 ? respostas.join("\n\n---\n\n") : null;
}

export async function salvarAnamneseCliente(formData: FormData) {
  await requirePermission("clientes.clinico");
  const clienteId = getClienteId(formData);
  const anamneseId = Number(formData.get("anamneseId"));

  const data = {
    clienteId,
    procedimento: getString(formData, "procedimento"),
    queixaPrincipal: getString(formData, "queixaPrincipal"),
    alergias: getString(formData, "alergias"),
    medicamentos: getString(formData, "medicamentos"),
    doencasPreExistentes: getString(formData, "doencasPreExistentes"),
    procedimentosAnteriores: getString(formData, "procedimentosAnteriores"),
    gestante: getBoolean(formData, "gestante"),
    lactante: getBoolean(formData, "lactante"),
    usaAcidos: getBoolean(formData, "usaAcidos"),
    possuiMarcapasso: getBoolean(formData, "possuiMarcapasso"),
    restricoes: getString(formData, "restricoes"),
    objetivoTratamento: getString(formData, "objetivoTratamento"),
    observacoesClinicas: getString(formData, "observacoesClinicas"),
    respostasRapidas: buildRespostasRapidas(formData) || getString(formData, "respostasRapidas"),
    assinaturaCliente: getString(formData, "assinaturaCliente"),
    termoConsentimento: getBoolean(formData, "termoConsentimento"),
    profissional: getString(formData, "profissional"),
    dataFicha: getDate(formData, "dataFicha"),
  };

  if (Number.isInteger(anamneseId) && anamneseId > 0) {
    await prisma.clienteAnamnese.update({
      where: { id: anamneseId },
      data,
    });
  } else {
    await prisma.clienteAnamnese.create({ data });
  }

  revalidatePath(`/clientes/${clienteId}`);
}

export async function criarFotoCliente(formData: FormData) {
  await requirePermission("clientes.clinico");
  const clienteId = getClienteId(formData);
  const titulo = getString(formData, "titulo");
  const url = getString(formData, "url");

  if (!titulo || !url) {
    throw new Error("Informe o título e o link da foto.");
  }

  await prisma.clienteFoto.create({
    data: {
      clienteId,
      titulo,
      tipo: getString(formData, "tipo") || "Evolução",
      url,
      descricao: getString(formData, "descricao"),
      dataRegistro: getDate(formData, "dataRegistro"),
    },
  });

  revalidatePath(`/clientes/${clienteId}`);
}

export async function criarEvolucaoCliente(formData: FormData) {
  await requirePermission("clientes.clinico");
  const clienteId = getClienteId(formData);
  const titulo = getString(formData, "titulo");
  const descricao = getString(formData, "descricao");

  if (!titulo || !descricao) {
    throw new Error("Informe o título e a evolução clínica.");
  }

  await prisma.clienteEvolucao.create({
    data: {
      clienteId,
      titulo,
      descricao,
      profissional: getString(formData, "profissional"),
      dataRegistro: getDate(formData, "dataRegistro"),
    },
  });

  revalidatePath(`/clientes/${clienteId}`);
}

export async function criarProcedimentoCliente(formData: FormData) {
  await requirePermission("clientes.clinico");
  const clienteId = getClienteId(formData);
  const nome = getString(formData, "nome");
  const valor = getNumber(formData, "valor");
  const dataProcedimento = getDate(formData, "dataProcedimento");

  if (!nome) {
    throw new Error("Informe o procedimento realizado.");
  }

  await prisma.$transaction([
    prisma.clienteProcedimento.create({
      data: {
        clienteId,
        nome,
        profissional: getString(formData, "profissional"),
        valor,
        status: getString(formData, "status") || "Realizado",
        dataProcedimento,
        observacoes: getString(formData, "observacoes"),
      },
    }),
    prisma.cliente.update({
      where: { id: clienteId },
      data: {
        procedimento: nome,
        valorGasto: { increment: valor },
        ultimaVisita: dataProcedimento,
      },
    }),
  ]);

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
}

export async function criarDocumentoCliente(formData: FormData) {
  await requirePermission("clientes.clinico");
  const clienteId = getClienteId(formData);
  const titulo = getString(formData, "titulo");

  if (!titulo) {
    throw new Error("Informe o título do documento.");
  }

  await prisma.clienteDocumento.create({
    data: {
      clienteId,
      titulo,
      tipo: getString(formData, "tipo") || "Documento",
      url: getString(formData, "url"),
      observacoes: getString(formData, "observacoes"),
      dataRegistro: getDate(formData, "dataRegistro"),
    },
  });

  revalidatePath(`/clientes/${clienteId}`);
}

export async function excluirRegistroClinico(
  clienteId: number,
  tipo: "foto" | "evolucao" | "procedimento" | "documento",
  id: number
) {
  await requirePermission("clientes.clinico");
  if (tipo === "foto") {
    await prisma.clienteFoto.delete({ where: { id } });
  }

  if (tipo === "evolucao") {
    await prisma.clienteEvolucao.delete({ where: { id } });
  }

  if (tipo === "procedimento") {
    await prisma.clienteProcedimento.delete({ where: { id } });
  }

  if (tipo === "documento") {
    await prisma.clienteDocumento.delete({ where: { id } });
  }

  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/clientes");
}
