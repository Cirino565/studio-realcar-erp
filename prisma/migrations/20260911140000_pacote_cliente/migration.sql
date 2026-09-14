-- CreateTable
CREATE TABLE "PacoteCliente" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "valorPago" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Aberto',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PacoteCliente_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Lancamento" ADD COLUMN "pacoteClienteId" INTEGER;

-- CreateIndex
CREATE INDEX "PacoteCliente_clienteId_status_idx" ON "PacoteCliente"("clienteId", "status");

-- CreateIndex
CREATE INDEX "Lancamento_pacoteClienteId_idx" ON "Lancamento"("pacoteClienteId");

-- AddForeignKey
ALTER TABLE "PacoteCliente" ADD CONSTRAINT "PacoteCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_pacoteClienteId_fkey" FOREIGN KEY ("pacoteClienteId") REFERENCES "PacoteCliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
