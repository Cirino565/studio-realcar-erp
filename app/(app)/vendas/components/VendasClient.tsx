"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  PackageCheck,
  Pencil,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  X,
} from "lucide-react";

import {
  cancelarVendaAdministrativa,
  criarVendaProdutos,
  editarVendaAdministrativa,
} from "@/actions/venda.actions";
import ClienteVendaSearch from "@/components/vendas/ClienteVendaSearch";
import KitsVendaEditor from "@/components/vendas/KitsVendaEditor";
import ProdutosVendaEditor from "@/components/vendas/ProdutosVendaEditor";
import type {
  ItemKitVendaDraft,
  ItemProdutoVendaDraft,
  KitVendaOption,
  ProdutoVendaOption,
} from "@/lib/vendas.types";
import {
  custoUnitarioKit,
  necessidadesEstoqueVenda,
  valorUnitarioKit,
} from "@/lib/vendas.types";
import type { ClienteVendaOption, VendaHistoricoItem } from "../types";

type Props = {
  clientes: ClienteVendaOption[];
  produtos: ProdutoVendaOption[];
  kits: KitVendaOption[];
  vendas: VendaHistoricoItem[];
  podeGerenciar: boolean;
  podeAutorizarEstoqueNegativo: boolean;
  podeAdministrarVendas: boolean;
};

type EditarVendaState = {
  venda: VendaHistoricoItem;
  formaPagamento: string;
  statusPagamento: "Pago" | "Pendente";
  observacoes: string;
  data: string;
};

type CancelarVendaState = {
  venda: VendaHistoricoItem;
  motivo: string;
};

const FORMAS_PAGAMENTO = [
  "Pix",
  "Dinheiro",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência",
  "Outro",
];

function moeda(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataHora(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function valorDataLocal(value: string) {
  const data = new Date(value);
  const deslocamento = data.getTimezoneOffset() * 60_000;
  return new Date(data.getTime() - deslocamento).toISOString().slice(0, 16);
}

function chaveCliente() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

export default function VendasClient({
  clientes,
  produtos,
  kits,
  vendas,
  podeGerenciar,
  podeAutorizarEstoqueNegativo,
  podeAdministrarVendas,
}: Props) {
  const router = useRouter();
  const [clienteId, setClienteId] = useState("");
  const [itens, setItens] = useState<ItemProdutoVendaDraft[]>([]);
  const [itensKits, setItensKits] = useState<ItemKitVendaDraft[]>([]);
  const [permitirEstoqueNegativo, setPermitirEstoqueNegativo] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState("Pix");
  const [statusPagamento, setStatusPagamento] = useState("Pago");
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [editarVenda, setEditarVenda] = useState<EditarVendaState | null>(null);
  const [cancelarVenda, setCancelarVenda] = useState<CancelarVendaState | null>(null);
  const [isPending, startTransition] = useTransition();

  const resumo = useMemo(() => {
    const receitaProdutos = itens.reduce(
      (total, item) => total + item.valorUnitario * item.quantidade,
      0,
    );
    const custoProdutos = itens.reduce(
      (total, item) => total + item.custoUnitario * item.quantidade,
      0,
    );
    const receitaKits = itensKits.reduce(
      (total, item) => total + valorUnitarioKit(item) * item.quantidadeKits,
      0,
    );
    const custoKits = itensKits.reduce(
      (total, item) => total + custoUnitarioKit(item) * item.quantidadeKits,
      0,
    );
    const receita = receitaProdutos + receitaKits;
    const custo = custoProdutos + custoKits;
    const margem = receita - custo;
    return {
      receita,
      custo,
      margem,
      margemPercentual: receita > 0 ? (margem / receita) * 100 : 0,
    };
  }, [itens, itensKits]);

  const estoqueInsuficiente = useMemo(
    () => necessidadesEstoqueVenda(itens, itensKits),
    [itens, itensKits],
  );

  const vendasAtivas = vendas.filter((venda) => venda.situacao !== "CANCELADA");
  const vendasPagas = vendasAtivas.filter(
    (venda) => venda.statusPagamento.toLowerCase() === "pago",
  );
  const receitaRecente = vendasPagas.reduce(
    (total, venda) => total + venda.valorTotal,
    0,
  );
  const margemRecente = vendasPagas.reduce(
    (total, venda) => total + venda.valorTotal - venda.custoTotal,
    0,
  );

  function limpar() {
    setClienteId("");
    setItens([]);
    setItensKits([]);
    setPermitirEstoqueNegativo(false);
    setFormaPagamento("Pix");
    setStatusPagamento("Pago");
    setObservacoes("");
    setErro("");
  }

  function salvarVenda() {
    setErro("");
    setSucesso("");

    if (!clienteId) {
      setErro("Selecione a cliente da venda.");
      return;
    }
    if (itens.length === 0 && itensKits.length === 0) {
      setErro("Adicione pelo menos um produto ou kit.");
      return;
    }
    if (estoqueInsuficiente.length > 0 && !permitirEstoqueNegativo) {
      setErro(
        "Há estoque insuficiente. Um administrador precisa autorizar o saldo negativo ou ajustar a venda.",
      );
      return;
    }

    startTransition(async () => {
      try {
        const resultado = await criarVendaProdutos({
          clienteId: Number(clienteId),
          produtos: itens.map((item) => ({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            valorUnitario: item.valorUnitario,
          })),
          kits: itensKits.map((item) => ({
            kitId: item.kitId,
            quantidade: item.quantidadeKits,
            componentes:
              item.tipo === "FLEXIVEL"
                ? item.componentes.map((componente) => ({
                    produtoId: componente.produtoId,
                    quantidade: componente.quantidadePorKit,
                  }))
                : undefined,
          })),
          permitirEstoqueNegativo,
          formaPagamento,
          statusPagamento,
          observacoes,
        });

        setSucesso(
          `Venda #${resultado.vendaId} registrada em ${moeda(resultado.valorTotal)}.`,
        );
        limpar();
        router.refresh();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível registrar a venda.",
        );
      }
    });
  }

  function abrirEdicao(venda: VendaHistoricoItem) {
    setErro("");
    setSucesso("");
    setEditarVenda({
      venda,
      formaPagamento: venda.formaPagamento || "Não informado",
      statusPagamento:
        venda.statusPagamento === "Pendente" ? "Pendente" : "Pago",
      observacoes: venda.observacoes || "",
      data: valorDataLocal(venda.data),
    });
  }

  function salvarEdicao() {
    if (!editarVenda) return;
    setErro("");
    setSucesso("");

    startTransition(async () => {
      try {
        const resultado = await editarVendaAdministrativa({
          vendaId: editarVenda.venda.id,
          formaPagamento: editarVenda.formaPagamento,
          statusPagamento: editarVenda.statusPagamento,
          observacoes: editarVenda.observacoes,
          data: new Date(editarVenda.data).toISOString(),
        });
        setEditarVenda(null);
        setSucesso(resultado.mensagem);
        router.refresh();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar a venda.",
        );
      }
    });
  }

  function confirmarCancelamento() {
    if (!cancelarVenda) return;
    setErro("");
    setSucesso("");

    startTransition(async () => {
      try {
        const resultado = await cancelarVendaAdministrativa({
          vendaId: cancelarVenda.venda.id,
          motivo: cancelarVenda.motivo,
        });
        setCancelarVenda(null);
        setSucesso(resultado.mensagem);
        router.refresh();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível cancelar a venda.",
        );
      }
    });
  }

  function refazerVenda(venda: VendaHistoricoItem) {
    setErro("");
    setSucesso("");

    if (!venda.cliente) {
      setErro("Esta venda não possui cliente vinculada e não pode ser refeita automaticamente.");
      return;
    }

    const avisos: string[] = [];
    const produtosDraft: ItemProdutoVendaDraft[] = [];
    const kitsDraft: ItemKitVendaDraft[] = [];

    for (const item of venda.itens.filter((registro) => registro.tipo === "PRODUTO")) {
      const produto = produtos.find((registro) => registro.id === item.produtoId);
      if (!produto || produto.status.toLowerCase() !== "ativo") {
        avisos.push(`Produto indisponível: ${item.descricao}`);
        continue;
      }
      produtosDraft.push({
        produtoId: produto.id,
        nome: produto.nome,
        unidade: produto.unidade,
        quantidade: item.quantidade,
        estoqueDisponivel: produto.quantidade,
        valorUnitario: item.valorUnitario,
        custoUnitario: produto.valorCompra,
      });
    }

    for (const item of venda.itens.filter((registro) => registro.tipo === "KIT")) {
      const kit = kits.find((registro) => registro.id === item.kitProdutoId);
      if (!kit || kit.status.toLowerCase() !== "ativo") {
        avisos.push(`Kit indisponível: ${item.descricao}`);
        continue;
      }

      const componentesHistoricos = venda.itens.filter(
        (registro) =>
          registro.tipo === "KIT_COMPONENTE" &&
          registro.grupoKitId &&
          registro.grupoKitId === item.grupoKitId,
      );

      const componentes =
        kit.tipo === "FLEXIVEL"
          ? componentesHistoricos.flatMap((componente) => {
              const produto = produtos.find(
                (registro) => registro.id === componente.produtoId,
              );
              const config = kit.itens.find(
                (registro) => registro.produtoId === componente.produtoId,
              );
              if (!produto || !config) return [];
              return [
                {
                  produtoId: produto.id,
                  nome: produto.nome,
                  unidade: produto.unidade,
                  quantidadePorKit: Math.max(
                    1,
                    Math.trunc(componente.quantidade / Math.max(1, item.quantidade)),
                  ),
                  estoqueDisponivel: produto.quantidade,
                  custoUnitario: produto.valorCompra,
                  valorVendaUnitario: produto.valorVenda,
                  acrescimoUnitario: config.acrescimo,
                },
              ];
            })
          : kit.itens.map((config) => ({
              produtoId: config.produto.id,
              nome: config.produto.nome,
              unidade: config.produto.unidade,
              quantidadePorKit: config.quantidade,
              estoqueDisponivel: config.produto.quantidade,
              custoUnitario: config.produto.valorCompra,
              valorVendaUnitario: config.produto.valorVenda,
              acrescimoUnitario: config.acrescimo,
            }));

      if (componentes.length === 0) {
        avisos.push(`O kit ${item.descricao} não possui composição válida atualmente.`);
        continue;
      }

      kitsDraft.push({
        clientKey: chaveCliente(),
        kitId: kit.id,
        nome: kit.nome,
        tipo: kit.tipo === "FLEXIVEL" ? "FLEXIVEL" : "FIXO",
        quantidadeKits: item.quantidade,
        precoBaseUnitario: kit.tipo === "FIXO" ? kit.precoVenda : 0,
        descontoTipo: kit.descontoTipo,
        descontoValor: kit.descontoValor,
        componentes,
      });
    }

    setClienteId(String(venda.cliente.id));
    setItens(produtosDraft);
    setItensKits(kitsDraft);
    setFormaPagamento(venda.formaPagamento || "Pix");
    setStatusPagamento("Pago");
    setObservacoes(`Refação da venda #${venda.id}. Revise todos os itens antes de registrar.`);
    setPermitirEstoqueNegativo(false);
    setSucesso(
      avisos.length > 0
        ? `Formulário preenchido parcialmente. ${avisos.join(" ")}`
        : `Dados da venda #${venda.id} carregados. Revise e registre como uma nova venda.`,
    );
    globalThis.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-w-0 space-y-5 pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
            Nível 3A+
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            Vendas e rentabilidade
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Venda produtos e kits sem criar agendamento. Vendas feitas junto ao atendimento também aparecem aqui com serviço e produtos separados.
          </p>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <ResumoCard
          icon={ReceiptText}
          label="Vendas ativas recentes"
          valor={String(vendasAtivas.length)}
          detalhe="Vendas canceladas permanecem apenas no histórico"
        />
        <ResumoCard
          icon={CircleDollarSign}
          label="Receita paga carregada"
          valor={moeda(receitaRecente)}
          detalhe="Somente vendas ativas marcadas como pagas"
        />
        <ResumoCard
          icon={TrendingUp}
          label="Margem direta carregada"
          valor={moeda(margemRecente)}
          detalhe="Receita menos custo histórico dos itens ativos"
        />
      </section>

      {podeGerenciar ? (
        <section className="premium-card p-4 sm:p-5">
          <div className="flex items-start gap-3 border-b border-slate-200 pb-4 dark:border-white/10">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
              <ShoppingCart className="size-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Nova venda de produtos e kits
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                A baixa dos produtos, os componentes dos kits, o histórico da cliente e o lançamento financeiro são criados juntos.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {erro ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {erro}
              </div>
            ) : null}
            {sucesso ? (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="size-4" />
                {sucesso}
              </div>
            ) : null}

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                Cliente
              </span>
              <ClienteVendaSearch
                clientes={clientes}
                value={clienteId}
                onChange={setClienteId}
              />
            </label>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Produtos avulsos
              </p>
              <ProdutosVendaEditor
                produtos={produtos}
                itens={itens}
                onChange={setItens}
                podeExcederEstoque={podeAutorizarEstoqueNegativo}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Kits
              </p>
              <KitsVendaEditor kits={kits} itens={itensKits} onChange={setItensKits} />
            </div>

            {estoqueInsuficiente.length > 0 ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold">
                      Estoque insuficiente para concluir esta composição
                    </p>
                    <p className="mt-1 text-[11px] leading-5">
                      {estoqueInsuficiente
                        .map(
                          (item) =>
                            `${item.nome}: precisa ${item.necessario}, disponível ${item.disponivel}`,
                        )
                        .join("; ")}
                    </p>
                    {podeAutorizarEstoqueNegativo ? (
                      <label className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-white/70 p-3">
                        <input
                          type="checkbox"
                          checked={permitirEstoqueNegativo}
                          onChange={(event) =>
                            setPermitirEstoqueNegativo(event.target.checked)
                          }
                          className="mt-0.5 size-4"
                        />
                        <span className="text-xs font-semibold">
                          Autorizar estoque negativo nesta venda. A autorização ficará registrada na auditoria.
                        </span>
                      </label>
                    ) : (
                      <p className="mt-2 text-[11px] font-semibold">
                        Ajuste os itens ou solicite autorização de um administrador.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Forma de pagamento
                </span>
                <select
                  value={formaPagamento}
                  onChange={(event) => setFormaPagamento(event.target.value)}
                  className="premium-input w-full"
                >
                  {FORMAS_PAGAMENTO.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Status
                </span>
                <select
                  value={statusPagamento}
                  onChange={(event) => setStatusPagamento(event.target.value)}
                  className="premium-input w-full"
                >
                  <option value="Pago">Pago</option>
                  <option value="Pendente">Pendente, a receber</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                Observações
              </span>
              <textarea
                value={observacoes}
                onChange={(event) => setObservacoes(event.target.value)}
                className="premium-input min-h-20 w-full resize-none"
                placeholder="Opcional"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-4">
              <ValorCard label="Receita" value={resumo.receita} />
              <ValorCard label="Custo" value={resumo.custo} />
              <ValorCard label="Margem" value={resumo.margem} />
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-400/20 dark:bg-violet-400/10">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                  Margem %
                </p>
                <p className="mt-1 text-xl font-black text-violet-950 dark:text-white">
                  {resumo.margemPercentual.toFixed(1).replace(".", ",")}%
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={salvarVenda}
                disabled={
                  isPending ||
                  (itens.length === 0 && itensKits.length === 0) ||
                  !clienteId ||
                  (estoqueInsuficiente.length > 0 && !permitirEstoqueNegativo)
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-40"
              >
                <PackageCheck className="size-4" />
                {isPending
                  ? "Registrando..."
                  : `Registrar venda, ${moeda(resumo.receita)}`}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="premium-card overflow-hidden">
        <div className="border-b border-slate-200 p-4 sm:p-5 dark:border-white/10">
          <h2 className="font-bold text-slate-950 dark:text-white">
            Histórico de vendas
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Vendas canceladas permanecem visíveis para auditoria, mas não contam em receita ou margem.
          </p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-white/10">
          {vendas.length > 0 ? (
            vendas.map((venda) => (
              <VendaRow
                key={venda.id}
                venda={venda}
                podeAdministrar={podeAdministrarVendas}
                onEditar={() => abrirEdicao(venda)}
                onCancelar={() => setCancelarVenda({ venda, motivo: "" })}
                onRefazer={() => refazerVenda(venda)}
              />
            ))
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">
              Nenhuma venda registrada ainda.
            </div>
          )}
        </div>
      </section>

      {editarVenda ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-white/10 p-4">
              <div>
                <h3 className="font-bold text-white">
                  Editar venda #{editarVenda.venda.id}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Esta edição não altera produtos, estoque, custo ou cliente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditarVenda(null)}
                className="rounded-xl border border-white/10 p-2 text-slate-300"
              >
                <X className="size-4" />
              </button>
            </header>
            <main className="space-y-3 p-4">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-300">
                  Data e hora
                </span>
                <input
                  type="datetime-local"
                  value={editarVenda.data}
                  onChange={(event) =>
                    setEditarVenda({ ...editarVenda, data: event.target.value })
                  }
                  className="premium-input w-full"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs font-bold text-slate-300">
                    Forma de pagamento
                  </span>
                  <select
                    value={editarVenda.formaPagamento}
                    onChange={(event) =>
                      setEditarVenda({
                        ...editarVenda,
                        formaPagamento: event.target.value,
                      })
                    }
                    className="premium-input w-full"
                  >
                    {[...FORMAS_PAGAMENTO, "Não informado"].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-bold text-slate-300">
                    Status
                  </span>
                  <select
                    value={editarVenda.statusPagamento}
                    onChange={(event) =>
                      setEditarVenda({
                        ...editarVenda,
                        statusPagamento: event.target.value as "Pago" | "Pendente",
                      })
                    }
                    className="premium-input w-full"
                  >
                    <option value="Pago">Pago</option>
                    <option value="Pendente">Pendente</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-300">
                  Observações
                </span>
                <textarea
                  value={editarVenda.observacoes}
                  onChange={(event) =>
                    setEditarVenda({
                      ...editarVenda,
                      observacoes: event.target.value,
                    })
                  }
                  className="premium-input min-h-28 w-full resize-none"
                />
              </label>
            </main>
            <footer className="grid grid-cols-2 gap-2 border-t border-white/10 p-3">
              <button
                type="button"
                onClick={() => setEditarVenda(null)}
                className="h-10 rounded-xl border border-white/10 text-xs font-bold text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarEdicao}
                disabled={isPending || !editarVenda.data}
                className="h-10 rounded-xl bg-violet-600 text-xs font-bold text-white disabled:opacity-40"
              >
                {isPending ? "Salvando..." : "Salvar correção"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {cancelarVenda ? (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-rose-400/20 bg-slate-950 shadow-2xl">
            <header className="flex items-start gap-3 border-b border-white/10 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
                <Ban className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white">
                  Cancelar e estornar venda #{cancelarVenda.venda.id}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  O estoque será devolvido, o lançamento financeiro será cancelado e o valor gasto da cliente será corrigido. O histórico será preservado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelarVenda(null)}
                className="rounded-xl border border-white/10 p-2 text-slate-300"
              >
                <X className="size-4" />
              </button>
            </header>
            <main className="space-y-3 p-4">
              {cancelarVenda.venda.agendamentoId ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs leading-5 text-amber-200">
                  Esta venda foi gerada por atendimento. O cancelamento da venda não altera o status do agendamento nem apaga a evolução clínica.
                </div>
              ) : null}
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-300">
                  Motivo obrigatório
                </span>
                <textarea
                  value={cancelarVenda.motivo}
                  onChange={(event) =>
                    setCancelarVenda({
                      ...cancelarVenda,
                      motivo: event.target.value,
                    })
                  }
                  className="premium-input min-h-28 w-full resize-none"
                  placeholder="Ex.: venda lançada para a cliente incorreta"
                  maxLength={500}
                />
                <p className="mt-1 text-right text-[10px] text-slate-500">
                  {cancelarVenda.motivo.length}/500
                </p>
              </label>
            </main>
            <footer className="grid grid-cols-2 gap-2 border-t border-white/10 p-3">
              <button
                type="button"
                onClick={() => setCancelarVenda(null)}
                className="h-10 rounded-xl border border-white/10 text-xs font-bold text-slate-300"
              >
                Manter venda
              </button>
              <button
                type="button"
                onClick={confirmarCancelamento}
                disabled={isPending || cancelarVenda.motivo.trim().length < 5}
                className="h-10 rounded-xl bg-rose-600 text-xs font-bold text-white disabled:opacity-40"
              >
                {isPending ? "Estornando..." : "Confirmar estorno"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResumoCard({
  icon: Icon,
  label,
  valor,
  detalhe,
}: {
  icon: typeof ReceiptText;
  label: string;
  valor: string;
  detalhe: string;
}) {
  return (
    <div className="premium-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-xl font-black text-slate-950 dark:text-white">
            {valor}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">{detalhe}</p>
        </div>
        <Icon className="size-5 text-violet-500" />
      </div>
    </div>
  );
}

function ValorCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
        {moeda(value)}
      </p>
    </div>
  );
}

function VendaRow({
  venda,
  podeAdministrar,
  onEditar,
  onCancelar,
  onRefazer,
}: {
  venda: VendaHistoricoItem;
  podeAdministrar: boolean;
  onEditar: () => void;
  onCancelar: () => void;
  onRefazer: () => void;
}) {
  const cancelada = venda.situacao === "CANCELADA";
  const margem = venda.valorTotal - venda.custoTotal;

  return (
    <div className={`p-4 sm:p-5 ${cancelada ? "bg-rose-50/50 opacity-80 dark:bg-rose-500/[0.03]" : ""}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`font-bold ${cancelada ? "text-slate-500 line-through" : "text-slate-950 dark:text-white"}`}>
              Venda #{venda.id}, {venda.cliente?.nome || "Cliente não vinculada"}
            </p>
            {cancelada ? (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                CANCELADA
              </span>
            ) : (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  venda.statusPagamento.toLowerCase() === "pago"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {venda.statusPagamento}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {dataHora(venda.data)}, {venda.origem}, {venda.formaPagamento || "Pagamento não informado"}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
            {venda.itens
              .filter((item) => item.tipo !== "KIT_COMPONENTE")
              .map((item) => {
                const componentes =
                  item.tipo === "KIT" && item.grupoKitId
                    ? venda.itens.filter(
                        (componente) =>
                          componente.tipo === "KIT_COMPONENTE" &&
                          componente.grupoKitId === item.grupoKitId,
                      )
                    : [];
                return (
                  <span key={item.id}>
                    {item.quantidade}x {item.descricao}, {moeda(item.valorTotal)}
                    {componentes.length > 0 ? (
                      <small className="ml-1 text-[10px] text-slate-400">
                        ({componentes
                          .map(
                            (componente) =>
                              `${componente.quantidade}x ${componente.descricao}`,
                          )
                          .join(", ")})
                      </small>
                    ) : null}
                  </span>
                );
              })}
          </div>
          {cancelada ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-white/70 px-3 py-2 text-[11px] text-rose-700 dark:border-rose-400/20 dark:bg-white/5 dark:text-rose-300">
              Cancelada por {venda.canceladaPor || "administrador"}
              {venda.canceladaEm ? ` em ${dataHora(venda.canceladaEm)}` : ""}.
              {venda.motivoCancelamento ? ` Motivo: ${venda.motivoCancelamento}` : ""}
            </div>
          ) : null}
        </div>
        <div className="shrink-0 sm:text-right">
          <p className={`text-lg font-black ${cancelada ? "text-slate-400 line-through" : "text-slate-950 dark:text-white"}`}>
            {moeda(venda.valorTotal)}
          </p>
          <p className={`text-xs font-semibold ${cancelada ? "text-slate-400" : "text-emerald-600 dark:text-emerald-300"}`}>
            Margem direta {moeda(margem)}
          </p>
          <p className="text-[10px] text-slate-400">Custo {moeda(venda.custoTotal)}</p>
          {podeAdministrar ? (
            <div className="mt-3 flex flex-wrap justify-start gap-1.5 sm:justify-end">
              {!cancelada ? (
                <>
                  <button
                    type="button"
                    onClick={onEditar}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    <Pencil className="size-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={onCancelar}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-400/20 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  >
                    <Ban className="size-3.5" /> Cancelar e estornar
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={onRefazer}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 px-2.5 text-[10px] font-bold text-violet-600 hover:bg-violet-50 dark:border-violet-400/20 dark:text-violet-300 dark:hover:bg-violet-500/10"
              >
                <Copy className="size-3.5" /> Refazer venda
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
