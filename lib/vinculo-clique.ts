/**
 * Vinculo provavel entre um contato de WhatsApp SEM codigo e um clique de
 * anuncio.
 *
 * Quando a pessoa clica no anuncio, a landing page cria um lead "Contato via
 * anuncio" com o codigo (SR-...) e o codigo do Google (gclid). Se ela apaga a
 * mensagem pronta e escreve do zero, o contato chega sem codigo e a ligacao com
 * o anuncio se perde. Aqui o sistema procura o clique mais provavel:
 *  - clique do Google (gclid ou origem Google Ads) que ainda nao virou contato;
 *  - feito ate 30 minutos ANTES da 1a mensagem (aceita 2 min depois, por relogio);
 *  - mais perto no horario ganha; mesmo servico ajuda no desempate.
 * Cada clique e sugerido para UM contato so. Nada e aplicado sozinho: a
 * sugestao so vira vinculo quando alguem confirma.
 *
 * Tudo e calculado em cima da lista de leads que a tela de Marketing ja
 * carrega (nenhuma consulta extra ao banco).
 */

export const JANELA_ANTES_MINUTOS = 30;
export const JANELA_DEPOIS_MINUTOS = 2;
export const DIAS_ANALISADOS = 14;
const BONUS_MESMO_SERVICO_MINUTOS = 10;
const ETAPAS_ENCERRADAS = ["Convertido", "Perdido"];

export type LeadParaVinculo = {
  id: number;
  nome: string;
  telefone: string | null;
  origem: string | null;
  interesse: string | null;
  etapa: string;
  clienteId: number | null;
  agendamentoId: number | null;
  codigoAtendimento: string | null;
  codigosExtras?: string | null;
  gclid: string | null;
  primeiraMensagemEm?: Date | string | null;
  sugestaoCliqueRecusada?: boolean;
  createdAt: Date | string;
  campanha?: { id: number; nome: string } | null;
};

export type SugestaoClique = {
  cliqueId: number;
  codigo: string;
  campanhaNome: string | null;
  servico: string | null;
  cliqueEm: string;
  minutosAntes: number;
  mesmoServico: boolean;
};

export type VinculoDoLead = {
  // Contato sem codigo que pode receber sugestao (mostra o horario usado).
  elegivel: boolean;
  referenciaEm: string | null;
  sugestao: SugestaoClique | null;
  // Outros leads com o MESMO codigo do Google (mesmo clique).
  mesmoClique: Array<{ id: number; codigo: string | null; nome: string }>;
};

function tempo(valor: Date | string | null | undefined) {
  if (!valor) return Number.NaN;
  return new Date(valor).getTime();
}

function normalizar(valor?: string | null) {
  return (valor || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function ehGoogle(origem?: string | null) {
  return /google\s*ads/i.test(origem || "");
}

const PALAVRAS_IGNORADAS = new Set(["contato", "via", "anuncio", "de", "da", "do", "com", "para", "pele", "e"]);

function palavras(texto?: string | null) {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((palavra) => palavra.length >= 4 && !PALAVRAS_IGNORADAS.has(palavra));
}

/** Clique de anuncio que ainda nao virou contato (sem telefone, sem cliente). */
export function ehCliqueSolto(lead: LeadParaVinculo) {
  return (
    Boolean(lead.codigoAtendimento) &&
    (Boolean(lead.gclid) || ehGoogle(lead.origem)) &&
    !lead.telefone?.trim() &&
    !lead.clienteId &&
    !lead.agendamentoId &&
    !ETAPAS_ENCERRADAS.includes(lead.etapa)
  );
}

/** Contato de verdade (telefone ou cliente) que chegou sem codigo nem clique. */
export function ehContatoSemCodigo(lead: LeadParaVinculo) {
  return (
    (Boolean(lead.telefone?.trim()) || Boolean(lead.clienteId)) &&
    !lead.codigoAtendimento &&
    !lead.gclid &&
    !lead.sugestaoCliqueRecusada
  );
}

export function referenciaDoContato(lead: LeadParaVinculo) {
  const primeira = tempo(lead.primeiraMensagemEm);
  return Number.isFinite(primeira) ? primeira : tempo(lead.createdAt);
}

function mesmoServico(contato: LeadParaVinculo, clique: LeadParaVinculo) {
  const doContato = new Set(palavras(`${contato.interesse || ""} ${contato.campanha?.nome || ""}`));
  if (doContato.size === 0) return false;
  return palavras(`${clique.interesse || ""} ${clique.campanha?.nome || ""} ${clique.nome}`).some((palavra) =>
    doContato.has(palavra),
  );
}

/**
 * Calcula, para cada lead, a sugestao de clique (se houver) e os outros leads
 * do mesmo clique do Google.
 */
export function calcularVinculosClique(
  leads: LeadParaVinculo[],
  agora: Date = new Date(),
): Record<number, VinculoDoLead> {
  const limite = agora.getTime() - DIAS_ANALISADOS * 86_400_000;
  const recentes = leads.filter((lead) => tempo(lead.createdAt) >= limite || referenciaDoContato(lead) >= limite);

  const cliques = recentes.filter(ehCliqueSolto);
  const contatos = recentes.filter((lead) => ehContatoSemCodigo(lead) && referenciaDoContato(lead) >= limite);

  // Todos os pares possiveis dentro da janela.
  const pares: Array<{ contato: LeadParaVinculo; clique: LeadParaVinculo; minutos: number; mesmo: boolean; nota: number }> = [];
  for (const contato of contatos) {
    const referencia = referenciaDoContato(contato);
    for (const clique of cliques) {
      if (clique.id === contato.id) continue;
      const minutos = (referencia - tempo(clique.createdAt)) / 60_000;
      if (minutos > JANELA_ANTES_MINUTOS || minutos < -JANELA_DEPOIS_MINUTOS) continue;
      const mesmo = mesmoServico(contato, clique);
      pares.push({
        contato,
        clique,
        minutos,
        mesmo,
        nota: Math.abs(minutos) - (mesmo ? BONUS_MESMO_SERVICO_MINUTOS : 0),
      });
    }
  }

  // Melhores pares primeiro; cada clique e cada contato entram uma vez so.
  pares.sort((a, b) => a.nota - b.nota || a.clique.id - b.clique.id);
  const cliqueUsado = new Set<number>();
  const sugestoes = new Map<number, SugestaoClique>();
  for (const par of pares) {
    if (cliqueUsado.has(par.clique.id) || sugestoes.has(par.contato.id)) continue;
    cliqueUsado.add(par.clique.id);
    sugestoes.set(par.contato.id, {
      cliqueId: par.clique.id,
      codigo: par.clique.codigoAtendimento || "",
      campanhaNome: par.clique.campanha?.nome ?? null,
      servico: par.clique.interesse,
      cliqueEm: new Date(par.clique.createdAt).toISOString(),
      minutosAntes: Math.round(par.minutos),
      mesmoServico: par.mesmo,
    });
  }

  // Mesmo codigo do Google em mais de um lead = mesma pessoa, mesmo clique.
  const porGclid = new Map<string, LeadParaVinculo[]>();
  for (const lead of leads) {
    const gclid = lead.gclid?.trim();
    if (!gclid) continue;
    const lista = porGclid.get(gclid) ?? [];
    lista.push(lead);
    porGclid.set(gclid, lista);
  }

  const resultado: Record<number, VinculoDoLead> = {};
  const garantir = (lead: LeadParaVinculo) =>
    (resultado[lead.id] ??= { elegivel: false, referenciaEm: null, sugestao: null, mesmoClique: [] });

  for (const contato of contatos) {
    const item = garantir(contato);
    item.elegivel = true;
    item.referenciaEm = new Date(referenciaDoContato(contato)).toISOString();
    item.sugestao = sugestoes.get(contato.id) ?? null;
  }

  for (const grupo of porGclid.values()) {
    if (grupo.length < 2) continue;
    for (const lead of grupo) {
      garantir(lead).mesmoClique = grupo
        .filter((outro) => outro.id !== lead.id)
        .map((outro) => ({ id: outro.id, codigo: outro.codigoAtendimento, nome: outro.nome }));
    }
  }

  return resultado;
}

/** Junta listas de codigos sem repetir ("SR-A, SR-B"). */
export function juntarCodigos(...listas: Array<string | null | undefined>) {
  const vistos = new Set<string>();
  for (const lista of listas) {
    for (const codigo of (lista || "").split(",")) {
      const limpo = codigo.trim().toUpperCase();
      if (limpo) vistos.add(limpo);
    }
  }
  return vistos.size > 0 ? Array.from(vistos).join(", ") : null;
}
