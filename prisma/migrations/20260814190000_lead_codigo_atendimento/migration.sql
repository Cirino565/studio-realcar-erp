-- Guarda o código de atendimento gerado no clique do botão de WhatsApp das
-- landing pages (ex.: SR-LIM-GPTPJ). É esse código que liga o lead ao anúncio
-- de origem, informação que hoje existe apenas na planilha do Google e se
-- perde ao entrar no CRM.
--
-- A coluna é opcional: nenhum lead existente é alterado e nada é apagado.

ALTER TABLE "Lead"
ADD COLUMN "codigoAtendimento" TEXT;

CREATE INDEX "Lead_codigoAtendimento_idx"
ON "Lead"("codigoAtendimento");