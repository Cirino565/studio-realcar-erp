"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import {
  executarExportacaoGoogleAds,
  type ResultadoExportacaoGoogleAds,
} from "@/lib/conversoes-marketing";
import { isGoogleDriveConfigured } from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";

/**
 * "Enviar agora": atualiza a planilha do Google Ads na hora, sem esperar a
 * atualização automática das 4h. Quem importa a planilha é o Google Ads, na
 * agenda configurada lá.
 */
export async function enviarConversoesAgora(): Promise<ResultadoExportacaoGoogleAds> {
  const usuario = await requirePermission("marketing.gerenciar");

  if (!isGoogleDriveConfigured()) {
    return {
      ok: false,
      erro: "O Google Drive ainda não está configurado neste sistema (precisa das chaves do Google).",
    };
  }

  const resultado = await executarExportacaoGoogleAds(
    `${usuario.nome} (envio manual)`,
  );

  revalidatePath("/marketing/google-ads");
  revalidatePath("/vendas");

  return resultado;
}

/**
 * Liga/desliga o envio de uma conversão extra POR PROCEDIMENTO (ex.:
 * "Venda Real - Limpeza de Pele"). Só ligue depois de criar essas conversões
 * no Google Ads com exatamente esses nomes.
 */
export async function definirConversaoPorProcedimento(ativo: boolean) {
  await requirePermission("marketing.gerenciar");

  const atual = await prisma.configuracaoClinica.findFirst({ select: { id: true } });

  if (atual) {
    await prisma.configuracaoClinica.update({
      where: { id: atual.id },
      data: { googleAdsPorProcedimento: Boolean(ativo) },
    });
  } else {
    await prisma.configuracaoClinica.create({
      data: { googleAdsPorProcedimento: Boolean(ativo) },
    });
  }

  revalidatePath("/marketing/google-ads");
  revalidatePath("/vendas");
}
