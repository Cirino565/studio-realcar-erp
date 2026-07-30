-- Cancelamento administrativo seguro de vendas.
-- A venda permanece no histórico, enquanto estoque e financeiro são estornados.

ALTER TABLE "Venda"
ADD COLUMN "situacao" TEXT NOT NULL DEFAULT 'ATIVA',
ADD COLUMN "canceladaEm" TIMESTAMP(3),
ADD COLUMN "canceladaPor" TEXT,
ADD COLUMN "motivoCancelamento" TEXT;

CREATE INDEX "Venda_situacao_data_idx" ON "Venda"("situacao", "data");
