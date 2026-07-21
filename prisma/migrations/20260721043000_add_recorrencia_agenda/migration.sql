ALTER TABLE "Agendamento"
  ADD COLUMN "serieId" TEXT,
  ADD COLUMN "recorrenciaTipo" TEXT,
  ADD COLUMN "recorrenciaIntervalo" INTEGER,
  ADD COLUMN "recorrenciaIndice" INTEGER,
  ADD COLUMN "recorrenciaTotal" INTEGER;

ALTER TABLE "BloqueioAgenda"
  ADD COLUMN "serieId" TEXT,
  ADD COLUMN "recorrenciaTipo" TEXT,
  ADD COLUMN "recorrenciaIntervalo" INTEGER,
  ADD COLUMN "recorrenciaIndice" INTEGER,
  ADD COLUMN "recorrenciaTotal" INTEGER;

CREATE INDEX "Agendamento_serieId_idx" ON "Agendamento"("serieId");
CREATE INDEX "BloqueioAgenda_serieId_idx" ON "BloqueioAgenda"("serieId");
