const PREFIXO_MENSAGEM_UTF8 = "utf8b64:";

export function mensagemModeloEstaCodificada(valor: string) {
  return valor.startsWith(PREFIXO_MENSAGEM_UTF8);
}

export function codificarMensagemModelo(valor: string) {
  return `${PREFIXO_MENSAGEM_UTF8}${Buffer.from(valor, "utf8").toString("base64")}`;
}

export function decodificarMensagemModelo(valor: string) {
  if (!mensagemModeloEstaCodificada(valor)) return valor;

  try {
    return Buffer.from(valor.slice(PREFIXO_MENSAGEM_UTF8.length), "base64").toString("utf8");
  } catch {
    return valor;
  }
}
