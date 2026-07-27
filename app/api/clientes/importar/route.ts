import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { canAccess, getCurrentUser } from "@/lib/auth";
import { analisarCsvClientes } from "@/lib/importacao-clientes";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;
const FRASE_CONFIRMACAO = "IMPORTAR CLIENTES";
const JANELA_BACKUP_MS = 24 * 60 * 60 * 1000;

function erro(mensagem: string, status = 400) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function hashArquivo(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function obterSituacaoBackup() {
  const ultimoBackup = await prisma.auditoria.findFirst({
    where: {
      modulo: "Backup",
      acao: "Exportou backup JSON",
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const data = ultimoBackup?.createdAt ?? null;
  const valido = Boolean(data && Date.now() - data.getTime() <= JANELA_BACKUP_MS);

  return {
    valido,
    realizadoEm: data?.toISOString() ?? null,
    validadeHoras: 24,
  };
}

async function listarIdentidadesExistentes() {
  return prisma.cliente.findMany({
    select: {
      id: true,
      nome: true,
      telefone: true,
      whatsapp: true,
      cpf: true,
    },
  });
}

export async function POST(request: Request) {
  const usuario = await getCurrentUser();
  if (!usuario) return erro("Não autenticado.", 401);

  const permissoesNecessarias = [
    "clientes.gerenciar",
    "configuracoes.gerenciar",
    "backup.gerenciar",
  ];

  if (!permissoesNecessarias.every((permissao) => canAccess(usuario, permissao))) {
    return erro(
      "A importação exige permissão para Clientes, Configurações e Backup.",
      403,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return erro("Não foi possível ler o formulário de importação.");
  }

  const arquivo = formData.get("arquivo");
  const modo = String(formData.get("modo") ?? "dry-run");

  if (!arquivo || typeof arquivo === "string") {
    return erro("Selecione um arquivo CSV.");
  }

  if (!arquivo.name.toLowerCase().endsWith(".csv")) {
    return erro("Use um arquivo CSV UTF-8. Exporte a planilha do Excel como CSV UTF-8.");
  }

  if (arquivo.size <= 0) return erro("O arquivo está vazio.");
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return erro("O arquivo excede o limite de 5 MB.", 413);
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());
  const hash = hashArquivo(buffer);
  const texto = buffer.toString("utf8");
  if (texto.includes("\uFFFD")) {
    return erro("O arquivo não está em UTF-8. Exporte novamente como CSV UTF-8.");
  }

  try {
    const clientesExistentes = await listarIdentidadesExistentes();
    const analise = analisarCsvClientes(texto, clientesExistentes);
    const backup = await obterSituacaoBackup();

    if (modo === "dry-run") {
      return NextResponse.json({
        modo,
        hash,
        relatorio: analise.relatorio,
        backup,
        mensagem:
          "Dry-run concluído. Nenhum dado foi gravado no banco de dados.",
      });
    }

    if (modo !== "importar") return erro("Modo de importação inválido.");

    const hashDryRun = String(formData.get("hashDryRun") ?? "");
    const confirmouBackup = String(formData.get("confirmouBackup") ?? "") === "true";
    const fraseConfirmacao = String(formData.get("fraseConfirmacao") ?? "").trim();

    if (!hashDryRun || hashDryRun !== hash) {
      return erro("O arquivo mudou depois do dry-run. Execute a validação novamente.");
    }
    if (!confirmouBackup) {
      return erro("Confirme que o Backup Premium foi exportado antes da importação.");
    }
    if (!backup.valido) {
      return erro("Não existe exportação de Backup Premium válida nas últimas 24 horas.");
    }
    if (fraseConfirmacao !== FRASE_CONFIRMACAO) {
      return erro(`Digite exatamente ${FRASE_CONFIRMACAO} para confirmar.`);
    }
    if (analise.relatorio.invalidas > 0) {
      return erro("A importação foi bloqueada porque o arquivo ainda possui linhas inválidas.");
    }
    if (analise.dadosImportacao.length === 0) {
      return erro("Não há clientes novos e válidos para importar.");
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const existentesAtualizados = await tx.cliente.findMany({
        select: {
          id: true,
          nome: true,
          telefone: true,
          whatsapp: true,
          cpf: true,
        },
      });

      const analiseFinal = analisarCsvClientes(texto, existentesAtualizados);
      if (analiseFinal.relatorio.invalidas > 0) {
        throw new Error("O arquivo ficou inválido durante a revalidação final.");
      }
      if (analiseFinal.dadosImportacao.length === 0) {
        throw new Error("Nenhum cliente novo permaneceu disponível para importação.");
      }

      const insercao = await tx.cliente
        .createMany({
          data: analiseFinal.dadosImportacao,
        })
        .catch(() => {
          throw new Error(
            "A transação foi cancelada porque o banco recusou a gravação. Nenhum cliente foi importado.",
          );
        });

      return {
        quantidade: insercao.count,
        relatorio: analiseFinal.relatorio,
      };
    });

    return NextResponse.json({
      modo,
      hash,
      importados: resultado.quantidade,
      relatorio: resultado.relatorio,
      backup,
      mensagem: `${resultado.quantidade} cliente(s) importado(s) com sucesso.`,
    });
  } catch (causa) {
    const mensagem =
      causa instanceof Error ? causa.message : "Falha inesperada ao processar o arquivo.";
    return erro(mensagem);
  }
}
