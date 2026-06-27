# Guia rápido por plataforma

## Railway

1. Suba o projeto para um repositório GitHub.
2. Crie um projeto no Railway a partir do repositório.
3. Adicione um banco PostgreSQL no Railway ou use um PostgreSQL externo.
4. Configure as variáveis do arquivo `.env.production.example`.
5. Use:
   - Build command: `npm run deploy:build`
   - Start command: `npm run start:host`
6. Abra a URL pública e faça login.

O arquivo `railway.json` já foi incluído com esses comandos.

---

## Render

1. Suba o projeto para o GitHub.
2. Crie um Web Service Node no Render.
3. Crie ou conecte um PostgreSQL.
4. Configure as variáveis do arquivo `.env.production.example`.
5. Use:
   - Build command: `npm install && npm run deploy:build`
   - Start command: `npm run start:host`
6. Abra a URL pública e faça login.

O arquivo `render.yaml` já foi incluído como referência.

---

## Vercel

1. Suba o projeto para o GitHub.
2. Importe o projeto na Vercel.
3. Conecte um PostgreSQL externo.
4. Configure as variáveis do arquivo `.env.production.example`.
5. Use:
   - Build command: `npm run deploy:build`
6. Faça o deploy.

O arquivo `vercel.json` já define o build command.

---

## Observação importante

O projeto usa banco, autenticação e server actions. Não publique como site estático. A hospedagem precisa rodar Next.js como aplicação fullstack.
