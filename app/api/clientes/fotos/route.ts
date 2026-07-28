import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { canAccess, getCurrentUser } from "@/lib/auth";
import {
  isGoogleDriveConfigured,
  moveDriveFileToTrash,
  uploadClienteFotoDrive,
} from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 2 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ACCEPTED_PHOTO_TYPES = new Set([
  "Antes",
  "Depois",
  "Evolução",
  "Intercorrência",
  "Outro",
]);

function getText(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function detectImageMimeType(buffer: Buffer) {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

function parseDate(value: string | null) {
  if (!value) return new Date();

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 12));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export async function POST(request: Request) {
  const usuario = await getCurrentUser();

  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  if (!canAccess(usuario, "clientes.clinico")) {
    return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  }

  if (!isGoogleDriveConfigured()) {
    return NextResponse.json(
      {
        erro: "A integração com o Google Drive ainda não foi configurada no Railway.",
      },
      { status: 503 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
    return NextResponse.json(
      { erro: "O envio ultrapassa o limite permitido." },
      { status: 413 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ erro: "Não foi possível ler o envio." }, { status: 400 });
  }

  const clienteId = Number(formData.get("clienteId"));
  const titulo = getText(formData, "titulo", 160);
  const tipo = getText(formData, "tipo", 40) || "Evolução";
  const procedimento = getText(formData, "procedimento", 160);
  const descricao = getText(formData, "descricao", 2000);
  const dataRegistro = parseDate(getText(formData, "dataRegistro", 10));
  const arquivo = formData.get("arquivo");

  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    return NextResponse.json({ erro: "Cliente inválido." }, { status: 400 });
  }

  if (!titulo) {
    return NextResponse.json({ erro: "Informe o título da foto." }, { status: 400 });
  }

  if (!ACCEPTED_PHOTO_TYPES.has(tipo)) {
    return NextResponse.json({ erro: "Tipo de foto inválido." }, { status: 400 });
  }

  if (!dataRegistro) {
    return NextResponse.json({ erro: "Data inválida." }, { status: 400 });
  }

  if (!(arquivo instanceof File) || arquivo.size <= 0) {
    return NextResponse.json({ erro: "Selecione uma foto." }, { status: 400 });
  }

  if (arquivo.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { erro: "A foto ultrapassa o limite de 10 MB após a preparação." },
      { status: 413 },
    );
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true },
  });

  if (!cliente) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());
  const detectedMimeType = detectImageMimeType(buffer);

  if (!detectedMimeType || !ACCEPTED_MIME_TYPES.has(detectedMimeType)) {
    return NextResponse.json(
      { erro: "Formato de imagem inválido. Use JPG, PNG ou WEBP." },
      { status: 415 },
    );
  }

  const hashSha256 = createHash("sha256").update(buffer).digest("hex");
  const duplicada = await prisma.clienteFoto.findFirst({
    where: {
      clienteId,
      hashSha256,
      excluidaEm: null,
    },
    select: { id: true },
  });

  if (duplicada) {
    return NextResponse.json(
      { erro: "Esta mesma foto já está registrada para a cliente." },
      { status: 409 },
    );
  }

  const extensao =
    detectedMimeType === "image/png"
      ? "png"
      : detectedMimeType === "image/webp"
        ? "webp"
        : "jpg";
  const dataKey = dataRegistro.toISOString().slice(0, 10);
  const baseName = safeFileName(`${tipo}_${titulo}`) || "foto_clinica";
  const nomeArquivo = `cliente_${String(clienteId).padStart(6, "0")}_${dataKey}_${baseName}_${Date.now()}.${extensao}`;

  let driveFileId: string | null = null;

  try {
    const driveFile = await uploadClienteFotoDrive({
      clienteId,
      dataRegistro,
      tipo,
      nomeArquivo,
      mimeType: detectedMimeType,
      conteudo: buffer,
    });

    driveFileId = driveFile.id;

    const foto = await prisma.$transaction(async (tx) => {
      const registro = await tx.clienteFoto.create({
        data: {
          clienteId,
          titulo,
          tipo,
          procedimento,
          url: `drive:${driveFile.id}`,
          descricao,
          dataRegistro,
          armazenamento: "GOOGLE_DRIVE",
          driveFileId: driveFile.id,
          nomeArquivo: driveFile.name || nomeArquivo,
          mimeType: driveFile.mimeType || detectedMimeType,
          tamanhoBytes: buffer.length,
          hashSha256,
          enviadaPor: usuario.nome || usuario.email,
        },
        select: { id: true },
      });

      await tx.auditoria.create({
        data: {
          modulo: "Clientes",
          acao: "Enviou foto clínica ao Google Drive",
          entidade: "ClienteFoto",
          entidadeId: String(registro.id),
          usuario: usuario.nome || usuario.email,
          detalhes: `Cliente ${clienteId}, tipo ${tipo}, arquivo ${nomeArquivo}.`,
        },
      });

      return registro;
    });

    return NextResponse.json({ ok: true, fotoId: foto.id }, { status: 201 });
  } catch (error) {
    if (driveFileId) {
      await moveDriveFileToTrash(driveFileId).catch(() => undefined);
    }

    const mensagem = error instanceof Error ? error.message : "Falha ao enviar a foto.";
    return NextResponse.json({ erro: mensagem }, { status: 500 });
  }
}
