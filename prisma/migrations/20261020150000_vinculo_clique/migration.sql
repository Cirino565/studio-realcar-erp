-- Vinculo com o clique do anuncio para quem apagou o codigo da mensagem.
ALTER TABLE "Lead" ADD COLUMN "codigosExtras" TEXT;
ALTER TABLE "Lead" ADD COLUMN "primeiraMensagemEm" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "sugestaoCliqueRecusada" BOOLEAN NOT NULL DEFAULT false;
