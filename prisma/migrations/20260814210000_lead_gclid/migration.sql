-- Guarda o GCLID (identificador de clique do Google Ads) no momento em que
-- o lead é criado a partir do clique no botão de WhatsApp da landing page.
-- É esse valor que, mais tarde, permite gerar a conversão para o Google Ads
-- sem precisar copiar nada manualmente.
--
-- Coluna opcional: leads que não vêm de um clique de anúncio (indicação,
-- cadastro manual etc.) simplesmente não têm esse valor preenchido.

ALTER TABLE "Lead"
ADD COLUMN "gclid" TEXT;