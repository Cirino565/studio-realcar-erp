-- AlterTable
ALTER TABLE "Venda" ADD COLUMN "conversaoAdsEnviadaEm" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Venda_conversaoAdsEnviadaEm_idx" ON "Venda"("conversaoAdsEnviadaEm");
