/**
 * CORRECAO - "Load failed" ao finalizar atendimento com produto/kit incluido
 *
 * O QUE FOI ENCONTRADO
 *
 * A finalizacao do atendimento grava tudo de uma vez so (atendimento, venda,
 * financeiro, baixa de estoque, historico do cliente, funil e auditoria).
 * O Prisma coloca um tempo limite PADRAO de 5 segundos nesse tipo de operacao.
 *
 * Sem produto, sao poucas gravacoes e cabe nos 5 segundos.
 * Com produto ou kit, cada item acrescenta mais tres gravacoes (baixa no
 * estoque, item da venda e movimentacao de estoque), uma depois da outra.
 * Como o banco fica em outro servidor, cada uma dessas idas e vindas custa
 * tempo - e o conjunto passa dos 5 segundos, o limite estoura e o sistema
 * desfaz tudo. Por isso o erro aparece SO quando ha item incluido, e por isso
 * na segunda tentativa costuma funcionar (a conexao ja esta "quente" e a
 * operacao fica mais rapida).
 *
 * A CORRECAO
 *
 * Aumenta o tempo limite dessas duas operacoes para 30 segundos, com ate 15
 * segundos de espera na fila. Nao muda NADA do que e gravado nem da ordem -
 * so deixa de cortar a operacao no meio antes da hora.
 *
 * Continua tudo ou nada: se algo der errado de verdade, o sistema segue
 * desfazendo tudo, sem risco de gravar venda pela metade.
 *
 * Como usar: coloque este arquivo na RAIZ do projeto e rode
 *     node corrigir-finalizar-atendimento.mjs
 *
 * E seguro rodar duas vezes: se ja estiver aplicado, ele avisa e pula.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const arquivos = {
  agenda: "actions/agendamento.actions.ts",
  venda: "actions/venda.actions.ts",
};

const OPCOES = "{ maxWait: 15000, timeout: 30000 }";

/** [arquivo, descricao, textoAntigo, textoNovo] */
const alteracoes = [
  [
    "agenda",
    "finalizar atendimento: tempo limite de 5s para 30s",
    `  if (dados.permitirEstoqueNegativo && !permitirEstoqueNegativo) {
    throw new Error("Somente administradores podem autorizar estoque negativo.");
  }

  await prisma.$transaction(async (tx) => {`,
    `  if (dados.permitirEstoqueNegativo && !permitirEstoqueNegativo) {
    throw new Error("Somente administradores podem autorizar estoque negativo.");
  }

  // Tempo limite ampliado: a finalizacao grava atendimento, venda, financeiro,
  // estoque, historico, funil e auditoria numa unica operacao. Com produtos ou
  // kits incluidos, sao varias gravacoes seguidas e o limite padrao do Prisma
  // (5 segundos) nao dava conta, fazendo a operacao ser cortada no meio.
  await prisma.$transaction(async (tx) => {`,
  ],
  [
    "agenda",
    "finalizar atendimento: aplica o novo tempo limite",
    `  });

  revalidatePath("/agenda");
  revalidatePath("/vendas");
  revalidatePath("/estoque");
  revalidatePath("/financeiro");
  revalidatePath("/gestao");`,
    `  }, ${OPCOES});

  revalidatePath("/agenda");
  revalidatePath("/vendas");
  revalidatePath("/estoque");
  revalidatePath("/financeiro");
  revalidatePath("/gestao");`,
  ],
  [
    "venda",
    "venda de produtos: tempo limite de 5s para 30s",
    `    return venda;
  });

  revalidarVenda(cliente.id);`,
    `    return venda;
  }, ${OPCOES});

  revalidarVenda(cliente.id);`,
  ],
];

console.log("\nCorrecao - finalizar atendimento com produto/kit\n");

const faltando = Object.values(arquivos).filter((caminho) => !existsSync(caminho));

if (faltando.length > 0) {
  console.error("ERRO: nao encontrei estes arquivos do projeto:\n");
  faltando.forEach((caminho) => console.error("   - " + caminho));
  console.error(
    "\nColoque este script na pasta raiz do projeto (a mesma que tem o package.json) e rode de novo.\n",
  );
  process.exit(1);
}

const conteudos = {};
const usaCRLF = {};

for (const [chave, caminho] of Object.entries(arquivos)) {
  const bruto = readFileSync(caminho, "utf8");
  usaCRLF[chave] = bruto.includes("\r\n");
  conteudos[chave] = bruto.replace(/\r\n/g, "\n");
}

let aplicadas = 0;
let jaEstavam = 0;
const erros = [];

for (const [chave, descricao, antigo, novo] of alteracoes) {
  const atual = conteudos[chave];

  if (atual.includes(novo)) {
    jaEstavam += 1;
    console.log("  [pulou] " + descricao + " (ja estava aplicada)");
    continue;
  }

  const ocorrencias = atual.split(antigo).length - 1;

  if (ocorrencias === 1) {
    conteudos[chave] = atual.replace(antigo, novo);
    aplicadas += 1;
    console.log("  [ok]    " + descricao);
    continue;
  }

  erros.push({ descricao, arquivo: arquivos[chave], ocorrencias });
  console.log("  [FALHOU] " + descricao);
}

if (erros.length > 0) {
  console.error("\nNADA foi salvo - o projeto continua como estava.\n");

  erros.forEach((erro) => {
    console.error("   - " + erro.descricao);
    console.error("     arquivo: " + erro.arquivo);
    console.error("     trechos encontrados: " + erro.ocorrencias + " (esperado 1)");
  });

  console.error("\nManda esta mensagem inteira no chat que eu ajusto.\n");
  process.exit(1);
}

for (const [chave, caminho] of Object.entries(arquivos)) {
  const saida = usaCRLF[chave]
    ? conteudos[chave].replace(/\n/g, "\r\n")
    : conteudos[chave];

  writeFileSync(caminho, saida, "utf8");
}

console.log(
  "\nPronto! " +
    aplicadas +
    " alteracao(oes) aplicada(s)" +
    (jaEstavam > 0 ? ", " + jaEstavam + " ja estava(m) no lugar" : "") +
    ".\n",
);
console.log("Agora rode:  npm run build\n");
