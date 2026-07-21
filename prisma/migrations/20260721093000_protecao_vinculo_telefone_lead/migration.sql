-- Protege contra vínculo automático incorreto quando duas pessoas compartilham o mesmo telefone.
ALTER TABLE "Lead"
ADD COLUMN "ignorarVinculoTelefone" BOOLEAN NOT NULL DEFAULT false;
