/**
 * Motivo de um desmarque/falta, a partir da observacao do agendamento.
 * O "Cliente desmarcou" grava uma linha assim:
 *   [Cancelou em 24/11 10:12, 1 dia antes. Vai remarcar. Viagem a trabalho]
 * Mostramos o conteudo da ultima linha dessas; sem ela, a observacao livre.
 */
export function motivoDesmarque(observacoes?: string | null): string | null {
  const texto = (observacoes || "").trim();
  if (!texto) return null;
  const linhas = [...texto.matchAll(/\[((?:Cancelou|Faltou) em [^\]]*)\]/g)];
  const ultima = linhas[linhas.length - 1]?.[1];
  if (ultima) return ultima.trim();
  return texto.replace(/\s+/g, " ").slice(0, 240);
}
