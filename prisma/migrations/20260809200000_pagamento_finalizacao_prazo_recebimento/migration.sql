-- Congela o prazo da forma de pagamento e a previsão de recebimento
-- nas vendas e lançamentos, preservando o histórico mesmo se a configuração
-- da forma de pagamento for alterada posteriormente.

ALTER TABLE "Lancamento"
ADD COLUMN "prazoRecebimentoDias" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "recebimentoPrevistoEm" TIMESTAMP(3);

ALTER TABLE "Venda"
ADD COLUMN "prazoRecebimentoDias" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "recebimentoPrevistoEm" TIMESTAMP(3);

CREATE INDEX "Lancamento_recebimentoPrevistoEm_statusPagamento_idx"
ON "Lancamento"("recebimentoPrevistoEm", "statusPagamento");

CREATE INDEX "Venda_recebimentoPrevistoEm_statusPagamento_idx"
ON "Venda"("recebimentoPrevistoEm", "statusPagamento");
