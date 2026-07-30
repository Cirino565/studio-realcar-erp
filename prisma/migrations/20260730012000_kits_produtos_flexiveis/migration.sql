-- Kits fixos e flexiveis de produtos.
-- Migration aditiva: nao cria estoque duplicado para kits.

CREATE TABLE "KitProduto" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "precoVenda" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantidadeEscolha" INTEGER NOT NULL DEFAULT 1,
    "permitirRepeticao" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitProduto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KitProdutoItem" (
    "id" SERIAL NOT NULL,
    "kitProdutoId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "acrescimo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitProdutoItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VendaItem"
ADD COLUMN "kitProdutoId" INTEGER,
ADD COLUMN "grupoKitId" TEXT,
ADD COLUMN "kitNomeHistorico" TEXT,
ADD COLUMN "kitTipoHistorico" TEXT,
ADD COLUMN "acrescimoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "KitProduto_nome_key" ON "KitProduto"("nome");
CREATE INDEX "KitProduto_status_nome_idx" ON "KitProduto"("status", "nome");
CREATE UNIQUE INDEX "KitProdutoItem_kitProdutoId_produtoId_key" ON "KitProdutoItem"("kitProdutoId", "produtoId");
CREATE INDEX "KitProdutoItem_produtoId_idx" ON "KitProdutoItem"("produtoId");
CREATE INDEX "VendaItem_kitProdutoId_idx" ON "VendaItem"("kitProdutoId");
CREATE INDEX "VendaItem_grupoKitId_idx" ON "VendaItem"("grupoKitId");

ALTER TABLE "KitProdutoItem"
ADD CONSTRAINT "KitProdutoItem_kitProdutoId_fkey"
FOREIGN KEY ("kitProdutoId") REFERENCES "KitProduto"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KitProdutoItem"
ADD CONSTRAINT "KitProdutoItem_produtoId_fkey"
FOREIGN KEY ("produtoId") REFERENCES "Produto"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VendaItem"
ADD CONSTRAINT "VendaItem_kitProdutoId_fkey"
FOREIGN KEY ("kitProdutoId") REFERENCES "KitProduto"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
