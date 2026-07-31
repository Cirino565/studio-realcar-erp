-- Corrige posições duplicadas existentes e estabelece uma sequência única.
-- A aplicação mantém a ordenação alfabética automaticamente após esta migration.
WITH ranked AS (
  SELECT
    "id",
    (ROW_NUMBER() OVER (ORDER BY LOWER("nome"), "id") - 1)::INTEGER AS "novaOrdem"
  FROM "ProcedimentoInteresse"
)
UPDATE "ProcedimentoInteresse" AS destino
SET "ordem" = ranked."novaOrdem"
FROM ranked
WHERE destino."id" = ranked."id"
  AND destino."ordem" <> ranked."novaOrdem";

WITH ranked AS (
  SELECT
    "id",
    (ROW_NUMBER() OVER (ORDER BY LOWER("nome"), "id") - 1)::INTEGER AS "novaOrdem"
  FROM "ProcedimentoServico"
)
UPDATE "ProcedimentoServico" AS destino
SET "ordem" = ranked."novaOrdem"
FROM ranked
WHERE destino."id" = ranked."id"
  AND destino."ordem" <> ranked."novaOrdem";
