import { prisma } from "@/lib/prisma";

export default async function ClientePage({ params }: any) {
  // 🔍 DEBUG IMPORTANTE (vai aparecer nos logs do Railway)
  console.log("PARAMS RECEBIDOS:", params);

  const rawId = params?.id;

  // 🔒 proteção 1
  if (!rawId) {
    console.log("ID NÃO ENCONTRADO NO PARAMS");
    return <h1>Cliente inválido</h1>;
  }

  const id = Number(rawId);

  // 🔒 proteção 2
  if (isNaN(id)) {
    console.log("ID INVÁLIDO:", rawId);
    return <h1>Cliente inválido</h1>;
  }

  // 🔎 busca cliente
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      agendamentos: true,
    },
  });

  // ❌ não encontrado
  if (!cliente) {
    console.log("CLIENTE NÃO ENCONTRADO ID:", id);
    return <h1>Cliente não encontrado</h1>;
  }

  return (
    <div>
      <h1>{cliente.nome}</h1>
      <p>{cliente.telefone}</p>
    </div>
  );
}