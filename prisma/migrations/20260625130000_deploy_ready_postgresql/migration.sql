-- Studio Realçar ERP - baseline PostgreSQL schema
-- Generated for deploy-ready homologation environments.

CREATE TABLE "Cliente" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "telefone" TEXT NOT NULL,
  "whatsapp" TEXT,
  "cpf" TEXT,
  "instagram" TEXT,
  "origem" TEXT,
  "procedimentoInteresse" TEXT,
  "nascimento" TIMESTAMP(3),
  "observacoes" TEXT,
  "procedimento" TEXT,
  "valorGasto" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "ultimaVisita" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'Ativa',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrigemCliente" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Ativa',
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrigemCliente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProcedimentoInteresse" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Ativo',
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProcedimentoInteresse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProcedimentoServico" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "categoria" TEXT,
  "descricao" TEXT,
  "duracaoPadrao" INTEGER NOT NULL DEFAULT 60,
  "valorPadrao" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Ativo',
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProcedimentoServico_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Profissional" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "area" TEXT,
  "cor" TEXT NOT NULL DEFAULT 'violet',
  "telefone" TEXT,
  "email" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Ativa',
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "observacoes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Profissional_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Fornecedor" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "telefone" TEXT,
  "email" TEXT,
  "cnpj" TEXT,
  "endereco" TEXT,
  "observacoes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Ativo',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Perfil" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "nivel" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'Ativo',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Perfil_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permissao" (
  "id" SERIAL NOT NULL,
  "chave" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "modulo" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Permissao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lancamento" (
  "id" SERIAL NOT NULL,
  "descricao" TEXT NOT NULL,
  "valor" DOUBLE PRECISION NOT NULL,
  "tipo" TEXT NOT NULL,
  "categoria" TEXT,
  "observacoes" TEXT,
  "data" TIMESTAMP(3) NOT NULL,
  "formaPagamento" TEXT,
  "statusPagamento" TEXT NOT NULL DEFAULT 'Pago',
  "origem" TEXT,
  "agendamentoId" INTEGER,
  "clienteId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lancamento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lead" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "telefone" TEXT,
  "origem" TEXT,
  "interesse" TEXT,
  "etapa" TEXT NOT NULL DEFAULT 'Novo',
  "valorPrevisto" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "observacoes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampanhaMarketing" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "canal" TEXT NOT NULL,
  "investimento" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "leads" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Ativa',
  "inicio" TIMESTAMP(3),
  "fim" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampanhaMarketing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Auditoria" (
  "id" SERIAL NOT NULL,
  "modulo" TEXT NOT NULL,
  "acao" TEXT NOT NULL,
  "entidade" TEXT,
  "entidadeId" TEXT,
  "usuario" TEXT,
  "detalhes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConfiguracaoClinica" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL DEFAULT 'Studio Realçar',
  "razaoSocial" TEXT,
  "cnpj" TEXT,
  "telefone" TEXT,
  "whatsapp" TEXT,
  "email" TEXT,
  "site" TEXT,
  "instagram" TEXT,
  "endereco" TEXT,
  "bairro" TEXT,
  "cidade" TEXT,
  "estado" TEXT,
  "cep" TEXT,
  "responsavelTecnico" TEXT,
  "registroProfissional" TEXT,
  "especialidadePrincipal" TEXT,
  "horarioAtendimento" TEXT,
  "intervaloAgenda" INTEGER NOT NULL DEFAULT 30,
  "antecedenciaLembrete" INTEGER NOT NULL DEFAULT 24,
  "toleranciaAtraso" INTEGER NOT NULL DEFAULT 10,
  "moeda" TEXT NOT NULL DEFAULT 'BRL',
  "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  "logoUrl" TEXT,
  "corPrincipal" TEXT NOT NULL DEFAULT 'violet',
  "assinaturaMensagem" TEXT,
  "mensagemConfirmacao" TEXT,
  "mensagemLembrete" TEXT,
  "mensagemRetorno" TEXT,
  "politicaCancelamento" TEXT,
  "observacoesInternas" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConfiguracaoClinica_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BackupRegistro" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Concluído',
  "tamanho" TEXT,
  "observacoes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackupRegistro_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Automacao" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'Operacional',
  "gatilho" TEXT NOT NULL,
  "acao" TEXT NOT NULL,
  "canal" TEXT,
  "frequencia" TEXT NOT NULL DEFAULT 'Manual',
  "prioridade" TEXT NOT NULL DEFAULT 'Média',
  "status" TEXT NOT NULL DEFAULT 'Ativa',
  "proximaExecucao" TIMESTAMP(3),
  "ultimaExecucao" TIMESTAMP(3),
  "execucoes" INTEGER NOT NULL DEFAULT 0,
  "falhas" INTEGER NOT NULL DEFAULT 0,
  "observacoes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Automacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Agendamento" (
  "id" SERIAL NOT NULL,
  "clienteId" INTEGER NOT NULL,
  "profissionalId" INTEGER,
  "procedimento" TEXT NOT NULL,
  "data" TIMESTAMP(3) NOT NULL,
  "duracao" INTEGER NOT NULL DEFAULT 60,
  "valor" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "observacoes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Agendado',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Produto" (
  "id" SERIAL NOT NULL,
  "fornecedorId" INTEGER,
  "nome" TEXT NOT NULL,
  "categoria" TEXT,
  "unidade" TEXT NOT NULL DEFAULT 'un',
  "quantidade" INTEGER NOT NULL DEFAULT 0,
  "estoqueMinimo" INTEGER NOT NULL DEFAULT 0,
  "valorCompra" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "valorVenda" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Ativo',
  "observacoes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MovimentacaoEstoque" (
  "id" SERIAL NOT NULL,
  "produtoId" INTEGER NOT NULL,
  "tipo" TEXT NOT NULL,
  "quantidade" INTEGER NOT NULL,
  "motivo" TEXT NOT NULL,
  "observacoes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MovimentacaoEstoque_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Compra" (
  "id" SERIAL NOT NULL,
  "fornecedorId" INTEGER,
  "descricao" TEXT NOT NULL,
  "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Aberta',
  "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompraItem" (
  "id" SERIAL NOT NULL,
  "compraId" INTEGER NOT NULL,
  "produtoId" INTEGER NOT NULL,
  "quantidade" INTEGER NOT NULL,
  "valorUnitario" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "CompraItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Usuario" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "senha" TEXT NOT NULL,
  "telefone" TEXT,
  "cargo" TEXT,
  "tipo" TEXT NOT NULL DEFAULT 'Equipe',
  "especialidade" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Ativo',
  "perfilId" INTEGER,
  "dataAdmissao" TIMESTAMP(3),
  "ultimoAcesso" TIMESTAMP(3),
  "observacoes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PerfilPermissao" (
  "id" SERIAL NOT NULL,
  "perfilId" INTEGER NOT NULL,
  "permissaoId" INTEGER NOT NULL,
  CONSTRAINT "PerfilPermissao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClienteAnamnese" (
  "id" SERIAL NOT NULL,
  "clienteId" INTEGER NOT NULL,
  "procedimento" TEXT,
  "queixaPrincipal" TEXT,
  "alergias" TEXT,
  "medicamentos" TEXT,
  "doencasPreExistentes" TEXT,
  "procedimentosAnteriores" TEXT,
  "gestante" BOOLEAN NOT NULL DEFAULT false,
  "lactante" BOOLEAN NOT NULL DEFAULT false,
  "usaAcidos" BOOLEAN NOT NULL DEFAULT false,
  "possuiMarcapasso" BOOLEAN NOT NULL DEFAULT false,
  "restricoes" TEXT,
  "objetivoTratamento" TEXT,
  "observacoesClinicas" TEXT,
  "respostasRapidas" TEXT,
  "assinaturaCliente" TEXT,
  "termoConsentimento" BOOLEAN NOT NULL DEFAULT false,
  "profissional" TEXT,
  "dataFicha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClienteAnamnese_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClienteFoto" (
  "id" SERIAL NOT NULL,
  "clienteId" INTEGER NOT NULL,
  "titulo" TEXT NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'Evolução',
  "url" TEXT NOT NULL,
  "descricao" TEXT,
  "dataRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClienteFoto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClienteDocumento" (
  "id" SERIAL NOT NULL,
  "clienteId" INTEGER NOT NULL,
  "titulo" TEXT NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'Documento',
  "url" TEXT,
  "observacoes" TEXT,
  "dataRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClienteDocumento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClienteProcedimento" (
  "id" SERIAL NOT NULL,
  "clienteId" INTEGER NOT NULL,
  "nome" TEXT NOT NULL,
  "profissional" TEXT,
  "valor" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'Realizado',
  "dataProcedimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "observacoes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClienteProcedimento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClienteEvolucao" (
  "id" SERIAL NOT NULL,
  "clienteId" INTEGER NOT NULL,
  "titulo" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "profissional" TEXT,
  "dataRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClienteEvolucao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnamneseModelo" (
  "id" SERIAL NOT NULL,
  "nome" TEXT NOT NULL,
  "procedimentoId" INTEGER,
  "procedimentoNome" TEXT,
  "descricao" TEXT,
  "status" TEXT NOT NULL DEFAULT 'Ativo',
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnamneseModelo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnamnesePergunta" (
  "id" SERIAL NOT NULL,
  "modeloId" INTEGER NOT NULL,
  "pergunta" TEXT NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'SIM_NAO',
  "opcoes" TEXT,
  "obrigatoria" BOOLEAN NOT NULL DEFAULT false,
  "ativa" BOOLEAN NOT NULL DEFAULT true,
  "ordem" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AnamnesePergunta_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClienteAnamneseResposta" (
  "id" SERIAL NOT NULL,
  "clienteId" INTEGER NOT NULL,
  "modeloId" INTEGER,
  "perguntaId" INTEGER,
  "procedimento" TEXT,
  "perguntaTexto" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "resposta" TEXT,
  "observacao" TEXT,
  "profissional" TEXT,
  "dataResposta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClienteAnamneseResposta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrigemCliente_nome_key" ON "OrigemCliente"("nome");
CREATE UNIQUE INDEX "ProcedimentoInteresse_nome_key" ON "ProcedimentoInteresse"("nome");
CREATE UNIQUE INDEX "ProcedimentoServico_nome_key" ON "ProcedimentoServico"("nome");
CREATE UNIQUE INDEX "Profissional_nome_key" ON "Profissional"("nome");
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");
CREATE UNIQUE INDEX "Perfil_nome_key" ON "Perfil"("nome");
CREATE UNIQUE INDEX "Permissao_chave_key" ON "Permissao"("chave");
CREATE UNIQUE INDEX "PerfilPermissao_perfilId_permissaoId_key" ON "PerfilPermissao"("perfilId", "permissaoId");

CREATE INDEX "Agendamento_clienteId_idx" ON "Agendamento"("clienteId");
CREATE INDEX "Agendamento_profissionalId_idx" ON "Agendamento"("profissionalId");
CREATE INDEX "Produto_fornecedorId_idx" ON "Produto"("fornecedorId");
CREATE INDEX "MovimentacaoEstoque_produtoId_idx" ON "MovimentacaoEstoque"("produtoId");
CREATE INDEX "Compra_fornecedorId_idx" ON "Compra"("fornecedorId");
CREATE INDEX "CompraItem_compraId_idx" ON "CompraItem"("compraId");
CREATE INDEX "CompraItem_produtoId_idx" ON "CompraItem"("produtoId");
CREATE INDEX "Usuario_perfilId_idx" ON "Usuario"("perfilId");
CREATE INDEX "PerfilPermissao_perfilId_idx" ON "PerfilPermissao"("perfilId");
CREATE INDEX "PerfilPermissao_permissaoId_idx" ON "PerfilPermissao"("permissaoId");
CREATE INDEX "ClienteAnamnese_clienteId_idx" ON "ClienteAnamnese"("clienteId");
CREATE INDEX "ClienteFoto_clienteId_idx" ON "ClienteFoto"("clienteId");
CREATE INDEX "ClienteDocumento_clienteId_idx" ON "ClienteDocumento"("clienteId");
CREATE INDEX "ClienteProcedimento_clienteId_idx" ON "ClienteProcedimento"("clienteId");
CREATE INDEX "ClienteEvolucao_clienteId_idx" ON "ClienteEvolucao"("clienteId");
CREATE INDEX "AnamneseModelo_procedimentoId_idx" ON "AnamneseModelo"("procedimentoId");
CREATE INDEX "AnamnesePergunta_modeloId_idx" ON "AnamnesePergunta"("modeloId");
CREATE INDEX "ClienteAnamneseResposta_clienteId_idx" ON "ClienteAnamneseResposta"("clienteId");
CREATE INDEX "ClienteAnamneseResposta_modeloId_idx" ON "ClienteAnamneseResposta"("modeloId");
CREATE INDEX "ClienteAnamneseResposta_perguntaId_idx" ON "ClienteAnamneseResposta"("perguntaId");

ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompraItem" ADD CONSTRAINT "CompraItem_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompraItem" ADD CONSTRAINT "CompraItem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "Perfil"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PerfilPermissao" ADD CONSTRAINT "PerfilPermissao_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "Perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PerfilPermissao" ADD CONSTRAINT "PerfilPermissao_permissaoId_fkey" FOREIGN KEY ("permissaoId") REFERENCES "Permissao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClienteAnamnese" ADD CONSTRAINT "ClienteAnamnese_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClienteFoto" ADD CONSTRAINT "ClienteFoto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClienteDocumento" ADD CONSTRAINT "ClienteDocumento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClienteProcedimento" ADD CONSTRAINT "ClienteProcedimento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClienteEvolucao" ADD CONSTRAINT "ClienteEvolucao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnamneseModelo" ADD CONSTRAINT "AnamneseModelo_procedimentoId_fkey" FOREIGN KEY ("procedimentoId") REFERENCES "ProcedimentoServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnamnesePergunta" ADD CONSTRAINT "AnamnesePergunta_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "AnamneseModelo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClienteAnamneseResposta" ADD CONSTRAINT "ClienteAnamneseResposta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClienteAnamneseResposta" ADD CONSTRAINT "ClienteAnamneseResposta_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "AnamneseModelo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClienteAnamneseResposta" ADD CONSTRAINT "ClienteAnamneseResposta_perguntaId_fkey" FOREIGN KEY ("perguntaId") REFERENCES "AnamnesePergunta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
