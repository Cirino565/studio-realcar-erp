import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { executarExportacaoGoogleAds } from "@/lib/conversoes-marketing";
import { isGoogleDriveConfigured } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

function comparacaoSegura(valorRecebido: string, valorEsperado: string) {
  const recebido = Buffer.from(valorRecebido);
  const esperado = Buffer.from(valorEsperado);

  if (recebido.length !== esperado.length) {
    return false;
  }

  return timingSafeEqual(recebido, esperado);
}

function extrairToken(request: NextRequest) {
  const header = request.headers.get("authorization");

  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }

  const headerDireto = request.headers.get("x-marketing-export-token");

  if (headerDireto) {
    return headerDireto.trim();
  }

  return request.nextUrl.searchParams.get("token")?.trim() ?? "";
}

async function executar(request: NextRequest) {
  const segredo = process.env.MARKETING_EXPORT_SECRET?.trim();

  // Sem segredo configurado a rota fica fechada. Nunca liberar por padrão.
  if (!segredo || segredo.length < 24) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          "Exportação de conversões não configurada. Defina MARKETING_EXPORT_SECRET com pelo menos 24 caracteres.",
      },
      { status: 503 },
    );
  }

  const tokenRecebido = extrairToken(request);

  if (!tokenRecebido || !comparacaoSegura(tokenRecebido, segredo)) {
    return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 });
  }

  if (!isGoogleDriveConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          "Google Drive não configurado. Defina GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET e GOOGLE_DRIVE_REFRESH_TOKEN.",
      },
      { status: 503 },
    );
  }

  // A planilha leva TODAS as vendas elegíveis dos últimos 90 dias (não só as
  // novas) e cada venda registra se subiu ou deu erro - dá para ver na tela
  // Marketing > Conversões Google Ads e em cada venda.
  const resultado = await executarExportacaoGoogleAds("Sistema (exportação de conversões)");

  if (!resultado.ok) {
    return NextResponse.json({ ok: false, erro: resultado.erro }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    linhas: resultado.linhas,
    vendas: resultado.vendas,
    novas: resultado.novas,
    planilha: resultado.planilha,
  });
}

export async function GET(request: NextRequest) {
  return executar(request);
}

export async function POST(request: NextRequest) {
  return executar(request);
}
