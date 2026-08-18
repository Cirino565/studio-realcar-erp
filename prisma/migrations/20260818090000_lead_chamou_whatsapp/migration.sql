-- Controle manual de quem atende: o botão de WhatsApp da landing page abre
-- a conversa com o texto pronto, mas não envia sozinho - a pessoa ainda
-- precisa apertar "enviar". Isso significa que existe código gerado na
-- planilha de rastreamento para gente que nunca chegou a conversar.
--
-- Esse campo deixa a família marcar, ao conferir a conversa de cada lead,
-- se ela de fato chamou no WhatsApp ou não - para medir o tamanho real
-- desse vazamento entre o clique e a conversa.

ALTER TABLE "Lead"
ADD COLUMN "chamouWhatsapp" TEXT NOT NULL DEFAULT 'A verificar';