import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsuariosClient } from "./components/UsuariosClient";
import type { PerfilResumo, UsuarioComPerfil } from "./types";

function serializarUsuario(usuario: {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  cargo: string | null;
  tipo: string;
  especialidade: string | null;
  status: string;
  perfilId: number | null;
  perfil: { id: number; nome: string; nivel: number } | null;
  dataAdmissao: Date | null;
  ultimoAcesso: Date | null;
  observacoes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): UsuarioComPerfil {
  return {
    ...usuario,
    dataAdmissao: usuario.dataAdmissao?.toISOString() || null,
    ultimoAcesso: usuario.ultimoAcesso?.toISOString() || null,
    createdAt: usuario.createdAt.toISOString(),
    updatedAt: usuario.updatedAt.toISOString(),
  };
}

export default async function UsuariosPage() {
  await requirePagePermission("usuarios.gerenciar");

  const [usuarios, perfis] = await Promise.all([
    prisma.usuario.findMany({
      include: { perfil: { select: { id: true, nome: true, nivel: true } } },
      orderBy: [{ status: "asc" }, { nome: "asc" }],
    }),
    prisma.perfil.findMany({
      include: { permissoes: { select: { id: true } } },
      orderBy: [{ status: "asc" }, { nome: "asc" }],
    }),
  ]);

  const perfisSerializados: PerfilResumo[] = perfis.map((perfil) => ({
    id: perfil.id,
    nome: perfil.nome,
    descricao: perfil.descricao,
    nivel: perfil.nivel,
    status: perfil.status,
    totalPermissoes: perfil.permissoes.length,
  }));

  return <UsuariosClient usuarios={usuarios.map(serializarUsuario)} perfis={perfisSerializados} />;
}
