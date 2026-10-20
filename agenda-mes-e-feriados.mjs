#!/usr/bin/env node
/*
 * AGENDA: MES CERTO NO TOPO + FERIADOS - Studio Realcar
 *
 * 1) O titulo do mes acima dos dias passa a acompanhar o dia escolhido
 *    (antes ficava "Outubro" mesmo com a agenda em novembro).
 * 2) Feriados aparecem sozinhos na Agenda: ponto vermelho no dia, faixa rosa
 *    com o nome do feriado e o nome no cabecalho da visao Semana.
 *    Nacionais, Carnaval, Sexta-feira Santa, Corpus Christi, 9 de julho (SP),
 *    19/02 e 01/10 (Taboao da Serra). Calculados para qualquer ano.
 *    E so aviso: nao bloqueia horario.
 *
 * Nao muda o banco de dados. Pode rodar mais de uma vez; se algum trecho nao
 * for encontrado, NADA e gravado.
 *
 * Uso: node agenda-mes-e-feriados.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{"lib/feriados.ts":"/**\n * Feriados que aparecem na Agenda (Studio Realcar, Taboao da Serra - SP).\n *\n * Calculados sozinhos para qualquer ano: os fixos (Natal, Finados...) e os que\n * mudam todo ano conforme a Pascoa (Carnaval, Sexta-feira Santa, Corpus\n * Christi). So servem de aviso visual: nao bloqueiam horario nenhum.\n *\n * Para incluir ou tirar um feriado, mexa nas listas abaixo.\n */\n\nexport type TipoFeriado = \"nacional\" | \"estadual\" | \"municipal\" | \"facultativo\";\n\nexport type Feriado = {\n  data: string; // \"2026-11-02\"\n  nome: string;\n  tipo: TipoFeriado;\n};\n\n// Dia e mes fixos.\nconst FIXOS: Array<{ mes: number; dia: number; nome: string; tipo: TipoFeriado }> = [\n  { mes: 1, dia: 1, nome: \"Confraternização Universal\", tipo: \"nacional\" },\n  { mes: 2, dia: 19, nome: \"Aniversário de Taboão da Serra\", tipo: \"municipal\" },\n  { mes: 4, dia: 21, nome: \"Tiradentes\", tipo: \"nacional\" },\n  { mes: 5, dia: 1, nome: \"Dia do Trabalho\", tipo: \"nacional\" },\n  { mes: 7, dia: 9, nome: \"Revolução Constitucionalista\", tipo: \"estadual\" },\n  { mes: 9, dia: 7, nome: \"Independência do Brasil\", tipo: \"nacional\" },\n  { mes: 10, dia: 1, nome: \"Amor Misericordioso de Deus (Taboão)\", tipo: \"municipal\" },\n  { mes: 10, dia: 12, nome: \"Nossa Senhora Aparecida\", tipo: \"nacional\" },\n  { mes: 11, dia: 2, nome: \"Finados\", tipo: \"nacional\" },\n  { mes: 11, dia: 15, nome: \"Proclamação da República\", tipo: \"nacional\" },\n  { mes: 11, dia: 20, nome: \"Consciência Negra\", tipo: \"nacional\" },\n  { mes: 12, dia: 25, nome: \"Natal\", tipo: \"nacional\" },\n];\n\n// Dias contados a partir do domingo de Pascoa.\nconst MOVEIS: Array<{ deslocamento: number; nome: string; tipo: TipoFeriado }> = [\n  { deslocamento: -48, nome: \"Carnaval\", tipo: \"facultativo\" },\n  { deslocamento: -47, nome: \"Carnaval\", tipo: \"facultativo\" },\n  { deslocamento: -2, nome: \"Sexta-feira Santa\", tipo: \"nacional\" },\n  { deslocamento: 60, nome: \"Corpus Christi\", tipo: \"municipal\" },\n];\n\nconst ROTULO_TIPO: Record<TipoFeriado, string> = {\n  nacional: \"feriado nacional\",\n  estadual: \"feriado estadual\",\n  municipal: \"feriado municipal\",\n  facultativo: \"ponto facultativo\",\n};\n\nexport function rotuloTipoFeriado(tipo: TipoFeriado) {\n  return ROTULO_TIPO[tipo];\n}\n\nfunction chave(ano: number, mes: number, dia: number) {\n  return `${ano}-${String(mes).padStart(2, \"0\")}-${String(dia).padStart(2, \"0\")}`;\n}\n\n/** Domingo de Pascoa (calendario gregoriano, metodo de Meeus/Butcher). */\nexport function domingoDePascoa(ano: number): { mes: number; dia: number } {\n  const a = ano % 19;\n  const b = Math.floor(ano / 100);\n  const c = ano % 100;\n  const d = Math.floor(b / 4);\n  const e = b % 4;\n  const f = Math.floor((b + 8) / 25);\n  const g = Math.floor((b - f + 1) / 3);\n  const h = (19 * a + b - d - g + 15) % 30;\n  const i = Math.floor(c / 4);\n  const k = c % 4;\n  const l = (32 + 2 * e + 2 * i - h - k) % 7;\n  const m = Math.floor((a + 11 * h + 22 * l) / 451);\n  const mes = Math.floor((h + l - 7 * m + 114) / 31);\n  const dia = ((h + l - 7 * m + 114) % 31) + 1;\n  return { mes, dia };\n}\n\nconst cache = new Map<number, Map<string, Feriado>>();\n\nexport function feriadosDoAno(ano: number): Map<string, Feriado> {\n  const pronto = cache.get(ano);\n  if (pronto) return pronto;\n\n  const mapa = new Map<string, Feriado>();\n  for (const item of FIXOS) {\n    const data = chave(ano, item.mes, item.dia);\n    mapa.set(data, { data, nome: item.nome, tipo: item.tipo });\n  }\n\n  const pascoa = domingoDePascoa(ano);\n  const base = Date.UTC(ano, pascoa.mes - 1, pascoa.dia);\n  for (const item of MOVEIS) {\n    const dia = new Date(base + item.deslocamento * 86_400_000);\n    const data = chave(dia.getUTCFullYear(), dia.getUTCMonth() + 1, dia.getUTCDate());\n    if (!mapa.has(data)) mapa.set(data, { data, nome: item.nome, tipo: item.tipo });\n  }\n\n  cache.set(ano, mapa);\n  return mapa;\n}\n\n/** Feriado do dia (\"2026-11-02\"), ou null. */\nexport function feriadoDoDia(dia: string): Feriado | null {\n  const ano = Number(dia.slice(0, 4));\n  if (!Number.isInteger(ano) || ano < 1900 || ano > 2200) return null;\n  return feriadosDoAno(ano).get(dia.slice(0, 10)) ?? null;\n}\n"},"arquivos":[{"arquivo":"app/(app)/agenda/components/AgendaCalendar.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import type { AppointmentDetails } from \"./AppointmentDetailsModal\";\n","depois":"import type { AppointmentDetails } from \"./AppointmentDetailsModal\";\nimport { feriadoDoDia, rotuloTipoFeriado } from \"@/lib/feriados\";\n"},{"nome":"ajuste 2","antes":"    const center = container.scrollLeft + container.clientWidth / 2;\n    let closestDate = \"\";\n    let closestDistance = Number.POSITIVE_INFINITY;\n\n    container\n      .querySelectorAll<HTMLElement>(\"[data-agenda-date]\")\n      .forEach((element) => {\n        const elementCenter = element.offsetLeft + element.offsetWidth / 2;\n        const distance = Math.abs(elementCenter - center);","depois":"    // Mede pela posicao na tela (e nao por offsetLeft, que e contado a partir\n    // de outro elemento e fazia o mes do topo ficar atrasado).\n    const caixa = container.getBoundingClientRect();\n    const center = caixa.left + caixa.width / 2;\n    let closestDate = \"\";\n    let closestDistance = Number.POSITIVE_INFINITY;\n\n    container\n      .querySelectorAll<HTMLElement>(\"[data-agenda-date]\")\n      .forEach((element) => {\n        const retangulo = element.getBoundingClientRect();\n        const elementCenter = retangulo.left + retangulo.width / 2;\n        const distance = Math.abs(elementCenter - center);"},{"nome":"ajuste 3","antes":"                  const saturday = dayOfWeek === 6;\n                  const sunday = dayOfWeek === 0;\n\n                  return (\n                    <a\n                      key={formatDateInput(day)}\n                      data-agenda-date={formatDateInput(day)}\n                      href={agendaHref(day, profissionalFiltro, viewMode)}\n                      aria-current={active ? \"date\" : undefined}\n                      aria-label={`${formatWeekday(day)}, ${formatDateCompact(day)}${todayItem ? \", hoje\" : \"\"}`}\n                      title={formatDateCompact(day)}","depois":"                  const saturday = dayOfWeek === 6;\n                  const feriado = feriadoDoDia(formatDateInput(day));\n                  // Feriado aparece com a mesma cor do domingo, mais o ponto vermelho.\n                  const sunday = dayOfWeek === 0 || Boolean(feriado);\n\n                  return (\n                    <a\n                      key={formatDateInput(day)}\n                      data-agenda-date={formatDateInput(day)}\n                      href={agendaHref(day, profissionalFiltro, viewMode)}\n                      aria-current={active ? \"date\" : undefined}\n                      aria-label={`${formatWeekday(day)}, ${formatDateCompact(day)}${todayItem ? \", hoje\" : \"\"}${feriado ? `, ${feriado.nome}` : \"\"}`}\n                      title={feriado ? `${formatDateCompact(day)} · ${feriado.nome} (${rotuloTipoFeriado(feriado.tipo)})` : formatDateCompact(day)}"},{"nome":"ajuste 4","antes":"                      {todayItem && !active ? (\n                        <span\n                          className=\"absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-violet-600 dark:bg-violet-300\"\n                          aria-hidden=\"true\"\n                        />\n                      ) : null}","depois":"                      {todayItem && !active ? (\n                        <span\n                          className=\"absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-violet-600 dark:bg-violet-300\"\n                          aria-hidden=\"true\"\n                        />\n                      ) : null}\n                      {feriado ? (\n                        <span\n                          className={`absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${active ? \"bg-white\" : \"bg-rose-500\"}`}\n                          aria-hidden=\"true\"\n                        />\n                      ) : null}"},{"nome":"ajuste 5","antes":"      {viewMode === \"week\" ? (\n        <div className=\"w-full overflow-x-auto border-t border-slate-300 dark:border-slate-700\">","depois":"      {(() => {\n        const feriadosVisiveis = (viewMode === \"week\" ? weekDays : [selectedDate])\n          .map((dia) => ({ dia, feriado: feriadoDoDia(formatDateInput(dia)) }))\n          .filter((item) => item.feriado);\n        if (feriadosVisiveis.length === 0) return null;\n        return (\n          <div className=\"flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 sm:text-sm\">\n            {feriadosVisiveis.map(({ dia, feriado }) => (\n              <span key={formatDateInput(dia)}>\n                {viewMode === \"week\" ? `${formatWeekday(dia)} ${String(dia.getDate()).padStart(2, \"0\")}: ` : \"Feriado: \"}\n                {feriado!.nome} <span className=\"font-normal opacity-80\">({rotuloTipoFeriado(feriado!.tipo)})</span>\n              </span>\n            ))}\n          </div>\n        );\n      })()}\n\n      {viewMode === \"week\" ? (\n        <div className=\"w-full overflow-x-auto border-t border-slate-300 dark:border-slate-700\">"},{"nome":"ajuste 6","antes":"                      <p className=\"mt-0.5 text-lg font-extrabold text-slate-900 dark:text-white\">\n                        {String(day.getDate()).padStart(2, \"0\")}\n                      </p>\n                    </div>","depois":"                      <p className=\"mt-0.5 text-lg font-extrabold text-slate-900 dark:text-white\">\n                        {String(day.getDate()).padStart(2, \"0\")}\n                      </p>\n                      {feriadoDoDia(formatDateInput(day)) ? (\n                        <p className=\"max-w-[9rem] truncate text-[10px] font-bold text-rose-600 dark:text-rose-300\">\n                          {feriadoDoDia(formatDateInput(day))!.nome}\n                        </p>\n                      ) : null}\n                    </div>"}]}]};
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
