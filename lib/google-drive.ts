import { randomUUID } from "node:crypto";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const DEFAULT_ROOT_FOLDER_NAME = "Studio Realçar - Arquivos Clínicos";

type AccessTokenCache = {
  token: string;
  expiresAt: number;
};

type DriveFileMetadata = {
  id: string;
  name: string;
  mimeType?: string;
  size?: string;
  createdTime?: string;
};

type UploadClienteFotoInput = {
  clienteId: number;
  dataRegistro: Date;
  tipo: string;
  nomeArquivo: string;
  mimeType: string;
  conteudo: Buffer;
};

let accessTokenCache: AccessTokenCache | null = null;

function getDriveCredentials() {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Drive não configurado. Defina GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET e GOOGLE_DRIVE_REFRESH_TOKEN.",
    );
  }

  return { clientId, clientSecret, refreshToken };
}

export function isGoogleDriveConfigured() {
  return Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim(),
  );
}

async function requestAccessToken(forceRefresh = false) {
  const now = Date.now();

  if (
    !forceRefresh &&
    accessTokenCache &&
    accessTokenCache.expiresAt > now + 60_000
  ) {
    return accessTokenCache.token;
  }

  const { clientId, clientSecret, refreshToken } = getDriveCredentials();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error_description?: string; error?: string }
    | null;

  if (!response.ok || !payload?.access_token) {
    const detalhe = payload?.error_description || payload?.error || response.statusText;
    throw new Error(`Falha ao autenticar no Google Drive: ${detalhe}`);
  }

  accessTokenCache = {
    token: payload.access_token,
    expiresAt: now + Math.max(300, payload.expires_in ?? 3600) * 1000,
  };

  return payload.access_token;
}

async function driveFetch(url: string, init: RequestInit = {}) {
  const executar = async (forceRefresh: boolean) => {
    const token = await requestAccessToken(forceRefresh);
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);

    return fetch(url, {
      ...init,
      headers,
      cache: "no-store",
    });
  };

  let response = await executar(false);

  if (response.status === 401) {
    accessTokenCache = null;
    response = await executar(true);
  }

  return response;
}

async function assertDriveResponse(response: Response, contexto: string) {
  if (response.ok) return;

  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } | string }
    | null;
  const detalhe =
    typeof payload?.error === "string"
      ? payload.error
      : payload?.error?.message || response.statusText;

  throw new Error(`${contexto}: ${detalhe}`);
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findFolder(queryParts: string[]) {
  const q = [
    `mimeType = '${DRIVE_FOLDER_MIME}'`,
    "trashed = false",
    ...queryParts,
  ].join(" and ");

  const url = new URL(`${DRIVE_API_BASE}/files`);
  url.searchParams.set("q", q);
  url.searchParams.set("fields", "files(id,name,mimeType)");
  url.searchParams.set("pageSize", "10");
  url.searchParams.set("spaces", "drive");

  const response = await driveFetch(url.toString());
  await assertDriveResponse(response, "Falha ao localizar pasta no Google Drive");

  const payload = (await response.json()) as { files?: DriveFileMetadata[] };
  return payload.files?.[0] ?? null;
}

async function createFolder(
  name: string,
  parentId: string | null,
  appProperties: Record<string, string>,
) {
  const response = await driveFetch(`${DRIVE_API_BASE}/files?fields=id,name,mimeType`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      name,
      mimeType: DRIVE_FOLDER_MIME,
      parents: parentId ? [parentId] : undefined,
      appProperties,
    }),
  });

  await assertDriveResponse(response, "Falha ao criar pasta no Google Drive");
  return (await response.json()) as DriveFileMetadata;
}

async function getOrCreateRootFolder() {
  const configuredRootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();

  if (configuredRootId) {
    return configuredRootId;
  }

  const existing = await findFolder([
    "appProperties has { key='studioRealcarRoot' and value='true' }",
  ]);

  if (existing) return existing.id;

  const root = await createFolder(
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME?.trim() || DEFAULT_ROOT_FOLDER_NAME,
    null,
    {
      studioRealcarRoot: "true",
      sistema: "studio-realcar",
    },
  );

  return root.id;
}

async function getOrCreateClientFolder(rootFolderId: string, clienteId: number) {
  const clienteKey = String(clienteId);
  const existing = await findFolder([
    `'${escapeDriveQueryValue(rootFolderId)}' in parents`,
    `appProperties has { key='clienteId' and value='${escapeDriveQueryValue(clienteKey)}' }`,
  ]);

  if (existing) return existing.id;

  const folder = await createFolder(
    `cliente_${String(clienteId).padStart(6, "0")}`,
    rootFolderId,
    {
      sistema: "studio-realcar",
      clienteId: clienteKey,
      tipoRegistro: "cliente",
    },
  );

  return folder.id;
}

async function getOrCreateYearFolder(clientFolderId: string, year: number) {
  const yearKey = String(year);
  const existing = await findFolder([
    `'${escapeDriveQueryValue(clientFolderId)}' in parents`,
    `appProperties has { key='ano' and value='${escapeDriveQueryValue(yearKey)}' }`,
  ]);

  if (existing) return existing.id;

  const folder = await createFolder(yearKey, clientFolderId, {
    sistema: "studio-realcar",
    ano: yearKey,
    tipoRegistro: "ano-clinico",
  });

  return folder.id;
}

export async function uploadClienteFotoDrive(input: UploadClienteFotoInput) {
  const rootFolderId = await getOrCreateRootFolder();
  const clientFolderId = await getOrCreateClientFolder(rootFolderId, input.clienteId);
  const yearFolderId = await getOrCreateYearFolder(
    clientFolderId,
    input.dataRegistro.getFullYear(),
  );

  const boundary = `studio_realcar_${randomUUID()}`;
  const metadata = {
    name: input.nomeArquivo,
    parents: [yearFolderId],
    appProperties: {
      sistema: "studio-realcar",
      clienteId: String(input.clienteId),
      tipoFoto: input.tipo,
      dataRegistro: input.dataRegistro.toISOString(),
    },
  };

  const prefix = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata,
    )}\r\n--${boundary}\r\nContent-Type: ${input.mimeType}\r\n\r\n`,
    "utf8",
  );
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const body = Buffer.concat([prefix, input.conteudo, suffix]);

  const url = new URL(`${DRIVE_UPLOAD_BASE}/files`);
  url.searchParams.set("uploadType", "multipart");
  url.searchParams.set("fields", "id,name,mimeType,size,createdTime");

  const response = await driveFetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: body as unknown as BodyInit,
  });

  await assertDriveResponse(response, "Falha ao enviar foto ao Google Drive");
  return (await response.json()) as DriveFileMetadata;
}

export async function downloadDriveFile(fileId: string) {
  const url = new URL(`${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("alt", "media");

  const response = await driveFetch(url.toString());
  await assertDriveResponse(response, "Falha ao abrir arquivo do Google Drive");
  return response;
}

async function setDriveFileTrashed(fileId: string, trashed: boolean) {
  const response = await driveFetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?fields=id,trashed`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ trashed }),
    },
  );

  await assertDriveResponse(
    response,
    trashed
      ? "Falha ao mover arquivo do Google Drive para a lixeira"
      : "Falha ao restaurar arquivo do Google Drive",
  );
}

export async function moveDriveFileToTrash(fileId: string) {
  await setDriveFileTrashed(fileId, true);
}

export async function restoreDriveFile(fileId: string) {
  await setDriveFileTrashed(fileId, false);
}

/* ==========================================================================
   Backup automático do sistema
   --------------------------------------------------------------------------
   Guarda os arquivos JSON de backup em uma pasta separada, dentro da mesma
   pasta raiz já usada pelas fotos clínicas. Nada aqui altera o funcionamento
   das fotos.
   ========================================================================== */

const BACKUP_FOLDER_NAME = "Backups do Sistema";

type BackupDriveUploadInput = {
  nomeArquivo: string;
  conteudo: Buffer;
  mimeType?: string;
};

async function getOrCreateBackupFolder() {
  const rootFolderId = await getOrCreateRootFolder();

  const existing = await findFolder([
    `'${escapeDriveQueryValue(rootFolderId)}' in parents`,
    "appProperties has { key='tipoRegistro' and value='backup-sistema' }",
  ]);

  if (existing) return existing.id;

  const folder = await createFolder(BACKUP_FOLDER_NAME, rootFolderId, {
    sistema: "studio-realcar",
    tipoRegistro: "backup-sistema",
  });

  return folder.id;
}

export async function uploadBackupDrive(input: BackupDriveUploadInput) {
  const backupFolderId = await getOrCreateBackupFolder();
  const mimeType = input.mimeType ?? "application/json";

  const boundary = `studio_realcar_${randomUUID()}`;
  const metadata = {
    name: input.nomeArquivo,
    parents: [backupFolderId],
    appProperties: {
      sistema: "studio-realcar",
      tipoRegistro: "backup-sistema-arquivo",
      geradoEm: new Date().toISOString(),
    },
  };

  const prefix = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata,
    )}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    "utf8",
  );
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const body = Buffer.concat([prefix, input.conteudo, suffix]);

  const url = new URL(`${DRIVE_UPLOAD_BASE}/files`);
  url.searchParams.set("uploadType", "multipart");
  url.searchParams.set("fields", "id,name,mimeType,size,createdTime");

  const response = await driveFetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: body as unknown as BodyInit,
  });

  await assertDriveResponse(response, "Falha ao enviar backup ao Google Drive");
  return (await response.json()) as DriveFileMetadata;
}

export async function listarBackupsDrive() {
  const backupFolderId = await getOrCreateBackupFolder();

  const q = [
    `'${escapeDriveQueryValue(backupFolderId)}' in parents`,
    `mimeType != '${DRIVE_FOLDER_MIME}'`,
    "trashed = false",
  ].join(" and ");

  const url = new URL(`${DRIVE_API_BASE}/files`);
  url.searchParams.set("q", q);
  url.searchParams.set("fields", "files(id,name,size,createdTime)");
  url.searchParams.set("orderBy", "createdTime desc");
  url.searchParams.set("pageSize", "200");
  url.searchParams.set("spaces", "drive");

  const response = await driveFetch(url.toString());
  await assertDriveResponse(response, "Falha ao listar backups no Google Drive");

  const payload = (await response.json()) as { files?: DriveFileMetadata[] };
  return payload.files ?? [];
}

export async function limparBackupsAntigosDrive(manter: number) {
  const quantidadeMinima = Math.max(1, manter);
  const arquivos = await listarBackupsDrive();

  if (arquivos.length <= quantidadeMinima) {
    return { removidos: 0, mantidos: arquivos.length };
  }

  const excedentes = arquivos.slice(quantidadeMinima);
  let removidos = 0;

  for (const arquivo of excedentes) {
    try {
      await moveDriveFileToTrash(arquivo.id);
      removidos++;
    } catch {
      // Um arquivo antigo que falhou ao ser removido não pode derrubar o backup do dia.
    }
  }

  return { removidos, mantidos: arquivos.length - removidos };
}

/* ==========================================================================
   Planilha de conversões para o Google Ads
   --------------------------------------------------------------------------
   Mantém uma planilha do Google Sheets sempre atualizada, no formato que o
   Google Ads aceita para importar conversão a partir de um "Direct
   Connection" agendado. O Ads passa a buscar essa planilha sozinho, sem
   ninguém precisar fazer upload manual.
   ========================================================================== */

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const CONVERSOES_FOLDER_NAME = "Conversões Google Ads";
const CONVERSOES_SHEET_NAME = "Conversoes Google Ads - Studio Realcar";

async function getOrCreateConversoesFolder() {
  const rootFolderId = await getOrCreateRootFolder();

  const existente = await findFolder([
    `'${escapeDriveQueryValue(rootFolderId)}' in parents`,
    "appProperties has { key='tipoRegistro' and value='conversoes-ads' }",
  ]);

  if (existente) return existente.id;

  const folder = await createFolder(CONVERSOES_FOLDER_NAME, rootFolderId, {
    sistema: "studio-realcar",
    tipoRegistro: "conversoes-ads",
  });

  return folder.id;
}

async function encontrarPlanilhaConversoes(folderId: string) {
  const q = [
    `'${escapeDriveQueryValue(folderId)}' in parents`,
    "mimeType = 'application/vnd.google-apps.spreadsheet'",
    "trashed = false",
  ].join(" and ");

  const url = new URL(`${DRIVE_API_BASE}/files`);
  url.searchParams.set("q", q);
  url.searchParams.set("fields", "files(id,name)");
  url.searchParams.set("pageSize", "1");
  url.searchParams.set("spaces", "drive");

  const response = await driveFetch(url.toString());
  await assertDriveResponse(response, "Falha ao procurar a planilha de conversões");

  const payload = (await response.json()) as { files?: { id: string; name: string }[] };
  return payload.files?.[0]?.id ?? null;
}

async function criarPlanilhaConversoes(folderId: string) {
  const response = await driveFetch(`${DRIVE_API_BASE}/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: CONVERSOES_SHEET_NAME,
      mimeType: "application/vnd.google-apps.spreadsheet",
      parents: [folderId],
    }),
  });

  await assertDriveResponse(response, "Falha ao criar a planilha de conversões");
  const payload = (await response.json()) as { id: string };
  return payload.id;
}

async function getOrCreateConversoesSpreadsheet() {
  const folderId = await getOrCreateConversoesFolder();
  const existente = await encontrarPlanilhaConversoes(folderId);

  if (existente) return existente;

  return criarPlanilhaConversoes(folderId);
}

export type LinhaConversaoAds = {
  gclid: string;
  nomeConversao: string;
  dataHora: string;
  valor: number;
  moeda: string;
};

export type ResultadoPlanilhaConversoes = {
  spreadsheetId: string;
  url: string;
};

/**
 * Sobrescreve a planilha inteira com os dados atuais. Reescrever do zero a
 * cada execução (em vez de só acrescentar linhas) é proposital: a planilha
 * sempre reflete a verdade mais recente, e o próprio Google Ads já ignora
 * conversão duplicada (mesmo GCLID + mesmo horário + mesma conversão), então
 * reenviar a mesma linha em execuções diferentes não gera contagem dobrada.
 */
export async function atualizarPlanilhaConversoesAds(
  linhas: LinhaConversaoAds[],
): Promise<ResultadoPlanilhaConversoes> {
  const spreadsheetId = await getOrCreateConversoesSpreadsheet();

  const limpar = await driveFetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/A1:E100000:clear`,
    { method: "POST" },
  );
  await assertDriveResponse(limpar, "Falha ao limpar a planilha de conversões");

  const valores: (string | number)[][] = [
    ["Parameters:TimeZone=-0300"],
    [
      "Google Click ID",
      "Conversion Name",
      "Conversion Time",
      "Conversion Value",
      "Conversion Currency",
    ],
    ...linhas.map((linha) => [
      linha.gclid,
      linha.nomeConversao,
      linha.dataHora,
      linha.valor.toFixed(2),
      linha.moeda,
    ]),
  ];

  const escrever = await driveFetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/A1?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: valores }),
    },
  );
  await assertDriveResponse(escrever, "Falha ao escrever na planilha de conversões");

  return {
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}