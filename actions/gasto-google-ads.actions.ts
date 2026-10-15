"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import {
  aplicarGastoAutomatico,
  diaValido,
  montarPreviaSubstituicao,
  substituirBlocosManuais,
  type PreviaSubstituicao,
  type ResultadoAplicacao,
} from "@/lib/gasto-google-ads";
import { prisma } from "@/lib/prisma";

function revalidar() {
  revalidatePath("/marketing");
  revalidatePath("/marketing/gasto-google-ads");
  revalidatePath("/financeiro");
  revalidatePath("/gestao");
  revalidatePath("/relatorios");
  revalidatePath("/");
}

async function exigirPermissoes() {
  const usuario = await requirePermission("marketing.gerenciar");
  await requirePermission("financeiro.gerenciar");
  return usuario;
}

/**
 * Liga uma campanha do Google Ads a uma campanha do sistema (ou desliga, com
 * campanhaId null) e define a partir de que dia o gasto entra sozinho.
 */
export async function ligarCampanhaGoogleAds(dados: {
  googleCampanhaId: string;
  campanhaId: number | null;
  desde: string;
}): Promise<ResultadoAplicacao & { ok: true }> {
  const usuario = await exigirPermissoes();

  const googleCampanhaId = String(dados.googleCampanhaId || "").trim();
  if (!/^\d{1,20}$/.test(googleCampanhaId)) throw new Error("Campanha do Google inválida.");

  if (!dados.campanhaId) {
    await prisma.campanhaMarketing.updateMany({
      where: { googleAdsCampanhaId: googleCampanhaId },
      data: { googleAdsCampanhaId: null, gastoAutomaticoDesde: null },
    });
    await prisma.auditoria.create({
      data: {
        modulo: "Marketing",
        acao: "Desligou campanha do Google Ads",
        entidade: "CampanhaMarketing",
        usuario: usuario.email,
        detalhes: `Campanha do Google ${googleCampanhaId}. Os gastos já lançados continuam no Financeiro.`,
      },
    });
    revalidar();
    return { ok: true, criados: 0, atualizados: 0, removidos: 0, semConta: false };
  }

  if (!diaValido(dados.desde)) throw new Error("Escolha o dia a partir do qual o gasto entra sozinho.");

  const campanha = await prisma.campanhaMarketing.findUnique({
    where: { id: Number(dados.campanhaId) },
    select: { id: true, nome: true },
  });
  if (!campanha) throw new Error("Campanha do sistema não encontrada.");

  await prisma.$transaction([
    // Uma campanha do Google fica ligada a uma so campanha do sistema.
    prisma.campanhaMarketing.updateMany({
      where: { googleAdsCampanhaId: googleCampanhaId, NOT: { id: campanha.id } },
      data: { googleAdsCampanhaId: null, gastoAutomaticoDesde: null },
    }),
    prisma.campanhaMarketing.update({
      where: { id: campanha.id },
      data: { googleAdsCampanhaId: googleCampanhaId, gastoAutomaticoDesde: dados.desde },
    }),
    prisma.auditoria.create({
      data: {
        modulo: "Marketing",
        acao: "Ligou campanha ao Google Ads",
        entidade: "CampanhaMarketing",
        entidadeId: String(campanha.id),
        usuario: usuario.email,
        detalhes: `${campanha.nome} ← campanha do Google ${googleCampanhaId}. Gasto automático a partir de ${dados.desde}.`,
      },
    }),
  ]);

  const resultado = await aplicarGastoAutomatico(campanha.id);
  revalidar();
  return { ok: true, ...resultado };
}

export async function previaSubstituirBlocos(campanhaId: number): Promise<PreviaSubstituicao> {
  await exigirPermissoes();
  return montarPreviaSubstituicao(Number(campanhaId));
}

export async function confirmarSubstituirBlocos(campanhaId: number) {
  const usuario = await exigirPermissoes();
  const resultado = await substituirBlocosManuais(Number(campanhaId), usuario.email);
  revalidar();
  return resultado;
}
