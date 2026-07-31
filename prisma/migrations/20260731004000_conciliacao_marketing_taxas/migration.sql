-- Contas financeiras, conciliação, atribuição de marketing e taxas de recebimento.
-- Alteração aditiva. Nenhum lançamento, venda ou cliente existente é apagado.

CREATE TABLE "ContaFinanceira" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "banco" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'Conta corrente',
    "saldoInicial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saldoBancoInformado" DOUBLE PRECISION,
    "conciliadoEm" TIMESTAMP(3),
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Ativa',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContaFinanceira_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormaPagamentoConfig" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "taxaPercentual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxaFixa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prazoDias" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Ativa',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormaPagamentoConfig_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Cliente"
ADD COLUMN "campanhaAquisicaoId" INTEGER;

ALTER TABLE "CampanhaMarketing"
ADD COLUMN "observacoes" TEXT;

ALTER TABLE "Lancamento"
ADD COLUMN "valorLiquido" DOUBLE PRECISION,
ADD COLUMN "taxaPagamento" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "taxaPercentualAplicada" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "taxaFixaAplicada" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "contaFinanceiraId" INTEGER,
ADD COLUMN "formaPagamentoConfigId" INTEGER,
ADD COLUMN "campanhaId" INTEGER;

ALTER TABLE "Venda"
ADD COLUMN "taxaPagamento" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "taxaPercentualAplicada" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "taxaFixaAplicada" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "valorLiquido" DOUBLE PRECISION,
ADD COLUMN "formaPagamentoConfigId" INTEGER,
ADD COLUMN "contaFinanceiraId" INTEGER,
ADD COLUMN "campanhaId" INTEGER;

CREATE UNIQUE INDEX "FormaPagamentoConfig_nome_key" ON "FormaPagamentoConfig"("nome");
CREATE INDEX "ContaFinanceira_principal_status_idx" ON "ContaFinanceira"("principal", "status");
CREATE INDEX "FormaPagamentoConfig_status_ordem_nome_idx" ON "FormaPagamentoConfig"("status", "ordem", "nome");
CREATE INDEX "Cliente_campanhaAquisicaoId_idx" ON "Cliente"("campanhaAquisicaoId");
CREATE INDEX "CampanhaMarketing_status_inicio_idx" ON "CampanhaMarketing"("status", "inicio");
CREATE INDEX "Lancamento_contaFinanceiraId_data_idx" ON "Lancamento"("contaFinanceiraId", "data");
CREATE INDEX "Lancamento_campanhaId_data_idx" ON "Lancamento"("campanhaId", "data");
CREATE INDEX "Lancamento_formaPagamentoConfigId_idx" ON "Lancamento"("formaPagamentoConfigId");
CREATE INDEX "Venda_contaFinanceiraId_data_idx" ON "Venda"("contaFinanceiraId", "data");
CREATE INDEX "Venda_campanhaId_data_idx" ON "Venda"("campanhaId", "data");
CREATE INDEX "Venda_formaPagamentoConfigId_idx" ON "Venda"("formaPagamentoConfigId");

ALTER TABLE "Cliente"
ADD CONSTRAINT "Cliente_campanhaAquisicaoId_fkey"
FOREIGN KEY ("campanhaAquisicaoId") REFERENCES "CampanhaMarketing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lancamento"
ADD CONSTRAINT "Lancamento_contaFinanceiraId_fkey"
FOREIGN KEY ("contaFinanceiraId") REFERENCES "ContaFinanceira"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Lancamento_formaPagamentoConfigId_fkey"
FOREIGN KEY ("formaPagamentoConfigId") REFERENCES "FormaPagamentoConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Lancamento_campanhaId_fkey"
FOREIGN KEY ("campanhaId") REFERENCES "CampanhaMarketing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Venda"
ADD CONSTRAINT "Venda_formaPagamentoConfigId_fkey"
FOREIGN KEY ("formaPagamentoConfigId") REFERENCES "FormaPagamentoConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Venda_contaFinanceiraId_fkey"
FOREIGN KEY ("contaFinanceiraId") REFERENCES "ContaFinanceira"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "Venda_campanhaId_fkey"
FOREIGN KEY ("campanhaId") REFERENCES "CampanhaMarketing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "FormaPagamentoConfig"
("nome", "taxaPercentual", "taxaFixa", "prazoDias", "status", "ordem", "updatedAt")
VALUES
('Pix', 0, 0, 0, 'Ativa', 10, CURRENT_TIMESTAMP),
('Dinheiro', 0, 0, 0, 'Ativa', 20, CURRENT_TIMESTAMP),
('Cartão de débito', 0, 0, 1, 'Ativa', 30, CURRENT_TIMESTAMP),
('Cartão de crédito', 0, 0, 30, 'Ativa', 40, CURRENT_TIMESTAMP),
('Transferência', 0, 0, 0, 'Ativa', 50, CURRENT_TIMESTAMP),
('Outro', 0, 0, 0, 'Ativa', 60, CURRENT_TIMESTAMP)
ON CONFLICT ("nome") DO NOTHING;
