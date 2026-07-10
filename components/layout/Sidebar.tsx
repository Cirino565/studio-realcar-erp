"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Archive,
  Bot,
  Calendar,
  ChevronRight,
  FileBarChart2,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

const mainMenus = [
  { nome: "Dashboard", icon: LayoutDashboard, href: "/", permissao: "dashboard.visualizar" },
  { nome: "Clientes", icon: Users, href: "/clientes", permissao: "clientes.visualizar" },
  { nome: "Agenda", icon: Calendar, href: "/agenda", permissao: "agenda.visualizar" },
  { nome: "Financeiro", icon: Wallet, href: "/financeiro", permissao: "financeiro.visualizar" },
  { nome: "Estoque", icon: Package, href: "/estoque", permissao: "estoque.visualizar" },
  { nome: "Relatórios", icon: FileBarChart2, href: "/relatorios", permissao: "relatorios.visualizar" },
  { nome: "Marketing", icon: Megaphone, href: "/marketing", permissao: "marketing.visualizar" },
];

const adminMenus = [
  { nome: "Usuários", icon: ShieldCheck, href: "/usuarios", permissao: "usuarios.gerenciar" },
  { nome: "Permissões", icon: KeyRound, href: "/permissoes", permissao: "permissoes.gerenciar" },
  { nome: "Auditoria", icon: Activity, href: "/auditoria", permissao: "auditoria.visualizar" },
  { nome: "Backup", icon: Archive, href: "/backup", permissao: "backup.gerenciar" },
  { nome: "Automações", icon: Bot, href: "/automacoes", permissao: "automacoes.gerenciar" },
  { nome: "Configurações", icon: Settings, href: "/configuracoes", permissao: "configuracoes.gerenciar" },
];

const mobilePreferredMenus = [
  mainMenus[0],
  mainMenus[1],
  mainMenus[2],
  mainMenus[3],
  adminMenus[5],
];

type MenuItem = {
  nome: string;
  href: string;
  permissao: string;
  icon: React.ComponentType<{ className?: string }>;
};

type SidebarProps = {
  permissoes: string[];
  isAdmin?: boolean;
};

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

function podeVerMenu(item: MenuItem, permissoes: string[], isAdmin?: boolean) {
  return Boolean(isAdmin) || permissoes.includes(item.permissao);
}

function SidebarLink({ item, ativo }: { item: MenuItem; ativo: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200 ${
        ativo
          ? "bg-violet-50 text-violet-800 shadow-sm ring-1 ring-violet-100"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <span
        className={`flex size-9 items-center justify-center rounded-xl transition-all ${
          ativo
            ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
            : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-violet-700 group-hover:shadow-sm"
        }`}
      >
        <Icon className="size-4" />
      </span>

      <span className="min-w-0 flex-1 truncate font-semibold">{item.nome}</span>

      <ChevronRight
        className={`size-4 transition-all ${
          ativo
            ? "text-violet-500 opacity-100"
            : "text-slate-300 opacity-0 group-hover:opacity-100"
        }`}
      />
    </Link>
  );
}

function MenuSection({
  titulo,
  items,
  pathname,
}: {
  titulo: string;
  items: MenuItem[];
  pathname: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="px-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-400">
        {titulo}
      </p>

      <div className="space-y-1">
        {items.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            ativo={isActive(pathname, item.href)}
          />
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({ permissoes, isAdmin = false }: SidebarProps) {
  const pathname = usePathname();

  const menusPrincipaisVisiveis = mainMenus.filter((item) =>
    podeVerMenu(item, permissoes, isAdmin),
  );

  const menusAdminVisiveis = adminMenus.filter((item) =>
    podeVerMenu(item, permissoes, isAdmin),
  );

  const menusMobileVisiveis = mobilePreferredMenus
    .filter((item) => podeVerMenu(item, permissoes, isAdmin))
    .slice(0, 5);

  return (
    <>
      <aside className="app-sidebar fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r shadow-xl lg:flex">
        <div className="border-b border-slate-200 px-5 py-5">
          <Link
            href={menusPrincipaisVisiveis[0]?.href ?? "/agenda"}
            className="flex items-center gap-3"
          >
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 text-white shadow-lg shadow-violet-600/20">
              <Sparkles className="size-5" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-950">
                Studio Realçar
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Gestão clínica
              </p>
            </div>
          </Link>
        </div>

        <nav className="scrollbar-premium flex-1 space-y-6 overflow-y-auto px-4 py-5">
          <MenuSection
            titulo="Operação"
            items={menusPrincipaisVisiveis}
            pathname={pathname}
          />

          <MenuSection
            titulo="Administração"
            items={menusAdminVisiveis}
            pathname={pathname}
          />
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  Sistema operacional
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  Permissões por perfil
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.65rem] font-bold text-emerald-700">
                Online
              </span>
            </div>
          </div>
        </div>
      </aside>

      {menusMobileVisiveis.length > 0 ? (
        <nav
          className="app-bottom-nav fixed inset-x-2 bottom-2 z-40 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-xl lg:hidden"
          style={{
            paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))",
          }}
        >
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${menusMobileVisiveis.length}, minmax(0, 1fr))`,
            }}
          >
            {menusMobileVisiveis.map((item) => {
              const Icon = item.icon;
              const ativo = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[0.63rem] font-semibold transition-all ${
                    ativo
                      ? "bg-violet-50 text-violet-800"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`size-4 ${
                      ativo ? "text-violet-600" : "text-slate-400"
                    }`}
                  />
                  <span className="max-w-full truncate">{item.nome}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </>
  );
}
