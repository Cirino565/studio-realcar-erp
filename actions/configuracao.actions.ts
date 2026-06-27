"use server";

import { requirePermission } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type SalvarConfiguracaoInput = {
  nome: string;
  razaoSocial?: string;
  cnpj?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  site?: string;
  instagram?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  responsavelTecnico?: string;
  registroProfissional?: string;
  especialidadePrincipal?: string;
  horarioAtendimento?: string;
  intervaloAgenda: number;
  antecedenciaLembrete: number;
  toleranciaAtraso: number;
  moeda: string;
  timezone: string;
  logoUrl?: string;
  corPrincipal: string;
  assinaturaMensagem?: string;
  mensagemConfirmacao?: string;
  mensagemLembrete?: string;
  mensagemRetorno?: string;
  politicaCancelamento?: string;
  observacoesInternas?: string;
};

function toNullableText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toSafeInteger(value: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value));
}

export async function salvarConfiguracaoClinica(dados: SalvarConfiguracaoInput) {
  await requirePermission("configuracoes.gerenciar");
  const existente = await prisma.configuracaoClinica.findFirst();

  const payload = {
    nome: dados.nome.trim() || "Studio Realçar",
    razaoSocial: toNullableText(dados.razaoSocial),
    cnpj: toNullableText(dados.cnpj),
    telefone: toNullableText(dados.telefone),
    whatsapp: toNullableText(dados.whatsapp),
    email: toNullableText(dados.email),
    site: toNullableText(dados.site),
    instagram: toNullableText(dados.instagram),
    endereco: toNullableText(dados.endereco),
    bairro: toNullableText(dados.bairro),
    cidade: toNullableText(dados.cidade),
    estado: toNullableText(dados.estado),
    cep: toNullableText(dados.cep),
    responsavelTecnico: toNullableText(dados.responsavelTecnico),
    registroProfissional: toNullableText(dados.registroProfissional),
    especialidadePrincipal: toNullableText(dados.especialidadePrincipal),
    horarioAtendimento: toNullableText(dados.horarioAtendimento),
    intervaloAgenda: toSafeInteger(dados.intervaloAgenda, 30),
    antecedenciaLembrete: toSafeInteger(dados.antecedenciaLembrete, 24),
    toleranciaAtraso: toSafeInteger(dados.toleranciaAtraso, 10),
    moeda: dados.moeda.trim() || "BRL",
    timezone: dados.timezone.trim() || "America/Sao_Paulo",
    logoUrl: toNullableText(dados.logoUrl),
    corPrincipal: dados.corPrincipal.trim() || "violet",
    assinaturaMensagem: toNullableText(dados.assinaturaMensagem),
    mensagemConfirmacao: toNullableText(dados.mensagemConfirmacao),
    mensagemLembrete: toNullableText(dados.mensagemLembrete),
    mensagemRetorno: toNullableText(dados.mensagemRetorno),
    politicaCancelamento: toNullableText(dados.politicaCancelamento),
    observacoesInternas: toNullableText(dados.observacoesInternas),
  };

  if (existente) {
    await prisma.configuracaoClinica.update({ where: { id: existente.id }, data: payload });
  } else {
    await prisma.configuracaoClinica.create({ data: payload });
  }

  await prisma.auditoria.create({
    data: {
      modulo: "Configurações",
      acao: "Atualizou configurações da clínica",
      entidade: "ConfiguracaoClinica",
      entidadeId: existente ? String(existente.id) : undefined,
      usuario: "Sistema",
      detalhes: payload.nome,
    },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/");
}
