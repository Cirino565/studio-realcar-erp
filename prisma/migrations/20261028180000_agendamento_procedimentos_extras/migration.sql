-- Procedimentos extras marcados no MESMO horario do agendamento (alem do principal).
-- Guardado como texto (lista em JSON). "valor" e "duracao" do agendamento
-- continuam sendo o TOTAL da visita.
ALTER TABLE "Agendamento" ADD COLUMN "procedimentosExtras" TEXT;
