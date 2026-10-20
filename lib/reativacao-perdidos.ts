/**
 * Reativacao de leads perdidos ("ultima mensagem").
 *
 * Regras:
 *  - entra quem esta como Perdido, tem telefone e nunca recebeu a mensagem de
 *    reativacao (cada pessoa recebe UMA vez so);
 *  - sai quem ja tem horario marcado para frente;
 *  - o envio e feito a mao, um por um, com limite por dia e uma pausa curta
 *    entre um envio e outro (protege o numero do WhatsApp).
 */

export const CATEGORIA_REATIVACAO_PERDIDOS = "Reativação de perdidos";
export const PREFIXO_MODELO = "reativacao-perdido:";
export const CHAVE_MODELO_PADRAO = `${PREFIXO_MODELO}padrao`;
export const POR_PAGINA = 30;
export const PAUSA_ENTRE_ENVIOS_SEGUNDOS = 30;
export const LIMITE_MINIMO = 1;
export const LIMITE_MAXIMO = 60;

export type ResultadoReativacao = "RESPONDEU" | "AGENDOU" | "SEM_RESPOSTA";

export const ROTULO_RESULTADO: Record<ResultadoReativacao, string> = {
  RESPONDEU: "Respondeu",
  AGENDOU: "Agendou / voltou",
  SEM_RESPOSTA: "Sem resposta",
};

export const TEXTO_PADRAO =
  "Oi, {nome}! Tudo bem? 😊 Aqui é do Studio Realçar.\n\n" +
  "Um tempo atrás você falou com a gente sobre {servico}. Ainda tem interesse?\n\n" +
  "Estamos com horários nesta semana e posso reservar um para você. Me conta qual dia e período (manhã ou tarde) ficam melhores. 💜";

export function normalizarTexto(valor?: string | null) {
  return (valor || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function chaveModeloDoServico(servico: string | null) {
  const normal = normalizarTexto(servico);
  return normal ? `${PREFIXO_MODELO}${normal}` : CHAVE_MODELO_PADRAO;
}

export function primeiroNome(nome?: string | null) {
  const limpo = (nome || "").trim();
  if (!limpo || /^contato via an[uú]ncio/i.test(limpo)) return "";
  return limpo.split(/\s+/)[0];
}

/** Troca {nome} e {servico} no texto do modelo. */
export function montarMensagem(modelo: string, dados: { nome?: string | null; servico?: string | null }) {
  const nome = primeiroNome(dados.nome);
  const servico = (dados.servico || "").trim().toLowerCase() || "nossos tratamentos";
  return modelo
    .replace(/\{nome\}/gi, nome)
    .replace(/Oi, !/g, "Oi!")
    .replace(/Olá, !/g, "Olá!")
    .replace(/\{servico\}|\{serviço\}/gi, servico)
    .trim();
}

const PALAVRAS_FRACAS = new Set(["contato", "via", "anuncio", "de", "da", "do", "e", "com", "para", "a", "o"]);

function primeiraPalavraForte(texto: string) {
  return texto.split(" ").find((palavra) => palavra.length >= 4 && !PALAVRAS_FRACAS.has(palavra)) || "";
}

/**
 * Descobre o "servico" de um interesse escrito livre ("limpeza", "Limpeza de
 * pele luxo", "Contato via anuncio · Criolipolise") usando a lista de servicos
 * cadastrados. Sem servico parecido, fica o proprio texto.
 */
export function servicoDoInteresse(interesse: string | null | undefined, servicos: string[]): string | null {
  const bruto = (interesse || "").replace(/^contato via an[uú]ncio\s*[·\-:]?\s*/i, "").trim();
  const alvo = normalizarTexto(bruto);
  if (!alvo) return null;

  const lista = servicos
    .map((nome) => ({ nome, normal: normalizarTexto(nome) }))
    .filter((item) => item.normal);

  const exato = lista.find((item) => item.normal === alvo);
  if (exato) return exato.nome;

  // Servico escrito dentro do interesse ("quero limpeza de pele luxo"): o mais completo.
  const dentroDoInteresse = lista
    .filter((item) => alvo.includes(item.normal))
    .sort((a, b) => b.normal.length - a.normal.length);
  if (dentroDoInteresse.length > 0) return dentroDoInteresse[0].nome;

  // Interesse curto dentro do nome do servico ("limpeza"): o mais simples.
  const interesseDentro = lista
    .filter((item) => item.normal.includes(alvo))
    .sort((a, b) => a.normal.length - b.normal.length);
  if (interesseDentro.length > 0) return interesseDentro[0].nome;

  const palavra = primeiraPalavraForte(alvo);
  if (palavra) {
    const porPalavra = lista
      .filter((item) => primeiraPalavraForte(item.normal) === palavra)
      .sort((a, b) => a.normal.length - b.normal.length);
    if (porPalavra.length > 0) return porPalavra[0].nome;
  }

  return bruto.charAt(0).toUpperCase() + bruto.slice(1);
}

/** Inicio do dia de hoje no horario de Brasilia. */
export function inicioDoDiaSaoPaulo(agora: Date = new Date()) {
  const dia = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
  return new Date(`${dia}T00:00:00-03:00`);
}

export function somenteDigitos(valor?: string | null) {
  const digitos = (valor || "").replace(/\D/g, "");
  // Ignora o 55 do Brasil para comparar o mesmo numero escrito de jeitos diferentes.
  return digitos.length > 11 && digitos.startsWith("55") ? digitos.slice(2) : digitos;
}
