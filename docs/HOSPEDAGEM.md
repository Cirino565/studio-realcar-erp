# Hospedagem - Studio Realçar ERP v10

Esta versão foi preparada para subir em hospedagem usando **Next.js + Prisma + PostgreSQL**.

## O que usar

Para teste real do dia a dia, use uma hospedagem que suporte aplicação Node/Next.js e banco PostgreSQL.

Boas opções:

- Railway + PostgreSQL.
- Render + PostgreSQL.
- Vercel + banco PostgreSQL externo.
- VPS com Node + PostgreSQL.

Evite hospedagem compartilhada simples/cPanel comum, porque este projeto não é PHP estático; ele precisa rodar servidor Node.js e acessar PostgreSQL.

---

## Variáveis obrigatórias

Configure no painel da hospedagem:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
SESSION_SECRET="CHAVE-GRANDE-GERADA-COM-NPM-RUN-SECRET-GENERATE"
ADMIN_EMAIL="admin@seudominio.com"
ADMIN_PASSWORD="senha-forte-com-8-ou-mais-caracteres"
ADMIN_NAME="Administrador"
ADMIN_RESET_PASSWORD="false"
OPERATIONAL_EMAIL="operacional@seudominio.com"
OPERATIONAL_PASSWORD="senha-forte-com-8-ou-mais-caracteres"
OPERATIONAL_NAME="Operacional"
OPERATIONAL_RESET_PASSWORD="false"
```

Gere a chave de sessão no VS Code:

```bash
npm run secret:generate
```

Copie o resultado para `SESSION_SECRET`.

---

## Comandos de hospedagem

### Build command

```bash
npm run deploy:build
```

Esse comando valida variáveis, gera Prisma Client para PostgreSQL, aplica migrations, roda seed e gera build do Next.js.

### Start command

```bash
npm run start:host
```

Esse comando inicia o Next.js ouvindo em `0.0.0.0` e usando a porta definida pela hospedagem.

---

## Primeiro acesso após hospedar

1. Abra a URL da hospedagem.
2. Entre com `ADMIN_EMAIL` e `ADMIN_PASSWORD`.
3. Acesse **Usuários** e crie os usuários reais.
4. Acesse **Permissões** e revise o perfil Operacional.
5. Entre com o usuário operacional e confirme se aparecem só **Clientes** e **Agenda**.
6. Cadastre um cliente de teste.
7. Crie um agendamento de teste.
8. Abra anamnese, fotos, documentos, procedimentos e evoluções.
9. Gere um backup manual pelo admin.

---

## Importante sobre senhas iniciais

O seed não fica redefinindo senha a cada deploy quando:

```env
ADMIN_RESET_PASSWORD="false"
OPERATIONAL_RESET_PASSWORD="false"
```

Se você esquecer a senha e quiser forçar uma nova senha pelo deploy, altere temporariamente para:

```env
ADMIN_RESET_PASSWORD="true"
```

ou:

```env
OPERATIONAL_RESET_PASSWORD="true"
```

Depois do login, volte para `false`.

---

## Banco de dados

Para hospedagem, não use SQLite. Use PostgreSQL.

O SQLite continua disponível só para teste local no VS Code com:

```bash
npm run setup:local
npm run dev
```
