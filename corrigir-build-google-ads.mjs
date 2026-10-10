#!/usr/bin/env node
/*
 * CORRECAO DO BUILD - tela Conversoes Google Ads (Studio Realcar)
 * Ajusta um detalhe de tipo que fazia o "npm run build" falhar.
 * Uso: node corrigir-build-google-ads.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/marketing/google-ads/page.tsx","obrigatorio":true,"patches":[{"nome":"usuario pode ser vazio","antes":"              usuario: ultimaExecucao.usuario,\n","depois":"              usuario: ultimaExecucao.usuario ?? \"automático\",\n"}]}]};
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
