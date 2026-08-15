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

// Reserva para quando a campanha ainda não tem o utm_campaign preenchido.
// O prefixo do código de atendimento já diz o serviço, então dá para achar a
// campanha pelo nome. O valor é um trecho procurado no nome da campanha.
const TERMOS_POR_PREFIXO: Record<string, string> = {
  "SR-LIM": "limpeza",
  "SR-LP": "limpeza",
  "SR-CRIO": "medidas",
  "SR-DEP": "depila",
  "SR-SOB": "ndyag",
  "SR-LAS": "ndyag",
  "SR-TAT": "ndyag",
};

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

    // Descobre a campanha em duas tentativas:
    //
    // 1. pelo identificador utm_campaign cadastrado na campanha - é o jeito
    //    confiável, porque é exatamente o que o anúncio manda;
    // 2. se não achar, pelo prefixo do código de atendimento (SR-LIM, SR-CRIO
    //    etc), que já diz o serviço. Serve de rede de segurança enquanto o
    //    identificador não estiver preenchido.
    //
    // Não achando nem por um nem por outro, o lead nasce sem campanha em vez
    // de arriscar vincular errado - dá pra corrigir à mão depois.
    const campanhas = await prisma.campanhaMarketing.findMany({
      select: { id: true, nome: true, utmCampaign: true },
    });

    let campanhaId: number | null = null;

    if (utmCampaign) {
      const alvo = normalizarTexto(utmCampaign);

      const porUtm = campanhas.find(
        (item) => item.utmCampaign && normalizarTexto(item.utmCampaign) === alvo,
      );

      campanhaId =
        porUtm?.id ??
        campanhas.find((item) => normalizarTexto(item.nome) === alvo)?.id ??
        null;
    }

    // A reserva por prefixo só vale quando o clique NÃO trouxe utm_campaign.
    //
    // Se veio um utm_campaign e ele não bateu com nenhuma campanha, isso quer
    // dizer que a origem é conhecida mas não é uma das campanhas cadastradas -
    // como "perfil_empresa_google", que são cliques do perfil do Google, não
    // de anúncio pago. Chutar a campanha nesse caso colocaria receita
    // orgânica dentro do resultado do anúncio e estragaria o ROAS.
    if (!campanhaId && !utmCampaign) {
      const prefixo = codigo.split("-").slice(0, 2).join("-");
      const termo = TERMOS_POR_PREFIXO[prefixo];

      if (termo) {
        campanhaId =
          campanhas.find((item) => normalizarTexto(item.nome).includes(termo))?.id ??
          null;
      }
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