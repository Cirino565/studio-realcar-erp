# Segurança e Dados Sensíveis

Este ERP pode armazenar dados pessoais, dados clínicos/anamnese, fotos, documentos e histórico financeiro. Use como sistema de homologação até validar segurança, backup e permissões.

## Controles aplicados nesta versão

- Cookie de sessão HTTP-only.
- Sessão assinada com HMAC via `SESSION_SECRET`.
- Expiração de sessão em 8 horas.
- Middleware valida assinatura da sessão.
- Layout protegido consulta usuário ativo no banco.
- Rotas de API exigem sessão.
- Backup exige permissão `backup.gerenciar`.
- Exportação remove hash/senha de usuários.
- Ações críticas de usuários, permissões e backup exigem permissão.
- Auditoria registra login e exportação de backup.

## O que ainda pode evoluir depois

- Recuperação de senha por e-mail.
- Troca obrigatória de senha no primeiro acesso.
- Política de senha forte no cadastro de usuários.
- 2FA para administradores.
- Rate limit de login.
- Log de IP/dispositivo.
- Armazenamento externo seguro para fotos/documentos.
- Criptografia adicional para campos clínicos sensíveis.
- Tela de termos/LGPD e consentimento por cliente.

## Boas práticas imediatas

- Não compartilhe usuário admin.
- Cada pessoa deve ter seu próprio login.
- Remova acesso de colaboradores desligados.
- Faça backup diário do banco na hospedagem.
- Restrinja quem pode exportar backup.
- Não envie JSON de backup por WhatsApp sem necessidade.
