/**
 * Campanhas de anuncio do Instagram (clique para o WhatsApp), para o botao
 * "Lead do Instagram" escolher de qual campanha a pessoa veio.
 */

function semAcento(texto?: string | null) {
  return (texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/** Canal Instagram/Meta/Facebook, ou nome comecando com "Instagram". */
export function campanhaEhInstagram(campanha: { canal?: string | null; nome?: string | null }) {
  const canal = semAcento(campanha.canal);
  return (
    canal.includes("instagram") ||
    canal.includes("meta") ||
    canal.includes("facebook") ||
    semAcento(campanha.nome).startsWith("instagram")
  );
}

/** "Instagram | Despigmentação | WhatsApp" -> "Despigmentação" (interesse do lead). */
export function interesseDaCampanha(nome?: string | null): string | null {
  const partes = (nome || "").split("|").map((parte) => parte.trim()).filter(Boolean);
  if (partes.length < 2) return null;
  const meio = partes.filter(
    (parte) => !["instagram", "whatsapp", "meta", "facebook"].includes(semAcento(parte)),
  );
  return meio[0] || null;
}
