import Link from "next/link";
import { redirect } from "next/navigation";

import { atualizarCliente } from "@/actions/cliente.actions";
import ClienteServerForm from "@/components/clientes/ClienteServerForm";
import { Button } from "@/components/ui/button";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  params: { id: string };
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export default async function EditarClientePage({ params }: Props) {
  await requirePagePermission("clientes.gerenciar");

  const clienteId = Number(params.id);

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
      <div className="premium-card p-10 text-center text-white">
        <h1 className="text-xl font-semibold">Cliente não encontrado</h1>
        <p className="mt-2 text-sm text-slate-400">
          O cadastro solicitado não existe ou foi removido.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/clientes">Voltar para clientes</Link>
        </Button>
      </div>
    );
  }

  async function salvarEdicaoCliente(formData: FormData) {
    "use server";

    await atualizarCliente({
      id: clienteId,
      nome: getString(formData, "nome"),
      telefone: getString(formData, "telefone") || getString(formData, "whatsapp"),
      whatsapp: getString(formData, "whatsapp") || getString(formData, "telefone"),
      cpf: getString(formData, "cpf"),
      instagram: getString(formData, "instagram"),
      origem: getString(formData, "origem"),
      procedimentoInteresse: getString(formData, "procedimentoInteresse"),
      nascimento: getString(formData, "nascimento"),
      observacoes: getString(formData, "observacoes"),
    });

    redirect(`/clientes/${clienteId}`);
  }

  return (
    <ClienteServerForm
      titulo="Editar cliente"
      descricao="Atualize cadastro, contato, origem e observações do cliente."
      cliente={cliente}
      origens={origens}
      procedimentosInteresse={procedimentosInteresse}
      action={salvarEdicaoCliente}
    />
  );
}