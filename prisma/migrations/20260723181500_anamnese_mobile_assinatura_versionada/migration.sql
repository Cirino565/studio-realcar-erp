ALTER TABLE "ClienteAnamnese"
  ADD COLUMN "assinaturaNome" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
  ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "finalizadaEm" TIMESTAMP(3),
  ADD COLUMN "assinadaEm" TIMESTAMP(3);

ALTER TABLE "ClienteAnamneseResposta"
  ADD COLUMN "anamneseId" INTEGER;

CREATE INDEX "ClienteAnamnese_clienteId_procedimento_status_idx"
  ON "ClienteAnamnese"("clienteId", "procedimento", "status");

CREATE INDEX "ClienteAnamneseResposta_anamneseId_idx"
  ON "ClienteAnamneseResposta"("anamneseId");

ALTER TABLE "ClienteAnamneseResposta"
  ADD CONSTRAINT "ClienteAnamneseResposta_anamneseId_fkey"
  FOREIGN KEY ("anamneseId") REFERENCES "ClienteAnamnese"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
