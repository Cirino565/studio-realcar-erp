import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { exec } from "node:child_process";

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const result = {};
  const text = readFileSync(path, "utf8");

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

const localEnv = {
  ...parseEnvFile(".env"),
  ...parseEnvFile(".env.local"),
};
const get = (key) => (process.env[key] || localEnv[key] || "").trim();
const clientId = get("GOOGLE_DRIVE_CLIENT_ID");
const clientSecret = get("GOOGLE_DRIVE_CLIENT_SECRET");
const port = Number(get("GOOGLE_DRIVE_OAUTH_PORT") || 53682);
const redirectUri = `http://127.0.0.1:${port}/callback`;

if (!clientId || !clientSecret) {
  console.error("\nDefina GOOGLE_DRIVE_CLIENT_ID e GOOGLE_DRIVE_CLIENT_SECRET no arquivo .env.local.\n");
  process.exit(1);
}

const state = randomBytes(24).toString("hex");
const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authorizationUrl.searchParams.set("client_id", clientId);
authorizationUrl.searchParams.set("redirect_uri", redirectUri);
authorizationUrl.searchParams.set("response_type", "code");
authorizationUrl.searchParams.set("scope", "https://www.googleapis.com/auth/drive.file");
authorizationUrl.searchParams.set("access_type", "offline");
authorizationUrl.searchParams.set("prompt", "consent");
authorizationUrl.searchParams.set("include_granted_scopes", "true");
authorizationUrl.searchParams.set("state", state);

function openBrowser(url) {
  const command =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;

  exec(command, () => undefined);
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || "/", redirectUri);

  if (requestUrl.pathname !== "/callback") {
    response.writeHead(404).end("Rota não encontrada.");
    return;
  }

  const returnedState = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");

  if (error || returnedState !== state || !code) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Autorização inválida ou cancelada. Volte ao terminal e tente novamente.");
    server.close();
    return;
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const payload = await tokenResponse.json();

    if (!tokenResponse.ok || !payload.refresh_token) {
      throw new Error(
        payload.error_description ||
          payload.error ||
          "O Google não retornou um refresh token. Revogue o acesso do aplicativo e tente novamente.",
      );
    }

    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(
      "<h1>Google Drive autorizado</h1><p>Volte ao terminal. O token foi exibido somente lá.</p>",
    );

    console.log("\nAutorização concluída.\n");
    console.log("Adicione esta variável no Railway e no .env.local:\n");
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=\"${payload.refresh_token}\"`);
    console.log("\nNão envie esse token por mensagem e não faça commit dele no GitHub.\n");
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Falha ao concluir a autorização. Veja o terminal.");
    console.error("\nFalha:", error instanceof Error ? error.message : error, "\n");
  } finally {
    setTimeout(() => server.close(), 500);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("\nAutorize a conta Google Drive exclusiva da clínica.");
  console.log(`\nURI de redirecionamento que deve estar cadastrada no Google Cloud:\n${redirectUri}\n`);
  console.log(`Abra este endereço caso o navegador não abra automaticamente:\n${authorizationUrl.toString()}\n`);
  openBrowser(authorizationUrl.toString());
});
