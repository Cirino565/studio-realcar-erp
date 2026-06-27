import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MarketingClient from "./components/MarketingClient";

export default async function MarketingPage() {
  await requirePagePermission("marketing.visualizar");
  const [leads, campanhas] = await Promise.all([
    prisma.lead.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.campanhaMarketing.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return <MarketingClient leads={leads} campanhas={campanhas} />;
}
