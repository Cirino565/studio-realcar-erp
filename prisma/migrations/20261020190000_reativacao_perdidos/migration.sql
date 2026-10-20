-- Reativacao de leads perdidos: data da perda, envio (uma vez so) e resultado.
ALTER TABLE "Lead" ADD COLUMN "perdidoEm" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "reativacaoEnviadaEm" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "reativacaoResultado" TEXT;
ALTER TABLE "Lead" ADD COLUMN "reativacaoResultadoEm" TIMESTAMP(3);

CREATE INDEX "Lead_etapa_reativacaoEnviadaEm_perdidoEm_idx" ON "Lead"("etapa", "reativacaoEnviadaEm", "perdidoEm");
CREATE INDEX "Lead_reativacaoEnviadaEm_idx" ON "Lead"("reativacaoEnviadaEm");

ALTER TABLE "ConfiguracaoClinica" ADD COLUMN "reativacaoLimiteDiario" INTEGER NOT NULL DEFAULT 15;

-- Leads que ja estavam perdidos: a data da perda vem do historico ("Perda");
-- sem historico, usa a ultima atualizacao do lead.
UPDATE "Lead" l
SET "perdidoEm" = COALESCE(
  (SELECT MAX(i."createdAt") FROM "LeadInteracao" i WHERE i."leadId" = l."id" AND i."tipo" = 'Perda'),
  l."updatedAt"
)
WHERE l."etapa" = 'Perdido' AND l."perdidoEm" IS NULL;
