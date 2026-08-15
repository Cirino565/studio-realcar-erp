import { redirect } from "next/navigation";

import { criarCliente } from "@/actions/cliente.actions";
import ClientePageScrollLock from "@/components/clientes/ClientePageScrollLock";
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
    cep: getString(formData, "cep"),
    logradouro: getString(formData, "logradouro"),
    numero: getString(formData, "numero"),
    complemento: getString(formData, "complemento"),
    bairro: getString(formData, "bairro"),
    cidade: getString(formData, "cidade"),
    estado: getString(formData, "estado"),
    enderecoOriginal: getString(formData, "enderecoOriginal"),
    origem: getString(formData, "origem"),
    procedimentoInteresse: getString(formData, "procedimentoInteresse"),
    nascimento: getString(formData, "nascimento"),
    responsavelNome: getString(formData, "responsavelNome"),
    responsavelTelefone: getString(formData, "responsavelTelefone"),
    responsavelParentesco: getString(formData, "responsavelParentesco"),
    observacoes: getString(formData, "observacoes"),
    areaEstetica: formData.get("areaEstetica") === "on",
    areaCilios: formData.get("areaCilios") === "on",
    campanhaAquisicaoId: Number(getString(formData, "campanhaAquisicaoId")) || null,
  });

  redirect("/clientes");
}

export default async function NovoClientePage() {
  await requirePagePermission("clientes.gerenciar");

  const [origens, procedimentosInteresse, campanhas] = await Promise.all([
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

  return (
    <>
      <ClientePageScrollLock />

      <div className="w-full min-w-0 max-w-full overflow-x-hidden [touch-action:pan-y]">
        <ClienteServerForm
          titulo="Novo cliente"
          descricao="Cadastro direto por página, compatível com celular e sem depender de modal."
          origens={origens}
          procedimentosInteresse={procedimentosInteresse}
          campanhas={campanhas}
          action={salvarNovoCliente}
        />
      </div>
    </>
  );
}