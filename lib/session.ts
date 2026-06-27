export const SESSION_COOKIE_NAME = "sr_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DEV_SESSION_SECRET = "studio-realcar-dev-session-secret-change-before-production-2026";

export type SessionPayload = {
  uid: number;
  email: string;
  nome: string;
  tipo: string;
  iat: number;
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET não definido. Configure uma chave forte nas variáveis de ambiente da hospedagem.");
    }

    return DEV_SESSION_SECRET;
  }

  if (secret.length < 32) {
    throw new Error("SESSION_SECRET precisa ter pelo menos 32 caracteres.");
  }

  return secret;
}

const base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const base64Lookup = new Map<string, number>(Array.from(base64Alphabet).map((char, index) => [char, index]));

function bytesToBase64(bytes: Uint8Array) {
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];

    output += base64Alphabet[first >> 2];
    output += base64Alphabet[((first & 0x03) << 4) | ((second ?? 0) >> 4)];
    output += index + 1 < bytes.length ? base64Alphabet[((second & 0x0f) << 2) | ((third ?? 0) >> 6)] : "=";
    output += index + 2 < bytes.length ? base64Alphabet[third & 0x3f] : "=";
  }

  return output;
}

function base64ToBytes(base64: string) {
  const bytes: number[] = [];

  for (let index = 0; index < base64.length; index += 4) {
    const first = base64Lookup.get(base64[index]);
    const second = base64Lookup.get(base64[index + 1]);
    const thirdChar = base64[index + 2];
    const fourthChar = base64[index + 3];
    const third = thirdChar === "=" ? undefined : base64Lookup.get(thirdChar);
    const fourth = fourthChar === "=" ? undefined : base64Lookup.get(fourthChar);

    if (first === undefined || second === undefined) {
      throw new Error("Base64 inválido.");
    }

    bytes.push((first << 2) | (second >> 4));

    if (third !== undefined) {
      bytes.push(((second & 0x0f) << 4) | (third >> 2));
    }

    if (third !== undefined && fourth !== undefined) {
      bytes.push(((third & 0x03) << 6) | fourth);
    }
  }

  return new Uint8Array(bytes);
}

function toBase64Url(value: string | ArrayBuffer) {
  const bytes = typeof value === "string" ? encoder.encode(value) : new Uint8Array(value);

  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  return base64ToBytes(padded);
}

async function getKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(value: string) {
  const signature = await crypto.subtle.sign("HMAC", await getKey(), encoder.encode(value));
  return toBase64Url(signature);
}

async function verify(value: string, signature: string) {
  try {
    return crypto.subtle.verify("HMAC", await getKey(), fromBase64Url(signature), encoder.encode(value));
  } catch {
    return false;
  }
}

export async function createSessionToken(payload: Omit<SessionPayload, "iat" | "exp">) {
  const now = Math.floor(Date.now() / 1000);
  const session: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = toBase64Url(JSON.stringify(session));
  const signature = await sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) return null;

  const validSignature = await verify(encodedPayload, signature);
  if (!validSignature) return null;

  try {
    const payload = JSON.parse(decoder.decode(fromBase64Url(encodedPayload))) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);

    if (!payload.uid || !payload.email || !payload.exp || payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
