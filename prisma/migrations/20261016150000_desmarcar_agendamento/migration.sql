-- Desmarcacao de agendamento: lista "Para remarcar" e sinal guardado para a nova data.
ALTER TABLE "Agendamento" ADD COLUMN "aguardandoRemarcacao" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Agendamento" ADD COLUMN "sinalGuardado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Agendamento" ADD COLUMN "desmarcadoEm" TIMESTAMP(3);

CREATE INDEX "Agendamento_aguardandoRemarcacao_clienteId_idx" ON "Agendamento"("aguardandoRemarcacao", "clienteId");
