import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  aplicarGastoAutomatico,
  normalizarLinhasRecebidas,
  salvarGastosRecebidos,
} from "@/lib/gasto-google-ads";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recebe, do script agendado dentro do Google Ads, quanto cada campanha gastou
 * em cada dia. Usa a mesma senha da exportacao de conversoes
 * (MARKETING_EXPORT_SECRET), enviada no cabecalho "Authorization: Bearer ...".
 */

function comparacaoSegura(valorRecebido: string, valorEsperado: string) {
  const recebido = Buffer.from(valorRecebido);
  const esperado = Buffer.from(valorEsperado);
  if (recebido.length !== esperado.length) return false;
  return timingSafeEqual(recebido, esperado);
}

function extrairToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return request.headers.get("x-marketing-export-token")?.trim() ?? "";
}

export async function POST(request: NextRequest) {
  const segredo = process.env.MARKETING_EXPORT_SECRET?.trim();

  if (!segredo || segredo.length < 24) {
    return NextResponse.json(
      { ok: false, erro: "Recebimento não configurado: falta MARKETING_EXPORT_SECRET (mínimo 24 caracteres)." },
      { status: 503 },
    );
  }

  const token = extrairToken(request);
  if (!token || !comparacaoSegura(token, segredo)) {
    return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 });
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "Conteúdo inválido (esperado JSON)." }, { status: 400 });
  }

  try {
    const { linhas, ignoradas } = normalizarLinhasRecebidas(corpo);
    await salvarGastosRecebidos(linhas);
    const resultado = await aplicarGastoAutomatico();

    // Campanhas do Google que ainda nao estao ligadas a nenhuma campanha do sistema.
    const idsRecebidos = Array.from(new Set(linhas.map((linha) => linha.googleCampanhaId)));
    const ligadas = await prisma.campanhaMarketing.findMany({
      where: { googleAdsCampanhaId: { in: idsRecebidos } },
      select: { googleAdsCampanhaId: true },
    });
    const idsLigados = new Set(ligadas.map((item) => item.googleAdsCampanhaId));
    const semLigacao = Array.from(
      new Set(
        linhas.filter((linha) => !idsLigados.has(linha.googleCampanhaId)).map((linha) => linha.campanha),
      ),
    );

    const resumo = `${linhas.length} dia(s) recebido(s)${ignoradas ? `, ${ignoradas} ignorado(s)` : ""}. Lançamentos: ${resultado.criados} novo(s), ${resultado.atualizados} atualizado(s), ${resultado.removidos} removido(s).${resultado.semConta ? " ATENÇÃO: não há conta financeira principal ativa, nada foi lançado." : ""}`;

    await prisma.auditoria.create({
      data: {
        modulo: "Marketing",
        acao: "Gasto do Google Ads recebido",
        entidade: "GastoGoogleAdsDia",
        usuario: "Script do Google Ads",
        detalhes: resumo,
      },
    });

    return NextResponse.json({
      ok: true,
      recebidos: linhas.length,
      ignorados: ignoradas,
      ...resultado,
      semLigacao,
      resumo,
    });
  } catch (erro) {
    console.error("[gasto-google-ads]", erro);
    const mensagem = erro instanceof Error ? erro.message : "Falha ao salvar o gasto.";
    await prisma.auditoria
      .create({
        data: {
          modulo: "Marketing",
          acao: "Falha ao receber gasto do Google Ads",
          entidade: "GastoGoogleAdsDia",
          usuario: "Script do Google Ads",
          detalhes: mensagem.slice(0, 500),
        },
      })
      .catch(() => undefined);
    return NextResponse.json({ ok: false, erro: mensagem }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, erro: "Use POST (este endereço é chamado pelo script do Google Ads)." },
    { status: 405 },
  );
}
