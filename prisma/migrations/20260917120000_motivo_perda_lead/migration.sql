-- CreateTable
CREATE TABLE "MotivoPerdaLead" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "naoChamou" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MotivoPerdaLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MotivoPerdaLead_nome_key" ON "MotivoPerdaLead"("nome");

-- Motivos iniciais: os mesmos que ja existiam fixos no sistema, mais o
-- "Cliente nao chamou", marcado como o motivo de quem nunca iniciou contato.
INSERT INTO "MotivoPerdaLead" ("nome", "descricao", "naoChamou", "status", "ordem", "updatedAt") VALUES
  ('Cliente não chamou', 'Clicou no anúncio mas nunca iniciou conversa.', true, 'Ativo', 0, CURRENT_TIMESTAMP),
  ('Preço', 'Valor foi o principal motivo para não fechar.', false, 'Ativo', 1, CURRENT_TIMESTAMP),
  ('Sem resposta', 'Parou de responder e a oportunidade será encerrada.', false, 'Ativo', 2, CURRENT_TIMESTAMP),
  ('Escolheu concorrente', 'Informou que decidiu realizar em outro local.', false, 'Ativo', 3, CURRENT_TIMESTAMP),
  ('Desistiu', 'Desistiu de realizar o procedimento neste momento.', false, 'Ativo', 4, CURRENT_TIMESTAMP),
  ('Sem interesse', 'Não demonstrou interesse em continuar a negociação.', false, 'Ativo', 5, CURRENT_TIMESTAMP);
