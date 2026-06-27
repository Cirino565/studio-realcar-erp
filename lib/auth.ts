import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export const PAGE_PERMISSION_PRIORITY = [
  { href: "/", permissao: "dashboard.visualizar" },
  { href: "/agenda", permissao: "agenda.visualizar" },
  { href: "/clientes", permissao: "clientes.visualizar" },
  { href: "/financeiro", permissao: "financeiro.visualizar" },
  { href: "/estoque", permissao: "estoque.visualizar" },
  { href: "/relatorios", permissao: "relatorios.visualizar" },
  { href: "/marketing", permissao: "marketing.visualizar" },
  { href: "/usuarios", permissao: "usuarios.gerenciar" },
  { href: "/permissoes", permissao: "permissoes.gerenciar" },
  { href: "/auditoria", permissao: "auditoria.visualizar" },
  { href: "/backup", permissao: "backup.gerenciar" },
  { href: "/automacoes", permissao: "automacoes.gerenciar" },
  { href: "/configuracoes", permissao: "configuracoes.gerenciar" },
];

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.uid },
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

  if (!usuario || usuario.status !== "Ativo") return null;

  return usuario;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function isAdminUser(usuario: CurrentUser) {
  return usuario.tipo?.toLowerCase() === "admin" || (usuario.perfil?.nivel ?? 0) >= 5;
}

export function canAccess(usuario: CurrentUser, permissaoChave: string) {
  if (isAdminUser(usuario)) return true;

  return Boolean(
    usuario.perfil?.permissoes.some((perfilPermissao) => perfilPermissao.permissao.chave === permissaoChave),
  );
}

export function getUserPermissionKeys(usuario: CurrentUser) {
  if (isAdminUser(usuario)) {
    return PAGE_PERMISSION_PRIORITY.map((item) => item.permissao);
  }

  return usuario.perfil?.permissoes.map((perfilPermissao) => perfilPermissao.permissao.chave) ?? [];
}

export function getDefaultPathForUser(usuario: CurrentUser) {
  const primeiraPaginaPermitida = PAGE_PERMISSION_PRIORITY.find((item) => canAccess(usuario, item.permissao));
  return primeiraPaginaPermitida?.href ?? "/login";
}

export async function requireCurrentUser() {
  const usuario = await getCurrentUser();

  if (!usuario) {
    redirect("/login");
  }

  return usuario;
}

export async function requirePermission(permissaoChave: string) {
  const usuario = await requireCurrentUser();

  if (!canAccess(usuario, permissaoChave)) {
    throw new Error("Acesso negado para esta operação.");
  }

  return usuario;
}

export async function requirePagePermission(permissaoChave: string) {
  const usuario = await requireCurrentUser();

  if (!canAccess(usuario, permissaoChave)) {
    const destino = getDefaultPathForUser(usuario);

    if (destino !== "/login") {
      redirect(destino);
    }

    throw new Error("Acesso negado para esta página.");
  }

  return usuario;
}
