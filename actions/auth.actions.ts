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

export type LoginState = {
  erro?: string;
};

function normalizarIdentificador(valor: FormDataEntryValue | null) {
  return typeof valor === "string" ? valor.trim() : "";
}

function normalizarSenha(valor: FormDataEntryValue | null) {
  return typeof valor === "string" ? valor : "";
}

export async function login(_state: LoginState, formData: FormData) {
  const identificador = normalizarIdentificador(formData.get("usuario"));
  const senha = normalizarSenha(formData.get("senha"));

  if (!identificador || !senha) {
    return {
      erro: "Informe usuário e senha para acessar.",
    };
  }

  // O login principal passa a ser pelo nome do usuário, sem diferenciar
  // maiúsculas e minúsculas. O e-mail continua aceito como fallback de
  // segurança, preservando os acessos existentes sem alterar o banco.
  const usuariosEncontrados = await prisma.usuario.findMany({
    where: {
      OR: [
        { nome: { equals: identificador, mode: "insensitive" } },
        { email: identificador.toLowerCase() },
      ],
    },
    include: {
      perfil: {
        include: {
          permissoes: {
            include: {
              permissao: true,
            },
          },
        },
      },
    },
    take: 2,
  });

  if (usuariosEncontrados.length > 1) {
    return {
      erro: "Existe mais de um usuário com esse nome. Procure o administrador para ajustar os cadastros.",
    };
  }

  const user = usuariosEncontrados[0];

  if (!user || user.status !== "Ativo") {
    return {
      erro: "Usuário não encontrado ou inativo.",
    };
  }

  const senhaValida = await bcrypt.compare(senha, user.senha);

  if (!senhaValida) {
    return {
      erro: "Usuário ou senha inválidos.",
    };
  }

  const token = await createSessionToken({
    uid: user.id,
    email: user.email,
    nome: user.nome,
    tipo: user.tipo,
  });

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
    data: {
      ultimoAcesso: new Date(),
    },
  });

  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent");
  const isMobile = isMobileUserAgent(userAgent);
  const isProfessional = user.cargo?.trim().toLowerCase() === "profissional";

  if (isMobile && isProfessional) {
    redirect("/agenda");
  }

  redirect(getDefaultPathForUser(user));
}

export async function logout() {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    expires: new Date(0),
  });

  redirect("/login");
}