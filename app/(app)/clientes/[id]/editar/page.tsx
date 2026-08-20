import Link from "next/link";
import { redirect } from "next/navigation";

import { atualizarCliente } from "@/actions/cliente.actions";
import ClienteServerForm from "@/components/clientes/ClienteServerForm";
import { Button } from "@/components/ui/button";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type EditarClientePageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function EditarClientePage({ params }: EditarClientePageProps) {
  await requirePagePermission("clientes.gerenciar");

  const { id } = await params;
  const clienteId = Number(id);

  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    return <h1>Cliente inválido</h1>;
  }

  const [cliente, origens, procedimentosInteresse, campanhas] = await Promise.all([
    prisma.cliente.findUnique({ where: { id: clienteId } }),
    prisma.origemCliente.findMany({
      where: { status: "Ativa" },
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    }),
    prisma.procedimentoInteresse.findMany({
      where: { status: "Ativo" },
      orderBy: [{ nome: "asc" }, { id: "asc" }],
    }),
    prisma.campanhaMarketing.findMany({
      orderBy: [{ status: "asc" }, { inicio: "desc" }, { nome: "asc" }],
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
      cep: (formData.get("cep") as string) || "",
      logradouro: (formData.get("logradouro") as string) || "",
      numero: (formData.get("numero") as string) || "",
      complemento: (formData.get("complemento") as string) || "",
      bairro: (formData.get("bairro") as string) || "",
      cidade: (formData.get("cidade") as string) || "",
      estado: (formData.get("estado") as string) || "",
      enderecoOriginal: (formData.get("enderecoOriginal") as string) || "",
      origem: (formData.get("origem") as string) || "",
      procedimentoInteresse:
        (formData.get("procedimentoInteresse") as string) || "",
      nascimento: (formData.get("nascimento") as string) || "",
      responsavelNome: (formData.get("responsavelNome") as string) || "",
      responsavelTelefone: (formData.get("responsavelTelefone") as string) || "",
      responsavelParentesco: (formData.get("responsavelParentesco") as string) || "",
      contatoConfiancaNome:
        (formData.get("contatoConfiancaNome") as string) || "",
      contatoConfiancaTelefone:
        (formData.get("contatoConfiancaTelefone") as string) || "",
      contatoConfiancaVinculo:
        (formData.get("contatoConfiancaVinculo") as string) || "",
      contatoConfiancaAutorizado:
        formData.get("contatoConfiancaAutorizado") === "on",
      observacoes: (formData.get("observacoes") as string) || "",
      areaEstetica: formData.get("areaEstetica") === "on",
      areaCilios: formData.get("areaCilios") === "on",
      campanhaAquisicaoId:
        Number((formData.get("campanhaAquisicaoId") as string) || 0) || null,
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
      campanhas={campanhas}
      action={salvarEdicaoCliente}
    />
  );
}