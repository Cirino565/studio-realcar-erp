import Link from "next/link";
import { redirect } from "next/navigation";

import { atualizarCliente } from "@/actions/cliente.actions";
import ClienteServerForm from "@/components/clientes/ClienteServerForm";
import { Button } from "@/components/ui/button";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EditarClientePage({ params }: any) {
  await requirePagePermission("clientes.gerenciar");

  const clienteId = Number(params?.id);

  if (isNaN(clienteId)) {
    return <h1>Cliente inválido</h1>;
  }

  const [cliente, origens, procedimentosInteresse] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: clienteId } }),
    prisma.origemCliente.findMany({
      where: { status: "Ativa" },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
    prisma.procedimentoInteresse.findMany({
      where: { status: "Ativo" },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
  ]);

  if (!cliente) {
    return (
      <div>
        <h1>Cliente não encontrado</h1>
        <Button asChild>
          <Link href="/clientes">Voltar</Link>
        </Button>
      </div>
    );
  }

  async function salvarEdicaoCliente(formData: FormData) {
    "use server";

    await atualizarCliente({
      id: clienteId,
      nome: formData.get("nome") as string,
      telefone: (formData.get("telefone") as string) || "",
      whatsapp: (formData.get("whatsapp") as string) || "",
      cpf: (formData.get("cpf") as string) || "",
      instagram: (formData.get("instagram") as string) || "",
      origem: (formData.get("origem") as string) || "",
      procedimentoInteresse:
        (formData.get("procedimentoInteresse") as string) || "",
      nascimento: (formData.get("nascimento") as string) || "",
      observacoes: (formData.get("observacoes") as string) || "",
    });

    redirect(`/clientes/${clienteId}`);
  }

  return (
    <ClienteServerForm
      titulo="Editar cliente"
      descricao="Atualize os dados do cliente"
      cliente={cliente}
      origens={origens}
      procedimentosInteresse={procedimentosInteresse}
      action={salvarEdicaoCliente}
    />
  );
}