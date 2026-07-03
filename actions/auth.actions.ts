"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";
import { getDefaultPathForUser } from "@/lib/auth";
import { isMobileUserAgent } from "@/lib/device";

export type LoginState = {
  erro?: string;
};

function normalizarEmail(valor: FormDataEntryValue | null) {
  return typeof valor === "string" ? valor.trim().toLowerCase() : "";
}

function normalizarSenha(valor: FormDataEntryValue | null) {
  return typeof valor === "string" ? valor : "";
}

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = normalizarEmail(formData.get("email"));
  const senha = normalizarSenha(formData.get("senha"));

  if (!email || !senha) {
    return { erro: "Informe e-mail e senha para acessar." };
  }

  const user = await prisma.usuario.findUnique({
    where: { email },
    include: {
      perfil: {
        include: {
          permissoes: {
            include: { permissao: true },
          },
        },
      },
    },
  });

  if (!user || user.status !== "Ativo") {
    return { erro: "Usuário não encontrado ou inativo." };
  }

  const senhaValida = await bcrypt.compare(senha, user.senha);

  if (!senhaValida) {
    return { erro: "E-mail ou senha inválidos." };
  }

  let token: string;

  try {
    token = await createSessionToken({
      uid: user.id,
      email: user.email,
      nome: user.nome,
      tipo: user.tipo,
    });
  } catch (error) {
    console.error(error);
    return { erro: "Configuração de segurança pendente. Defina SESSION_SECRET no ambiente." };
  }

  const cookieStore = await cookies();

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

  await prisma.auditoria.create({
    data: {
      modulo: "Autenticação",
      acao: "Login realizado",
      entidade: "Usuario",
      entidadeId: String(user.id),
      usuario: user.email,
      detalhes: "Sessão iniciada com autenticação segura.",
    },
  });

  // 🔥 DETECÇÃO MOBILE
  const userAgent = headers().get("user-agent");
  const isMobile = isMobileUserAgent(userAgent);

  // 🧠 DESTINO PADRÃO (DESKTOP)
  const destinoDesktop = getDefaultPathForUser(user);

  // 📱 FLUXO CLÍNICO MOBILE
  if (isMobile) {
    redirect("/assistencial/agenda");
  }

  // 🖥️ FLUXO NORMAL (ADMIN / SISTEMA COMPLETO)
  redirect(destinoDesktop);
}