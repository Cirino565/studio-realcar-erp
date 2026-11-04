#!/usr/bin/env node
/*
 * CLIENTES DA CAMPANHA - Studio Realcar
 *
 * Em "Clientes" (cartao e tabela das campanhas) passa a contar quem foi
 * cadastrada pela campanha no periodo OU quem comprou pela campanha no
 * periodo (cliente antiga que voltou pelo anuncio tambem conta). Cada pessoa
 * conta uma vez so. Com isso o "Custo por cliente" tambem passa a aparecer.
 *
 * Precisa ter rodado antes o entrou-campanha-confiavel.mjs.
 * Nao muda o banco. Pode rodar mais de uma vez; se algum trecho nao for
 * encontrado, NADA e gravado.
 *
 * Uso: node clientes-da-campanha.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/marketing/periodo.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"export type VendaCampanhaMovimento = {\n  campanhaId: number | null;","depois":"export type VendaCampanhaMovimento = {\n  campanhaId: number | null;\n  clienteId?: number | null;"},{"nome":"ajuste 2","antes":"export type LancamentoCampanhaMovimento = {\n  campanhaId: number | null;","depois":"export type LancamentoCampanhaMovimento = {\n  campanhaId: number | null;\n  clienteId?: number | null;"},{"nome":"ajuste 3","antes":"  clientes: Array<{\n    campanhaAquisicaoId: number | null;\n    createdAt: Date | string;\n    cliquePago?: boolean;\n  }>;\n}): MetricasPeriodo {","depois":"  clientes: Array<{\n    id?: number;\n    campanhaAquisicaoId: number | null;\n    createdAt: Date | string;\n    cliquePago?: boolean;\n  }>;\n}): MetricasPeriodo {"},{"nome":"ajuste 4","antes":"  const soma = <T,>(lista: T[], valor: (item: T) => number) =>","depois":"  // Clientes da campanha no periodo: cadastrada pela campanha no periodo OU\n  // que comprou pela campanha no periodo (cliente antiga que voltou pelo\n  // anuncio tambem conta). Cada pessoa conta uma vez so.\n  const pessoas = new Set<string>();\n  clientesNoPeriodo.forEach((cliente, indice) => {\n    pessoas.add(cliente.id != null ? `c${cliente.id}` : `sem-id-${indice}`);\n  });\n  for (const item of [...vendas.map((venda) => ({ clienteId: venda.clienteId, valor: venda.valorTotal })), ...manuais]) {\n    if (item.clienteId != null && item.valor > 0) pessoas.add(`c${item.clienteId}`);\n  }\n\n  const soma = <T,>(lista: T[], valor: (item: T) => number) =>"},{"nome":"ajuste 5","antes":"    clientes: clientesNoPeriodo.length,\n    leadsSoPagina:","depois":"    clientes: pessoas.size,\n    leadsSoPagina:"}]},{"arquivo":"app/(app)/marketing/page.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"        lancamentos: lancamentosCampanha.map((item) => ({\n          cliquePago: movimentoEhDeCliquePago(item.clienteId, idsPagos),\n          campanhaId: item.campanhaId,","depois":"        lancamentos: lancamentosCampanha.map((item) => ({\n          cliquePago: movimentoEhDeCliquePago(item.clienteId, idsPagos),\n          campanhaId: item.campanhaId,\n          clienteId: item.clienteId,"},{"nome":"ajuste 2","antes":"    const receitaBruta = receitaBrutaVendas + receitaBrutaManual;","depois":"    const receitaBruta = receitaBrutaVendas + receitaBrutaManual;\n    // Cadastrada pela campanha OU comprou pela campanha (uma vez por pessoa).\n    const pessoasCampanha = new Set<number>(clientesCampanha.map((cliente) => cliente.id));\n    for (const item of [\n      ...vendas.map((venda) => ({ clienteId: venda.clienteId, valor: venda.valorTotal })),\n      ...lancamentosManuais,\n    ]) {\n      if (item.clienteId != null && item.valor > 0) pessoasCampanha.add(item.clienteId);\n    }"},{"nome":"ajuste 3","antes":"        clientes: clientesCampanha.length,","depois":"        clientes: pessoasCampanha.size,"}]}]};
const raiz = process.cwd();
const aGravar = [];
let erros = 0;
let avisos = 0;

for (const [relativo, conteudo] of Object.entries(DATA.novosArquivos)) {
  const caminho = path.join(raiz, ...relativo.split("/"));
  const existente = fs.existsSync(caminho) ? fs.readFileSync(caminho, "utf8").replace(/\r\n/g, "\n") : null;
  if (existente === conteudo) {
    console.log("[pulou] " + relativo + " - ja existe igual");
  } else {
    aGravar.push({ caminho, conteudo, pasta: true });
    console.log((existente === null ? "[ok] criar " : "[ok] atualizar ") + relativo);
  }
}

for (const arq of DATA.arquivos) {
  const caminho = path.join(raiz, ...arq.arquivo.split("/"));
  if (!fs.existsSync(caminho)) {
    if (arq.obrigatorio) { console.log("[erro] arquivo nao encontrado: " + arq.arquivo + ". Rode na pasta do projeto."); erros++; }
    else { console.log("[aviso] arquivo nao encontrado, mantido: " + arq.arquivo); avisos++; }
    continue;
  }
  const bruto = fs.readFileSync(caminho, "utf8");
  const crlf = bruto.includes("\r\n");
  let texto = bruto.replace(/\r\n/g, "\n");
  let mudou = false;

  for (const p of arq.patches) {
    const ocorrencias = texto.split(p.antes).length - 1;
    if (p.modo === "remover") {
      // trecho a ser tirado: se ainda existe, tira; se nao existe, ja foi feito
      if (ocorrencias === 1) {
        texto = texto.replace(p.antes, () => p.depois);
        mudou = true;
        console.log("[ok] " + p.nome + " (" + arq.arquivo + ")");
      } else if (ocorrencias === 0) {
        console.log("[pulou] " + p.nome + " (" + arq.arquivo + ") - ja feito ou trecho diferente");
      } else {
        console.log("[aviso] " + p.nome + " (" + arq.arquivo + ") - aparece mais de uma vez, mantido");
        avisos++;
      }
      continue;
    }
    if (texto.includes(p.depois)) {
      console.log("[pulou] " + p.nome + " (" + arq.arquivo + ") - ja aplicado");
    } else if (ocorrencias === 1) {
      texto = texto.replace(p.antes, () => p.depois);
      mudou = true;
      console.log("[ok] " + p.nome + " (" + arq.arquivo + ")");
    } else {
      console.log("[erro] " + p.nome + " (" + arq.arquivo + ") - trecho nao encontrado");
      erros++;
    }
  }
  if (mudou) aGravar.push({ caminho, conteudo: crlf ? texto.replace(/\n/g, "\r\n") : texto });
}

if (erros > 0) {
  console.log("\nNada foi gravado: " + erros + " problema(s). Me mande esta tela.");
  process.exit(1);
}
for (const g of aGravar) {
  if (g.pasta) fs.mkdirSync(path.dirname(g.caminho), { recursive: true });
  fs.writeFileSync(g.caminho, g.conteudo, "utf8");
}
if (avisos > 0) console.log("\n" + avisos + " aviso(s): trechos opcionais que ficaram como estavam (nada quebra).");
console.log("\nConcluido.");
