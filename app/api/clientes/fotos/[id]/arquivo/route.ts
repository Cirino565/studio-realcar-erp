import { NextResponse } from "next/server";

import { canAccess, getCurrentUser } from "@/lib/auth";
import { downloadDriveFile } from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(_request: Request, context: RouteContext) {
  const usuario = await getCurrentUser();

  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  if (!canAccess(usuario, "clientes.clinico")) {
    return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  }

  const { id } = await context.params;
  const fotoId = Number(id);

  if (!Number.isInteger(fotoId) || fotoId <= 0) {
    return NextResponse.json({ erro: "Foto inválida." }, { status: 400 });
  }

  const foto = await prisma.clienteFoto.findFirst({
    where: {
      id: fotoId,
      excluidaEm: null,
      armazenamento: "GOOGLE_DRIVE",
      driveFileId: { not: null },
    },
    select: {
      driveFileId: true,
      mimeType: true,
      nomeArquivo: true,
    },
  });

  if (!foto?.driveFileId) {
    return NextResponse.json({ erro: "Foto não encontrada." }, { status: 404 });
  }

  try {
    const driveResponse = await downloadDriveFile(foto.driveFileId);
    const headers = new Headers();
    headers.set("Content-Type", foto.mimeType || "application/octet-stream");
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(foto.nomeArquivo || "foto-clinica")}`,
    );

    return new Response(driveResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : "Falha ao abrir a foto.";
    return NextResponse.json({ erro: mensagem }, { status: 502 });
  }
}
