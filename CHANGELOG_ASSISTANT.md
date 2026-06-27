# Changelog Assistant

## v10 - Hospedagem / Homologação

Base: v9 mobile fix sem Docker, confirmada pelo usuário como funcionando no PC e celular.

Alterações:

- Preparado pacote para hospedagem com PostgreSQL.
- Mantido modo local SQLite sem Docker para teste no VS Code.
- Removido `.env` real do pacote para evitar subir configuração local/segredo para hospedagem.
- Adicionado `.env.local.example`.
- Atualizado `.env.example` e `.env.production.example`.
- Adicionado `scripts/prisma-generate-auto.mjs` para gerar Prisma Client automaticamente conforme DATABASE_URL.
- Adicionado `scripts/verify-hosting-env.mjs` para bloquear deploy com variáveis fracas/incompletas.
- Adicionado `scripts/start-host.mjs` para iniciar Next.js em `0.0.0.0` usando a porta da hospedagem.
- Atualizado `package.json` com scripts:
  - `hosting:check-env`
  - `deploy:build`
  - `deploy:build:no-seed`
  - `deploy:migrate`
  - `deploy:seed`
  - `start:host`
- Adicionado `railway.json`.
- Adicionado `render.yaml`.
- Adicionado `vercel.json`.
- Criado `docs/HOSPEDAGEM.md`.
- Criado `docs/RAILWAY_RENDER_VERCEL.md`.
- README reescrito para v10 hospedagem.

Observação:

- Para uso local continue com `npm run setup:local`.
- Para hospedagem, configure `DATABASE_URL` PostgreSQL e variáveis fortes antes do deploy.
