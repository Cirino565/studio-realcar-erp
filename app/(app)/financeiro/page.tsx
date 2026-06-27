import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import FinanceiroClient from "./components/FinanceiroClient";

export default async function FinanceiroPage() {
  await requirePagePermission("financeiro.visualizar");
  const lancamentos = await prisma.lancamento.findMany({
    orderBy: [
      {
        data: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return <FinanceiroClient lancamentos={lancamentos} />;
}
