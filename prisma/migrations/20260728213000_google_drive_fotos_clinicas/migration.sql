ALTER TABLE "ClienteFoto"
  ADD COLUMN "procedimento" TEXT,
  ADD COLUMN "armazenamento" TEXT NOT NULL DEFAULT 'LINK',
  ADD COLUMN "driveFileId" TEXT,
  ADD COLUMN "nomeArquivo" TEXT,
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "tamanhoBytes" INTEGER,
  ADD COLUMN "hashSha256" TEXT,
  ADD COLUMN "enviadaPor" TEXT,
  ADD COLUMN "excluidaEm" TIMESTAMP(3),
  ADD COLUMN "excluidaPor" TEXT;

CREATE UNIQUE INDEX "ClienteFoto_driveFileId_key"
  ON "ClienteFoto"("driveFileId");

CREATE INDEX "ClienteFoto_clienteId_excluidaEm_dataRegistro_idx"
  ON "ClienteFoto"("clienteId", "excluidaEm", "dataRegistro");

CREATE INDEX "ClienteFoto_hashSha256_idx"
  ON "ClienteFoto"("hashSha256");
