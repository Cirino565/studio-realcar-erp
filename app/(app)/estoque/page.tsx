import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EstoqueClient from "./components/EstoqueClient";

export default async function EstoquePage() {
  await requirePagePermission("estoque.visualizar");
  const [produtos, fornecedores, movimentacoes] = await Promise.all([
    prisma.produto.findMany({ include: { fornecedor: true }, orderBy: { nome: "asc" } }),
    prisma.fornecedor.findMany({ orderBy: { nome: "asc" } }),
    prisma.movimentacaoEstoque.findMany({ include: { produto: true }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return <EstoqueClient produtos={produtos} fornecedores={fornecedores} movimentacoes={movimentacoes} />;
}
