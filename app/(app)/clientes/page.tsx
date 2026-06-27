import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ClientesClient from "./components/ClientesClient";

export default async function ClientesPage() {
  await requirePagePermission("clientes.visualizar");
  const [clientes, origens, procedimentosInteresse] = await Promise.all([
    prisma.cliente.findMany({
      orderBy: {
        nome: "asc",
      },
      include: {
        agendamentos: {
          orderBy: { data: "desc" },
          select: {
            id: true,
            procedimento: true,
            data: true,
            status: true,
          },
        },
      },
    }),
    prisma.origemCliente.findMany({
      where: { status: "Ativa" },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
    prisma.procedimentoInteresse.findMany({
      where: { status: "Ativo" },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
  ]);

  return (
    <ClientesClient
      clientes={clientes}
      origens={origens}
      procedimentosInteresse={procedimentosInteresse}
    />
  );
}
