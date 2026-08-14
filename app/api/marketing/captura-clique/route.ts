import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function comparacaoSegura(valorRecebido: string, valorEsperado: string) {
  const recebido = Buffer.from(valorRecebido);
  const esperado = Buffer.from(valorEsperado);

  if (recebido.length !== esperado.length) {
    return false;
  }

  return timingSafeEqual(recebido, esperado);
}

function extrairSegredo(request: NextRequest) {
  const header = request.headers.get("x-lead-webhook-secret");
  return (header || "").trim();
}

function normalizarTexto(valor?: string | null) {
  return (valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizarCodigo(valor?: string | null) {
  const limpo = (valor || "").trim().toUpperCase();
  return limpo || null;
}

function limpar(valor?: string | null) {
  const texto = (valor || "").trim();
  return texto || null;
}

export async function POST(request: NextRequest) {
  const segredo = process.env.LEAD_WEBHOOK_SECRET?.trim();

  // Sem segredo configurado a rota fica fechada. Nunca liberar por padrão.
  if (!segredo || segredo.length < 24) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          "Captura de clique não configurada. Defina LEAD_WEBHOOK_SECRET com pelo menos 24 caracteres.",
      },
      { status: 503 },
    );
  }

  const tokenRecebido = extrairSegredo(request);

  if (!tokenRecebido || !comparacaoSegura(tokenRecebido, segredo)) {
    return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 });
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const codigo = normalizarCodigo(
    typeof body.codigo_atendimento === "string" ? body.codigo_atendimento : null,
  );

  if (!codigo) {
    return NextResponse.json(
      { ok: false, erro: "codigo_atendimento é obrigatório." },
      { status: 400 },
    );
  }

  try {
    // Clique repetido para o mesmo código (a mesma visitante clicando de novo)
    // não deve criar um segundo lead nem sobrescrever o que já existe -
    // inclusive porque a essa altura pode já ter sido editado à mão.
    const existente = await prisma.lead.findFirst({
      where: { codigoAtendimento: codigo },
      select: { id: true },
    });

    if (existente) {
      return NextResponse.json({ ok: true, criado: false, leadId: existente.id });
    }

    const servico = limpar(typeof body.servico === "string" ? body.servico : null);
    const utmCampaign = limpar(typeof body.utm_campaign === "string" ? body.utm_campaign : null);
    const utmSource = limpar(typeof body.utm_source === "string" ? body.utm_source : null);
    const origemDetectada = limpar(
      typeof body.origem_detectada === "string" ? body.origem_detectada : null,
    );
    const gclid = limpar(typeof body.gclid === "string" ? body.gclid : null);

    // Casamento por nome com a campanha já cadastrada. Best-effort: se não
    // achar nada parecido, o lead nasce sem campanha em vez de arriscar
    // vincular errado - dá pra corrigir à mão depois, como já era feito.
    let campanhaId: number | null = null;

    if (utmCampaign) {
      const campanhas = await prisma.campanhaMarketing.findMany({
        select: { id: true, nome: true },
      });

      const alvo = normalizarTexto(utmCampaign);
      const encontrada = campanhas.find((item) => normalizarTexto(item.nome) === alvo);

      campanhaId = encontrada?.id ?? null;
    }

    const origem =
      utmSource && normalizarTexto(utmSource) === "google"
        ? "Google Ads"
        : origemDetectada || "Site";

    const nome = servico ? `Contato via anúncio · ${servico}` : "Contato via anúncio";

    const lead = await prisma.$transaction(async (tx) => {
      const criado = await tx.lead.create({
        data: {
          nome,
          telefone: null,
          origem,
          interesse: servico,
          etapa: "Novo",
          valorPrevisto: 0,
          campanhaId,
          codigoAtendimento: codigo,
          gclid,
        },
      });

      await tx.leadInteracao.create({
        data: {
          leadId: criado.id,
          tipo: "Criação",
          descricao: campanhaId
            ? "Lead criado automaticamente a partir do clique no WhatsApp do anúncio, já vinculado à campanha."
            : "Lead criado automaticamente a partir do clique no WhatsApp do anúncio. Nenhuma campanha correspondente foi encontrada para vincular automaticamente.",
        },
      });

      await tx.auditoria.create({
        data: {
          modulo: "Marketing",
          acao: "Lead criado automaticamente via clique",
          entidade: "Lead",
          entidadeId: String(criado.id),
          usuario: "Sistema (captura de clique)",
          detalhes: `${nome} · código ${codigo}`,
        },
      });

      return criado;
    });

    return NextResponse.json({ ok: true, criado: true, leadId: lead.id });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido.";
    return NextResponse.json({ ok: false, erro: mensagem }, { status: 500 });
  }
}