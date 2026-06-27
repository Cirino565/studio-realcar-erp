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
      className={`group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition-all duration-200 ${
        ativo
          ? "bg-white/[0.12] text-white shadow-[0_18px_40px_rgba(15,23,42,0.42)] ring-1 ring-white/10"
          : "text-slate-400 hover:bg-white/[0.07] hover:text-slate-100"
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
          ativo
            ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-950/40"
            : "bg-white/[0.07] text-slate-400 group-hover:bg-white/[0.07] group-hover:text-white"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{item.nome}</span>
      <ChevronRight
        className={`h-4 w-4 transition-all ${
          ativo ? "text-violet-200 opacity-100" : "text-slate-400 opacity-0 group-hover:opacity-100"
        }`}
      />
    </Link>
  );
}

function MenuSection({ titulo, items, pathname }: { titulo: string; items: MenuItem[]; pathname: string }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">{titulo}</p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <SidebarLink key={item.href} item={item} ativo={isActive(pathname, item.href)} />
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({ permissoes, isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const menusPrincipaisVisiveis = mainMenus.filter((item) => podeVerMenu(item, permissoes, isAdmin));
  const menusAdminVisiveis = adminMenus.filter((item) => podeVerMenu(item, permissoes, isAdmin));
  const menusMobileVisiveis = mobilePreferredMenus.filter((item) => podeVerMenu(item, permissoes, isAdmin)).slice(0, 5);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/[0.12] bg-[#151a2a]/88 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:flex lg:flex-col">
        <div className="border-b border-white/[0.12] px-5 py-5">
          <Link href={menusPrincipaisVisiveis[0]?.href ?? "/agenda"} className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-400 shadow-lg shadow-fuchsia-950/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-white">Studio Realçar</h1>
              <p className="text-xs font-medium text-slate-400">ERP Premium</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-6 scrollbar-premium">
          <MenuSection titulo="Operação" items={menusPrincipaisVisiveis} pathname={pathname} />
          <MenuSection titulo="Administração" items={menusAdminVisiveis} pathname={pathname} />
        </nav>

        <div className="border-t border-white/[0.12] p-4">
          <div className="rounded-3xl border border-white/[0.12] bg-white/[0.07] p-4 shadow-inner shadow-white/[0.03]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Versão Comercial</p>
                <p className="mt-1 text-xs text-slate-400">Alpha 2.2 · Permissões por perfil</p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[0.68rem] font-semibold text-emerald-300">
                Online
              </span>
            </div>
          </div>
        </div>
      </aside>

      {menusMobileVisiveis.length > 0 && (
        <nav className="fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-white/[0.10] bg-[#151a2a]/92 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl lg:hidden" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${menusMobileVisiveis.length}, minmax(0, 1fr))` }}>
            {menusMobileVisiveis.map((item) => {
              const Icon = item.icon;
              const ativo = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[0.68rem] font-medium transition-all ${
                    ativo ? "bg-white/[0.12] text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${ativo ? "text-violet-300" : ""}`} />
                  <span className="max-w-full truncate">{item.nome}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
