# Integração privada de fotos clínicas com Google Drive

## O que foi implementado

- Captura pela câmera do iPhone ou seleção pela galeria.
- Redução da imagem no navegador para até 2.200 pixels no maior lado.
- Conversão para JPEG para reduzir espaço e remover metadados comuns da foto.
- Upload privado pelo servidor, sem link público.
- Organização automática por pasta interna da cliente e ano.
- Exibição por rota autenticada do Studio Realçar.
- Detecção de foto duplicada por SHA-256.
- Auditoria de envio e exclusão.
- Exclusão lógica no banco e envio do arquivo para a lixeira do Drive.
- Fotos antigas por link continuam funcionando.

## Variáveis necessárias

Configure localmente em `.env.local` e no Railway:

```env
GOOGLE_DRIVE_CLIENT_ID="..."
GOOGLE_DRIVE_CLIENT_SECRET="..."
GOOGLE_DRIVE_REFRESH_TOKEN="..."
GOOGLE_DRIVE_ROOT_FOLDER_ID=""
GOOGLE_DRIVE_ROOT_FOLDER_NAME="Studio Realçar - Arquivos Clínicos"
```

O `GOOGLE_DRIVE_ROOT_FOLDER_ID` é opcional. Na primeira configuração, deixe-o vazio para o sistema criar e reutilizar a pasta raiz automaticamente. Use um ID manual somente se a pasta tiver sido criada pela mesma integração OAuth, porque o escopo privado `drive.file` não concede acesso geral a todas as pastas da conta.

## Configuração no Google Cloud

1. Entre no Google Cloud Console com a conta administrativa da clínica.
2. Crie ou selecione um projeto exclusivo para o Studio Realçar.
3. Ative a Google Drive API.
4. Configure a tela de consentimento OAuth.
5. Durante a configuração inicial, adicione a conta do Drive da clínica como usuária de teste.
6. Antes do uso contínuo em produção, altere o status de publicação do aplicativo OAuth para Produção. Em modo de teste externo, o refresh token pode expirar em sete dias.
7. Crie uma credencial OAuth do tipo Aplicativo da Web.
8. Cadastre esta URI de redirecionamento:

```text
http://127.0.0.1:53682/callback
```

9. Copie o Client ID e o Client Secret para `.env.local`.
10. No terminal, execute:

```powershell
npm run drive:oauth
```

11. Autorize a conta Google que possui os 100 GB.
12. Copie o `GOOGLE_DRIVE_REFRESH_TOKEN` mostrado no terminal para o Railway.

Nunca envie o Client Secret ou o Refresh Token por mensagens e nunca faça commit desses valores.

## Publicação

A migration deve ser aplicada pelo Railway:

```powershell
npm run db:migrate:deploy
```

Não use `prisma db push` em produção.

## Teste mínimo

1. Abra uma cliente de teste.
2. Entre em Fotos.
3. Tire uma foto no iPhone.
4. Confirme que a foto aparece inteira no sistema.
5. Abra a foto em tela cheia.
6. Confira no Drive a pasta criada automaticamente.
7. Exclua a foto de teste e confirme que ela saiu da tela e foi para a lixeira do Drive.
8. Exporte o Backup Premium e confirme que os metadados da foto aparecem no JSON.
