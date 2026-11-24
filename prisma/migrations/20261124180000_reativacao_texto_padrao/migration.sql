-- Reativacao de perdidos: novo texto padrao (continua editavel em "Textos").
INSERT INTO "MensagemModelo" ("chave", "nome", "categoria", "corpo", "ativo", "ordem", "updatedAt") VALUES
('reativacao-perdido:padrao', 'Reativação · padrão', 'Reativação de perdidos', E'Oi, {nome}! Tudo bem? 😊 Vi que você se interessou pela nossa {servico} há um tempinho e a gente acabou não conseguindo marcar um horário. Passei só pra dizer que seguimos de portas abertas pra te receber! Se quiser, me conta qual dia e período ficam melhores que eu já separo um horário pra você. Qualquer dúvida, é só me chamar 💛', true, 0, CURRENT_TIMESTAMP)
ON CONFLICT ("chave") DO UPDATE SET "corpo" = EXCLUDED."corpo", "ativo" = true, "updatedAt" = CURRENT_TIMESTAMP;
