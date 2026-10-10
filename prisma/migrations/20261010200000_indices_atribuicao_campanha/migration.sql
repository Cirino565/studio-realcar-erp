-- Indices para a regra "so clique pago conta na campanha" ficar rapida.
CREATE INDEX IF NOT EXISTS "Lead_gclid_idx" ON "Lead"("gclid");
CREATE INDEX IF NOT EXISTS "Lead_origem_idx" ON "Lead"("origem");
CREATE INDEX IF NOT EXISTS "Cliente_origem_idx" ON "Cliente"("origem");
