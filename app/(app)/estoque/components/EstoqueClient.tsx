"use client";

import { useMemo, useState } from "react";
import type { Fornecedor, MovimentacaoEstoque, Produto } from "@prisma/client";

import StatCard from "@/components/dashboard/StatCard";
import { formatarMoeda } from "@/lib/format";

type ProdutoComFornecedor = Produto & { fornecedor: Fornecedor | null };
type MovimentacaoComProduto = MovimentacaoEstoque & { produto: Produto };

type Props = {
  produtos: ProdutoComFornecedor[];
  fornecedores: Fornecedor[];
  movimentacoes: MovimentacaoComProduto[];
};

export default function EstoqueClient({
  produtos,
  fornecedores,
  movimentacoes,
}: Props) {
  const [busca, setBusca] = useState("");

  // 🔎 filtro simples
  const produtosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();

    return produtos.filter((p) => {
      const texto =
        `${p.nome} ${p.categoria ?? ""} ${p.fornecedor?.nome ?? ""}`.toLowerCase();

      return !termo || texto.includes(termo);
    });
  }, [busca, produtos]);

  // 📊 KPIs
  const totalProdutos = produtos.length;

  const valorEstoque = produtos.reduce(
    (acc, p) => acc + p.quantidade * p.valorCompra,
    0
  );

  const baixoEstoque = produtos.filter(
    (p) => p.quantidade <= p.estoqueMinimo
  ).length;

  const fornecedoresAtivos = fornecedores.length;

  const giroMes = movimentacoes.length;

  return (
    <div className="space-y-6">

      {/* 🔥 CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

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

      {/* 🔎 BUSCA */}
      <div className="mt-6">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produtos..."
          className="w-full p-2 rounded bg-white/5 border border-white/10 text-white"
        />
      </div>

      {/* 📦 LISTA */}
      <div className="mt-4 space-y-2">
        {produtosFiltrados.map((p) => (
          <div
            key={p.id}
            className="flex justify-between p-3 rounded bg-white/5 border border-white/10"
          >
            <span>{p.nome}</span>
            <span>{p.quantidade}</span>
          </div>
        ))}
      </div>

    </div>
  );
}