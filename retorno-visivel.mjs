#!/usr/bin/env node
/*
 * RETORNO BEM VISIVEL NA AGENDA - Studio Realcar
 *
 * Atendimento de retorno (sem custo) fica com listras azul-piscina, borda
 * azul-piscina e etiqueta grande "RETORNO · SEM CUSTO" (tambem no celular).
 * Na semana: etiqueta "RETORNO · R$ 0". Linha de baixo: "retorno, nao gera
 * valor".
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node retorno-visivel.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/agenda/components/AgendaCalendar.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"${appointment.preReserva === \"PENDENTE\" ? \"border-2 border-dashed opacity-80\" : \"\"}`}\n                              style={{\n                                borderColor: palette.border,","depois":"${appointment.preReserva === \"PENDENTE\" ? \"border-2 border-dashed opacity-80\" : \"\"} ${appointment.naturezaAtendimento === \"RETORNO\" ? \"agenda-retorno relative\" : \"\"}`}\n                              style={{\n                                borderColor: palette.border,"},{"nome":"ajuste 2","antes":"                                {appointment.naturezaAtendimento === \"RETORNO\" ? (\n                                  <span className=\"inline-flex items-center gap-1 rounded border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-cyan-700 shadow-sm dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200\">\n                                    <CalendarClock size={10} />\n                                    Retorno\n                                  </span>\n                                ) : null}","depois":"                                {appointment.naturezaAtendimento === \"RETORNO\" ? (\n                                  <span className=\"inline-flex items-center gap-1 rounded bg-cyan-600 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white shadow-sm\">\n                                    <CalendarClock size={11} />\n                                    Retorno · R$ 0\n                                  </span>\n                                ) : null}"},{"nome":"ajuste 3","antes":"${appointment.preReserva === \"PENDENTE\" ? \"border-2 border-dashed opacity-75\" : \"\"}`}\n                          style={{\n                            top,","depois":"${appointment.preReserva === \"PENDENTE\" ? \"border-2 border-dashed opacity-75\" : \"\"} ${appointment.naturezaAtendimento === \"RETORNO\" ? \"agenda-retorno\" : \"\"}`}\n                          style={{\n                            top,"},{"nome":"ajuste 4","antes":"                                  <span\n                                    className=\"inline-flex items-center gap-1 rounded-md border border-white/80 bg-white/90 px-1.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-cyan-700 shadow-sm\"\n                                    title=\"Retorno gratuito\"\n                                  >\n                                    <CalendarClock size={11} />\n                                    <span className=\"hidden xl:inline\">Retorno</span>\n                                  </span>","depois":"                                  <span\n                                    className=\"inline-flex items-center gap-1 rounded-md bg-cyan-600 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-sm\"\n                                    title=\"Retorno sem custo: não gera valor\"\n                                  >\n                                    <CalendarClock size={13} />\n                                    Retorno\n                                    <span className=\"hidden sm:inline\">· sem custo</span>\n                                  </span>"},{"nome":"ajuste 5","antes":"                                {appointment.status}\n                                {!observacaoReal && note !== appointment.status\n                                  ? ` · ${note}`\n                                  : \"\"}","depois":"                                {appointment.status}\n                                {appointment.naturezaAtendimento === \"RETORNO\" ? \" · retorno, não gera valor\" : \"\"}\n                                {!observacaoReal && note !== appointment.status\n                                  ? ` · ${note}`\n                                  : \"\"}"}]},{"arquivo":"app/globals.css","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":".theme-dark .agenda-card {\n  background:","depois":"/* Retorno sem custo: listras e borda azul-piscina, para ver de longe que\n   esse horario nao gera valor. */\n.agenda-retorno {\n  isolation: isolate;\n}\n\n.agenda-retorno::after {\n  content: \"\";\n  position: absolute;\n  inset: 0;\n  z-index: -1;\n  pointer-events: none;\n  border-radius: inherit;\n  background: repeating-linear-gradient(\n    135deg,\n    rgba(8, 145, 178, 0.13) 0 10px,\n    transparent 10px 20px\n  );\n}\n\n.agenda-card.agenda-retorno,\n.theme-light .agenda-card.agenda-retorno,\n.theme-dark .agenda-card.agenda-retorno {\n  border-color: #0891b2 !important;\n  box-shadow: inset 5px 0 0 #0891b2 !important;\n}\n\n.theme-dark .agenda-card {\n  background:"}]}]};

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
