import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PermissoesClient } from "./components/PermissoesClient";
import type { PerfilComPermissoes, PermissaoResumo } from "./types";

export default async function PermissoesPage() {
  await requirePagePermission("permissoes.gerenciar");

  const [perfis, permissoes] = await Promise.all([
    prisma.perfil.findMany({
      include: {
        usuarios: { select: { id: true, nome: true, email: true, status: true }, orderBy: { nome: "asc" } },
        permissoes: {
          include: { permissao: true },
          orderBy: { permissaoId: "asc" },
        },
      },
      orderBy: [{ status: "asc" }, { nivel: "desc" }, { nome: "asc" }],
    }),
    prisma.permissao.findMany({ orderBy: [{ modulo: "asc" }, { nome: "asc" }] }),
  ]);

  const permissoesSerializadas: PermissaoResumo[] = permissoes.map((permissao) => ({
    id: permissao.id,
    chave: permissao.chave,
    nome: permissao.nome,
    modulo: permissao.modulo,
  }));

  const perfisSerializados: PerfilComPermissoes[] = perfis.map((perfil) => ({
    id: perfil.id,
    nome: perfil.nome,
    descricao: perfil.descricao,
    nivel: perfil.nivel,
    status: perfil.status,
    usuarios: perfil.usuarios,
    permissoes: perfil.permissoes.map((item) => ({
      permissaoId: item.permissaoId,
      permissao: {
        id: item.permissao.id,
        chave: item.permissao.chave,
        nome: item.permissao.nome,
        modulo: item.permissao.modulo,
      },
    })),
  }));

  return <PermissoesClient perfis={perfisSerializados} permissoes={permissoesSerializadas} />;
}
