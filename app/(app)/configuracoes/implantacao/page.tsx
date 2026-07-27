import Link from "next/link";

import { obterResumoImplantacao } from "@/actions/implantacao.actions";
import { isAdminUser, requirePagePermission } from "@/lib/auth";
import ImplantacaoClient from "./ImplantacaoClient";

export default async function ImplantacaoPage() {
  const usuario = await requirePagePermission("configuracoes.gerenciar");

  if (!isAdminUser(usuario)) {
    return (
      <section className="mx-auto max-w-3xl p-6">
        <div className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900/50 dark:bg-slate-950">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Acesso restrito</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Somente um administrador pode executar a preparação inicial do sistema.
          </p>
          <Link href="/configuracoes" className="mt-5 inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
            Voltar para configurações
          </Link>
        </div>
      </section>
    );
  }

  const resumo = await obterResumoImplantacao();

  return <ImplantacaoClient resumoInicial={resumo} />;
}
