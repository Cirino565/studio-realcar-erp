-- CRM comercial integrado
ALTER TABLE "Lead"
  ADD COLUMN "motivoPerda" TEXT,
  ADD COLUMN "ultimoContatoEm" TIMESTAMP(3),
  ADD COLUMN "proximoContatoEm" TIMESTAMP(3),
  ADD COLUMN "convertidoEm" TIMESTAMP(3),
  ADD COLUMN "clienteId" INTEGER,
  ADD COLUMN "agendamentoId" INTEGER,
  ADD COLUMN "campanhaId" INTEGER;

CREATE UNIQUE INDEX "Lead_agendamentoId_key" ON "Lead"("agendamentoId");
CREATE INDEX "Lead_clienteId_idx" ON "Lead"("clienteId");
CREATE INDEX "Lead_campanhaId_idx" ON "Lead"("campanhaId");
CREATE INDEX "Lead_etapa_idx" ON "Lead"("etapa");
CREATE INDEX "Lead_proximoContatoEm_idx" ON "Lead"("proximoContatoEm");

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_clienteId_fkey"
  FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_agendamentoId_fkey"
  FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_campanhaId_fkey"
  FOREIGN KEY ("campanhaId") REFERENCES "CampanhaMarketing"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "LeadInteracao" (
  "id" SERIAL NOT NULL,
  "leadId" INTEGER NOT NULL,
  "tipo" TEXT NOT NULL,
  "descricao" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadInteracao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeadInteracao_leadId_createdAt_idx"
  ON "LeadInteracao"("leadId", "createdAt");

ALTER TABLE "LeadInteracao"
  ADD CONSTRAINT "LeadInteracao_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
