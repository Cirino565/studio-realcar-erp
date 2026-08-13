import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { gerarSnapshotBackup } from "@/lib/backup-snapshot";
import {
  isGoogleDriveConfigured,
  limparBackupsAntigosDrive,
  uploadBackupDrive,
} from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TIMEZONE = "America/Sao_Paulo";

/** Quantos backups manter no Drive antes de mandar os mais antigos para a lixeira. */
const MANTER_PADRAO = 30;

/** Janela mínima entre dois backups automáticos, para o caso de o agendador repetir a chamada. */
const JANELA_MINIMA_HORAS = 20;

function comparacaoSegura(valorRecebido: string, valorEsperado: string) {
  const recebido = Buffer.from(valorRecebido);
  const esperado = Buffer.from(valorEsperado);

  if (recebido.length !== esperado.length) {
    return false;
  }

  return timingSafeEqual(recebido, esperado);
}

function extrairToken(request: NextRequest) {
  const header = request.headers.get("authorization");

  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }

  const headerDireto = request.headers.get("x-backup-token");

  if (headerDireto) {
    return headerDireto.trim();
  }

  return request.nextUrl.searchParams.get("token")?.trim() ?? "";
}

function dataHoraSaoPaulo(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  }).format(data);
}

function dataArquivoSaoPaulo(data: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
  }).formatToParts(data);

  const buscar = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "00";

  return `${buscar("year")}-${buscar("month")}-${buscar("day")}_${buscar("hour")}${buscar("minute")}`;
}

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function executarBackupAutomatico(request: NextRequest) {
  const segredo = process.env.BACKUP_CRON_SECRET?.trim();

  // Sem segredo configurado a rota fica fechada. Nunca liberar por padrão.
  if (!segredo || segredo.length < 24) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          "Backup automático não configurado. Defina BACKUP_CRON_SECRET com pelo menos 24 caracteres.",
      },
      { status: 503 },
    );
  }

  const tokenRecebido = extrairToken(request);

  if (!tokenRecebido || !comparacaoSegura(tokenRecebido, segredo)) {
    return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 });
  }

  if (!isGoogleDriveConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        erro:
          "Google Drive não configurado. Defina GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET e GOOGLE_DRIVE_REFRESH_TOKEN.",
      },
      { status: 503 },
    );
  }

  const forcar = request.nextUrl.searchParams.get("forcar") === "1";

  if (!forcar) {
    const limite = new Date(Date.now() - JANELA_MINIMA_HORAS * 60 * 60 * 1000);

    const recente = await prisma.backupRegistro.findFirst({
      where: {
        status: "Concluído",
        nome: { startsWith: "Backup automático" },
        createdAt: { gte: limite },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recente) {
      return NextResponse.json({
        ok: true,
        ignorado: true,
        motivo: `Já existe um backup automático concluído nas últimas ${JANELA_MINIMA_HORAS} horas.`,
        ultimoBackupEm: recente.createdAt,
      });
    }
  }

  const agora = new Date();
  const nomeRegistro = `Backup automático ${dataHoraSaoPaulo(agora)}`;

  try {
    const snapshot = await gerarSnapshotBackup();
    const conteudo = Buffer.from(JSON.stringify(snapshot), "utf8");
    const nomeArquivo = `studio-realcar-backup-${dataArquivoSaoPaulo(agora)}.json`;

    const arquivoDrive = await uploadBackupDrive({
      nomeArquivo,
      conteudo,
      mimeType: "application/json",
    });

    const manterConfigurado = Number(process.env.BACKUP_DRIVE_MANTER?.trim());
    const manter =
      Number.isFinite(manterConfigurado) && manterConfigurado > 0
        ? Math.floor(manterConfigurado)
        : MANTER_PADRAO;

    const limpeza = await limparBackupsAntigosDrive(manter);

    await prisma.backupRegistro.create({
      data: {
        nome: nomeRegistro,
        status: "Concluído",
        tamanho: `${snapshot.totalRegistros} registros · ${formatarTamanho(conteudo.length)}`,
        observacoes: `Enviado ao Google Drive como ${nomeArquivo}. Mantendo os ${manter} backups mais recentes.`,
      },
    });

    await prisma.auditoria.create({
      data: {
        modulo: "Backup",
        acao: "Backup automático enviado ao Google Drive",
        entidade: "BackupRegistro",
        usuario: "Sistema (backup automático)",
        detalhes: `${snapshot.totalRegistros} registros. Arquivo ${nomeArquivo}. ${limpeza.removidos} backup(s) antigo(s) movido(s) para a lixeira.`,
      },
    });

    return NextResponse.json({
      ok: true,
      arquivo: nomeArquivo,
      driveFileId: arquivoDrive.id,
      totalRegistros: snapshot.totalRegistros,
      tamanho: formatarTamanho(conteudo.length),
      backupsAntigosRemovidos: limpeza.removidos,
      geradoEm: snapshot.generatedAt,
    });
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido no backup automático.";

    // O registro de falha é importante: sem ele, um backup que parou de funcionar
    // passa despercebido justamente por ser automático.
    try {
      await prisma.backupRegistro.create({
        data: {
          nome: `${nomeRegistro} (com erro)`,
          status: "Erro",
          tamanho: null,
          observacoes: mensagem.slice(0, 500),
        },
      });

      await prisma.auditoria.create({
        data: {
          modulo: "Backup",
          acao: "Falha no backup automático",
          entidade: "BackupRegistro",
          usuario: "Sistema (backup automático)",
          detalhes: mensagem.slice(0, 500),
        },
      });
    } catch {
      // Se nem o registro de erro puder ser gravado, ainda assim devolvemos 500.
    }

    return NextResponse.json({ ok: false, erro: mensagem }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return executarBackupAutomatico(request);
}

export async function POST(request: NextRequest) {
  return executarBackupAutomatico(request);
}