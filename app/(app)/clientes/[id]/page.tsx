import { prisma } from "@/lib/prisma";

export default async function ClientePage({ params }: any) {
  const id = Number(params?.id);

  // 🔒 proteção contra erro (NaN / undefined)
  if (!params?.id || isNaN(id)) {
    return (
      <div>
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
      <div>
        <h1>Cliente não encontrado</h1>
      </div>
    );
  }

  const agendamentos = cliente.agendamentos || [];

  const proximoAgendamento = agendamentos.find(
    (agendamento: { data: Date }) =>
      new Date(agendamento.data) >= new Date()
  );

  const ultimoAgendamento = agendamentos[0] ?? null;

  return (
    <div>
      <h1>{cliente.nome}</h1>

      <p>Telefone: {cliente.telefone}</p>

      <p>
        Próximo:{" "}
        {proximoAgendamento
          ? new Date(proximoAgendamento.data).toLocaleString()
          : "Nenhum"}
      </p>
    </div>
  );
}