#!/usr/bin/env node
/*
 * AREA DA CLIENTE AUTOMATICA PELA PROFISSIONAL - Studio Realcar
 *
 * Novo agendamento: escolhendo a Vivian, "Estetica" ja vem marcada (e a
 * Gabriely, "Cilios"), para qualquer pessoa que esteja usando o sistema.
 * Usa a area cadastrada da profissional; sem ela, o nome. Trocar a
 * profissional troca a marcacao automatica, sem deixar a anterior presa.
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node area-automatica-profissional.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"lib/area-cliente.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"export function obterAreaPadraoAgendamento(","depois":"/**\n * Area de quem vai atender: pelo campo \"area\" da profissional (Estetica /\n * Cilios) ou, sem ele, pelo nome (Vivian = estetica, Gabriely = cilios).\n */\nexport function areaDaProfissional(\n  profissional?: { nome?: string | null; area?: string | null } | null,\n): AreaPadraoAgendamento {\n  if (!profissional) return null;\n  const area = normalizarTexto(profissional.area);\n  if (area.includes(\"estet\")) return \"estetica\";\n  if (area.includes(\"cili\")) return \"cilios\";\n  return obterAreaPadraoAgendamento(profissional.nome, false);\n}\n\nexport function obterAreaPadraoAgendamento("}]},{"arquivo":"app/(app)/agenda/components/NovoAgendamentoModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  const areaAutomaticaAtiva =\n    !modoEdicao && !modoEdicaoBloqueio ? areaPadraoAgendamento : null;","depois":"  // Area automatica: a de quem esta logado (Vivian/Gabriely) ou, se nao\n  // tiver, a da profissional escolhida no agendamento (Vivian = Estetica).\n  const areaAutomaticaAtiva =\n    !modoEdicao && !modoEdicaoBloqueio\n      ? areaPadraoAgendamento ??\n        areaDaProfissional(\n          profissionais.find((profissional) => String(profissional.id) === String(profissionalId)),\n        )\n      : null;\n  const areaEsteticaMarcada = areaEstetica || areaAutomaticaAtiva === \"estetica\";\n  const areaCiliosMarcada = areaCilios || areaAutomaticaAtiva === \"cilios\";"},{"nome":"ajuste 2","antes":"        areaEstetica,\n        areaCilios,\n        recorrencia:","depois":"        areaEstetica: areaEsteticaMarcada,\n        areaCilios: areaCiliosMarcada,\n        recorrencia:"},{"nome":"ajuste 3","antes":"              {areaAutomaticaAtiva ? (\n                <span className=\"text-[11px] font-medium text-violet-700 dark:text-violet-300\">\n                  Padrão automático: {areaAutomaticaAtiva === \"estetica\" ? \"Estética\" : \"Cílios\"}\n                </span>\n              ) : null}","depois":"              {areaAutomaticaAtiva ? (\n                <span className=\"text-[11px] font-medium text-violet-700 dark:text-violet-300\">\n                  Automático pela profissional: {areaAutomaticaAtiva === \"estetica\" ? \"Estética\" : \"Cílios\"}\n                </span>\n              ) : null}"},{"nome":"ajuste 4","antes":"                  checked={areaEstetica}\n                  disabled={areaAutomaticaAtiva === \"estetica\"}","depois":"                  checked={areaEsteticaMarcada}\n                  disabled={areaAutomaticaAtiva === \"estetica\"}"},{"nome":"ajuste 5","antes":"                  checked={areaCilios}\n                  disabled={areaAutomaticaAtiva === \"cilios\"}","depois":"                  checked={areaCiliosMarcada}\n                  disabled={areaAutomaticaAtiva === \"cilios\"}"},{"nome":"ajuste 6","antes":"import { mensagemErroAcao } from \"@/lib/erro-acao\";\n","depois":"import { mensagemErroAcao } from \"@/lib/erro-acao\";\nimport { areaDaProfissional } from \"@/lib/area-cliente\";\n"},{"nome":"ajuste 7","antes":"      Boolean(clienteInicial?.areaEstetica) || areaAutomaticaAtiva === \"estetica\",","depois":"      Boolean(clienteInicial?.areaEstetica),"},{"nome":"ajuste 8","antes":"      Boolean(clienteInicial?.areaCilios) || areaAutomaticaAtiva === \"cilios\",","depois":"      Boolean(clienteInicial?.areaCilios),"},{"nome":"ajuste 9","antes":"  function aplicarAreasPadrao() {\n    setAreaEstetica(areaAutomaticaAtiva === \"estetica\");\n    setAreaCilios(areaAutomaticaAtiva === \"cilios\");\n  }","depois":"  // A area automatica (da profissional) ja e somada na tela e ao salvar.\n  function aplicarAreasPadrao() {\n    setAreaEstetica(false);\n    setAreaCilios(false);\n  }"},{"nome":"ajuste 10","antes":"      cliente.areaEstetica || areaAutomaticaAtiva === \"estetica\",","depois":"      Boolean(cliente.areaEstetica),"},{"nome":"ajuste 11","antes":"      cliente.areaCilios || areaAutomaticaAtiva === \"cilios\",","depois":"      Boolean(cliente.areaCilios),"}]}]};

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
