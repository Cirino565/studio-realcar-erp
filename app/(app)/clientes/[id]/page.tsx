import { prisma } from "@/lib/prisma";
import ClienteClinicoTabs from "@/app/(app)/clientes/components/ClienteClinicoTabs";

export default async function ClientePage({ params }: any) {
  const clienteId = Number(params?.id);

  // 🔒 validação de segurança
  if (!params?.id || isNaN(clienteId)) {
    return (
      <div className="p-6 text-white">
        <h1>Cliente inválido</h1>
      </div>
    );
  }

  // 🔎 busca completa do cliente com módulos clínicos
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      agendamentos: true,
      anamnese: true,
      fotos: true,
      historico: true,
      observacoesClinicas: true,
    },
  });

  // ❌ cliente não encontrado
  if (!cliente) {
    return (
      <div className="p-6 text-white">
        <h1>Cliente não encontrado</h1>
      </div>
    );
  }

  // 🚀 SISTEMA CLÍNICO COMPLETO
  return <ClienteClinicoTabs data={cliente} />;
}