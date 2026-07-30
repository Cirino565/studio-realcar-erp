import { canAccess, isAdminUser, requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import VendasClient from "./components/VendasClient";

export default async function VendasPage() {
  const usuario = await requirePagePermission("financeiro.visualizar");

  const [clientes, produtos, kits, vendas] = await Promise.all([
    prisma.cliente.findMany({
      where: { status: { not: "Inativa" } },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        telefone: true,
        whatsapp: true,
      },
    }),
    prisma.produto.findMany({
      where: { status: "Ativo" },
      orderBy: { nome: "asc" },
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
    }),
    prisma.kitProduto.findMany({
      where: { status: "Ativo" },
      orderBy: { nome: "asc" },
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
    prisma.venda.findMany({
      orderBy: [{ data: "desc" }, { id: "desc" }],
      take: 60,
      include: {
        cliente: { select: { id: true, nome: true } },
        itens: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            tipo: true,
            descricao: true,
            quantidade: true,
            valorUnitario: true,
            custoUnitario: true,
            valorTotal: true,
            custoTotal: true,
            grupoKitId: true,
            kitNomeHistorico: true,
            kitTipoHistorico: true,
            acrescimoUnitario: true,
          },
        },
      },
    }),
  ]);

  return (
    <VendasClient
      clientes={clientes}
      produtos={produtos}
      kits={kits}
      vendas={vendas.map((venda) => ({
        ...venda,
        data: venda.data.toISOString(),
      }))}
      podeGerenciar={canAccess(usuario, "financeiro.gerenciar")}
      podeAutorizarEstoqueNegativo={isAdminUser(usuario)}
    />
  );
}
