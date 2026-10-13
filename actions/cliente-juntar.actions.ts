"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Marca colocada no nome do cadastro que foi juntado a outro. Serve para ele
// nao aparecer como cliente de verdade nas buscas e para nao ser juntado duas vezes.
const MARCA_CADASTRO_JUNTADO = "[JUNTADO]";

export type ItemResumoJuncao = { rotulo: string; quantidade: number };

export type CadastroParaJuntar = {
  id: number;
  nome: string;
  telefone: string;
  status: string;
  criadoEm: string;
};

export type ResumoJuncao = {
  id: number;
  nome: string;
  telefone: string;
  itens: ItemResumoJuncao[];
  total: number;
};

function idValido(valor: unknown) {
  return typeof valor === "number" && Number.isInteger(valor) && valor > 0;
}

function textoVazio(valor?: string | null) {
  return !valor || !valor.trim();
}

async function contarRegistros(clienteId: number): Promise<ItemResumoJuncao[]> {
  const [
    agendamentos,
    anamneses,
    fotos,
    documentos,
    procedimentos,
    evolucoes,
    respostas,
    contatos,
    mensagens,
    vendas,
    pacotes,
    lancamentos,
  ] = await Promise.all([
    prisma.agendamento.count({ where: { clienteId } }),
    prisma.clienteAnamnese.count({ where: { clienteId } }),
    prisma.clienteFoto.count({ where: { clienteId, excluidaEm: null } }),
    prisma.clienteDocumento.count({ where: { clienteId } }),
    prisma.clienteProcedimento.count({ where: { clienteId } }),
    prisma.clienteEvolucao.count({ where: { clienteId } }),
    prisma.clienteAnamneseResposta.count({ where: { clienteId } }),
    prisma.lead.count({ where: { clienteId } }),
    prisma.comunicacaoRegistro.count({ where: { clienteId } }),
    prisma.venda.count({ where: { clienteId } }),
    prisma.pacoteCliente.count({ where: { clienteId } }),
    prisma.lancamento.count({ where: { clienteId } }),
  ]);

  return [
    { rotulo: "Fotos", quantidade: fotos },
    { rotulo: "Evoluções", quantidade: evolucoes },
    { rotulo: "Procedimentos", quantidade: procedimentos },
    { rotulo: "Fichas de anamnese", quantidade: anamneses },
    { rotulo: "Respostas de anamnese", quantidade: respostas },
    { rotulo: "Documentos", quantidade: documentos },
    { rotulo: "Agendamentos", quantidade: agendamentos },
    { rotulo: "Vendas", quantidade: vendas },
    { rotulo: "Lançamentos financeiros", quantidade: lancamentos },
    { rotulo: "Pacotes", quantidade: pacotes },
    { rotulo: "Contatos (leads)", quantidade: contatos },
    { rotulo: "Mensagens registradas", quantidade: mensagens },
  ].filter((item) => item.quantidade > 0);
}

/** Procura o cadastro duplicado pelo nome ou pelo numero do cadastro (ex.: 127). */
export async function buscarCadastrosParaJuntar(
  destinoId: number,
  termo: string,
): Promise<CadastroParaJuntar[]> {
  await requirePermission("clientes.gerenciar");

  const texto = (termo || "").trim();
  if (!idValido(destinoId) || texto.length < 1) return [];

  const ou: Prisma.ClienteWhereInput[] = [];
  const soNumeros = /^\d{1,9}$/.test(texto.replace(/^#/, ""));

  if (soNumeros) {
    ou.push({ id: Number(texto.replace(/^#/, "")) });
  }
  if (texto.length >= 2) {
    ou.push({ nome: { contains: texto, mode: "insensitive" } });
  }
  if (ou.length === 0) return [];

  const encontrados = await prisma.cliente.findMany({
    where: {
      AND: [
        { id: { not: destinoId } },
        { NOT: { nome: { startsWith: MARCA_CADASTRO_JUNTADO } } },
        { OR: ou },
      ],
    },
    select: { id: true, nome: true, telefone: true, status: true, createdAt: true },
    orderBy: { nome: "asc" },
    take: 15,
  });

  return encontrados.map((cliente) => ({
    id: cliente.id,
    nome: cliente.nome,
    telefone: cliente.telefone,
    status: cliente.status,
    criadoEm: cliente.createdAt.toISOString(),
  }));
}

/** Mostra o que sera passado para o cadastro principal, antes de confirmar. */
export async function resumoJuntarCadastros(
  destinoId: number,
  origemId: number,
): Promise<ResumoJuncao> {
  await requirePermission("clientes.gerenciar");

  if (!idValido(destinoId) || !idValido(origemId) || destinoId === origemId) {
    throw new Error("Escolha dois cadastros diferentes.");
  }

  const origem = await prisma.cliente.findUnique({
    where: { id: origemId },
    select: { id: true, nome: true, telefone: true },
  });

  if (!origem) throw new Error("Cadastro não encontrado.");
  if (origem.nome.startsWith(MARCA_CADASTRO_JUNTADO)) {
    throw new Error("Este cadastro já foi juntado a outro.");
  }

  const itens = await contarRegistros(origemId);

  return {
    id: origem.id,
    nome: origem.nome,
    telefone: origem.telefone,
    itens,
    total: itens.reduce((soma, item) => soma + item.quantidade, 0),
  };
}

const CAMPOS_TEXTO_PARA_COMPLETAR = [
  "whatsapp",
  "cpf",
  "instagram",
  "cep",
  "logradouro",
  "numero",
  "complemento",
  "bairro",
  "cidade",
  "estado",
  "enderecoOriginal",
  "origem",
  "procedimentoInteresse",
  "procedimento",
  "responsavelNome",
  "responsavelTelefone",
  "responsavelParentesco",
  "contatoConfiancaNome",
  "contatoConfiancaTelefone",
  "contatoConfiancaVinculo",
] as const;

/**
 * Passa TUDO do cadastro duplicado (origem) para o cadastro principal (destino)
 * e deixa o duplicado guardado como inativo e marcado [JUNTADO].
 * Tudo acontece numa unica transacao: ou passa tudo, ou nao muda nada.
 */
export async function juntarCadastros(destinoId: number, origemId: number) {
  const usuario = await requirePermission("clientes.gerenciar");

  if (!idValido(destinoId) || !idValido(origemId) || destinoId === origemId) {
    throw new Error("Escolha dois cadastros diferentes.");
  }

  const resultado = await prisma.$transaction(
    async (tx) => {
      const [destino, origem] = await Promise.all([
        tx.cliente.findUnique({ where: { id: destinoId } }),
        tx.cliente.findUnique({ where: { id: origemId } }),
      ]);

      if (!destino || !origem) throw new Error("Cadastro não encontrado.");
      if (
        destino.nome.startsWith(MARCA_CADASTRO_JUNTADO) ||
        origem.nome.startsWith(MARCA_CADASTRO_JUNTADO)
      ) {
        throw new Error("Um destes cadastros já foi juntado a outro.");
      }

      // Guarda os numeros de tudo que vai mudar de cadastro (fica na auditoria,
      // para dar para desfazer manualmente se algum dia for preciso).
      const where = { clienteId: origemId };
      const [
        agendamentos,
        anamneses,
        fotos,
        documentos,
        procedimentos,
        evolucoes,
        respostas,
        contatos,
        mensagens,
        vendas,
        pacotes,
        lancamentos,
      ] = await Promise.all([
        tx.agendamento.findMany({ where, select: { id: true } }),
        tx.clienteAnamnese.findMany({ where, select: { id: true } }),
        tx.clienteFoto.findMany({ where, select: { id: true } }),
        tx.clienteDocumento.findMany({ where, select: { id: true } }),
        tx.clienteProcedimento.findMany({ where, select: { id: true } }),
        tx.clienteEvolucao.findMany({ where, select: { id: true } }),
        tx.clienteAnamneseResposta.findMany({ where, select: { id: true } }),
        tx.lead.findMany({ where, select: { id: true } }),
        tx.comunicacaoRegistro.findMany({ where, select: { id: true } }),
        tx.venda.findMany({ where, select: { id: true } }),
        tx.pacoteCliente.findMany({ where, select: { id: true } }),
        tx.lancamento.findMany({ where, select: { id: true } }),
      ]);

      const para = { clienteId: destinoId };
      await tx.agendamento.updateMany({ where, data: para });
      await tx.clienteAnamnese.updateMany({ where, data: para });
      await tx.clienteFoto.updateMany({ where, data: para });
      await tx.clienteDocumento.updateMany({ where, data: para });
      await tx.clienteProcedimento.updateMany({ where, data: para });
      await tx.clienteEvolucao.updateMany({ where, data: para });
      await tx.clienteAnamneseResposta.updateMany({ where, data: para });
      await tx.lead.updateMany({ where, data: para });
      await tx.comunicacaoRegistro.updateMany({ where, data: para });
      await tx.venda.updateMany({ where, data: para });
      await tx.pacoteCliente.updateMany({ where, data: para });
      await tx.lancamento.updateMany({ where, data: para });

      // Completa o cadastro principal com o que estiver em branco nele.
      const completar: Record<string, unknown> = {};
      for (const campo of CAMPOS_TEXTO_PARA_COMPLETAR) {
        if (textoVazio(destino[campo]) && !textoVazio(origem[campo])) {
          completar[campo] = origem[campo];
        }
      }
      if (textoVazio(destino.telefone) && !textoVazio(origem.telefone)) {
        completar.telefone = origem.telefone;
      }
      if (!destino.nascimento && origem.nascimento) {
        completar.nascimento = origem.nascimento;
      }
      if (!destino.campanhaAquisicaoId && origem.campanhaAquisicaoId) {
        completar.campanhaAquisicaoId = origem.campanhaAquisicaoId;
      }

      const hoje = new Date().toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      });
      const notaDestino = [
        `[Cadastro #${origem.id} (${origem.nome}) juntado a este em ${hoje}.]`,
        origem.observacoes?.trim() ? `Observações do cadastro antigo: ${origem.observacoes.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" ");

      const ultimaVisita =
        destino.ultimaVisita && origem.ultimaVisita
          ? destino.ultimaVisita > origem.ultimaVisita
            ? destino.ultimaVisita
            : origem.ultimaVisita
          : (destino.ultimaVisita ?? origem.ultimaVisita);

      await tx.cliente.update({
        where: { id: destinoId },
        data: {
          ...(completar as Prisma.ClienteUncheckedUpdateInput),
          valorGasto: (destino.valorGasto || 0) + (origem.valorGasto || 0),
          ultimaVisita,
          areaEstetica: destino.areaEstetica || origem.areaEstetica,
          areaCilios: destino.areaCilios || origem.areaCilios,
          contatoConfiancaAutorizado:
            destino.contatoConfiancaAutorizado || origem.contatoConfiancaAutorizado,
          observacoes: [destino.observacoes?.trim(), notaDestino].filter(Boolean).join("\n\n"),
        },
      });

      // O duplicado fica guardado, mas sem telefone/CPF (para nao ser achado de
      // novo por busca de telefone) e sem valores (ja foram somados no principal).
      const dadosAntigos = [
        `Telefone: ${origem.telefone || "-"}`,
        `WhatsApp: ${origem.whatsapp || "-"}`,
        `CPF: ${origem.cpf || "-"}`,
      ].join(" | ");

      await tx.cliente.update({
        where: { id: origemId },
        data: {
          nome: `${MARCA_CADASTRO_JUNTADO} ${origem.nome}`,
          status: "Inativa",
          telefone: "",
          whatsapp: null,
          cpf: null,
          valorGasto: 0,
          ultimaVisita: null,
          observacoes: [
            origem.observacoes?.trim(),
            `[Juntado ao cadastro #${destino.id} (${destino.nome}) em ${hoje}. Dados de antes -> ${dadosAntigos}]`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      });

      const contagem = {
        agendamentos: agendamentos.length,
        anamneses: anamneses.length,
        fotos: fotos.length,
        documentos: documentos.length,
        procedimentos: procedimentos.length,
        evolucoes: evolucoes.length,
        respostasAnamnese: respostas.length,
        contatos: contatos.length,
        mensagens: mensagens.length,
        vendas: vendas.length,
        pacotes: pacotes.length,
        lancamentos: lancamentos.length,
      };

      await tx.auditoria.create({
        data: {
          modulo: "Clientes",
          acao: "Juntou cadastros duplicados",
          entidade: "Cliente",
          entidadeId: String(destinoId),
          usuario: usuario.email,
          detalhes: JSON.stringify({
            principal: { id: destino.id, nome: destino.nome },
            juntado: { id: origem.id, nome: origem.nome },
            contagem,
            ids: {
              agendamentos: agendamentos.map((item) => item.id),
              anamneses: anamneses.map((item) => item.id),
              fotos: fotos.map((item) => item.id),
              documentos: documentos.map((item) => item.id),
              procedimentos: procedimentos.map((item) => item.id),
              evolucoes: evolucoes.map((item) => item.id),
              respostasAnamnese: respostas.map((item) => item.id),
              contatos: contatos.map((item) => item.id),
              mensagens: mensagens.map((item) => item.id),
              vendas: vendas.map((item) => item.id),
              pacotes: pacotes.map((item) => item.id),
              lancamentos: lancamentos.map((item) => item.id),
            },
          }),
        },
      });

      return {
        contagem,
        total: Object.values(contagem).reduce((soma, valor) => soma + valor, 0),
      };
    },
    { timeout: 30000, maxWait: 10000 },
  );

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${destinoId}`);
  revalidatePath(`/clientes/${origemId}`);
  revalidatePath("/agenda");
  revalidatePath("/vendas");
  revalidatePath("/financeiro");
  revalidatePath("/relatorios");
  revalidatePath("/marketing");
  revalidatePath("/gestao");
  revalidatePath("/");

  return { ok: true as const, ...resultado };
}
