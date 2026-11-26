-- Pacote com numero de sessoes (quantas foram feitas) e marca de "pago no
-- atendimento" (o dinheiro ja entrou pela venda do atendimento).
ALTER TABLE "PacoteCliente" ADD COLUMN IF NOT EXISTS "sessoes" INTEGER;
ALTER TABLE "PacoteCliente" ADD COLUMN IF NOT EXISTS "sessoesFeitas" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PacoteCliente" ADD COLUMN IF NOT EXISTS "pagoNoAtendimento" BOOLEAN NOT NULL DEFAULT false;
