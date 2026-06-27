"use client";

import { useMemo, useState, useTransition, type ComponentType } from "react";
import {
  Activity,
  BriefcaseBusiness,
  CalendarDays,
  Edit3,
  Mail,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  alterarStatusUsuario,
  atualizarUsuario,
  criarUsuario,
  excluirUsuario,
} from "@/actions/usuario.actions";
import type { PerfilResumo, UsuarioComPerfil } from "../types";

type Props = {
  usuarios: UsuarioComPerfil[];
  perfis: PerfilResumo[];
};

type UsuarioForm = {
  id?: number;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  tipo: string;
  especialidade: string;
  status: string;
  perfilId: string;
  dataAdmissao: string;
  observacoes: string;
  senha: string;
};

const formularioInicial: UsuarioForm = {
  nome: "",
  email: "",
  telefone: "",
  cargo: "",
  tipo: "Equipe",
  especialidade: "",
  status: "Ativo",
  perfilId: "",
  dataAdmissao: "",
  observacoes: "",
  senha: "",
};

const tipos = ["Equipe", "Profissional", "Recepção", "Gestão", "Financeiro", "Marketing"];
const statusOptions = ["Ativo", "Inativo", "Férias", "Afastado"];

function formatarData(valor: string | null) {
  if (!valor) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(valor));
}

function dataParaInput(valor: string | null) {
  if (!valor) return "";
  return new Date(valor).toISOString().slice(0, 10);
}

function obterClasseStatus(status: string) {
  if (status === "Ativo") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (status === "Férias") return "border-sky-400/30 bg-sky-400/10 text-sky-200";
  if (status === "Afastado") return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  return "border-rose-400/30 bg-rose-400/10 text-rose-200";
}

export function UsuariosClient({ usuarios, perfis }: Props) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [modalAberto, setModalAberto] = useState(false);
  const [formulario, setFormulario] = useState<UsuarioForm>(formularioInicial);
  const [isPending, startTransition] = useTransition();

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return usuarios.filter((usuario) => {
      const correspondeBusca =
        termo.length === 0 ||
        usuario.nome.toLowerCase().includes(termo) ||
        usuario.email.toLowerCase().includes(termo) ||
        (usuario.cargo || "").toLowerCase().includes(termo) ||
        (usuario.especialidade || "").toLowerCase().includes(termo);
      const correspondeStatus = status === "Todos" || usuario.status === status;
      const correspondeTipo = tipo === "Todos" || usuario.tipo === tipo;
      return correspondeBusca && correspondeStatus && correspondeTipo;
    });
  }, [busca, status, tipo, usuarios]);

  const ativos = usuarios.filter((usuario) => usuario.status === "Ativo").length;
  const profissionais = usuarios.filter((usuario) => usuario.tipo === "Profissional").length;
  const semPerfil = usuarios.filter((usuario) => !usuario.perfilId).length;
  const perfisAtivos = perfis.filter((perfil) => perfil.status === "Ativo").length;

  function abrirNovoUsuario() {
    setFormulario(formularioInicial);
    setModalAberto(true);
  }

  function abrirEdicao(usuario: UsuarioComPerfil) {
    setFormulario({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone || "",
      cargo: usuario.cargo || "",
      tipo: usuario.tipo,
      especialidade: usuario.especialidade || "",
      status: usuario.status,
      perfilId: usuario.perfilId ? String(usuario.perfilId) : "",
      dataAdmissao: dataParaInput(usuario.dataAdmissao),
      observacoes: usuario.observacoes || "",
      senha: "",
    });
    setModalAberto(true);
  }

  function salvarUsuario() {
    if (!formulario.nome.trim() || !formulario.email.trim()) return;
    if (!formulario.id && formulario.senha.trim().length < 6) return;

    startTransition(async () => {
      const dados = {
        nome: formulario.nome,
        email: formulario.email,
        telefone: formulario.telefone,
        cargo: formulario.cargo,
        tipo: formulario.tipo,
        especialidade: formulario.especialidade,
        status: formulario.status,
        perfilId: Number(formulario.perfilId) || undefined,
        dataAdmissao: formulario.dataAdmissao,
        observacoes: formulario.observacoes,
        senha: formulario.senha,
      };

      if (formulario.id) {
        await atualizarUsuario({ ...dados, id: formulario.id });
      } else {
        await criarUsuario(dados);
      }

      setModalAberto(false);
      setFormulario(formularioInicial);
    });
  }

  function removerUsuario(id: number) {
    startTransition(async () => {
      await excluirUsuario(id);
    });
  }

  function mudarStatus(id: number, novoStatus: string) {
    startTransition(async () => {
      await alterarStatusUsuario(id, novoStatus);
    });
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-violet-200">
            Equipe e acesso
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">Usuários</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Gerencie profissionais, recepção, gestão e vínculos de acesso do Studio Realçar.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirNovoUsuario}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400"
        >
          <Plus className="h-4 w-4" />
          Novo usuário
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResumoCard titulo="Usuários ativos" valor={ativos} detalhe={`${usuarios.length} cadastrados`} icon={Users} />
        <ResumoCard titulo="Profissionais" valor={profissionais} detalhe="agenda e atendimentos" icon={BriefcaseBusiness} />
        <ResumoCard titulo="Perfis ativos" valor={perfisAtivos} detalhe="regras disponíveis" icon={ShieldCheck} />
        <ResumoCard titulo="Sem perfil" valor={semPerfil} detalhe="exigem revisão" icon={Activity} alerta={semPerfil > 0} />
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-4 shadow-2xl shadow-slate-950/30 md:p-6">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome, e-mail, cargo ou especialidade"
              className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/55 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/50"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-12 rounded-2xl border border-white/10 bg-slate-950/55 px-4 text-sm text-white outline-none focus:border-violet-300/50"
          >
            <option>Todos</option>
            {statusOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            value={tipo}
            onChange={(event) => setTipo(event.target.value)}
            className="h-12 rounded-2xl border border-white/10 bg-slate-950/55 px-4 text-sm text-white outline-none focus:border-violet-300/50"
          >
            <option>Todos</option>
            {tipos.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/55 shadow-2xl shadow-slate-950/30 lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-[0.18em] text-slate-400">
            <tr>
              <th className="px-6 py-4">Usuário</th>
              <th className="px-6 py-4">Função</th>
              <th className="px-6 py-4">Perfil</th>
              <th className="px-6 py-4">Admissão</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {usuariosFiltrados.map((usuario) => (
              <tr key={usuario.id} className="text-slate-300 transition hover:bg-white/[0.03]">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-300/10 text-sm font-bold text-violet-100">
                      {usuario.nome.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{usuario.nome}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Mail className="h-3 w-3" />{usuario.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <p className="font-medium text-white">{usuario.cargo || usuario.tipo}</p>
                  <p className="mt-1 text-xs text-slate-400">{usuario.especialidade || usuario.tipo}</p>
                </td>
                <td className="px-6 py-5">
                  <p className="font-medium text-white">{usuario.perfil?.nome || "Sem perfil"}</p>
                  <p className="mt-1 text-xs text-slate-400">Nível {usuario.perfil?.nivel || "-"}</p>
                </td>
                <td className="px-6 py-5 text-slate-300">{formatarData(usuario.dataAdmissao)}</td>
                <td className="px-6 py-5">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${obterClasseStatus(usuario.status)}`}>{usuario.status}</span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => abrirEdicao(usuario)} className="rounded-xl border border-white/10 p-2 text-slate-300 transition hover:border-violet-300/40 hover:text-white" aria-label="Editar usuário">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <select value={usuario.status} onChange={(event) => mudarStatus(usuario.id, event.target.value)} className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white outline-none">
                      {statusOptions.map((item) => <option key={item}>{item}</option>)}
                    </select>
                    <button onClick={() => removerUsuario(usuario.id)} className="rounded-xl border border-rose-300/20 p-2 text-rose-300 transition hover:bg-rose-400/10" aria-label="Excluir usuário">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-4 lg:hidden">
        {usuariosFiltrados.map((usuario) => (
          <article key={usuario.id} className="rounded-[1.5rem] border border-white/10 bg-slate-900/60 p-5 shadow-xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-white">{usuario.nome}</p>
                <p className="mt-1 text-sm text-slate-400">{usuario.cargo || usuario.tipo}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${obterClasseStatus(usuario.status)}`}>{usuario.status}</span>
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-500" />{usuario.email}</p>
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-500" />{usuario.telefone || "Sem telefone"}</p>
              <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-slate-500" />{usuario.perfil?.nome || "Sem perfil"}</p>
              <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-500" />{formatarData(usuario.dataAdmissao)}</p>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => abrirEdicao(usuario)} className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white">Editar</button>
              <button onClick={() => removerUsuario(usuario.id)} className="rounded-2xl border border-rose-300/20 px-4 py-3 text-sm font-semibold text-rose-200">Excluir</button>
            </div>
          </article>
        ))}
      </section>

      {modalAberto ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-900 p-5 shadow-2xl shadow-slate-950 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">{formulario.id ? "Editar usuário" : "Novo usuário"}</h2>
                <p className="mt-1 text-sm text-slate-400">Preencha os dados operacionais e o perfil de acesso.</p>
              </div>
              <button onClick={() => setModalAberto(false)} className="rounded-2xl border border-white/10 p-2 text-slate-300 hover:text-white" aria-label="Fechar modal">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Campo label="Nome" value={formulario.nome} onChange={(valor) => setFormulario((atual) => ({ ...atual, nome: valor }))} required />
              <Campo label="E-mail" type="email" value={formulario.email} onChange={(valor) => setFormulario((atual) => ({ ...atual, email: valor }))} required />
              <Campo
                label={formulario.id ? "Nova senha (opcional)" : "Senha inicial"}
                type="password"
                value={formulario.senha}
                onChange={(valor) => setFormulario((atual) => ({ ...atual, senha: valor }))}
                required={!formulario.id}
              />
              <Campo label="Telefone" value={formulario.telefone} onChange={(valor) => setFormulario((atual) => ({ ...atual, telefone: valor }))} />
              <Campo label="Cargo" value={formulario.cargo} onChange={(valor) => setFormulario((atual) => ({ ...atual, cargo: valor }))} />
              <Select label="Tipo" value={formulario.tipo} options={tipos} onChange={(valor) => setFormulario((atual) => ({ ...atual, tipo: valor }))} />
              <Campo label="Especialidade" value={formulario.especialidade} onChange={(valor) => setFormulario((atual) => ({ ...atual, especialidade: valor }))} />
              <Select label="Status" value={formulario.status} options={statusOptions} onChange={(valor) => setFormulario((atual) => ({ ...atual, status: valor }))} />
              <label className="grid gap-2 text-sm font-medium text-slate-300">
                Perfil de acesso
                <select value={formulario.perfilId} onChange={(event) => setFormulario((atual) => ({ ...atual, perfilId: event.target.value }))} className="h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-white outline-none focus:border-violet-300/50">
                  <option value="">Sem perfil</option>
                  {perfis.map((perfil) => <option key={perfil.id} value={perfil.id}>{perfil.nome}</option>)}
                </select>
              </label>
              <Campo label="Data de admissão" type="date" value={formulario.dataAdmissao} onChange={(valor) => setFormulario((atual) => ({ ...atual, dataAdmissao: valor }))} />
              <label className="grid gap-2 text-sm font-medium text-slate-300 md:col-span-2">
                Observações internas
                <textarea value={formulario.observacoes} onChange={(event) => setFormulario((atual) => ({ ...atual, observacoes: event.target.value }))} rows={4} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/50" />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setModalAberto(false)} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200">Cancelar</button>
              <button onClick={salvarUsuario} disabled={isPending || (!formulario.id && formulario.senha.trim().length < 6)} className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60">
                {isPending ? "Salvando..." : "Salvar usuário"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type IconType = ComponentType<{ className?: string }>;

function ResumoCard({ titulo, valor, detalhe, icon: Icon, alerta }: { titulo: string; valor: number; detalhe: string; icon: IconType; alerta?: boolean }) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-slate-900/60 p-5 shadow-xl shadow-slate-950/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{titulo}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{valor}</p>
          <p className={`mt-2 text-xs ${alerta ? "text-amber-200" : "text-slate-500"}`}>{detalhe}</p>
        </div>
        <div className="rounded-2xl border border-violet-300/20 bg-violet-300/10 p-3 text-violet-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function Campo({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (valor: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-300">
      {label}
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/50" />
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
