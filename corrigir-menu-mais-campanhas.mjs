#!/usr/bin/env node
/*
 * MENU "MAIS" DAS CAMPANHAS NAO FICA MAIS CORTADO - Studio Realcar
 *
 * Na tela Marketing > Campanhas (Tabela e Cartoes), o menu do botao "Mais"
 * (Vincular cliente, Lancar custo, Vincular receita, Excluir campanha) abria
 * sempre para baixo e, nas ultimas linhas, ficava cortado pela borda da tela.
 *
 * Agora ele confere o espaco: se nao couber embaixo, abre PARA CIMA; se faltar
 * espaco nos dois lados, usa o maior e ganha rolagem propria. Nada fica cortado.
 *
 * Nao mexe no banco de dados. Pode rodar mais de uma vez; se algum trecho nao
 * for encontrado, NADA e gravado.
 *
 * Uso: node corrigir-menu-mais-campanhas.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/marketing/components/MarketingClient.tsx","obrigatorio":true,"patches":[{"nome":"guardar posicao do menu","antes":"  const [aberto, setAberto] = useState<{ top: number; right: number; destino: Element } | null>(null);","depois":"  const [aberto, setAberto] = useState<{\n    top?: number;\n    bottom?: number;\n    right: number;\n    maxAltura: number;\n    destino: Element;\n  } | null>(null);"},{"nome":"abrir para cima quando falta espaco","antes":"    const caixa = botao.getBoundingClientRect();\n    setAberto({\n      top: caixa.bottom + 6,\n      right: window.innerWidth - caixa.right,\n      destino: botao.closest(\".app-shell\") ?? document.body,\n    });","depois":"    const caixa = botao.getBoundingClientRect();\n    // O menu tem uns 210px de altura. Se nao couber embaixo do botao (linha\n    // no fim da tela), abre para CIMA; se faltar espaco dos dois lados, usa o\n    // maior e deixa rolar dentro do menu - nunca fica cortado.\n    const margem = 12;\n    const espacoAbaixo = window.innerHeight - caixa.bottom - margem;\n    const espacoAcima = caixa.top - margem;\n    const abrirParaBaixo = espacoAbaixo >= 210 || espacoAbaixo >= espacoAcima;\n    const destino = botao.closest(\".app-shell\") ?? document.body;\n\n    setAberto(\n      abrirParaBaixo\n        ? {\n            top: caixa.bottom + 6,\n            right: window.innerWidth - caixa.right,\n            maxAltura: Math.max(120, espacoAbaixo),\n            destino,\n          }\n        : {\n            bottom: window.innerHeight - caixa.top + 6,\n            right: window.innerWidth - caixa.right,\n            maxAltura: Math.max(120, espacoAcima),\n            destino,\n          },\n    );"},{"nome":"menu com rolagem propria","antes":"                style={{ top: aberto.top, right: aberto.right }}\n                className=\"fixed z-[100] w-56 rounded-2xl","depois":"                style={{\n                  top: aberto.top,\n                  bottom: aberto.bottom,\n                  right: aberto.right,\n                  maxHeight: aberto.maxAltura,\n                }}\n                className=\"fixed z-[100] w-56 overflow-y-auto rounded-2xl"}]}]};
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
