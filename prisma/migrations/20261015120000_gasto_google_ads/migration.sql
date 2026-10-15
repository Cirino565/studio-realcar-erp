-- Gasto diario do Google Ads: recebido todo dia pelo script do Google Ads e
-- lancado no Financeiro um por campanha por dia, na data certa.
CREATE TABLE "GastoGoogleAdsDia" (
    "id" SERIAL NOT NULL,
    "googleCampanhaId" TEXT NOT NULL,
    "campanhaNome" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "custo" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GastoGoogleAdsDia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GastoGoogleAdsDia_googleCampanhaId_data_key" ON "GastoGoogleAdsDia"("googleCampanhaId", "data");
CREATE INDEX "GastoGoogleAdsDia_data_idx" ON "GastoGoogleAdsDia"("data");

ALTER TABLE "CampanhaMarketing" ADD COLUMN "googleAdsCampanhaId" TEXT;
ALTER TABLE "CampanhaMarketing" ADD COLUMN "gastoAutomaticoDesde" TEXT;
CREATE UNIQUE INDEX "CampanhaMarketing_googleAdsCampanhaId_key" ON "CampanhaMarketing"("googleAdsCampanhaId");

ALTER TABLE "Lancamento" ADD COLUMN "chaveGasto" TEXT;
CREATE UNIQUE INDEX "Lancamento_chaveGasto_key" ON "Lancamento"("chaveGasto");
