-- Guarda o identificador que o anúncio manda no parâmetro utm_campaign
-- (ex.: pesq_limpeza_pele_taboao). É por ele que o clique no anúncio acha a
-- campanha certa no CRM.
--
-- Antes o sistema tentava casar pelo nome da campanha, mas o nome cadastrado
-- aqui é escrito para pessoa ("PESQ | Limpeza de Pele | Taboão | WhatsApp")
-- e nunca batia com o do anúncio.
--
-- Coluna opcional: campanha sem esse valor continua funcionando normalmente.

ALTER TABLE "CampanhaMarketing"
ADD COLUMN "utmCampaign" TEXT;