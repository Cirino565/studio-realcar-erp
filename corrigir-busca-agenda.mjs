/**
 * CORRECAO - busca da Agenda aparecendo por cima da janela de atendimento
 *
 * O problema: a barra de busca estava num nivel de sobreposicao (200) MAIOR
 * que o da janela de atendimento (100). Por isso ela aparecia por cima da
 * janela aberta, em vez de ficar atras.
 *
 * A correcao baixa a busca para 60 (e a lista de resultados para 70):
 *   - continua acima do calendario, que usa ate 50, entao a lista de
 *     resultados segue aparecendo por cima dos agendamentos normalmente;
 *   - fica abaixo de todas as janelas da Agenda, que usam de 100 para cima.
 *
 * Como usar: coloque este arquivo na RAIZ do projeto e rode
 *     node corrigir-busca-agenda.mjs
 *
 * E seguro rodar duas vezes: se ja estiver aplicado, ele avisa e pula.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const ARQUIVO = "app/(app)/agenda/components/AgendaSearch.tsx";

const alteracoes = [
  [
    "barra de busca: desce do nivel 200 para 60",
    `    <div className="relative z-[200] mb-3 px-1 sm:mb-4">`,
    `    <div className="relative z-[60] mb-3 px-1 sm:mb-4">`,
  ],
  [
    "lista de resultados: desce do nivel 210 para 70",
    `        <div className="absolute left-1 right-1 z-[210] top-[calc(100%+0.35rem)]`,
    `        <div className="absolute left-1 right-1 z-[70] top-[calc(100%+0.35rem)]`,
  ],
];

console.log("\nCorrecao - busca da Agenda\n");

if (!existsSync(ARQUIVO)) {
  console.error("ERRO: nao encontrei o arquivo:\n");
  console.error("   " + ARQUIVO + "\n");
  console.error(
    "Coloque este script na pasta raiz do projeto (a mesma que tem o package.json) e rode de novo.\n",
  );
  process.exit(1);
}

const bruto = readFileSync(ARQUIVO, "utf8");
const usaCRLF = bruto.includes("\r\n");
let conteudo = bruto.replace(/\r\n/g, "\n");

let aplicadas = 0;
let jaEstavam = 0;
const erros = [];

for (const [descricao, antigo, novo] of alteracoes) {
  if (conteudo.includes(novo)) {
    jaEstavam += 1;
    console.log("  [pulou] " + descricao + " (ja estava aplicada)");
    continue;
  }

  const ocorrencias = conteudo.split(antigo).length - 1;

  if (ocorrencias === 1) {
    conteudo = conteudo.replace(antigo, novo);
    aplicadas += 1;
    console.log("  [ok]    " + descricao);
    continue;
  }

  erros.push({ descricao, ocorrencias });
  console.log("  [FALHOU] " + descricao);
}

if (erros.length > 0) {
  console.error("\nNADA foi salvo - o arquivo continua como estava.\n");

  erros.forEach((erro) => {
    console.error("   - " + erro.descricao);
    console.error("     trechos encontrados: " + erro.ocorrencias + " (esperado 1)");
  });

  console.error("\nManda esta mensagem inteira no chat que eu ajusto.\n");
  process.exit(1);
}

writeFileSync(ARQUIVO, usaCRLF ? conteudo.replace(/\n/g, "\r\n") : conteudo, "utf8");

console.log(
  "\nPronto! " +
    aplicadas +
    " alteracao(oes) aplicada(s)" +
    (jaEstavam > 0 ? ", " + jaEstavam + " ja estava(m) no lugar" : "") +
    ".\n",
);
console.log("Agora rode:  npm run build\n");
