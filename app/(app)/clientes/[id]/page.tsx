import { prisma } from "@/lib/prisma";

export default async function ClientePage({ params }: any) {
  const id = Number(params?.id);

  if (!params?.id || isNaN(id)) {
    return (
      <div className="p-6 text-white">
        <h1>Cliente inválido</h1>
      </div>
    );
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      agendamentos: true,
    },
  });

  if (!cliente) {
    return (
      <div className="p-6 text-white">
        <h1>Cliente não encontrado</h1>
      </div>
    );
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-xl font-bold">{cliente.nome}</h1>
      <p>{cliente.telefone}</p>
    </div>
  );
}