ALTER TABLE "Agendamento"
ADD COLUMN "sinalPago" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "statusAntesAtendimento" TEXT;
