import { prisma } from "@/lib/prisma";

export default async function ClientePage({ params }: any) {
  // 🔒 proteção contra params undefined
  const rawId = params?.id;

  const id = Number(rawId);

  // 🔥 validação forte (evita Cliente inválido / crash)
  if (!rawId || isNaN(id)) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-xl font-semibold">Cliente inválido</h1>
        <p className="text-sm text-gray-400 mt-2">
          ID não encontrado ou inválido na URL.
        </p>
      </div>
    );
  }

  // 🔎 busca cliente no banco
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      agendamentos: true,
    },
  });

  // ❌ cliente não existe
  if (!cliente) {
    return (
      <div className="p-6 text-white">
        <h1 className="text-xl font-semibold">Cliente não encontrado</h1>
        <p className="text-sm text-gray-400 mt-2">
          Este cliente pode ter sido removido.
        </p>
      </div>
    );
  }

  const agendamentos = cliente.agendamentos ?? [];

  const proximoAgendamento = agendamentos.find(
    (a: any) => new Date(a.data) >= new Date()
  );

  const ultimoAgendamento = agendamentos[0] ?? null;

  return (
    <div className="p-6 text-white space-y-4">
      <h1 className="text-2xl font-bold">{cliente.nome}</h1>

      <p className="text-gray-300">
        Telefone: {cliente.telefone ?? "Sem telefone"}
      </p>

      <div className="mt-4">
        <p className="text-sm text-gray-400">Próximo agendamento:</p>
        <p className="text-white">
          {proximoAgendamento
            ? new Date(proximoAgendamento.data).toLocaleString()
            : "Nenhum"}
        </p>
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-400">Último agendamento:</p>
        <p className="text-white">
          {ultimoAgendamento
            ? new Date(ultimoAgendamento.data).toLocaleString()
            : "Nenhum"}
        </p>
      </div>
    </div>
  );
}