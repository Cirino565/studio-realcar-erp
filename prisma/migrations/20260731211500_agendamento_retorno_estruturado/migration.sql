ALTER TABLE "Agendamento"
ADD COLUMN "naturezaAtendimento" TEXT NOT NULL DEFAULT 'PROCEDIMENTO',
ADD COLUMN "agendamentoOrigemId" INTEGER;

CREATE INDEX "Agendamento_naturezaAtendimento_data_idx"
ON "Agendamento"("naturezaAtendimento", "data");

CREATE INDEX "Agendamento_agendamentoOrigemId_idx"
ON "Agendamento"("agendamentoOrigemId");

ALTER TABLE "Agendamento"
ADD CONSTRAINT "Agendamento_agendamentoOrigemId_fkey"
FOREIGN KEY ("agendamentoOrigemId") REFERENCES "Agendamento"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
