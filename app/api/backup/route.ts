import { NextResponse } from "next/server";

import { canAccess, getCurrentUser } from "@/lib/auth";
import { gerarSnapshotBackup } from "@/lib/backup-snapshot";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const usuarioAtual = await getCurrentUser();

  if (!usuarioAtual) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  if (!canAccess(usuarioAtual, "backup.gerenciar")) {
    return NextResponse.json({ erro: "Acesso negado para exportar backup." }, { status: 403 });
  }

  const snapshot = await gerarSnapshotBackup();

  await prisma.auditoria.create({
    data: {
      modulo: "Backup",
      acao: "Exportou backup JSON",
      entidade: "BackupRegistro",
      usuario: usuarioAtual.email,
      detalhes: `${snapshot.totalRegistros} registros exportados. Campo senha dos usuários removido do snapshot.`,
    },
  });

  return NextResponse.json(snapshot, {
    headers: {
      "Content-Disposition": `attachment; filename="studio-realcar-backup-${snapshot.generatedAt.slice(
        0,
        10,
      )}.json"`,
    },
  });
}