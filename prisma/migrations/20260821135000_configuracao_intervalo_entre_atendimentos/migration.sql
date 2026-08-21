-- Add configurable safety interval between appointments
ALTER TABLE "ConfiguracaoClinica"
ADD COLUMN "intervaloEntreAtendimentos" INTEGER NOT NULL DEFAULT 30;
