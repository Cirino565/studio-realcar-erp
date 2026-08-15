-- Guarda o responsável legal quando o cliente é menor de idade: nome,
-- telefone e o vínculo (mãe, pai, avó etc). Campos opcionais, pensados
-- para o caso em que quem assina a anamnese e autoriza o atendimento é
-- diferente de quem recebe o atendimento.
--
-- Não altera nem apaga nenhum dado existente.

ALTER TABLE "Cliente"
ADD COLUMN "responsavelNome" TEXT,
ADD COLUMN "responsavelTelefone" TEXT,
ADD COLUMN "responsavelParentesco" TEXT;