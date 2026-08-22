import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  gerarConversoesGoogleAds,
  marcarVendasComoEnviadasAds,
} from "@/lib/conversoes-marketing";
import { atualizarPlanilhaConversoesAds, isGoogleDriveConfigured } from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const JANELA_DIAS = 90;

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

  try {
    const linhas = await gerarConversoesGoogleAds(JANELA_DIAS);

    // Nada novo desde o último envio - não sobe planilha nenhuma.
    if (linhas.length === 0) {
      return NextResponse.json({
        ok: true,
        linhas: 0,
        planilha: null,
        mensagem: "Nenhuma conversão nova. Nada foi enviado.",
      });
    }

    const resultado = await atualizarPlanilhaConversoesAds(linhas);

    // Só marca como enviado DEPOIS da confirmação de sucesso acima. Se a
    // linha anterior tivesse falhado, o código nunca chegaria aqui, e essas
    // vendas continuariam disponíveis para a próxima tentativa.
    await marcarVendasComoEnviadasAds(linhas.map((linha) => linha.vendaId));

    await prisma.auditoria.create({
      data: {
        modulo: "Marketing",
        acao: "Exportação de conversões atualizada",
        entidade: "CampanhaMarketing",
        usuario: "Sistema (exportação de conversões)",
        detalhes: `${linhas.length} conversão(ões) nova(s) na janela de ${JANELA_DIAS} dias.`,
      },
    });

    return NextResponse.json({
      ok: true,
      linhas: linhas.length,
      planilha: resultado.url,
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido.";
    return NextResponse.json({ ok: false, erro: mensagem }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return executar(request);
}

export async function POST(request: NextRequest) {
  return executar(request);
}
