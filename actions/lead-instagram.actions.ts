"use server";

import { revalidatePath } from "next/cache";

import { origemEhAnuncioPago, ORIGEM_INSTAGRAM_ADS } from "@/lib/atribuicao-campanha";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chaveTelefone, formatarTelefoneNacional, telefoneValido } from "@/lib/telefone-chave";

/**
 * Botao "Lead do Instagram": quem chamou no WhatsApp pelo anuncio do
 * Instagram (clique pro WhatsApp). A equipe cola o numero e o CRM:
 *  - acha a campanha pelo identificador (utm_campaign) cadastrado nela;
 *  - nao duplica: um lead em andamento por numero;
 *  - marca origem "Instagram Ads" (conta como clique pago).
 */

// Identificador (utm_campaign) da campanha do Instagram cadastrada no CRM.
const UTM_CAMPANHA_INSTAGRAM = "ig_limpeza_pele_taboao";

export type ResultadoLeadInstagram = {
  situacao: "criado" | "ja_existia" | "reaberto" | "cliente_existente";
  leadId: number;
  nome: string;
  campanhaNome: string;
  /** Explicacao curta para mostrar na tela. */
  mensagem: string;
};

function normalizar(texto?: string | null) {
  return (texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export async function registrarLeadInstagram(dados: {
  telefone: string;
  nome?: string;
  interesse?: string;
}): Promise<ResultadoLeadInstagram> {
  const usuario = await requirePermission("marketing.gerenciar");

  if (!telefoneValido(dados.telefone)) {
    throw new Error("Confira o número: precisa ter DDD e o telefone (ex.: 11 91234-5678).");
  }

  const chave = chaveTelefone(dados.telefone);
  const telefone = formatarTelefoneNacional(dados.telefone);
  const nomeInformado = (dados.nome || "").trim();
  const interesse = (dados.interesse || "").trim() || null;

  const campanhas = await prisma.campanhaMarketing.findMany({
    where: { utmCampaign: { not: null } },
    select: { id: true, nome: true, utmCampaign: true },
  });
  const campanha = campanhas.find(
    (item) => normalizar(item.utmCampaign) === UTM_CAMPANHA_INSTAGRAM,
  );
  if (!campanha) {
    throw new Error(
      `Não achei a campanha do Instagram. Em Marketing > Campanhas, edite a campanha do Instagram e preencha o identificador com ${UTM_CAMPANHA_INSTAGRAM}.`,
    );
  }

  // Leads e clientes com o mesmo numero (comparando so DDD + 8 ultimos digitos).
  const [leads, clientes] = await Promise.all([
    prisma.lead.findMany({
      where: { telefone: { not: null } },
      select: {
        id: true,
        nome: true,
        telefone: true,
        etapa: true,
        origem: true,
        gclid: true,
        campanhaId: true,
        clienteId: true,
        updatedAt: true,
        campanha: { select: { nome: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.cliente.findMany({
      where: { OR: [{ telefone: { not: "" } }, { whatsapp: { not: null } }] },
      select: { id: true, nome: true, telefone: true, whatsapp: true },
    }),
  ]);
  const doNumero = leads.filter((lead) => chaveTelefone(lead.telefone) === chave);
  const ativo = doNumero.find((lead) => lead.etapa !== "Convertido" && lead.etapa !== "Perdido");
  const perdido = doNumero.find((lead) => lead.etapa === "Perdido");
  const cliente =
    clientes.find(
      (item) => chaveTelefone(item.telefone) === chave || chaveTelefone(item.whatsapp) === chave,
    ) ?? null;

  const agora = new Date();
  const textoContato = `Chamou no WhatsApp pelo anúncio do Instagram (${campanha.nome}).`;

  const resultado = await prisma.$transaction(async (tx) => {
    // 1. Ja tem lead em andamento com este numero: nao cria outro.
    if (ativo) {
      const semCampanhaOuEsta = !ativo.campanhaId || ativo.campanhaId === campanha.id;
      const jaPago = Boolean(ativo.gclid) || origemEhAnuncioPago(ativo.origem);
      await tx.lead.update({
        where: { id: ativo.id },
        data: {
          chamouWhatsapp: "Chamou",
          ultimoContatoEm: agora,
          // Nome provisorio ("Instagram · numero") troca pelo nome informado.
          ...(nomeInformado && ativo.nome.startsWith("Instagram · ") ? { nome: nomeInformado } : {}),
          ...(interesse ? { interesse } : {}),
          ...(semCampanhaOuEsta ? { campanhaId: campanha.id } : {}),
          ...(semCampanhaOuEsta && !jaPago ? { origem: ORIGEM_INSTAGRAM_ADS } : {}),
        },
      });
      await tx.leadInteracao.create({
        data: {
          leadId: ativo.id,
          tipo: "Contato",
          descricao: semCampanhaOuEsta
            ? `${textoContato} Lead já existia; não foi criado outro.`
            : `${textoContato} Lead já existia na campanha ${ativo.campanha?.nome || "outra"}; foi mantido nela.`,
        },
      });
      return {
        situacao: "ja_existia" as const,
        leadId: ativo.id,
        nome: ativo.nome,
        mensagem: semCampanhaOuEsta
          ? `${ativo.nome} já estava no CRM (${ativo.etapa}). Não criei outro lead: registrei o contato e deixei na campanha do Instagram.`
          : `${ativo.nome} já estava no CRM (${ativo.etapa}) pela campanha ${ativo.campanha?.nome || "outra"}. Não criei outro lead e mantive a campanha dela; o contato pelo Instagram ficou registrado no histórico.`,
      };
    }

    // 2. Lead perdido com este numero (e ela nao e cliente): volta para o funil.
    if (perdido && !cliente) {
      await tx.lead.update({
        where: { id: perdido.id },
        data: {
          etapa: "Novo",
          proximoContatoEm: null,
          chamouWhatsapp: "Chamou",
          ultimoContatoEm: agora,
          campanhaId: campanha.id,
          origem: ORIGEM_INSTAGRAM_ADS,
          ...(interesse ? { interesse } : {}),
        },
      });
      await tx.leadInteracao.create({
        data: {
          leadId: perdido.id,
          tipo: "Contato",
          descricao: `${textoContato} Estava como Perdido e voltou para Novo.`,
        },
      });
      return {
        situacao: "reaberto" as const,
        leadId: perdido.id,
        nome: perdido.nome,
        mensagem: `${perdido.nome} já tinha um lead marcado como Perdido. Não criei outro: ele voltou para Novo, na campanha do Instagram.`,
      };
    }

    // 3. Novo lead (ligado ao cadastro se ja for cliente).
    const nome =
      nomeInformado || cliente?.nome || `Instagram · ${telefone}`;
    const criado = await tx.lead.create({
      data: {
        nome,
        telefone,
        origem: ORIGEM_INSTAGRAM_ADS,
        interesse,
        etapa: "Novo",
        valorPrevisto: 0,
        campanhaId: campanha.id,
        clienteId: cliente?.id ?? null,
        chamouWhatsapp: "Chamou",
        primeiraMensagemEm: agora,
        ultimoContatoEm: agora,
      },
    });
    await tx.leadInteracao.create({
      data: {
        leadId: criado.id,
        tipo: "Criação",
        descricao: cliente
          ? `${textoContato} Já é cliente (${cliente.nome}): lead ligado ao cadastro dela, sem criar outro cadastro.`
          : `${textoContato} Lead lançado pelo botão "Lead do Instagram".`,
      },
    });
    return {
      situacao: cliente ? ("cliente_existente" as const) : ("criado" as const),
      leadId: criado.id,
      nome,
      mensagem: cliente
        ? `${cliente.nome} já é cliente. Criei a oportunidade ligada ao cadastro dela (sem cadastro novo), na campanha do Instagram.`
        : `Lead criado: ${nome}, origem Instagram Ads, na campanha do Instagram.`,
    };
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Marketing",
      acao: "Lead do Instagram",
      entidade: "Lead",
      entidadeId: String(resultado.leadId),
      usuario: usuario.email,
      detalhes: `${resultado.situacao} · ${resultado.nome} · ${telefone} · ${campanha.nome}`,
    },
  });

  revalidatePath("/marketing");
  revalidatePath("/");

  return { ...resultado, campanhaNome: campanha.nome };
}
