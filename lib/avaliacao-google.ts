// Pedido de avaliacao no Google (Dashboard > "Pedir avaliação hoje").
// O registro "ja pedi" fica em ComunicacaoRegistro com esta categoria, uma
// vez por cliente: quem ja recebeu nao volta para a lista.
export const CATEGORIA_AVALIACAO_GOOGLE = "Avaliação Google";

const MENSAGEM = [
  "Oi, [nome]! 💖",
  "",
  "Foi um prazer te atender aqui no Studio Realçar! ✨",
  "",
  "Sua opinião é muito importante pra nós e ajuda outras pessoas a conhecerem nosso trabalho 💫",
  "",
  "Se você gostou da sua experiência, pode deixar uma avaliação no Google? É rapidinho 😊",
  "",
  "👉 https://g.page/r/CTI4nUC2KD1HEBM/review",
  "",
  "Agradecemos muito pela confiança e esperamos te ver novamente em breve! 🥰✨",
].join("\n");

/** "MARIA aparecida silva" -> "Maria". */
export function primeiroNomeCliente(nome: string) {
  const primeiro = nome.trim().split(/\s+/)[0] || "";
  if (!primeiro) return "";
  return primeiro.charAt(0).toLocaleUpperCase("pt-BR") + primeiro.slice(1).toLocaleLowerCase("pt-BR");
}

export function mensagemAvaliacaoGoogle(nomeCliente: string) {
  const nome = primeiroNomeCliente(nomeCliente);
  return nome ? MENSAGEM.replace("[nome]", nome) : MENSAGEM.replace(", [nome]", "");
}
