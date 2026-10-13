-- Contas fixas: cadastradas uma vez, lancadas sozinhas todo mes como "a pagar".
CREATE TABLE "ContaFixa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "diaVencimento" INTEGER NOT NULL,
    "categoria" TEXT,
    "formaPagamento" TEXT,
    "contaFinanceiraId" INTEGER,
    "valorVariavel" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Ativa',
    "inicioCompetencia" TEXT NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContaFixa_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContaFixa_status_idx" ON "ContaFixa"("status");

ALTER TABLE "Lancamento" ADD COLUMN "contaFixaId" INTEGER;
ALTER TABLE "Lancamento" ADD COLUMN "competencia" TEXT;
ALTER TABLE "Lancamento" ADD COLUMN "vencimento" TIMESTAMP(3);

CREATE UNIQUE INDEX "Lancamento_contaFixaId_competencia_key" ON "Lancamento"("contaFixaId", "competencia");

ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_contaFixaId_fkey" FOREIGN KEY ("contaFixaId") REFERENCES "ContaFixa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
