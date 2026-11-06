-- Ficha da cliente e agenda: busca rapida dos agendamentos de uma cliente por situacao.
CREATE INDEX IF NOT EXISTS "Agendamento_clienteId_status_idx" ON "Agendamento"("clienteId", "status");
