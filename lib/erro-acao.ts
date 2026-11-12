/**
 * Traduz erros de "acao do servidor" que o Next mostra em ingles.
 * O mais comum: a tela ficou aberta desde antes de uma atualizacao do
 * sistema e o botao chama uma versao que nao existe mais.
 */
export function mensagemErroAcao(erro: unknown, padrao: string) {
  const texto = erro instanceof Error ? erro.message : "";
  if (
    /unexpected response was received from the server/i.test(texto) ||
    /server action .*not found/i.test(texto) ||
    /failed to find server action/i.test(texto)
  ) {
    return "O sistema foi atualizado enquanto esta tela estava aberta. Atualize a página (puxe a tela para baixo ou toque em recarregar) e salve de novo.";
  }
  if (/failed to fetch|network|load failed/i.test(texto)) {
    return "Sem conexão com o sistema agora. Confira a internet e tente de novo; nada do que você digitou foi perdido.";
  }
  return texto || padrao;
}
