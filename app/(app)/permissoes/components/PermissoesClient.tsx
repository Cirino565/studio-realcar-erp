"use client";

import { useMemo, useState, useTransition, type ComponentType, type ReactNode } from "react";
import {
  Check,
  Edit3,
  Layers3,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  atualizarPerfil,
  criarPerfil,
  criarPermissao,
  criarPermissoesPadrao,
  excluirPerfil,
  excluirPermissao,
  salvarPermissoesDoPerfil,
} from "@/actions/permissao.actions";
import type { PerfilComPermissoes, PermissaoResumo } from "../types";

type Props = {
  perfis: PerfilComPermissoes[];
  permissoes: PermissaoResumo[];
};

type PerfilForm = {
  id?: number;
  nome: string;
  descricao: string;
  nivel: string;
  status: string;
};

type PermissaoForm = {
  modulo: string;
  nome: string;
  chave: string;
};

const perfilInicial: PerfilForm = { nome: "", descricao: "", nivel: "1", status: "Ativo" };
const permissaoInicial: PermissaoForm = { modulo: "", nome: "", chave: "" };
const statusOptions = ["Ativo", "Inativo"];

function obterClasseStatus(status: string) {
  if (status === "Ativo") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  return "border-rose-400/30 bg-rose-400/10 text-rose-200";
}

export function PermissoesClient({ perfis, permissoes }: Props) {
  const [buscaPerfil, setBuscaPerfil] = useState("");
  const [buscaPermissao, setBuscaPermissao] = useState("");
  const [perfilSelecionadoId, setPerfilSelecionadoId] = useState(perfis[0]?.id ?? 0);
  const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
  const [modalPermissaoAberto, setModalPermissaoAberto] = useState(false);
  const [perfilForm, setPerfilForm] = useState<PerfilForm>(perfilInicial);
  const [permissaoForm, setPermissaoForm] = useState<PermissaoForm>(permissaoInicial);
  const [isPending, startTransition] = useTransition();

  const perfilSelecionado = perfis.find((perfil) => perfil.id === perfilSelecionadoId) || perfis[0] || null;
  const permissoesSelecionadas = new Set(perfilSelecionado?.permissoes.map((item) => item.permissaoId) || []);

  const modulos = useMemo(() => {
    const grupos = new Map<string, PermissaoResumo[]>();
    permissoes.forEach((permissao) => {
      const lista = grupos.get(permissao.modulo) || [];
      lista.push(permissao);
      grupos.set(permissao.modulo, lista);
    });
    return Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permissoes]);

  const perfisFiltrados = useMemo(() => {
    const termo = buscaPerfil.trim().toLowerCase();
    return perfis.filter((perfil) => {
      if (!termo) return true;
      return perfil.nome.toLowerCase().includes(termo) || (perfil.descricao || "").toLowerCase().includes(termo);
    });
  }, [buscaPerfil, perfis]);

  const permissoesFiltradas = useMemo(() => {
    const termo = buscaPermissao.trim().toLowerCase();
    if (!termo) return modulos;
    return modulos
      .map(([modulo, itens]) => [
        modulo,
        itens.filter(
          (permissao) =>
            permissao.nome.toLowerCase().includes(termo) ||
            permissao.chave.toLowerCase().includes(termo) ||
            permissao.modulo.toLowerCase().includes(termo),
        ),
      ] as [string, PermissaoResumo[]])
      .filter(([, itens]) => itens.length > 0);
  }, [buscaPermissao, modulos]);

  const perfisAtivos = perfis.filter((perfil) => perfil.status === "Ativo").length;
  const usuariosComPerfil = perfis.reduce((total, perfil) => total + perfil.usuarios.length, 0);
  const modulosProtegidos = modulos.length;

  function abrirNovoPerfil() {
    setPerfilForm(perfilInicial);
    setModalPerfilAberto(true);
  }

  function abrirEdicaoPerfil(perfil: PerfilComPermissoes) {
    setPerfilForm({
      id: perfil.id,
      nome: perfil.nome,
      descricao: perfil.descricao || "",
      nivel: String(perfil.nivel),
      status: perfil.status,
    });
    setModalPerfilAberto(true);
  }

  function salvarPerfilAtual() {
    if (!perfilForm.nome.trim()) return;
    startTransition(async () => {
      const dados = {
        nome: perfilForm.nome,
        descricao: perfilForm.descricao,
        nivel: Number(perfilForm.nivel) || 1,
        status: perfilForm.status,
      };
      if (perfilForm.id) {
        await atualizarPerfil({ ...dados, id: perfilForm.id });
      } else {
        await criarPerfil(dados);
      }
      setModalPerfilAberto(false);
      setPerfilForm(perfilInicial);
    });
  }

  function salvarPermissaoAtual() {
    if (!permissaoForm.modulo.trim() || !permissaoForm.nome.trim() || !permissaoForm.chave.trim()) return;
    startTransition(async () => {
      await criarPermissao(permissaoForm);
      setModalPermissaoAberto(false);
      setPermissaoForm(permissaoInicial);
    });
  }

  function removerPerfil(id: number) {
    startTransition(async () => {
      await excluirPerfil(id);
      if (perfilSelecionadoId === id) setPerfilSelecionadoId(0);
    });
  }

  function removerPermissao(id: number) {
    startTransition(async () => {
      await excluirPermissao(id);
    });
  }

  function alternarPermissao(permissaoId: number) {
    if (!perfilSelecionado) return;
    const novaLista = new Set(permissoesSelecionadas);
    if (novaLista.has(permissaoId)) {
      novaLista.delete(permissaoId);
    } else {
      novaLista.add(permissaoId);
    }

    startTransition(async () => {
      await salvarPermissoesDoPerfil(perfilSelecionado.id, Array.from(novaLista));
    });
  }

  function selecionarTodasDoModulo(permissaoIds: number[]) {
    if (!perfilSelecionado) return;
    const novaLista = new Set(permissoesSelecionadas);
    const todasMarcadas = permissaoIds.every((id) => novaLista.has(id));

    permissaoIds.forEach((id) => {
      if (todasMarcadas) novaLista.delete(id);
      else novaLista.add(id);
    });

    startTransition(async () => {
      await salvarPermissoesDoPerfil(perfilSelecionado.id, Array.from(novaLista));
    });
  }

  function sincronizarPadrao() {
    startTransition(async () => {
      await criarPermissoesPadrao();
    });
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-violet-200">
            Controle de acesso
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">Permissões</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Configure perfis operacionais e defina quais áreas cada função pode acessar.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 xl:flex">
          <button onClick={sincronizarPadrao} disabled={isPending} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-violet-300/40 disabled:opacity-60">
            <RefreshCw className="h-4 w-4" />
            Padrão
          </button>
          <button onClick={() => setModalPermissaoAberto(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-violet-300/40">
            <Plus className="h-4 w-4" />
            Permissão
          </button>
          <button onClick={abrirNovoPerfil} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400">
            <Plus className="h-4 w-4" />
            Perfil
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResumoCard titulo="Perfis ativos" valor={perfisAtivos} detalhe={`${perfis.length} cadastrados`} icon={ShieldCheck} />
        <ResumoCard titulo="Permissões" valor={permissoes.length} detalhe="regras de sistema" icon={LockKeyhole} />
        <ResumoCard titulo="Módulos" valor={modulosProtegidos} detalhe="áreas protegidas" icon={Layers3} />
        <ResumoCard titulo="Usuários vinculados" valor={usuariosComPerfil} detalhe="com perfil definido" icon={Users} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <aside className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-4 shadow-2xl shadow-slate-950/30 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Perfis</h2>
              <p className="mt-1 text-xs text-slate-400">Funções de acesso por área.</p>
            </div>
            <Shield className="h-5 w-5 text-violet-200" />
          </div>
          <label className="relative mt-4 block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={buscaPerfil} onChange={(event) => setBuscaPerfil(event.target.value)} placeholder="Buscar perfil" className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/55 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/50" />
          </label>
          <div className="mt-4 space-y-3">
            {perfisFiltrados.map((perfil) => {
              const ativo = perfilSelecionado?.id === perfil.id;
              return (
                <button key={perfil.id} onClick={() => setPerfilSelecionadoId(perfil.id)} className={`w-full rounded-2xl border p-4 text-left transition ${ativo ? "border-violet-300/40 bg-violet-300/10" : "border-white/10 bg-slate-950/35 hover:border-white/20"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{perfil.nome}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">{perfil.descricao || "Sem descrição"}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[0.65rem] font-semibold ${obterClasseStatus(perfil.status)}`}>{perfil.status}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>Nível {perfil.nivel}</span>
                    <span>{perfil.permissoes.length} permissões</span>
                    <span>{perfil.usuarios.length} usuários</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-4 shadow-2xl shadow-slate-950/30 md:p-6">
          {perfilSelecionado ? (
            <>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold text-white">{perfilSelecionado.nome}</h2>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${obterClasseStatus(perfilSelecionado.status)}`}>{perfilSelecionado.status}</span>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm text-slate-400">{perfilSelecionado.descricao || "Perfil sem descrição."}</p>
                  <p className="mt-2 text-xs text-slate-500">Nível de acesso {perfilSelecionado.nivel} · {perfilSelecionado.usuarios.length} usuário(s) vinculado(s)</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => abrirEdicaoPerfil(perfilSelecionado)} className="rounded-2xl border border-white/10 p-3 text-slate-200 transition hover:border-violet-300/40 hover:text-white" aria-label="Editar perfil"><Edit3 className="h-4 w-4" /></button>
                  <button onClick={() => removerPerfil(perfilSelecionado.id)} className="rounded-2xl border border-rose-300/20 p-3 text-rose-300 transition hover:bg-rose-400/10" aria-label="Excluir perfil"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              <label className="relative mt-6 block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={buscaPermissao} onChange={(event) => setBuscaPermissao(event.target.value)} placeholder="Buscar permissão, módulo ou chave técnica" className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/55 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/50" />
              </label>

              <div className="mt-6 space-y-5">
                {permissoesFiltradas.map(([modulo, itens]) => {
                  const ids = itens.map((item) => item.id);
                  const todasMarcadas = ids.length > 0 && ids.every((id) => permissoesSelecionadas.has(id));
                  return (
                    <section key={modulo} className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-white">{modulo}</h3>
                          <p className="mt-1 text-xs text-slate-500">{itens.length} permissão(ões)</p>
                        </div>
                        <button onClick={() => selecionarTodasDoModulo(ids)} disabled={isPending} className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-violet-300/40 disabled:opacity-60">
                          {todasMarcadas ? "Remover módulo" : "Liberar módulo"}
                        </button>
                      </div>
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {itens.map((permissao) => {
                          const marcada = permissoesSelecionadas.has(permissao.id);
                          return (
                            <div key={permissao.id} className={`rounded-2xl border p-4 transition ${marcada ? "border-emerald-300/30 bg-emerald-300/10" : "border-white/10 bg-slate-950/40"}`}>
                              <div className="flex items-start gap-3">
                                <button onClick={() => alternarPermissao(permissao.id)} className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${marcada ? "border-emerald-300/40 bg-emerald-400/20 text-emerald-100" : "border-white/15 text-transparent"}`} aria-label="Alternar permissão">
                                  <Check className="h-4 w-4" />
                                </button>
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-white">{permissao.nome}</p>
                                  <p className="mt-1 break-all text-xs text-slate-500">{permissao.chave}</p>
                                </div>
                                <button onClick={() => removerPermissao(permissao.id)} className="rounded-xl border border-rose-300/15 p-2 text-rose-300 transition hover:bg-rose-400/10" aria-label="Excluir permissão"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-white/15 p-10 text-center">
              <Shield className="mx-auto h-10 w-10 text-slate-500" />
              <h2 className="mt-4 text-xl font-semibold text-white">Nenhum perfil cadastrado</h2>
              <p className="mt-2 text-sm text-slate-400">Crie um perfil para começar a definir permissões.</p>
            </div>
          )}
        </main>
      </section>

      {modalPerfilAberto ? (
        <Modal titulo={perfilForm.id ? "Editar perfil" : "Novo perfil"} onClose={() => setModalPerfilAberto(false)}>
          <div className="grid gap-4">
            <Campo label="Nome do perfil" value={perfilForm.nome} onChange={(valor) => setPerfilForm((atual) => ({ ...atual, nome: valor }))} />
            <Campo label="Descrição" value={perfilForm.descricao} onChange={(valor) => setPerfilForm((atual) => ({ ...atual, descricao: valor }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Nível de acesso" type="number" value={perfilForm.nivel} onChange={(valor) => setPerfilForm((atual) => ({ ...atual, nivel: valor }))} />
              <Select label="Status" value={perfilForm.status} options={statusOptions} onChange={(valor) => setPerfilForm((atual) => ({ ...atual, status: valor }))} />
            </div>
            <button onClick={salvarPerfilAtual} disabled={isPending} className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400 disabled:opacity-60">
              {isPending ? "Salvando..." : "Salvar perfil"}
            </button>
          </div>
        </Modal>
      ) : null}

      {modalPermissaoAberto ? (
        <Modal titulo="Nova permissão" onClose={() => setModalPermissaoAberto(false)}>
          <div className="grid gap-4">
            <Campo label="Módulo" value={permissaoForm.modulo} onChange={(valor) => setPermissaoForm((atual) => ({ ...atual, modulo: valor }))} />
            <Campo label="Nome da permissão" value={permissaoForm.nome} onChange={(valor) => setPermissaoForm((atual) => ({ ...atual, nome: valor }))} />
            <Campo label="Chave técnica" value={permissaoForm.chave} onChange={(valor) => setPermissaoForm((atual) => ({ ...atual, chave: valor }))} />
            <button onClick={salvarPermissaoAtual} disabled={isPending} className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400 disabled:opacity-60">
              {isPending ? "Salvando..." : "Salvar permissão"}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

type IconType = ComponentType<{ className?: string }>;

function ResumoCard({ titulo, valor, detalhe, icon: Icon }: { titulo: string; valor: number; detalhe: string; icon: IconType }) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-slate-900/60 p-5 shadow-xl shadow-slate-950/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{titulo}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{valor}</p>
          <p className="mt-2 text-xs text-slate-500">{detalhe}</p>
        </div>
        <div className="rounded-2xl border border-violet-300/20 bg-violet-300/10 p-3 text-violet-100"><Icon className="h-5 w-5" /></div>
      </div>
    </article>
  );
}

function Modal({ titulo, children, onClose }: { titulo: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-900 p-5 shadow-2xl shadow-slate-950 md:p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">{titulo}</h2>
            <p className="mt-1 text-sm text-slate-400">Mantenha nomes claros para facilitar a gestão de acesso.</p>
          </div>
          <button onClick={onClose} className="rounded-2xl border border-white/10 p-2 text-slate-300 hover:text-white" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Campo({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (valor: string) => void; type?: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-300">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/50" />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (valor: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-300">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-white outline-none transition focus:border-violet-300/50">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
