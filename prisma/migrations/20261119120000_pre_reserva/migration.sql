-- Pre-reserva: horario que a cliente deixou combinado no fim do atendimento,
-- mas ainda vai confirmar (7 dias antes). Valores: PENDENTE, CONFIRMADA,
-- LIBERADA. Nulo = agendamento normal.
ALTER TABLE "Agendamento" ADD COLUMN IF NOT EXISTS "preReserva" TEXT;
CREATE INDEX IF NOT EXISTS "Agendamento_preReserva_data_idx" ON "Agendamento"("preReserva", "data");

-- Mensagem para confirmar a pre-reserva (editavel em Comunicacoes > Modelos).
INSERT INTO "MensagemModelo" ("chave", "nome", "categoria", "corpo", "ativo", "ordem", "updatedAt") VALUES
('confirmar_pre_reserva', 'Confirmar pré-reserva', 'Agenda', E'Olá, {primeiro_nome}, tudo bem?\n\nNo seu último atendimento deixamos um horário pré-reservado para você:\n\n*{dia_semana}, {data}, às {horario}*\n{procedimento}\n\nPodemos confirmar? Se precisar mudar, é só nos avisar que ajustamos.\n\n{clinica}', true, 102, CURRENT_TIMESTAMP)
ON CONFLICT ("chave") DO NOTHING;
