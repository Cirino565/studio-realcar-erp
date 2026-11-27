#!/usr/bin/env node
/*
 * // avaliacao-sem-esperar-finalizar.mjs — "Pedir avaliação hoje" não espera a finalização:
 * // entra quem tinha horário ontem (não falta/cancelado). Quem ainda não foi finalizado
 * // aparece com o aviso "confira se ela veio".
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node avaliacao-sem-esperar-finalizar.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/page.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"      data: { gte: new Date(inicioHoje.getTime() - 7 * UM_DIA_MS), lt: inicioHoje },\n      status: \"Atendido\",\n      cliente: { comunicacoes: { none: { categoria: CATEGORIA_AVALIACAO_GOOGLE } } },\n    },\n    select: {\n      id: true,\n      data: true,\n      procedimento: true,","depois":"      data: { gte: new Date(inicioHoje.getTime() - 7 * UM_DIA_MS), lt: inicioHoje },\n      // Nao espera a finalizacao (as vezes leva dias): entra quem tinha\n      // horario e nao foi marcado como falta ou cancelado.\n      status: { in: [\"Atendido\", \"Agendado\", \"Confirmado\"] },\n      cliente: { comunicacoes: { none: { categoria: CATEGORIA_AVALIACAO_GOOGLE } } },\n    },\n    select: {\n      id: true,\n      data: true,\n      status: true,\n      procedimento: true,"},{"nome":"ajuste 2","antes":"      procedimento: item.procedimento || \"Atendimento\",\n      quando: item.data >= inicioOntem ? \"ontem\" : formatarDataCurta(item.data),\n    }));","depois":"      procedimento: item.procedimento || \"Atendimento\",\n      quando: item.data >= inicioOntem ? \"ontem\" : formatarDataCurta(item.data),\n      finalizado: item.status === \"Atendido\",\n    }));"},{"nome":"ajuste 3","antes":"          Clientes atendidas ontem (e dias anteriores ainda sem pedido). Copie a mensagem, mande no\n          WhatsApp e toque em &quot;Já pedi&quot;.","depois":"          Clientes com horário ontem (e dias anteriores ainda sem pedido), mesmo antes de finalizar o\n          atendimento. Copie a mensagem, mande no WhatsApp e toque em &quot;Já pedi&quot;."}]},{"arquivo":"components/dashboard/PedirAvaliacaoClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  /** \"ontem\" ou a data curta do atendimento. */\n  quando: string;\n};","depois":"  /** \"ontem\" ou a data curta do atendimento. */\n  quando: string;\n  /** false = horario ja passou, mas o atendimento ainda nao foi finalizado. */\n  finalizado?: boolean;\n};"},{"nome":"ajuste 2","antes":"            <p className=\"truncate text-xs text-slate-500\">\n              {item.procedimento} · {item.quando}\n            </p>","depois":"            <p className=\"truncate text-xs text-slate-500\">\n              {item.procedimento} · {item.quando}\n            </p>\n            {item.finalizado === false ? (\n              <p className=\"text-[11px] font-semibold text-amber-700\">\n                Ainda não finalizado · confira se ela veio\n              </p>\n            ) : null}"}]}]};

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
