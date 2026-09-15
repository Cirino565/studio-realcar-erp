-- CreateTable
CREATE TABLE "ClienteEvolucaoVersao" (
    "id" SERIAL NOT NULL,
    "evolucaoId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "editadoPor" TEXT,
    "editadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClienteEvolucaoVersao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClienteEvolucaoVersao_evolucaoId_editadoEm_idx" ON "ClienteEvolucaoVersao"("evolucaoId", "editadoEm");

-- AddForeignKey
ALTER TABLE "ClienteEvolucaoVersao" ADD CONSTRAINT "ClienteEvolucaoVersao_evolucaoId_fkey" FOREIGN KEY ("evolucaoId") REFERENCES "ClienteEvolucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
