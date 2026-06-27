import { prisma } from "@/lib/prisma";

export default async function ClientePage({ params }: any) {
  const cliente = await prisma.cliente.findUnique({
    where: { id: Number(params.id) },
    include: {
      agendamentos: true,
    },
  });

  if (!cliente) return null;

  const agendamentos = cliente.agendamentos;

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

      <p>
        Último:{" "}
        {ultimoAgendamento
          ? new Date(ultimoAgendamento.data).toLocaleString()
          : "Nenhum"}
      </p>
    </div>
  );
}