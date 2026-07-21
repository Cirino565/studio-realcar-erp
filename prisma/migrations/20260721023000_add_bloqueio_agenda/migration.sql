CREATE TABLE "BloqueioAgenda" (
    "id" SERIAL NOT NULL,
    "profissionalId" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "duracao" INTEGER NOT NULL DEFAULT 60,
    "motivo" TEXT NOT NULL,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BloqueioAgenda_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BloqueioAgenda_profissionalId_data_idx" ON "BloqueioAgenda"("profissionalId", "data");

ALTER TABLE "BloqueioAgenda"
ADD CONSTRAINT "BloqueioAgenda_profissionalId_fkey"
FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
