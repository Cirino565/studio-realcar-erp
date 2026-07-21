CREATE TABLE "MensagemModelo" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MensagemModelo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComunicacaoRegistro" (
    "id" SERIAL NOT NULL,
    "modeloId" INTEGER,
    "clienteId" INTEGER,
    "leadId" INTEGER,
    "agendamentoId" INTEGER,
    "destinatarioNome" TEXT NOT NULL,
    "telefone" TEXT,
    "categoria" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'WhatsApp',
    "mensagem" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Aberta',
    "usuario" TEXT,
    "abertoEm" TIMESTAMP(3),
    "enviadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComunicacaoRegistro_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MensagemModelo_chave_key" ON "MensagemModelo"("chave");
CREATE INDEX "ComunicacaoRegistro_clienteId_createdAt_idx" ON "ComunicacaoRegistro"("clienteId", "createdAt");
CREATE INDEX "ComunicacaoRegistro_leadId_createdAt_idx" ON "ComunicacaoRegistro"("leadId", "createdAt");
CREATE INDEX "ComunicacaoRegistro_agendamentoId_createdAt_idx" ON "ComunicacaoRegistro"("agendamentoId", "createdAt");
CREATE INDEX "ComunicacaoRegistro_categoria_createdAt_idx" ON "ComunicacaoRegistro"("categoria", "createdAt");
CREATE INDEX "ComunicacaoRegistro_status_createdAt_idx" ON "ComunicacaoRegistro"("status", "createdAt");

ALTER TABLE "ComunicacaoRegistro" ADD CONSTRAINT "ComunicacaoRegistro_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "MensagemModelo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComunicacaoRegistro" ADD CONSTRAINT "ComunicacaoRegistro_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComunicacaoRegistro" ADD CONSTRAINT "ComunicacaoRegistro_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComunicacaoRegistro" ADD CONSTRAINT "ComunicacaoRegistro_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "MensagemModelo" ("chave", "nome", "categoria", "corpo", "ativo", "ordem", "updatedAt") VALUES
('confirmacao_agendamento', 'Confirmação de agendamento', 'Agenda', 'Olá, {primeiro_nome}! Tudo bem?\n\nPassando para confirmar seu horário no {clinica}:\n\nProcedimento: {procedimento}\nData: {data}\nHorário: {horario}\n\nPode confirmar sua presença para nós?', true, 10, CURRENT_TIMESTAMP),
('lembrete_agendamento', 'Lembrete de agendamento', 'Agenda', 'Olá, {primeiro_nome}! Tudo bem?\n\nPassando para lembrar do seu horário no {clinica}.\n\nProcedimento: {procedimento}\nData: {data}\nHorário: {horario}\n\nCaso precise ajustar seu horário, fale conosco por aqui.', true, 20, CURRENT_TIMESTAMP),
('pos_atendimento', 'Pós-atendimento', 'Relacionamento', 'Olá, {primeiro_nome}! Tudo bem?\n\nPassando para saber como você está após seu atendimento de {procedimento} no {clinica}.\n\nCaso tenha alguma dúvida sobre seu atendimento, pode falar com nossa equipe por aqui.', true, 30, CURRENT_TIMESTAMP),
('aniversario', 'Aniversário', 'Relacionamento', 'Olá, {primeiro_nome}! Tudo bem?\n\nHoje é um dia especial e toda a equipe do {clinica} deseja a você um feliz aniversário!\n\nQue seu novo ciclo seja leve, bonito e cheio de boas conquistas.', true, 40, CURRENT_TIMESTAMP),
('reativacao_cliente', 'Reativação de cliente', 'Relacionamento', 'Olá, {primeiro_nome}! Tudo bem?\n\nFaz um tempinho que não nos vemos no {clinica}. Passando para saber como você está e se deseja programar uma nova avaliação ou retorno.\n\nPodemos te ajudar por aqui.', true, 50, CURRENT_TIMESTAMP),
('primeiro_contato_lead', 'Primeiro contato com lead', 'CRM', 'Olá, {primeiro_nome}! Tudo bem?\n\nAqui é do {clinica}. Recebemos seu contato{interesse_texto} e podemos te ajudar por aqui.\n\nVocê prefere receber mais informações ou verificar um horário para avaliação?', true, 60, CURRENT_TIMESTAMP),
('followup_lead', 'Follow-up comercial', 'CRM', 'Olá, {primeiro_nome}! Tudo bem?\n\nPassando para retomar nossa conversa{interesse_texto}.\n\nFicou alguma dúvida ou deseja que a gente veja um horário para você no {clinica}?', true, 70, CURRENT_TIMESTAMP),
('avaliacao_lead', 'Avaliação agendada', 'CRM', 'Olá, {primeiro_nome}! Tudo bem?\n\nPassando para confirmar sua avaliação no {clinica}.\n\nData: {data}\nHorário: {horario}\n\nPode confirmar sua presença para nós?', true, 80, CURRENT_TIMESTAMP),
('negociacao_lead', 'Negociação em acompanhamento', 'CRM', 'Olá, {primeiro_nome}! Tudo bem?\n\nPassando para dar continuidade à nossa conversa{interesse_texto}.\n\nFicou alguma dúvida em que possamos ajudar?', true, 90, CURRENT_TIMESTAMP),
('cliente_faltou', 'Contato após falta', 'Agenda', 'Olá, {primeiro_nome}! Tudo bem?\n\nSentimos sua falta no horário que estava reservado no {clinica}.\n\nEsperamos que esteja tudo bem. Quando puder, fale conosco por aqui para vermos uma nova possibilidade de horário.', true, 100, CURRENT_TIMESTAMP),
('recuperacao_cancelamento', 'Recuperação de cancelamento', 'Agenda', 'Olá, {primeiro_nome}! Tudo bem?\n\nVimos que seu horário no {clinica} precisou ser cancelado.\n\nQuando for um bom momento para você, podemos verificar uma nova data.', true, 110, CURRENT_TIMESTAMP);
