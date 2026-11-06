#!/usr/bin/env node
/*
 * PARA REMARCAR: BOTAO "REMARCAR" E LISTA MAIS COMPACTA - Studio Realcar
 *
 *  - Na faixa "Para remarcar" o botao "Agendar" passa a se chamar
 *    "Remarcar" (mesmo nome do botao do agendamento cancelado).
 *  - No computador, cada cliente ocupa uma linha so (dados a esquerda,
 *    botoes a direita). No celular continua como antes.
 *  - A data sugerida nunca fica no passado.
 *
 * Nao muda o banco. Pode rodar mais de uma vez; se algum trecho nao for
 * encontrado, NADA e gravado.
 *
 * Uso: node para-remarcar-botao.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/agenda/components/ParaRemarcarPainel.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"            Desmarcaram e ainda não têm nova data","depois":"            Desmarcaram ou faltaram e ainda não têm nova data"},{"nome":"ajuste 2","antes":"                className=\"rounded-xl border border-amber-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-slate-900\"\n              >\n                <div className=\"flex flex-wrap items-start justify-between gap-2\">","depois":"                className=\"flex flex-col gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between\"\n              >\n                <div className=\"flex min-w-0 flex-wrap items-start justify-between gap-2 sm:flex-1\">"},{"nome":"ajuste 3","antes":"                  <div className=\"mt-2 grid grid-cols-3 gap-2\">\n                    <button\n                      type=\"button\"\n                      onClick={() => onAgendar(pendente)}\n                      className=\"inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-2 text-xs font-bold text-white hover:bg-violet-700\"\n                    >\n                      <CalendarPlus size={14} /> Agendar\n                    </button>","depois":"                  <div className=\"grid grid-cols-3 gap-2 sm:flex sm:shrink-0\">\n                    <button\n                      type=\"button\"\n                      onClick={() => onAgendar(pendente)}\n                      className=\"inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-2 text-xs font-bold text-white hover:bg-violet-700 sm:px-3\"\n                    >\n                      <CalendarPlus size={14} /> Remarcar\n                    </button>"},{"nome":"ajuste 4","antes":"                        className=\"inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs font-bold text-emerald-700\"","depois":"                        className=\"inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-xs font-bold text-emerald-700 sm:px-3\""},{"nome":"ajuste 5","antes":"                      className=\"inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-transparent dark:text-slate-300\"","depois":"                      className=\"inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-transparent dark:text-slate-300 sm:px-3\""},{"nome":"ajuste 6","antes":"                  <div className=\"mt-2 rounded-lg bg-slate-50 p-2 text-xs","depois":"                  <div className=\"rounded-lg bg-slate-50 p-2 text-xs"}]},{"arquivo":"app/(app)/agenda/components/AgendaClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  function abrirRemarcacao(pendente: RemarcacaoPendente) {\n    setSelectedAppointment(null);\n    setNovoHorario({\n      modo: \"novo\",\n      tipoAtendimento: \"agendamento\",\n      data: toDateInput(selectedDate),","depois":"  function abrirRemarcacao(pendente: RemarcacaoPendente) {\n    // Nunca sugere uma data que ja passou.\n    const hojeRemarcar = toDateInput(new Date());\n    const diaVisto = toDateInput(selectedDate);\n    setSelectedAppointment(null);\n    setNovoHorario({\n      modo: \"novo\",\n      tipoAtendimento: \"agendamento\",\n      data: diaVisto < hojeRemarcar ? hojeRemarcar : diaVisto,"}]}]};
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
