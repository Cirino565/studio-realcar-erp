"use server";

import { revalidatePath } from "next/cache";

import { isAdminUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type KitProdutoItemInput = {
  produtoId: number;
  quantidade?: number;
  acrescimo?: number;
  ordem?: number;
};

export type SalvarKitProdutoInput = {
  id?: number;
  nome: string;
  tipo: "FIXO" | "FLEXIVEL";
  precoVenda: number;
  quantidadeEscolha?: number;
  permitirRepeticao?: boolean;
  descontoTipo?: "NENHUM" | "PERCENTUAL" | "VALOR";
  descontoValor?: number;
  status?: string;
  observacoes?: string;
  itens: KitProdutoItemInput[];
};

function limparTexto(value?: string | null) {
  const texto = value?.trim();
  return texto || null;
}

function numeroNaoNegativo(value: unknown) {
  const numero = Number(value);
  return Number.isFinite(numero) ? Math.max(0, numero) : 0;
}

function inteiroPositivo(value: unknown, fallback = 1) {
  const numero = Math.trunc(Number(value));
  return Number.isFinite(numero) && numero > 0 ? numero : fallback;
}

function revalidarKits() {
  revalidatePath("/estoque");
  revalidatePath("/vendas");
  revalidatePath("/agenda");
  revalidatePath("/backup");
}

function validarKit(dados: SalvarKitProdutoInput) {
  const nome = dados.nome?.trim();
  if (!nome) throw new Error("Informe o nome do kit.");

  const tipo = dados.tipo === "FLEXIVEL" ? "FLEXIVEL" : "FIXO";
  const precoVenda = tipo === "FIXO" ? numeroNaoNegativo(dados.precoVenda) : 0;
  const descontoTipo =
    tipo === "FLEXIVEL" &&
    (dados.descontoTipo === "PERCENTUAL" || dados.descontoTipo === "VALOR")
      ? dados.descontoTipo
      : "NENHUM";
  const descontoValor =
    descontoTipo === "NENHUM" ? 0 : numeroNaoNegativo(dados.descontoValor);

  if (descontoTipo === "PERCENTUAL" && descontoValor > 100) {
    throw new Error("O desconto percentual não pode ser maior que 100%.");
  }

  const mapa = new Map<number, KitProdutoItemInput>();
  for (const item of dados.itens || []) {
    const produtoId = Math.trunc(Number(item.produtoId));
    if (!produtoId || produtoId <= 0) continue;
    if (mapa.has(produtoId)) {
      throw new Error("Um produto não pode aparecer duas vezes na configuração do mesmo kit.");
    }
    mapa.set(produtoId, item);
  }

  const itens = Array.from(mapa.values()).map((item, index) => ({
    produtoId: Math.trunc(Number(item.produtoId)),
    quantidade: tipo === "FIXO" ? inteiroPositivo(item.quantidade, 1) : 1,
    acrescimo: tipo === "FIXO" ? numeroNaoNegativo(item.acrescimo) : 0,
    ordem: Number.isFinite(Number(item.ordem)) ? Math.trunc(Number(item.ordem)) : index,
  }));

  if (itens.length === 0) {
    throw new Error(
      tipo === "FIXO"
        ? "Adicione ao menos um produto à composição fixa."
        : "Adicione ao menos um produto permitido no kit flexível.",
    );
  }

  return {
    nome,
    tipo,
    precoVenda,
    quantidadeEscolha:
      tipo === "FLEXIVEL" ? 0 : itens.reduce((t, i) => t + i.quantidade, 0),
    permitirRepeticao: tipo === "FLEXIVEL" ? Boolean(dados.permitirRepeticao) : false,
    descontoTipo,
    descontoValor,
    status:
      dados.status?.trim().toLowerCase() === "inativo" ? "Inativo" : "Ativo",
    observacoes: limparTexto(dados.observacoes),
    itens,
  };
}

export async function salvarKitProduto(dados: SalvarKitProdutoInput) {
  const usuario = await requirePermission("estoque.gerenciar");
  const normalizado = validarKit(dados);

  const duplicado = await prisma.kitProduto.findFirst({
    where: {
      nome: normalizado.nome,
      ...(dados.id ? { id: { not: dados.id } } : {}),
    },
    select: { id: true },
  });

  if (duplicado) {
    throw new Error("Já existe um kit cadastrado com este nome.");
  }

  const idsProdutos = normalizado.itens.map((item) => item.produtoId);
  const produtos = await prisma.produto.findMany({
    where: { id: { in: idsProdutos } },
    select: { id: true, nome: true, status: true },
  });

  if (produtos.length !== idsProdutos.length) {
    throw new Error("Um ou mais produtos selecionados não foram encontrados.");
  }

  const produtosInativos = produtos.filter(
    (produto) => produto.status.toLowerCase() !== "ativo",
  );
  if (normalizado.status === "Ativo" && produtosInativos.length > 0) {
    throw new Error(
      `Para ativar o kit, reative ou remova: ${produtosInativos
        .map((produto) => produto.nome)
        .join(", ")}.`,
    );
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const kit = dados.id
      ? await tx.kitProduto.update({
          where: { id: dados.id },
          data: {
            nome: normalizado.nome,
            tipo: normalizado.tipo,
            precoVenda: normalizado.precoVenda,
            quantidadeEscolha: normalizado.quantidadeEscolha,
            permitirRepeticao: normalizado.permitirRepeticao,
            descontoTipo: normalizado.descontoTipo,
            descontoValor: normalizado.descontoValor,
            status: normalizado.status,
            observacoes: normalizado.observacoes,
          },
        })
      : await tx.kitProduto.create({
          data: {
            nome: normalizado.nome,
            tipo: normalizado.tipo,
            precoVenda: normalizado.precoVenda,
            quantidadeEscolha: normalizado.quantidadeEscolha,
            permitirRepeticao: normalizado.permitirRepeticao,
            descontoTipo: normalizado.descontoTipo,
            descontoValor: normalizado.descontoValor,
            status: normalizado.status,
            observacoes: normalizado.observacoes,
          },
        });

    if (dados.id) {
      await tx.kitProdutoItem.deleteMany({ where: { kitProdutoId: kit.id } });
    }

    await tx.kitProdutoItem.createMany({
      data: normalizado.itens.map((item) => ({
        kitProdutoId: kit.id,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        acrescimo: item.acrescimo,
        ordem: item.ordem,
      })),
    });

    await tx.auditoria.create({
      data: {
        modulo: "Estoque",
        acao: dados.id ? "Atualizou kit de produtos" : "Cadastrou kit de produtos",
        entidade: "KitProduto",
        entidadeId: String(kit.id),
        usuario: usuario.email,
        detalhes:
          normalizado.tipo === "FLEXIVEL"
            ? `${normalizado.nome}. Tipo: FLEXIVEL. Produtos permitidos: ${normalizado.itens.length}. Seleção livre. Desconto: ${normalizado.descontoTipo} ${normalizado.descontoValor.toFixed(2)}.`
            : `${normalizado.nome}. Tipo: FIXO. Itens configurados: ${normalizado.itens.length}. Preço: R$ ${normalizado.precoVenda.toFixed(2)}.`,
      },
    });

    return kit;
  });

  revalidarKits();
  return { ok: true, id: resultado.id };
}

export async function alterarStatusKitProduto(id: number, status: "Ativo" | "Inativo") {
  const usuario = await requirePermission("estoque.gerenciar");

  if (status === "Ativo") {
    const kitAtual = await prisma.kitProduto.findUnique({
      where: { id },
      select: {
        nome: true,
        itens: {
          select: {
            produto: { select: { nome: true, status: true } },
          },
        },
      },
    });

    if (!kitAtual) {
      throw new Error("Kit não encontrado.");
    }
    if (kitAtual.itens.length === 0) {
      throw new Error("Não é possível ativar um kit sem produtos configurados.");
    }

    const produtosInativos = kitAtual.itens
      .map((item) => item.produto)
      .filter((produto) => produto.status.toLowerCase() !== "ativo");
    if (produtosInativos.length > 0) {
      throw new Error(
        `Para ativar o kit, reative ou remova: ${produtosInativos
          .map((produto) => produto.nome)
          .join(", ")}.`,
      );
    }
  }

  const kit = await prisma.kitProduto.update({
    where: { id },
    data: { status },
  });

  await prisma.auditoria.create({
    data: {
      modulo: "Estoque",
      acao: status === "Ativo" ? "Ativou kit de produtos" : "Inativou kit de produtos",
      entidade: "KitProduto",
      entidadeId: String(id),
      usuario: usuario.email,
      detalhes: kit.nome,
    },
  });

  revalidarKits();
  return { ok: true };
}

export async function excluirOuArquivarKitProduto(id: number) {
  const usuario = await requirePermission("estoque.gerenciar");
  if (!isAdminUser(usuario)) {
    throw new Error("Somente administradores podem excluir ou arquivar kits.");
  }

  const kitId = Math.trunc(Number(id));
  if (!kitId || kitId <= 0) throw new Error("Kit inválido.");

  const kit = await prisma.kitProduto.findUnique({
    where: { id: kitId },
    select: {
      id: true,
      nome: true,
      status: true,
      _count: { select: { itensVenda: true } },
    },
  });

  if (!kit) throw new Error("Kit não encontrado.");

  if (kit._count.itensVenda > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.kitProduto.update({
        where: { id: kit.id },
        data: { status: "Inativo" },
      });
      await tx.auditoria.create({
        data: {
          modulo: "Estoque",
          acao: "Arquivou kit com histórico de vendas",
          entidade: "KitProduto",
          entidadeId: String(kit.id),
          usuario: usuario.email,
          detalhes: `${kit.nome}. O kit possui ${kit._count.itensVenda} item(ns) de venda vinculados e foi preservado para auditoria.`,
        },
      });
    });

    revalidarKits();
    return {
      ok: true,
      modo: "ARQUIVADO" as const,
      mensagem: `O kit ${kit.nome} já possui histórico e foi arquivado, não excluído.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.kitProduto.delete({ where: { id: kit.id } });
    await tx.auditoria.create({
      data: {
        modulo: "Estoque",
        acao: "Excluiu kit sem histórico de vendas",
        entidade: "KitProduto",
        entidadeId: String(kit.id),
        usuario: usuario.email,
        detalhes: kit.nome,
      },
    });
  });

  revalidarKits();
  return {
    ok: true,
    modo: "EXCLUIDO" as const,
    mensagem: `Kit ${kit.nome} excluído definitivamente.`,
  };
}
