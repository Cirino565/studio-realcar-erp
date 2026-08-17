-- Marca quando um agendamento foi deliberadamente criado fora do horário de
-- funcionamento normal da clínica (uma exceção, não um erro). Serve para
-- diferenciar isso de um problema de configuração ao olhar a agenda depois.
--
-- Não altera nenhum agendamento existente - todos continuam com false.

ALTER TABLE "Agendamento"
ADD COLUMN "excecaoHorarioFuncionamento" BOOLEAN NOT NULL DEFAULT false;