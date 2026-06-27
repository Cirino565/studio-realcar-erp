import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AuditoriaClient from "./components/AuditoriaClient";
import type { AuditoriaLog, AuditoriaResumo } from "./types";

function getInicioHoje() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
}

export default async function AuditoriaPage() {
  await requirePagePermission("auditoria.visualizar");

  const logs = await prisma.auditoria.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const inicioHoje = getInicioHoje();
  const modulos = new Set(logs.map((log) => log.modulo).filter(Boolean));
  const usuarios = new Set(logs.map((log) => log.usuario).filter(Boolean));
  const criticos = logs.filter((log) => {
    const texto = `${log.acao} ${log.detalhes ?? ""}`.toLowerCase();
    return texto.includes("excluiu") || texto.includes("delete") || texto.includes("limpou") || texto.includes("backup");
  }).length;

  const resumo: AuditoriaResumo = {
    total: logs.length,
    hoje: logs.filter((log) => log.createdAt >= inicioHoje).length,
    modulos: modulos.size,
    usuarios: usuarios.size,
    criticos,
  };

  return <AuditoriaClient logs={logs as AuditoriaLog[]} resumo={resumo} />;
}
