import { canAccess, requirePagePermission } from "@/lib/auth";
import { carregarReativacao, lerFiltros } from "@/lib/reativacao-perdidos-dados";

import ReativacaoClient from "./components/ReativacaoClient";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<Record<string, string | undefined>> | Record<string, string | undefined>;
};

export default async function ReativacaoPage({ searchParams }: Props) {
  const usuario = await requirePagePermission("marketing.visualizar");
  const params = (await searchParams) ?? {};
  const dados = await carregarReativacao(lerFiltros(params));

  return <ReativacaoClient dados={dados} podeGerenciar={canAccess(usuario, "marketing.gerenciar")} />;
}
