ALTER TABLE "Cliente"
ADD COLUMN "contatoConfiancaNome" TEXT,
ADD COLUMN "contatoConfiancaTelefone" TEXT,
ADD COLUMN "contatoConfiancaVinculo" TEXT,
ADD COLUMN "contatoConfiancaAutorizado" BOOLEAN NOT NULL DEFAULT false;
