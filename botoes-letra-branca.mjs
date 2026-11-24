#!/usr/bin/env node
/*
 * BOTOES COM LETRA BRANCA SUMINDO NO TEMA CLARO - Studio Realcar
 *
 * O tema claro deixa branco o fundo escuro de alguns botoes, e a letra branca
 * sumia. Corrigido: "Sim, desistiu" e o de sinal (Para remarcar), "Sim,
 * liberar" (pre-reservas), "Concluir" (mensagem de falta) e o de backup
 * (Configuracoes > Implantacao).
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node botoes-letra-branca.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/agenda/components/ParaRemarcarPainel.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"                          <button type=\"button\" onClick={() => desistiu(pendente, \"RETER\")} disabled={salvando !== null} className=\"h-9 rounded-lg bg-slate-800 px-3 font-semibold text-white disabled:opacity-50\">","depois":"                          <button type=\"button\" onClick={() => desistiu(pendente, \"RETER\")} disabled={salvando !== null} className=\"h-9 rounded-lg bg-rose-600 px-3 font-semibold text-white hover:bg-rose-700 disabled:opacity-50\">"},{"nome":"ajuste 2","antes":"                        <button type=\"button\" onClick={() => desistiu(pendente)} disabled={salvando !== null} className=\"h-9 rounded-lg bg-slate-800 px-3 font-semibold text-white disabled:opacity-50\">","depois":"                        <button type=\"button\" onClick={() => desistiu(pendente)} disabled={salvando !== null} className=\"h-9 rounded-lg bg-rose-600 px-3 font-semibold text-white hover:bg-rose-700 disabled:opacity-50\">"}]},{"arquivo":"app/(app)/agenda/components/PreReservasPainel.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"className=\"h-9 rounded-lg bg-slate-800 px-3 font-semibold text-white disabled:opacity-50\"","depois":"className=\"h-9 rounded-lg bg-rose-600 px-3 font-semibold text-white hover:bg-rose-700 disabled:opacity-50\""}]},{"arquivo":"app/(app)/agenda/components/DesmarcarAgendamentoModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"rounded-xl bg-slate-900 text-sm font-bold text-white hover:bg-slate-800 sm:flex-[2]\"","depois":"rounded-xl bg-violet-600 text-sm font-bold text-white hover:bg-violet-700 sm:flex-[2]\""}]},{"arquivo":"app/(app)/configuracoes/implantacao/ImplantacaoClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"className=\"mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-slate-950\"","depois":"className=\"mt-5 inline-flex rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700\""}]}]};

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
