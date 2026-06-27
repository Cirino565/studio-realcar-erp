# Studio Realçar ERP

Sistema web em **Next.js + Prisma** para operação de clínica/estúdio: clientes, agenda, financeiro, estoque, marketing, usuários, permissões, auditoria, backup, automações e configurações clínicas.

## Status desta versão

**v10 - pronta para hospedagem/homologação**

Base funcional confirmada em PC e celular na v9. Esta v10 mantém as correções mobile e adiciona preparo para hospedagem com PostgreSQL.

## Modos disponíveis

- **Local no VS Code sem Docker:** SQLite, fácil para testar no computador.
- **Hospedagem real:** PostgreSQL, recomendado para teste diário com equipe e dados reais.

---

## Rodar localmente sem Docker

```bash
npm install
npm run setup:local
npm run dev
```

Acesse:

```txt
http://localhost:3000
```

Logins locais:

```txt
Admin: admin@studiorealcar.com / 123456
Operacional: operacional@studiorealcar.com / 123456
```

O perfil Operacional vê **Clientes** e **Agenda**. Dentro de Clientes, acessa ficha clínica, anamnese, fotos, documentos, procedimentos e evoluções.

---

## Testar no celular localmente

Com computador e celular na mesma rede Wi-Fi:

```bash
npm run dev
```

No Windows, veja o IP:

```powershell
ipconfig
```

No celular:

```txt
http://SEU-IP:3000
```

---

## Hospedagem com PostgreSQL

Use uma hospedagem Node/Next.js com PostgreSQL.

Arquivos úteis:

```txt
.env.production.example
railway.json
render.yaml
vercel.json
docs/HOSPEDAGEM.md
docs/RAILWAY_RENDER_VERCEL.md
```

### Variáveis obrigatórias

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
SESSION_SECRET="chave-com-pelo-menos-32-caracteres"
ADMIN_EMAIL="admin@seudominio.com"
ADMIN_PASSWORD="senha-forte"
ADMIN_NAME="Administrador"
ADMIN_RESET_PASSWORD="false"
OPERATIONAL_EMAIL="operacional@seudominio.com"
OPERATIONAL_PASSWORD="senha-forte"
OPERATIONAL_NAME="Operacional"
OPERATIONAL_RESET_PASSWORD="false"
```

Gere uma chave segura:

```bash
npm run secret:generate
```

### Build command

```bash
npm run deploy:build
```

### Start command

```bash
npm run start:host
```

---

## Scripts principais

### Local

```bash
npm run setup:local          # cria .env SQLite, aplica schema e seed local
npm run dev                  # roda acessivel na rede local
npm run db:seed              # seed no SQLite local
npm run db:studio            # Prisma Studio no SQLite local
npm run build:local          # build usando SQLite local
```

### Hospedagem/PostgreSQL

```bash
npm run hosting:check-env    # valida variaveis de hospedagem
npm run deploy:build         # valida env + migrate + seed + build
npm run deploy:build:no-seed # valida env + migrate + build
npm run deploy:migrate       # aplica migrations PostgreSQL
npm run deploy:seed          # roda seed PostgreSQL
npm run start:host           # inicia servidor usando PORT da hospedagem
```

---

## Segurança já aplicada

- Login obrigatório.
- Sessão com cookie HTTP-only assinado.
- `SESSION_SECRET` obrigatório em produção.
- Middleware protegendo páginas e rotas `/api`.
- Perfil Operacional restrito a Clientes e Agenda.
- `/api/backup` protegido por permissão.
- Backup não exporta senha dos usuários.
- Senhas com hash bcrypt.

---

## Próximas melhorias depois de hospedar

- Backup automático externo.
- Página de troca de senha pelo próprio usuário.
- Armazenamento real de imagens/documentos em serviço externo.
- Logs de erro da hospedagem.
- Domínio próprio e HTTPS definitivo.
