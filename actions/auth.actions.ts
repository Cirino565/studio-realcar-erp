"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getDefaultPathForUser } from "@/lib/auth";
import { isMobileUserAgent } from "@/lib/device";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";

export async function login(_state: any, formData: FormData) {
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const senha = String(formData.get("senha") || "");

  const user = await prisma.usuario.findUnique({
    where: { email },
    include: {
      perfil: { include: { permissoes: { include: { permissao: true } } } },
    },
  });

  if (!user) return { erro: "Usuário inválido" };

  const ok = await bcrypt.compare(senha, user.senha);
  if (!ok) return { erro: "Senha inválida" };

  const token = await createSessionToken({
    uid: user.id,
    email: user.email,
    nome: user.nome,
    tipo: user.tipo,
  });

  const cookieStore = cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  await prisma.usuario.update({
    where: { id: user.id },
    data: { ultimoAcesso: new Date() },
  });

  const h = headers();
  const ua = h.get("user-agent");

  const mobile = isMobileUserAgent(ua);

  if (mobile) {
    redirect("/assistencial/agenda");
  }

  redirect(getDefaultPathForUser(user));
}

export async function logout() {
  const cookieStore = cookies();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  redirect("/login");
}