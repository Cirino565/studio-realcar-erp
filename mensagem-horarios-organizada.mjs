#!/usr/bin/env node
/*
 * MENSAGEM DOS HORARIOS LIVRES MAIS ORGANIZADA - Studio Realcar
 *
 * A mensagem para a cliente fica com um dia por linha, dia em negrito no
 * WhatsApp, saudacao e fechamento:
 *   Ola! Tudo bem?
 *   Para *Limpeza de pele* a tarde, tenho estes horarios disponiveis:
 *   *Hoje, 16/11* - 15h  /  *Amanha, 17/11* - 16h  /  *Quarta-feira, 18/11* - 14h
 *   Qual fica melhor para voce? Assim ja deixo reservado.
 * A previa na tela mostra igual ao WhatsApp (negrito, quebra de linha).
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node mensagem-horarios-organizada.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"lib/horarios-livres.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"function juntarComOu(partes: string[]) {\n  if (partes.length <= 1) return partes.join(\"\");\n  return `${partes.slice(0, -1).join(\", \")} ou ${partes[partes.length - 1]}`;\n}\n\n/** Mensagem curta para colar no WhatsApp da cliente. */\nexport function mensagemHorariosCliente({\n  procedimento,\n  periodo,\n  escolhidos,\n  hojeISO,\n}: {\n  procedimento?: string | null;\n  periodo: PeriodoHorario;\n  escolhidos: HorarioEscolhido[];\n  hojeISO: string;\n}) {\n  if (escolhidos.length === 0) return \"\";\n\n  const lista = ordenarEscolhidos(escolhidos).map(\n    (item) => `${diaFalado(item.data, hojeISO)} às ${horaFalada(item.hora)}`,\n  );\n  const nome = (procedimento || \"\").trim();\n  const quando = periodo === \"manha\" ? \"de manhã\" : periodo === \"tarde\" ? \"à tarde\" : \"\";\n  const pergunta = escolhidos.length === 1 ? \"Fica bom para você?\" : \"Qual fica melhor para você?\";\n  // \"Para limpeza de pele à tarde, tenho...\" / \"À tarde, tenho...\" / \"Tenho...\"\n  const abertura = nome\n    ? `Para ${nome}${quando ? ` ${quando}` : \"\"}, tenho`\n    : quando\n      ? `${quando.charAt(0).toUpperCase()}${quando.slice(1)}, tenho`\n      : \"Tenho\";\n\n  return `Oi! ${abertura} ${juntarComOu(lista)}. ${pergunta} 😊`;\n}","depois":"function juntarComOu(partes: string[]) {\n  if (partes.length <= 1) return partes.join(\"\");\n  return `${partes.slice(0, -1).join(\", \")} ou ${partes[partes.length - 1]}`;\n}\n\nconst DIAS_SEMANA_COMPLETO = [\n  \"Domingo\",\n  \"Segunda-feira\",\n  \"Terça-feira\",\n  \"Quarta-feira\",\n  \"Quinta-feira\",\n  \"Sexta-feira\",\n  \"Sábado\",\n];\n\n/** \"Hoje, 16/11\", \"Amanhã, 17/11\" ou \"Quarta-feira, 18/11\". */\nfunction diaParaCliente(dataISO: string, hojeISO: string) {\n  const dm = `${dataISO.slice(8, 10)}/${dataISO.slice(5, 7)}`;\n  if (dataISO === hojeISO) return `Hoje, ${dm}`;\n  if (dataISO === somarDiasISO(hojeISO, 1)) return `Amanhã, ${dm}`;\n  return `${DIAS_SEMANA_COMPLETO[diaDaSemanaISO(dataISO)]}, ${dm}`;\n}\n\n/**\n * Mensagem para colar no WhatsApp da cliente, uma linha por dia:\n *\n *   Olá! Tudo bem? 😊\n *\n *   Para *Limpeza de pele* à tarde, tenho estes horários disponíveis:\n *\n *   📅 *Hoje, 16/11* – 15h\n *   📅 *Amanhã, 17/11* – 16h\n *   📅 *Quarta-feira, 18/11* – 14h\n *\n *   Qual fica melhor para você? Assim já deixo reservado. ✨\n *\n * (*texto* fica em negrito no WhatsApp.)\n */\nexport function mensagemHorariosCliente({\n  procedimento,\n  periodo,\n  escolhidos,\n  hojeISO,\n}: {\n  procedimento?: string | null;\n  periodo: PeriodoHorario;\n  escolhidos: HorarioEscolhido[];\n  hojeISO: string;\n}) {\n  if (escolhidos.length === 0) return \"\";\n\n  // Agrupa por dia: \"📅 *Terça-feira, 17/11* – 10h ou 14h\".\n  const porDia = new Map<string, string[]>();\n  for (const item of ordenarEscolhidos(escolhidos)) {\n    porDia.set(item.data, [...(porDia.get(item.data) ?? []), horaFalada(item.hora)]);\n  }\n  const linhas = [...porDia.entries()].map(\n    ([data, horas]) => `📅 *${diaParaCliente(data, hojeISO)}* – ${juntarComOu(horas)}`,\n  );\n\n  const um = escolhidos.length === 1;\n  const nome = (procedimento || \"\").trim();\n  const quando = periodo === \"manha\" ? \" pela manhã\" : periodo === \"tarde\" ? \" à tarde\" : \"\";\n  const oferta = um ? \"tenho este horário disponível\" : \"tenho estes horários disponíveis\";\n  const abertura = nome\n    ? `Para *${nome}*${quando}, ${oferta}:`\n    : `${oferta.charAt(0).toUpperCase()}${oferta.slice(1)}${quando}:`;\n  const pergunta = um\n    ? \"Fica bom para você? Assim já deixo reservado. ✨\"\n    : \"Qual fica melhor para você? Assim já deixo reservado. ✨\";\n\n  return [\"Olá! Tudo bem? 😊\", \"\", abertura, \"\", ...linhas, \"\", pergunta].join(\"\\n\");\n}"}]},{"arquivo":"app/(app)/agenda/components/HorariosLivresModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"          <p className=\"min-h-[2.5rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800\">\n            {mensagem || <span className=\"text-slate-400\">Escolha até {MAX_HORARIOS_CLIENTE} horários na lista.</span>}\n          </p>","depois":"          <p className=\"max-h-28 min-h-[2.5rem] overflow-y-auto sm:max-h-44 whitespace-pre-line rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800\">\n            {mensagem ? (\n              // Mostra como fica no WhatsApp (*texto* em negrito).\n              mensagem.split(/(\\*[^*\\n]+\\*)/).map((parte, indice) =>\n                parte.startsWith(\"*\") && parte.endsWith(\"*\") && parte.length > 2 ? (\n                  <strong key={indice}>{parte.slice(1, -1)}</strong>\n                ) : (\n                  <span key={indice}>{parte}</span>\n                ),\n              )\n            ) : (\n              <span className=\"text-slate-400\">Escolha até {MAX_HORARIOS_CLIENTE} horários na lista.</span>\n            )}\n          </p>"}]}]};
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
