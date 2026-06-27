import { getUserPermissionKeys, isAdminUser, requireCurrentUser } from "@/lib/auth";
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
    <div className="min-h-screen w-full overflow-x-hidden bg-[#111827] text-slate-100">
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <Sidebar permissoes={permissoes} isAdmin={isAdminUser(usuario)} />
        <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
          <Header />
          <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-4 pb-32 sm:p-6 sm:pb-32 lg:pb-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
