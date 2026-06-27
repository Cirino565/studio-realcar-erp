"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useMemo, useState, useTransition } from "react";
import type { Fornecedor, MovimentacaoEstoque, Produto } from "@prisma/client";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Boxes, Building2, CheckCircle2, ClipboardList, PackagePlus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { criarFornecedor, criarProduto, excluirFornecedor, excluirProduto, movimentarEstoque } from "@/actions/estoque.actions";
import StatCard from "@/components/dashboard/StatCard";
import { formatarDataHora, formatarMoeda } from "@/lib/format";

type ProdutoComFornecedor = Produto & { fornecedor: Fornecedor | null };
type MovimentacaoComProduto = MovimentacaoEstoque & { produto: Produto };
type Props = { produtos: ProdutoComFornecedor[]; fornecedores: Fornecedor[]; movimentacoes: MovimentacaoComProduto[] };
type ModalType = "produto" | "fornecedor" | "movimento" | null;
type StatusFiltro = "TODOS" | "CRITICO" | "OK";

const categoriasPadrao = ["Todos", "Injetáveis", "Dermocosméticos", "Descartáveis", "Equipamentos", "Higiene", "Outros"];

export default function EstoqueClient({ produtos, fornecedores, movimentacoes }: Props) {
  const [modal, setModal] = useState<ModalType>(null);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [status, setStatus] = useState<StatusFiltro>("TODOS");
  const [isPending, startTransition] = useTransition();

  const categorias = useMemo(() => {
    const recebidas = produtos.map((produto) => produto.categoria).filter((valor): valor is string => Boolean(valor));
    return Array.from(new Set([...categoriasPadrao, ...recebidas]));
  }, [produtos]);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return produtos.filter((produto) => {
      const fornecedor = produto.fornecedor?.nome.toLowerCase() || "";
      const texto = `${produto.nome} ${produto.categoria || ""} ${fornecedor}`.toLowerCase();
      const matchBusca = !termo || texto.includes(termo);
      const matchCategoria = categoria === "Todos" || produto.categoria === categoria;
      const critico = produto.quantidade <= produto.estoqueMinimo;
      const matchStatus = status === "TODOS" || (status === "CRITICO" && critico) || (status === "OK" && !critico);

      return matchBusca && matchCategoria && matchStatus;
    });
  }, [busca, categoria, produtos, status]);

  const totalProdutos = produtos.length;
  const valorEstoque = produtos.reduce((acc, produto) => acc + produto.quantidade * produto.valorCompra, 0);
  const baixoEstoque = produtos.filter((produto) => produto.quantidade <= produto.estoqueMinimo).length;
  const fornecedoresAtivos = fornecedores.length;
  const giroMes = movimentacoes.filter((movimento) => {
    const agora = new Date();
    const data = new Date(movimento.createdAt);
    return data.getMonth() === agora.getMonth() && data.getFullYear() === agora.getFullYear();
  }).length;

  function onCriarProduto(formData: FormData) {
    startTransition(async () => {
      await criarProduto({
        nome: String(formData.get("nome") || ""),
        categoria: String(formData.get("categoria") || ""),
        unidade: String(formData.get("unidade") || "un"),
        quantidade: Number(formData.get("quantidade") || 0),
        estoqueMinimo: Number(formData.get("estoqueMinimo") || 0),
        valorCompra: Number(formData.get("valorCompra") || 0),
        valorVenda: Number(formData.get("valorVenda") || 0),
        fornecedorId: Number(formData.get("fornecedorId") || 0) || undefined,
        observacoes: String(formData.get("observacoes") || ""),
      });
      setModal(null);
    });
  }

  function onCriarFornecedor(formData: FormData) {
    startTransition(async () => {
      await criarFornecedor({
        nome: String(formData.get("nome") || ""),
        telefone: String(formData.get("telefone") || ""),
        email: String(formData.get("email") || ""),
        cnpj: String(formData.get("cnpj") || ""),
        endereco: String(formData.get("endereco") || ""),
        observacoes: String(formData.get("observacoes") || ""),
      });
      setModal(null);
    });
  }

  function onMovimentar(formData: FormData) {
    startTransition(async () => {
      await movimentarEstoque({
        produtoId: Number(formData.get("produtoId") || 0),
        tipo: String(formData.get("tipo") || "ENTRADA") as "ENTRADA" | "SAIDA" | "AJUSTE",
        quantidade: Number(formData.get("quantidade") || 0),
        motivo: String(formData.get("motivo") || "Movimentação manual"),
        observacoes: String(formData.get("observacoes") || ""),
      });
      setModal(null);
    });
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="premium-card relative overflow-hidden p-5 sm:p-6 lg:p-7">
        <div className="pointer-events-none absolute right-[-7rem] top-[-8rem] h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-100">
              <Boxes className="h-3.5 w-3.5" />
              Controle operacional
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-4xl">Estoque</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Produtos, fornecedores, movimentações e alertas de reposição em uma visão mais clara para uso diário no celular e no desktop.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[34rem]">
            <button onClick={() => setModal("movimento")} className="premium-button-secondary flex items-center justify-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Movimentar
            </button>
            <button onClick={() => setModal("fornecedor")} className="premium-button-secondary flex items-center justify-center gap-2">
              <Building2 className="h-4 w-4" />
              Fornecedor
            </button>
            <button onClick={() => setModal("produto")} className="premium-button-primary flex items-center justify-center gap-2">
              <PackagePlus className="h-4 w-4" />
              Novo produto
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard titulo="Produtos cadastrados" valor={String(totalProdutos)} descricao="Itens ativos no cadastro." />
        <StatCard titulo="Valor em estoque" valor={formatarMoeda(valorEstoque)} cor="text-emerald-300" descricao="Estimativa pelo custo de compra." />
        <StatCard titulo="Alertas de reposição" valor={String(baixoEstoque)} cor="text-amber-300" descricao="Itens no mínimo ou abaixo." />
        <StatCard titulo="Fornecedores" valor={String(fornecedoresAtivos)} cor="text-sky-300" descricao={`${giroMes} movimentações neste mês.`} />
      </div>

      <section className="premium-card p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Produtos</h2>
            <p className="mt-1 text-sm text-slate-400">Busque, filtre e acompanhe o status de reposição.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[44rem] lg:grid-cols-[1fr_12rem_10rem]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar produto ou fornecedor"
                className="premium-input w-full pl-11"
              />
            </label>
            <select value={categoria} onChange={(event) => setCategoria(event.target.value)} className="premium-input w-full">
              {categorias.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value as StatusFiltro)} className="premium-input w-full">
              <option value="TODOS">Todos</option>
              <option value="CRITICO">Críticos</option>
              <option value="OK">Em dia</option>
            </select>
          </div>
        </div>

        <div className="mt-5 hidden overflow-x-auto rounded-3xl border border-white/[0.12] bg-white/[0.045] lg:block">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-white/[0.10] bg-white/[0.045] text-xs uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-5 py-4">Produto</th>
                <th className="px-5 py-4">Estoque</th>
                <th className="px-5 py-4">Mínimo</th>
                <th className="px-5 py-4">Fornecedor</th>
                <th className="px-5 py-4">Custo</th>
                <th className="px-5 py-4">Venda</th>
                <th className="px-5 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {produtosFiltrados.map((produto) => (
                <ProdutoTableRow key={produto.id} produto={produto} isPending={isPending} onExcluir={(id) => startTransition(async () => excluirProduto(id))} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 lg:hidden">
          {produtosFiltrados.map((produto) => (
            <ProdutoMobileCard key={produto.id} produto={produto} isPending={isPending} onExcluir={(id) => startTransition(async () => excluirProduto(id))} />
          ))}
        </div>

        {produtosFiltrados.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-white/[0.14] bg-white/[0.04] p-8 text-center">
            <p className="text-sm font-semibold text-white">Nenhum produto encontrado.</p>
            <p className="mt-2 text-sm text-slate-400">Ajuste os filtros ou cadastre um novo produto.</p>
          </div>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_26rem]">
        <section className="premium-card p-4 sm:p-5 lg:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Fornecedores</h2>
              <p className="mt-1 text-sm text-slate-400">Contatos usados nas compras e reposições.</p>
            </div>
            <span className="premium-chip hidden sm:inline-flex">{fornecedores.length} cadastrados</span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {fornecedores.map((fornecedor) => (
              <FornecedorCard key={fornecedor.id} fornecedor={fornecedor} isPending={isPending} onExcluir={(id) => startTransition(async () => excluirFornecedor(id))} />
            ))}
            {fornecedores.length === 0 ? <EmptyCard texto="Nenhum fornecedor cadastrado." /> : null}
          </div>
        </section>

        <section className="premium-card p-4 sm:p-5 lg:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Movimentações</h2>
              <p className="mt-1 text-sm text-slate-400">Últimas entradas, saídas e ajustes.</p>
            </div>
            <SlidersHorizontal className="h-5 w-5 text-slate-400" />
          </div>

          <div className="max-h-[34rem] space-y-3 overflow-y-auto pr-1 scrollbar-premium">
            {movimentacoes.map((movimento) => (
              <MovimentoCard key={movimento.id} movimento={movimento} />
            ))}
            {movimentacoes.length === 0 ? <EmptyCard texto="Nenhuma movimentação registrada." /> : null}
          </div>
        </section>
      </div>

      {modal === "produto" ? (
        <Modal title="Novo produto" onClose={() => setModal(null)}>
          <form action={onCriarProduto} className="grid gap-4 sm:grid-cols-2">
            <Input name="nome" label="Nome do produto" required className="sm:col-span-2" />
            <Input name="categoria" label="Categoria" />
            <Input name="unidade" label="Unidade" defaultValue="un" />
            <Input name="quantidade" label="Quantidade inicial" type="number" min="0" />
            <Input name="estoqueMinimo" label="Estoque mínimo" type="number" min="0" />
            <Input name="valorCompra" label="Valor de compra" type="number" step="0.01" min="0" />
            <Input name="valorVenda" label="Valor de venda" type="number" step="0.01" min="0" />
            <Select name="fornecedorId" label="Fornecedor" options={fornecedores.map((fornecedor) => ({ value: String(fornecedor.id), label: fornecedor.nome }))} className="sm:col-span-2" />
            <Textarea name="observacoes" label="Observações" className="sm:col-span-2" />
            <Submit disabled={isPending} label="Salvar produto" className="sm:col-span-2" />
          </form>
        </Modal>
      ) : null}

      {modal === "fornecedor" ? (
        <Modal title="Novo fornecedor" onClose={() => setModal(null)}>
          <form action={onCriarFornecedor} className="grid gap-4 sm:grid-cols-2">
            <Input name="nome" label="Nome" required className="sm:col-span-2" />
            <Input name="telefone" label="Telefone" />
            <Input name="email" label="E-mail" type="email" />
            <Input name="cnpj" label="CNPJ" />
            <Input name="endereco" label="Endereço" />
            <Textarea name="observacoes" label="Observações" className="sm:col-span-2" />
            <Submit disabled={isPending} label="Salvar fornecedor" className="sm:col-span-2" />
          </form>
        </Modal>
      ) : null}

      {modal === "movimento" ? (
        <Modal title="Movimentar estoque" onClose={() => setModal(null)}>
          <form action={onMovimentar} className="grid gap-4">
            <Select name="produtoId" label="Produto" required options={produtos.map((produto) => ({ value: String(produto.id), label: produto.nome }))} />
            <Select name="tipo" label="Tipo" options={[{ value: "ENTRADA", label: "Entrada" }, { value: "SAIDA", label: "Saída" }, { value: "AJUSTE", label: "Ajuste manual" }]} />
            <Input name="quantidade" label="Quantidade" type="number" min="1" required />
            <Input name="motivo" label="Motivo" required placeholder="Ex: compra, uso em procedimento, conferência" />
            <Textarea name="observacoes" label="Observações" />
            <Submit disabled={isPending} label="Confirmar movimentação" />
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function ProdutoTableRow({ produto, isPending, onExcluir }: { produto: ProdutoComFornecedor; isPending: boolean; onExcluir: (id: number) => void }) {
  const critico = produto.quantidade <= produto.estoqueMinimo;

  return (
    <tr className="text-slate-200 transition hover:bg-white/[0.04]">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${critico ? "bg-amber-400/12 text-amber-200" : "bg-emerald-400/12 text-emerald-200"}`}>
            {critico ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-semibold text-white">{produto.nome}</p>
            <p className="mt-1 text-xs text-slate-400">{produto.categoria || "Sem categoria"}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 font-semibold text-white">{produto.quantidade} {produto.unidade}</td>
      <td className={`px-5 py-4 ${critico ? "font-semibold text-amber-200" : "text-slate-300"}`}>{produto.estoqueMinimo}</td>
      <td className="px-5 py-4 text-slate-300">{produto.fornecedor?.nome || "Sem fornecedor"}</td>
      <td className="px-5 py-4 text-slate-300">{formatarMoeda(produto.valorCompra)}</td>
      <td className="px-5 py-4 text-slate-300">{formatarMoeda(produto.valorVenda)}</td>
      <td className="px-5 py-4 text-right">
        <button disabled={isPending} onClick={() => onExcluir(produto.id)} className="inline-flex items-center gap-2 rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-400/15 disabled:opacity-60">
          <Trash2 className="h-3.5 w-3.5" />
          Excluir
        </button>
      </td>
    </tr>
  );
}

function ProdutoMobileCard({ produto, isPending, onExcluir }: { produto: ProdutoComFornecedor; isPending: boolean; onExcluir: (id: number) => void }) {
  const critico = produto.quantidade <= produto.estoqueMinimo;

  return (
    <article className="rounded-3xl border border-white/[0.12] bg-white/[0.06] p-4 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{produto.nome}</p>
          <p className="mt-1 text-sm text-slate-400">{produto.categoria || "Sem categoria"}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${critico ? "bg-amber-400/12 text-amber-200" : "bg-emerald-400/12 text-emerald-200"}`}>
          {critico ? "Reposição" : "Em dia"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Info label="Atual" value={`${produto.quantidade} ${produto.unidade}`} />
        <Info label="Mínimo" value={String(produto.estoqueMinimo)} />
        <Info label="Compra" value={formatarMoeda(produto.valorCompra)} />
        <Info label="Venda" value={formatarMoeda(produto.valorVenda)} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.10] pt-4">
        <p className="min-w-0 truncate text-sm text-slate-400">{produto.fornecedor?.nome || "Sem fornecedor"}</p>
        <button disabled={isPending} onClick={() => onExcluir(produto.id)} className="rounded-xl border border-red-300/20 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-200 disabled:opacity-60">
          Excluir
        </button>
      </div>
    </article>
  );
}

function FornecedorCard({ fornecedor, isPending, onExcluir }: { fornecedor: Fornecedor; isPending: boolean; onExcluir: (id: number) => void }) {
  return (
    <article className="rounded-3xl border border-white/[0.12] bg-white/[0.06] p-4 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{fornecedor.nome}</p>
          <p className="mt-1 truncate text-sm text-slate-400">{fornecedor.telefone || fornecedor.email || "Sem contato"}</p>
          {fornecedor.cnpj ? <p className="mt-2 text-xs text-slate-500">CNPJ: {fornecedor.cnpj}</p> : null}
        </div>
        <button disabled={isPending} onClick={() => onExcluir(fornecedor.id)} className="rounded-xl border border-red-300/20 bg-red-400/10 p-2 text-red-200 hover:bg-red-400/15 disabled:opacity-60" aria-label="Excluir fornecedor">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function MovimentoCard({ movimento }: { movimento: MovimentacaoComProduto }) {
  const entrada = movimento.tipo === "ENTRADA";
  const ajuste = movimento.tipo === "AJUSTE";

  return (
    <article className="rounded-3xl border border-white/[0.12] bg-white/[0.06] p-4 shadow-lg shadow-black/10">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${entrada ? "bg-emerald-400/12 text-emerald-200" : ajuste ? "bg-sky-400/12 text-sky-200" : "bg-rose-400/12 text-rose-200"}`}>
          {entrada ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-sm font-semibold text-white">{movimento.produto.nome}</p>
            <span className="rounded-full bg-white/[0.08] px-2.5 py-1 text-[0.68rem] font-semibold text-slate-200">{movimento.tipo}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">{movimento.quantidade} un · {formatarDataHora(movimento.createdAt)}</p>
          <p className="mt-3 text-sm leading-5 text-slate-300">{movimento.motivo}</p>
        </div>
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.10] bg-white/[0.05] p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function EmptyCard({ texto }: { texto: string }) {
  return <div className="rounded-3xl border border-dashed border-white/[0.14] bg-white/[0.04] p-5 text-sm text-slate-400">{texto}</div>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/[0.14] bg-[#202638] p-5 shadow-2xl shadow-black/30 sm:max-w-2xl sm:rounded-3xl sm:p-6 scrollbar-premium">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="rounded-xl border border-white/[0.12] bg-white/[0.07] px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/[0.11]">
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, className = "", ...rest } = props;

  return (
    <label className={`grid gap-2 text-sm font-medium text-slate-300 ${className}`}>
      {label}
      <input {...rest} className="premium-input w-full" />
    </label>
  );
}

function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const { label, className = "", ...rest } = props;

  return (
    <label className={`grid gap-2 text-sm font-medium text-slate-300 ${className}`}>
      {label}
      <textarea {...rest} className="premium-input min-h-28 w-full resize-none" />
    </label>
  );
}

function Select({ label, options, className = "", ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: { value: string; label: string }[] }) {
  return (
    <label className={`grid gap-2 text-sm font-medium text-slate-300 ${className}`}>
      {label}
      <select {...rest} className="premium-input w-full">
        <option value="">Selecione</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function Submit({ label, disabled, className = "" }: { label: string; disabled: boolean; className?: string }) {
  return <button disabled={disabled} className={`premium-button-primary ${className}`}>{disabled ? "Salvando..." : label}</button>;
}
