ALTER TABLE "Agendamento"
ADD COLUMN "evolucaoStatus" TEXT,
ADD COLUMN "evolucaoPendenteDesde" TIMESTAMP(3),
ADD COLUMN "evolucaoRegistradaEm" TIMESTAMP(3),
ADD COLUMN "evolucaoRegistradaPor" TEXT;

ALTER TABLE "ClienteEvolucao"
ADD COLUMN "agendamentoId" INTEGER;

CREATE UNIQUE INDEX "ClienteEvolucao_agendamentoId_key"
ON "ClienteEvolucao"("agendamentoId");

CREATE INDEX "Agendamento_evolucaoStatus_evolucaoPendenteDesde_idx"
ON "Agendamento"("evolucaoStatus", "evolucaoPendenteDesde");

ALTER TABLE "ClienteEvolucao"
ADD CONSTRAINT "ClienteEvolucao_agendamentoId_fkey"
FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
