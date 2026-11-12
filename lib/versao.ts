/**
 * Identifica a versao no ar (muda a cada deploy na Railway). Usada para
 * avisar quem esta com a tela aberta de antes de uma atualizacao.
 */
export function versaoAtual() {
  return (
    process.env.RAILWAY_DEPLOYMENT_ID ||
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    "local"
  );
}
