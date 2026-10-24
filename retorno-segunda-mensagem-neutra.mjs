#!/usr/bin/env node
/*
 * RETORNOS: 2a MENSAGEM COM TEXTO NEUTRO - Studio Realcar
 *
 * A 2a mensagem de retorno passa a ter um texto unico, que serve tanto para
 * quem nao respondeu quanto para quem disse que ia marcar (o sistema nao
 * deduz mais quem respondeu). Etiqueta: "2a mensagem - ja recebeu a 1a e nao
 * marcou".
 *
 * Precisa ter rodado antes o retorno-segunda-tentativa-2.mjs.
 * Nao mexe no banco. Pode rodar mais de uma vez; se algum trecho nao for
 * encontrado, NADA e gravado.
 *
 * Uso: node retorno-segunda-mensagem-neutra.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"lib/whatsapp.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  if (disseQueIaMarcar) {\n    return `Oi, ${firstName}! Tudo bem? 😊\\n\\nVocê tinha comentado que ia marcar ${oQue}. Quer que eu já veja um horário para você?\\n\\nÉ só me responder com o dia e o período (manhã ou tarde) que ficam melhores. 💜`;\n  }\n\n  return `Oi, ${firstName}! Tudo bem? 😊\\n\\nTe mandei uma mensagem há alguns dias e acho que acabou passando no meio da correria, então vou deixar bem simples:\\n\\nQuer que eu separe um horário para ${oQue}? É só me responder com o dia e o período (manhã ou tarde) que ficam melhores para você. 💜`;","depois":"  // Texto neutro: serve tanto para quem nao respondeu quanto para quem disse\n  // que ia marcar (o sistema nao tem como saber com certeza).\n  void disseQueIaMarcar;\n  const lembrarDe = `${oQue.startsWith(\"sua\") ? \"da\" : \"do\"} ${oQue}`;\n\n  return `Oi, ${firstName}! Tudo bem? 😊\\n\\nPassando de novo por aqui para lembrar ${lembrarDe}, que já está na época.\\n\\nQuer que eu veja um horário para você? É só me responder com o dia e o período (manhã ou tarde) que ficam melhores. 💜`;"}]},{"arquivo":"app/(app)/retornos/page.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"            procedure: principal?.nome,\n            disseQueIaMarcar: cliente.situacao === \"Vai marcar\",\n          })","depois":"            procedure: principal?.nome,\n            // Texto neutro: nao deduz se a cliente respondeu ou nao.\n          })"}]},{"arquivo":"app/(app)/retornos/components/RetornosClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"                            {cliente.situacao === \"Vai marcar\"\n                              ? \"2ª mensagem · disse que ia marcar e não marcou\"\n                              : \"2ª tentativa · não respondeu a 1ª mensagem\"}","depois":"                            2ª mensagem · já recebeu a 1ª e não marcou"}]}]};
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
