import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, verifySessionToken } from "./lib/session";

function securityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const isLoginPage = pathname.startsWith("/login");
  const isApiRoute = pathname.startsWith("/api");

  // Rota usada pelo agendador externo.
  // Ela não depende da sessão do sistema porque possui sua própria
  // autenticação através do BACKUP_CRON_SECRET.
  //
  // IMPORTANTE:
  // liberar somente este caminho exato.
  const isBackupAutomatico = pathname === "/api/backup/automatico";

  // Rota usada pelo Apps Script da landing page para criar o lead no
  // instante do clique no WhatsApp. Também não depende da sessão do
  // sistema - tem sua própria autenticação via LEAD_WEBHOOK_SECRET.
  //
  // IMPORTANTE:
  // liberar somente este caminho exato.
  const isCapturaClique = pathname === "/api/marketing/captura-clique";

  // Rota usada pelo agendador externo para atualizar a planilha de
  // conversões do Google Ads. Também não depende da sessão do sistema -
  // tem sua própria autenticação via MARKETING_EXPORT_SECRET.
  //
  // IMPORTANTE:
  // liberar somente este caminho exato.
  const isExportarConversoes = pathname === "/api/marketing/exportar-conversoes";

  if (isBackupAutomatico || isCapturaClique || isExportarConversoes) {
    return securityHeaders(NextResponse.next());
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  let session: Awaited<ReturnType<typeof verifySessionToken>> = null;

  if (token) {
    try {
      session = await verifySessionToken(token);
    } catch (error) {
      console.error(error);
      session = null;
    }
  }

  if (!session && isApiRoute) {
    return securityHeaders(
      NextResponse.json(
        { erro: "Não autenticado." },
        { status: 401 },
      ),
    );
  }

  if (!session && !isLoginPage) {
    return securityHeaders(
      NextResponse.redirect(new URL("/login", req.url)),
    );
  }

  if (session && isLoginPage) {
    return securityHeaders(
      NextResponse.redirect(new URL("/", req.url)),
    );
  }

  return securityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};
