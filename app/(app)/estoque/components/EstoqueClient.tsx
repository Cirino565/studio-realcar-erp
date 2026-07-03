"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import type { Fornecedor, MovimentacaoEstoque, Produto } from "@prisma/client";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  History,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  createFornecedor,
  createProduto,
  deleteProduto,
  registrarMovimentacao,
  updateProduto,
} from "@/actions/estoque.actions";
import StatCard from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { formatarDataHora, formatarMoeda } from "@/lib/format";

type ProdutoComFornecedor = Produto & {
  fornecedor: Fornecedor | null;
};

type MovimentacaoComProduto = MovimentacaoEstoque & {
  produto: Produto;
};

type Props = {
  produtos: ProdutoComFornecedor[];
  fornecedores: Fornecedor[];
  movimentacoes: MovimentacaoComProduto[];
};

type ProdutoModalState =
  | {
      modo: "novo";
      produto?: null;
    }
  | {
      modo: "editar";
      produto: ProdutoComFornecedor;
    }
  | null;

type MovimentacaoModalState =
  | {
      tipo: "ENTRADA" | "SAIDA";
      produto?: ProdutoComFornecedor | null;
    }
  | null;

function numeroDoFormulario(value: FormDataEntryValue | null, fallback = 0) {
  if (value === null) return fallback;

  const texto = String(value)
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  if (!texto) return fallback;

  const numero = Number(texto);

  return Number.isFinite(numero) ? numero : fallback;
}

function inteiroDoFormulario(value: FormDataEntryValue | null, fallback = 0) {
  return Math.trunc(numeroDoFormulario(value, fallback));
}

function textoDoFormulario(value: FormDataEntryValue | null) {
  const texto = String(value ?? "").trim();

  return texto;
}

function fornecedorIdDoFormulario(value: FormDataEntryValue | null) {
  const id = Number(value);

  return Number.isFinite(id) && id > 0 ? id : null;
}

function statusProduto(produto: ProdutoComFornecedor) {
  if (produto.quantidade <= 0) {
    return {
      texto: "Sem estoque",
      classe: "bg-rose-500/10 text-rose-300 ring-rose-400/20",
    };
  }

  if (produto.quantidade <= produto.estoqueMinimo) {
    return {
      texto: "Baixo estoque",
      classe: "bg-amber-500/10 text-amber-300 ring-amber-400/20",
    };
  }

  return {
    texto: "Normal",
    classe: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20",
  };
}

function Modal({
  titulo,
  descricao,
  children,
  onClose,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-white/[0.03] p-5">
          <div>
            <h2 className="text-xl font-semibold text-white">{titulo}</h2>
            {descricao ? (
              <p className="mt-1 text-sm text-slate-400">{descricao}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/[0.05] p-2 text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required = false,
  step,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  required?: boolean;
  step?: string;
  min?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>

      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        step={step}
        min={min}
        className="premium-input min-h-12 w-full"
      />
    </label>
  );
}

function SelectFornecedor({
  fornecedores,
  defaultValue,
}: {
  fornecedores: Fornecedor[];
  defaultValue?: number | null;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        Fornecedor
      </span>

      <select
        name="fornecedorId"
        defaultValue={defaultValue ?? ""}
        className="premium-input min-h-12 w-full"
      >
        <option value="">Sem fornecedor</option>

        {fornecedores.map((fornecedor) => (
          <option key={fornecedor.id} value={fornecedor.id}>
            {fornecedor.nome}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function EstoqueClient({
  produtos,
  fornecedores,
  movimentacoes,
}: Props) {
  const router = useRouter();

  const [busca, setBusca] = useState("");
  const [produtoModal, setProdutoModal] = useState<ProdutoModalState>(null);
  const [movimentacaoModal, setMovimentacaoModal] =
    useState<MovimentacaoModalState>(null);
  const [fornecedorModalAberto, setFornecedorModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    return produtos.filter((produto) => {
      const texto =
        `${produto.nome} ${produto.categoria ?? ""} ${produto.unidade} ${
          produto.fornecedor?.nome ?? ""
        }`.toLowerCase();

      return !termo || texto.includes(termo);
    });
  }, [busca, produtos]);

  const totalProdutos = produtos.length;

  const valorEstoque = produtos.reduce(
    (acc, produto) => acc + produto.quantidade * produto.valorCompra,
    0
  );

  const baixoEstoque = produtos.filter(
    (produto) => produto.quantidade <= produto.estoqueMinimo
  ).length;

  const fornecedoresAtivos = fornecedores.filter(
    (fornecedor) => fornecedor.status !== "Inativo"
  ).length;

  const giroMes = movimentacoes.length;

  function limparAlertas() {
    setMensagem(null);
    setErro(null);
  }

  function tratarErro(error: unknown) {
    const texto =
      error instanceof Error
        ? error.message
        : "Não foi possível concluir a operação.";

    setErro(texto);
  }

  async function handleSalvarProduto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    limparAlertas();
    setSalvando(true);

    const formData = new FormData(event.currentTarget);

    const dados = {
      nome: textoDoFormulario(formData.get("nome")),
      categoria: textoDoFormulario(formData.get("categoria")),
      unidade: textoDoFormulario(formData.get("unidade")) || "un",
      quantidade: inteiroDoFormulario(formData.get("quantidade")),
      estoqueMinimo: inteiroDoFormulario(formData.get("estoqueMinimo")),
      valorCompra: numeroDoFormulario(formData.get("valorCompra")),
      valorVenda: numeroDoFormulario(formData.get("valorVenda")),
      fornecedorId: fornecedorIdDoFormulario(formData.get("fornecedorId")),
      observacoes: textoDoFormulario(formData.get("observacoes")),
    };

    try {
      if (produtoModal?.modo === "editar") {
        await updateProduto(produtoModal.produto.id, dados);
        setMensagem("Produto atualizado com sucesso.");
      } else {
        await createProduto(dados);
        setMensagem("Produto cadastrado com sucesso.");
      }

      setProdutoModal(null);
      router.refresh();
    } catch (error) {
      tratarErro(error);
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvarFornecedor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    limparAlertas();
    setSalvando(true);

    const formData = new FormData(event.currentTarget);

    try {
      await createFornecedor({
        nome: textoDoFormulario(formData.get("nome")),
        telefone: textoDoFormulario(formData.get("telefone")),
        email: textoDoFormulario(formData.get("email")),
        cnpj: textoDoFormulario(formData.get("cnpj")),
        endereco: textoDoFormulario(formData.get("endereco")),
        observacoes: textoDoFormulario(formData.get("observacoes")),
      });

      setMensagem("Fornecedor cadastrado com sucesso.");
      setFornecedorModalAberto(false);
      router.refresh();
    } catch (error) {
      tratarErro(error);
    } finally {
      setSalvando(false);
    }
  }

  async function handleRegistrarMovimentacao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    limparAlertas();
    setSalvando(true);

    const formData = new FormData(event.currentTarget);

    try {
      await registrarMovimentacao({
        produtoId: inteiroDoFormulario(formData.get("produtoId")),
        tipo: movimentacaoModal?.tipo ?? "ENTRADA",
        quantidade: inteiroDoFormulario(formData.get("quantidade")),
        motivo: textoDoFormulario(formData.get("motivo")),
        observacoes: textoDoFormulario(formData.get("observacoes")),
      });

      setMensagem(
        movimentacaoModal?.tipo === "SAIDA"
          ? "Saída registrada com sucesso."
          : "Entrada registrada com sucesso."
      );

      setMovimentacaoModal(null);
      router.refresh();
    } catch (error) {
      tratarErro(error);
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluirProduto(produto: ProdutoComFornecedor) {
    limparAlertas();

    const confirmou = window.confirm(
      `Deseja excluir o produto "${produto.nome}"? Essa ação não poderá ser desfeita.`
    );

    if (!confirmou) return;

    setSalvando(true);

    try {
      await deleteProduto(produto.id);
      setMensagem("Produto excluído com sucesso.");
      router.refresh();
    } catch (error) {
      tratarErro(error);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          titulo="Produtos"
          valor={String(totalProdutos)}
          descricao="Total cadastrados"
        />

        <StatCard
          titulo="Valor Estoque"
          valor={formatarMoeda(valorEstoque)}
          descricao="Valor total em estoque"
        />

        <StatCard
          titulo="Baixo Estoque"
          valor={String(baixoEstoque)}
          descricao="Itens críticos"
          cor="text-red-400"
        />

        <StatCard
          titulo="Fornecedores"
          valor={String(fornecedoresAtivos)}
          descricao="Ativos no sistema"
        />

        <StatCard
          titulo="Giro do Mês"
          valor={String(giroMes)}
          descricao="Movimentações"
        />
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/10 sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por produto, categoria, unidade ou fornecedor..."
              className="premium-input min-h-12 w-full pl-11"
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2 xl:flex">
            <Button
              type="button"
              onClick={() => {
                limparAlertas();
                setProdutoModal({ modo: "novo" });
              }}
            >
              <PackagePlus className="h-4 w-4" />
              Novo produto
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                limparAlertas();
                setFornecedorModalAberto(true);
              }}
            >
              <Truck className="h-4 w-4" />
              Novo fornecedor
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                limparAlertas();
                setMovimentacaoModal({ tipo: "ENTRADA" });
              }}
            >
              <ArrowDownToLine className="h-4 w-4" />
              Entrada
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                limparAlertas();
                setMovimentacaoModal({ tipo: "SAIDA" });
              }}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Saída
            </Button>
          </div>
        </div>

        {mensagem ? (
          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {mensagem}
          </div>
        ) : null}

        {erro ? (
          <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {erro}
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/10">
        <div className="flex flex-col gap-2 border-b border-white/10 bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Produtos em estoque
            </h2>
            <p className="text-sm text-slate-400">
              Controle de materiais, produtos e descartáveis da clínica.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
            <Boxes className="h-4 w-4 text-violet-300" />
            {produtosFiltrados.length} item(ns)
          </div>
        </div>

        {produtosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-500/10 text-violet-300">
              <PackagePlus className="h-7 w-7" />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-white">
              Nenhum produto encontrado
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              Cadastre produtos como toxina botulínica, ácido hialurônico,
              agulhas, luvas, anestésicos, cremes e descartáveis.
            </p>

            <Button
              type="button"
              className="mt-5"
              onClick={() => setProdutoModal({ modo: "novo" })}
            >
              <Plus className="h-4 w-4" />
              Cadastrar primeiro produto
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.025] text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Produto</th>
                  <th className="px-5 py-4 font-semibold">Categoria</th>
                  <th className="px-5 py-4 font-semibold">Quantidade</th>
                  <th className="px-5 py-4 font-semibold">Mínimo</th>
                  <th className="px-5 py-4 font-semibold">Fornecedor</th>
                  <th className="px-5 py-4 font-semibold">Compra</th>
                  <th className="px-5 py-4 font-semibold">Venda</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {produtosFiltrados.map((produto) => {
                  const status = statusProduto(produto);

                  return (
                    <tr
                      key={produto.id}
                      className="text-slate-300 transition hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-white">
                            {produto.nome}
                          </p>

                          {produto.observacoes ? (
                            <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                              {produto.observacoes}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {produto.categoria || "Sem categoria"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-base font-semibold text-white">
                          {produto.quantidade}
                        </span>{" "}
                        <span className="text-xs text-slate-500">
                          {produto.unidade}
                        </span>
                      </td>

                      <td className="px-5 py-4">{produto.estoqueMinimo}</td>

                      <td className="px-5 py-4">
                        {produto.fornecedor?.nome || "Sem fornecedor"}
                      </td>

                      <td className="px-5 py-4">
                        {formatarMoeda(produto.valorCompra)}
                      </td>

                      <td className="px-5 py-4">
                        {formatarMoeda(produto.valorVenda)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${status.classe}`}
                        >
                          {produto.quantidade <= produto.estoqueMinimo ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : null}
                          {status.texto}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            title="Entrada"
                            onClick={() => {
                              limparAlertas();
                              setMovimentacaoModal({
                                tipo: "ENTRADA",
                                produto,
                              });
                            }}
                          >
                            <ArrowDownToLine className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            title="Saída"
                            onClick={() => {
                              limparAlertas();
                              setMovimentacaoModal({
                                tipo: "SAIDA",
                                produto,
                              });
                            }}
                          >
                            <ArrowUpFromLine className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            size="icon-sm"
                            variant="secondary"
                            title="Editar"
                            onClick={() => {
                              limparAlertas();
                              setProdutoModal({
                                modo: "editar",
                                produto,
                              });
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            size="icon-sm"
                            variant="destructive"
                            title="Excluir"
                            disabled={salvando}
                            onClick={() => handleExcluirProduto(produto)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/10">
        <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-violet-300">
            <History className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white">
              Últimas movimentações
            </h2>
            <p className="text-sm text-slate-400">
              Entradas e saídas registradas recentemente.
            </p>
          </div>
        </div>

        {movimentacoes.length === 0 ? (
          <div className="p-5 text-sm text-slate-400">
            Nenhuma movimentação registrada ainda.
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {movimentacoes.slice(0, 8).map((movimentacao) => (
              <div
                key={movimentacao.id}
                className="grid gap-2 p-5 text-sm text-slate-300 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-semibold text-white">
                    {movimentacao.produto.nome}
                  </p>

                  <p className="mt-1 text-slate-400">
                    {movimentacao.motivo}
                    {movimentacao.observacoes
                      ? ` • ${movimentacao.observacoes}`
                      : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 md:justify-end">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                      movimentacao.tipo === "ENTRADA"
                        ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20"
                        : "bg-rose-500/10 text-rose-300 ring-rose-400/20"
                    }`}
                  >
                    {movimentacao.tipo === "ENTRADA" ? "Entrada" : "Saída"} de{" "}
                    {movimentacao.quantidade}
                  </span>

                  <span className="text-xs text-slate-500">
                    {formatarDataHora(movimentacao.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {produtoModal ? (
        <Modal
          titulo={
            produtoModal.modo === "editar"
              ? "Editar produto"
              : "Cadastrar produto"
          }
          descricao="Preencha as informações do produto, material ou descartável usado na clínica."
          onClose={() => setProdutoModal(null)}
        >
          <form onSubmit={handleSalvarProduto} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field
                  label="Nome do produto"
                  name="nome"
                  required
                  defaultValue={produtoModal.produto?.nome}
                  placeholder="Ex: Ácido hialurônico, toxina botulínica, luva..."
                />
              </div>

              <Field
                label="Categoria"
                name="categoria"
                defaultValue={produtoModal.produto?.categoria}
                placeholder="Ex: Injetáveis, descartáveis, cosméticos"
              />

              <Field
                label="Unidade"
                name="unidade"
                defaultValue={produtoModal.produto?.unidade ?? "un"}
                placeholder="un, cx, ml, frasco..."
              />

              <Field
                label="Quantidade atual"
                name="quantidade"
                type="number"
                min="0"
                defaultValue={produtoModal.produto?.quantidade ?? 0}
              />

              <Field
                label="Estoque mínimo"
                name="estoqueMinimo"
                type="number"
                min="0"
                defaultValue={produtoModal.produto?.estoqueMinimo ?? 0}
              />

              <Field
                label="Valor de compra"
                name="valorCompra"
                type="number"
                min="0"
                step="0.01"
                defaultValue={produtoModal.produto?.valorCompra ?? 0}
              />

              <Field
                label="Valor de venda"
                name="valorVenda"
                type="number"
                min="0"
                step="0.01"
                defaultValue={produtoModal.produto?.valorVenda ?? 0}
              />

              <div className="md:col-span-2">
                <SelectFornecedor
                  fornecedores={fornecedores}
                  defaultValue={produtoModal.produto?.fornecedorId}
                />
              </div>

              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Observações
                </span>

                <textarea
                  name="observacoes"
                  defaultValue={produtoModal.produto?.observacoes ?? ""}
                  placeholder="Ex: lote, validade, marca, concentração ou observações internas"
                  className="premium-input min-h-28 w-full resize-none"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setProdutoModal(null)}
              >
                Cancelar
              </Button>

              <Button type="submit" disabled={salvando}>
                <Save className="h-4 w-4" />
                {salvando ? "Salvando..." : "Salvar produto"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {fornecedorModalAberto ? (
        <Modal
          titulo="Cadastrar fornecedor"
          descricao="Adicione fornecedores de produtos, materiais ou descartáveis."
          onClose={() => setFornecedorModalAberto(false)}
        >
          <form onSubmit={handleSalvarFornecedor} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field
                  label="Nome do fornecedor"
                  name="nome"
                  required
                  placeholder="Nome da empresa ou fornecedor"
                />
              </div>

              <Field
                label="Telefone"
                name="telefone"
                placeholder="(11) 99999-9999"
              />

              <Field
                label="E-mail"
                name="email"
                type="email"
                placeholder="contato@fornecedor.com"
              />

              <Field
                label="CNPJ"
                name="cnpj"
                placeholder="00.000.000/0000-00"
              />

              <Field
                label="Endereço"
                name="endereco"
                placeholder="Endereço do fornecedor"
              />

              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Observações
                </span>

                <textarea
                  name="observacoes"
                  placeholder="Informações comerciais, prazos, condições ou contatos internos"
                  className="premium-input min-h-28 w-full resize-none"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFornecedorModalAberto(false)}
              >
                Cancelar
              </Button>

              <Button type="submit" disabled={salvando}>
                <Save className="h-4 w-4" />
                {salvando ? "Salvando..." : "Salvar fornecedor"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {movimentacaoModal ? (
        <Modal
          titulo={
            movimentacaoModal.tipo === "ENTRADA"
              ? "Registrar entrada de estoque"
              : "Registrar saída de estoque"
          }
          descricao={
            movimentacaoModal.tipo === "ENTRADA"
              ? "Use para compras, reposições ou ajustes positivos."
              : "Use para consumo em procedimento, perda, vencimento ou ajuste negativo."
          }
          onClose={() => setMovimentacaoModal(null)}
        >
          <form onSubmit={handleRegistrarMovimentacao} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Produto
                </span>

                <select
                  name="produtoId"
                  required
                  defaultValue={movimentacaoModal.produto?.id ?? ""}
                  disabled={Boolean(movimentacaoModal.produto)}
                  className="premium-input min-h-12 w-full disabled:opacity-70"
                >
                  <option value="">Selecione um produto</option>

                  {produtos.map((produto) => (
                    <option key={produto.id} value={produto.id}>
                      {produto.nome} • estoque atual: {produto.quantidade}{" "}
                      {produto.unidade}
                    </option>
                  ))}
                </select>

                {movimentacaoModal.produto ? (
                  <input
                    type="hidden"
                    name="produtoId"
                    value={movimentacaoModal.produto.id}
                  />
                ) : null}
              </label>

              <Field
                label="Quantidade"
                name="quantidade"
                type="number"
                min="1"
                required
                placeholder="Informe a quantidade"
              />

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Motivo
                </span>

                <select
                  name="motivo"
                  required
                  className="premium-input min-h-12 w-full"
                  defaultValue={
                    movimentacaoModal.tipo === "ENTRADA"
                      ? "Compra de produto"
                      : "Uso em procedimento"
                  }
                >
                  {movimentacaoModal.tipo === "ENTRADA" ? (
                    <>
                      <option value="Compra de produto">
                        Compra de produto
                      </option>
                      <option value="Reposição de estoque">
                        Reposição de estoque
                      </option>
                      <option value="Ajuste positivo">Ajuste positivo</option>
                      <option value="Devolução">Devolução</option>
                    </>
                  ) : (
                    <>
                      <option value="Uso em procedimento">
                        Uso em procedimento
                      </option>
                      <option value="Perda">Perda</option>
                      <option value="Produto vencido">Produto vencido</option>
                      <option value="Ajuste negativo">Ajuste negativo</option>
                    </>
                  )}
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Observações
                </span>

                <textarea
                  name="observacoes"
                  placeholder="Detalhes da movimentação, lote, validade, procedimento ou responsável"
                  className="premium-input min-h-28 w-full resize-none"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMovimentacaoModal(null)}
              >
                Cancelar
              </Button>

              <Button type="submit" disabled={salvando}>
                {movimentacaoModal.tipo === "ENTRADA" ? (
                  <ArrowDownToLine className="h-4 w-4" />
                ) : (
                  <ArrowUpFromLine className="h-4 w-4" />
                )}
                {salvando ? "Salvando..." : "Registrar movimentação"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}