-- Botao "Faltou": mensagem pronta para a cliente que faltou (editavel em
-- Comunicacoes > Modelos). Duas versoes: com sinal retido e sem sinal.

INSERT INTO "MensagemModelo" ("chave", "nome", "categoria", "corpo", "ativo", "ordem", "updatedAt") VALUES
('cliente_faltou', 'Contato após falta (com sinal)', 'Agenda', E'Olá, {primeiro_nome}, tudo bem?\n\nPassamos para dizer que sentimos sua falta hoje, no horário que havíamos reservado especialmente para você — imaginamos que possa ter surgido algum imprevisto.\n\nCom toda transparência, precisamos explicar um ponto: como a profissional se deslocou e permaneceu à sua espera no horário marcado, e não foi possível encaixar outra cliente naquele período, o sinal desta reserva não pode ser transferido para um novo agendamento, por ter sido um tempo dedicado exclusivamente a você.\n\nSeguimos inteiramente à disposição para recebê-la. Quando desejar remarcar, basta nos informar o melhor dia e período que reservamos um novo horário para você, mediante um novo sinal para garantir a reserva.\n\nFicamos no aguardo!\n{clinica}', true, 100, CURRENT_TIMESTAMP),
('cliente_faltou_sem_sinal', 'Contato após falta (sem sinal)', 'Agenda', E'Olá, {primeiro_nome}, tudo bem?\n\nPassamos para dizer que sentimos sua falta hoje, no horário que havíamos reservado especialmente para você — imaginamos que possa ter surgido algum imprevisto.\n\nSeguimos inteiramente à disposição para recebê-la. Quando desejar remarcar, basta nos informar o melhor dia e período que reservamos um novo horário para você, mediante um sinal para garantir a reserva.\n\nFicamos no aguardo!\n{clinica}', true, 101, CURRENT_TIMESTAMP)
ON CONFLICT ("chave") DO UPDATE SET
  "nome" = EXCLUDED."nome",
  "corpo" = EXCLUDED."corpo",
  "ativo" = true,
  "updatedAt" = CURRENT_TIMESTAMP;
