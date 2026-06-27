import { redirect } from "next/navigation";

import { criarCliente } from "@/actions/cliente.actions";
import ClienteServerForm from "@/components/clientes/ClienteServerForm";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function salvarNovoCliente(formData: FormData) {
  "use server";

  await criarCliente({
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

  redirect("/clientes");
}

export default async function NovoClientePage() {
  await requirePagePermission("clientes.gerenciar");

  const [origens, procedimentosInteresse] = await Promise.all([
    prisma.origemCliente.findMany({ where: { status: "Ativa" }, orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
    prisma.procedimentoInteresse.findMany({ where: { status: "Ativo" }, orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
  ]);

  return (
    <ClienteServerForm
      titulo="Novo cliente"
      descricao="Cadastro direto por página, compatível com celular e sem depender de modal."
      origens={origens}
      procedimentosInteresse={procedimentosInteresse}
      action={salvarNovoCliente}
    />
  );
}
