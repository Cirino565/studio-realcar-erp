-- Simplifica o funil de leads de 6 para 5 etapas, conforme o pedido de
-- 18/08/2026. Nenhuma coluna muda de estrutura - só os VALORES já
-- guardados em leads existentes, para acompanhar o novo nome de cada
-- etapa.
--
--   Contato    -> Novo
--   Avaliação  -> Agendado
--   Negociação -> Aguardando resposta
--
-- "Novo", "Convertido" e "Perdido" continuam com o mesmo nome e não
-- precisam de nenhum ajuste.

UPDATE "Lead" SET "etapa" = 'Novo' WHERE "etapa" = 'Contato';
UPDATE "Lead" SET "etapa" = 'Agendado' WHERE "etapa" = 'Avaliação';
UPDATE "Lead" SET "etapa" = 'Aguardando resposta' WHERE "etapa" = 'Negociação';