-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN "reativacaoSituacao" TEXT,
ADD COLUMN "reativacaoVoltaEm" TIMESTAMP(3),
ADD COLUMN "reativacaoAtualizadaEm" TIMESTAMP(3);
