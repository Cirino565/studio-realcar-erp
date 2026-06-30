import { prisma } from "@/lib/prisma";

export default async function ClientePage({ params }: any) {
  const rawId = params?.id;

  // 🔒 proteção contra undefined
  if (!rawId) {
    return <h1>Cliente inválido</h1>;
  }

  const id = Number(rawId);

  if (isNaN(id)) {
    return <h1>Cliente inválido</h1>;
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id },
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