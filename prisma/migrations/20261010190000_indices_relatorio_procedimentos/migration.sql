-- Indices para o relatorio por procedimento abrir rapido.
CREATE INDEX IF NOT EXISTS "Agendamento_status_data_idx" ON "Agendamento"("status", "data");
CREATE INDEX IF NOT EXISTS "Agendamento_procedimento_data_idx" ON "Agendamento"("procedimento", "data");
CREATE INDEX IF NOT EXISTS "Venda_situacao_statusPagamento_data_idx" ON "Venda"("situacao", "statusPagamento", "data");
