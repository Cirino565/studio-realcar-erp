-- Ultima mensagem para perdido (Arquivo do pipeline): nao manda de novo.
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "ultimaMensagemEm" TIMESTAMP(3);
