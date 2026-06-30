import { prisma } from "@/lib/prisma";

export default async function ClientePage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const clienteId = Number(id);

  if (isNaN(clienteId)) {
    return <h1>Cliente inválido</h1>;
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      agendamentos: true,
    },
  });

  if (!cliente) {
    return <h1>Cliente não encontrado</h1>;
  }

  return (
    <div>
      <h1>{cliente.nome}</h1>
      <p>{cliente.telefone}</p>
    </div>
  );
}