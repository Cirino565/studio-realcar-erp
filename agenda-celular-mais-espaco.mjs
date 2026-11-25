#!/usr/bin/env node
/*
 * // agenda-celular-mais-espaco.mjs — Agenda no celular: busca e "Livres" na mesma linha,
 * // "Para remarcar" em uma linha só, cancelados do dia em uma linha (toque em "ver" para abrir).
 * // A grade de horários ganha bem mais espaço na tela. No computador quase nada muda.
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node agenda-celular-mais-espaco.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/agenda/components/AgendaSearch.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"    <div className=\"relative z-[60] mb-3 px-1 sm:mb-4\">\n      <div className=\"relative\">\n        <Search","depois":"    <div className=\"relative z-[60] px-1\">\n      <div className=\"relative\">\n        <Search"}]},{"arquivo":"app/(app)/agenda/components/AgendaClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"          <>\n            <AgendaSearch\n              clientes={clientes}","depois":"          <>\n            {/* Busca e \"Horarios livres\" na mesma linha: no celular sobra\n                mais tela para a agenda. */}\n            <div className=\"mb-2 flex items-center gap-2 sm:mb-3\">\n            <div className=\"min-w-0 flex-1\">\n            <AgendaSearch\n              clientes={clientes}"},{"nome":"ajuste 2","antes":"            />\n\n            <div className=\"mb-3 flex justify-end\">\n              <button\n                type=\"button\"\n                onClick={() => setHorariosLivresAberto(true)}\n                className=\"inline-flex h-9 items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 text-sm font-semibold text-violet-700 shadow-sm hover:bg-violet-50 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-100\"\n              >\n                <Clock3 size={16} />\n                Horários livres\n              </button>\n            </div>","depois":"            />\n            </div>\n              <button\n                type=\"button\"\n                onClick={() => setHorariosLivresAberto(true)}\n                aria-label=\"Horários livres\"\n                className=\"inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 text-sm font-semibold text-violet-700 shadow-sm hover:bg-violet-50 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-100\"\n              >\n                <Clock3 size={16} />\n                <span className=\"sm:hidden\">Livres</span>\n                <span className=\"hidden sm:inline\">Horários livres</span>\n              </button>\n            </div>"}]},{"arquivo":"app/(app)/agenda/components/ParaRemarcarPainel.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"    <section className=\"mb-3 rounded-2xl border border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-400/20 dark:bg-amber-500/10\">\n      <button\n        type=\"button\"\n        onClick={() => setAberto((atual) => !atual)}\n        aria-expanded={aberto}\n        className=\"flex w-full items-center justify-between gap-3 px-4 py-3 text-left\"\n      >\n        <span className=\"min-w-0\">\n          <span className=\"block text-sm font-bold text-amber-900 dark:text-amber-100\">\n            Para remarcar: {pendentes.length} cliente{pendentes.length === 1 ? \"\" : \"s\"}\n          </span>\n          <span className=\"block text-xs text-amber-800/80 dark:text-amber-200/80\">","depois":"    <section className=\"mb-2 rounded-2xl border border-amber-200 bg-amber-50/80 shadow-sm dark:border-amber-400/20 dark:bg-amber-500/10 sm:mb-3\">\n      <button\n        type=\"button\"\n        onClick={() => setAberto((atual) => !atual)}\n        aria-expanded={aberto}\n        className=\"flex w-full items-center justify-between gap-3 px-3 py-2 text-left sm:px-4 sm:py-3\"\n      >\n        <span className=\"min-w-0\">\n          <span className=\"block truncate text-sm font-bold text-amber-900 dark:text-amber-100\">\n            Para remarcar: {pendentes.length} cliente{pendentes.length === 1 ? \"\" : \"s\"}\n            {comSinal > 0 ? (\n              <span className=\"font-semibold text-amber-800/80 sm:hidden\"> · {comSinal} com sinal</span>\n            ) : null}\n          </span>\n          {/* No celular fica so a linha de cima (a agenda precisa de espaco). */}\n          <span className=\"hidden text-xs text-amber-800/80 dark:text-amber-200/80 sm:block\">"}]},{"arquivo":"app/(app)/agenda/components/PreReservasPainel.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"      className={`mb-3 rounded-2xl border shadow-sm ${\n        urgentes > 0","depois":"      className={`mb-2 rounded-2xl border shadow-sm sm:mb-3 ${\n        urgentes > 0"},{"nome":"ajuste 2","antes":"        aria-expanded={aberto}\n        className=\"flex w-full items-center justify-between gap-3 px-4 py-3 text-left\"","depois":"        aria-expanded={aberto}\n        className=\"flex w-full items-center justify-between gap-3 px-3 py-2 text-left sm:px-4 sm:py-3\""}]},{"arquivo":"app/(app)/agenda/components/AgendaCalendar.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  const [verMotivosCancelados, setVerMotivosCancelados] = useState(false);","depois":"  const [verMotivosCancelados, setVerMotivosCancelados] = useState(false);\n  // No celular a faixa de cancelados vem fechada (uma linha so).\n  const [canceladosAbertos, setCanceladosAbertos] = useState(false);"},{"nome":"ajuste 2","antes":"        return (\n          <div className=\"flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300\">\n            <span className=\"inline-flex shrink-0 items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200\">","depois":"        return (\n          <>\n          {!canceladosAbertos ? (\n            <button\n              type=\"button\"\n              onClick={() => setCanceladosAbertos(true)}\n              className=\"flex w-full items-center gap-1.5 border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-bold text-slate-700 sm:hidden dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200\"\n            >\n              <Ban size={13} className=\"shrink-0 text-rose-500\" />\n              {cancelados.length} cancelado{cancelados.length === 1 ? \"\" : \"s\"}\n              {viewMode === \"week\" ? \" na semana\" : selectedDateIsToday ? \" hoje\" : \" neste dia\"}\n              <span className=\"ml-auto font-semibold text-violet-700 dark:text-violet-200\">ver</span>\n            </button>\n          ) : null}\n          <div className={`${canceladosAbertos ? \"flex\" : \"hidden sm:flex\"} flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300`}>\n            <span className=\"inline-flex shrink-0 items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200\">"},{"nome":"ajuste 3","antes":"              {mostrarCancelados ? \"Esconder da agenda\" : \"Mostrar na agenda\"}\n            </button>\n          </div>\n        );\n      })()}","depois":"              {mostrarCancelados ? \"Esconder da agenda\" : \"Mostrar na agenda\"}\n            </button>\n            <button\n              type=\"button\"\n              onClick={() => setCanceladosAbertos(false)}\n              className=\"shrink-0 rounded-md px-2 py-1 text-[11px] font-bold text-violet-700 sm:hidden dark:text-violet-200\"\n            >\n              Fechar\n            </button>\n          </div>\n          </>\n        );\n      })()}"}]}]};

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
