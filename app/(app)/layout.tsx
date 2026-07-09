import {
  getUserPermissionKeys,
  isAdminUser,
  requireCurrentUser,
} from "@/lib/auth";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await requireCurrentUser();
  const permissoes = getUserPermissionKeys(usuario);

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-[#111827] text-slate-100">
      <div className="flex min-h-[100dvh] w-full overflow-x-hidden">
        <Sidebar permissoes={permissoes} isAdmin={isAdminUser(usuario)} />

        <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
          <Header />

          <main className="min-w-0 flex-1 overflow-x-hidden px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+76px)] sm:px-4 sm:py-4 sm:pb-6 lg:px-6 lg:py-6 lg:pb-6">
            <div className="mx-auto w-full max-w-full min-w-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}