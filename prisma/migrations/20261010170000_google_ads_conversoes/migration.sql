-- Visibilidade do envio de conversoes ao Google Ads.
-- Guarda o ultimo erro ao escrever cada venda na planilha e a opcao de enviar
-- tambem uma conversao por procedimento. Colunas opcionais / com padrao.
ALTER TABLE "Venda" ADD COLUMN "conversaoAdsErro" TEXT;
ALTER TABLE "ConfiguracaoClinica" ADD COLUMN "googleAdsPorProcedimento" BOOLEAN NOT NULL DEFAULT false;
