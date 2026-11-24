-- Reativacao de perdidos: so entra quem foi perdido ha mais de X dias (padrao 7).
ALTER TABLE "ConfiguracaoClinica" ADD COLUMN IF NOT EXISTS "reativacaoDiasEsfriar" INTEGER NOT NULL DEFAULT 7;
