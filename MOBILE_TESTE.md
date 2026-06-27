# Teste mobile - Studio Realçar ERP

## Como rodar sem Docker

```powershell
npm install
npm run setup:local
npm run dev
```

No PC:

```txt
http://localhost:3000
```

No celular, use o IP do computador:

```txt
http://IP-DO-PC:3000
```

Exemplo:

```txt
http://192.168.0.13:3000
```

## Logins

Admin:

```txt
admin@studiorealcar.com
123456
```

Operacional:

```txt
operacional@studiorealcar.com
123456
```

## O que validar no celular na v9

1. Entrar como Operacional.
2. Abrir **Clientes**.
3. Clicar em **Novo cliente**.
   - Deve abrir a página `/clientes/novo`.
4. Cadastrar um cliente e salvar.
5. Voltar em **Clientes** e abrir um perfil.
6. Clicar nas abas:
   - Anamnese
   - Fotos
   - Evolução
   - Procedimentos
   - Documentos
   Todas devem abrir por link, mesmo que o navegador não dispare evento React.
7. Na lista de clientes, clicar em **Editar**.
   - Deve abrir `/clientes/ID/editar`.
8. Abrir **Agenda**.
9. Clicar em **Novo** ou em algum horário rápido.
   - Deve abrir `/agenda/novo`.
10. Salvar um agendamento e confirmar se volta para a agenda.

## Observação técnica

Na v9, as ações principais do mobile foram trocadas de modais/`onClick` para páginas e links reais. Isso evita falhas em celular quando o navegador acessa o app pelo IP local e algum evento JavaScript não hidrata corretamente.
