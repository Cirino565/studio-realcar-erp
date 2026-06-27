# Checklist de Homologação

## Antes de inserir dados reais

- [ ] `DATABASE_URL` aponta para PostgreSQL, não SQLite.
- [ ] `SESSION_SECRET` foi gerado e tem mais de 32 caracteres.
- [ ] `ADMIN_PASSWORD` foi trocada para senha forte.
- [ ] `npm run db:migrate:deploy` executou sem erro.
- [ ] `npm run db:seed` executou sem erro.
- [ ] Login do admin funcionando.
- [ ] Perfil Operacional criado pelo seed e testado.
- [ ] Usuário operacional visualiza somente Agenda e Clientes no menu desktop/mobile.
- [ ] Usuário operacional acessa cadastro completo do cliente, anamnese, fotos, documentos, procedimentos e evoluções.
- [ ] Usuário operacional não acessa dashboard, financeiro, estoque, marketing, relatórios, backup, usuários, permissões, auditoria, automações e configurações pela URL direta.
- [ ] Exportação `/api/backup` só funciona logado e com permissão.
- [ ] JSON de backup não contém campo `senha` em usuários.
- [ ] Backup manual aparece na auditoria.
- [ ] Rotina de backup externo do banco foi configurada na hospedagem.

## Testes operacionais

- [ ] Cadastrar cliente.
- [ ] Editar cliente.
- [ ] Registrar agendamento.
- [ ] Registrar lançamento financeiro.
- [ ] Registrar item de estoque.
- [ ] Gerar backup lógico.
- [ ] Sair e entrar novamente.
- [ ] Testar no celular com admin.
- [ ] Testar no celular com operacional, incluindo abertura do perfil do cliente e abas clínicas.
- [ ] Testar com 2 usuários simultâneos.

## Critério para avançar de homologação para produção

Avance somente se:

- login e permissões estiverem estáveis;
- backup estiver testado;
- banco tiver backup automático externo;
- equipe souber como cadastrar, editar e corrigir registros;
- houver responsável por suporte e rotina de conferência diária.
