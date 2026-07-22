-- Nível 3A+ - Rentabilidade, Vendas e Resultado
-- Migration aditiva: preserva os dados existentes.

ALTER TABLE "ProcedimentoServico"
ADD COLUMN "custoPadrao" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE "Venda" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER,
    "agendamentoId" INTEGER,
    "lancamentoId" INTEGER,
    "totalServicos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProdutos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoServicos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoProdutos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "formaPagamento" TEXT,
    "statusPagamento" TEXT NOT NULL DEFAULT 'Pago',
    "origem" TEXT NOT NULL DEFAULT 'Venda',
    "observacoes" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendaItem" (
    "id" SERIAL NOT NULL,
    "vendaId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "produtoId" INTEGER,
    "procedimentoServicoId" INTEGER,
    "descricao" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "valorUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendaItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MovimentacaoEstoque"
ADD COLUMN "vendaItemId" INTEGER;

CREATE UNIQUE INDEX "Venda_lancamentoId_key" ON "Venda"("lancamentoId");
CREATE INDEX "Venda_clienteId_data_idx" ON "Venda"("clienteId", "data");
CREATE INDEX "Venda_agendamentoId_data_idx" ON "Venda"("agendamentoId", "data");
CREATE INDEX "Venda_data_idx" ON "Venda"("data");
CREATE INDEX "Venda_statusPagamento_data_idx" ON "Venda"("statusPagamento", "data");

CREATE INDEX "VendaItem_vendaId_idx" ON "VendaItem"("vendaId");
CREATE INDEX "VendaItem_produtoId_idx" ON "VendaItem"("produtoId");
CREATE INDEX "VendaItem_procedimentoServicoId_idx" ON "VendaItem"("procedimentoServicoId");
CREATE INDEX "VendaItem_tipo_idx" ON "VendaItem"("tipo");

CREATE UNIQUE INDEX "MovimentacaoEstoque_vendaItemId_key" ON "MovimentacaoEstoque"("vendaItemId");

ALTER TABLE "Venda"
ADD CONSTRAINT "Venda_clienteId_fkey"
FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Venda"
ADD CONSTRAINT "Venda_agendamentoId_fkey"
FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Venda"
ADD CONSTRAINT "Venda_lancamentoId_fkey"
FOREIGN KEY ("lancamentoId") REFERENCES "Lancamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendaItem"
ADD CONSTRAINT "VendaItem_vendaId_fkey"
FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VendaItem"
ADD CONSTRAINT "VendaItem_produtoId_fkey"
FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VendaItem"
ADD CONSTRAINT "VendaItem_procedimentoServicoId_fkey"
FOREIGN KEY ("procedimentoServicoId") REFERENCES "ProcedimentoServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MovimentacaoEstoque"
ADD CONSTRAINT "MovimentacaoEstoque_vendaItemId_fkey"
FOREIGN KEY ("vendaItemId") REFERENCES "VendaItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
