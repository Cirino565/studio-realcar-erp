import { NextResponse } from "next/server";

import { versaoAtual } from "@/lib/versao";

export const dynamic = "force-dynamic";

// Resposta minuscula: so diz qual versao esta no ar.
export function GET() {
  return NextResponse.json(
    { versao: versaoAtual() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
