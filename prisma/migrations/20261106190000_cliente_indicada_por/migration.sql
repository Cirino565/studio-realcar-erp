-- "Indicada por": cliente que indicou esta cliente (um nivel so).
ALTER TABLE "Cliente" ADD COLUMN "indicadaPorId" INTEGER;
CREATE INDEX "Cliente_indicadaPorId_idx" ON "Cliente"("indicadaPorId");
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_indicadaPorId_fkey" FOREIGN KEY ("indicadaPorId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
