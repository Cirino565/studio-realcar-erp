import { canAccess, requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EstoqueClient from "./components/EstoqueClient";

export default async function EstoquePage() {
  const usuario = await requirePagePermission("estoque.visualizar");
  const [produtos, fornecedores, movimentacoes, kits] = await Promise.all([
    prisma.produto.findMany({ include: { fornecedor: true }, orderBy: { nome: "asc" } }),
    prisma.fornecedor.findMany({ orderBy: { nome: "asc" } }),
    prisma.movimentacaoEstoque.findMany({ include: { produto: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.kitProduto.findMany({
      orderBy: [{ status: "asc" }, { nome: "asc" }],
      include: {
        itens: {
          orderBy: [{ ordem: "asc" }, { id: "asc" }],
          include: {
            produto: {
              select: {
                id: true,
                nome: true,
                categoria: true,
                unidade: true,
                quantidade: true,
                valorCompra: true,
                valorVenda: true,
                status: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return (
    <EstoqueClient
      produtos={produtos}
      fornecedores={fornecedores}
      movimentacoes={movimentacoes}
      kits={kits}
      podeGerenciar={canAccess(usuario, "estoque.gerenciar")}
    />
  );
}
