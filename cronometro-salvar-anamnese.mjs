#!/usr/bin/env node
/*
 * CRONOMETRO DO SALVAR ANAMNESE - Studio Realcar
 *
 * Serve para descobrir ONDE esta a demora ao salvar/finalizar a assinatura.
 * A cada rascunho salvo ou ficha finalizada, o sistema anota na Auditoria
 * (tela Auditoria, linha "Finalizou e assinar anamnese" ou "Salvou rascunho")
 * quanto tempo o servidor levou em cada etapa: login, conferencia, ficha,
 * gravacao, e o tamanho da assinatura. Nao muda nada do que a pessoa ve.
 *
 * Altera so actions/anamnese-config.actions.ts. Pode rodar mais de uma vez;
 * se algum trecho nao for encontrado, NADA e gravado.
 *
 * Uso: node cronometro-salvar-anamnese.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"actions/anamnese-config.actions.ts","patches":[{"nome":"cronometro: inicio e login","antes":"export async function salvarRespostasAnamneseRapida(formData: FormData) {\n  const usuario = await requirePermission(\"clientes.clinico\");","depois":"export async function salvarRespostasAnamneseRapida(formData: FormData) {\n  // Cronometro: mede cada etapa e anota na Auditoria (para achar o que demora).\n  const tInicio = Date.now();\n  const usuario = await requirePermission(\"clientes.clinico\");\n  const tLogin = Date.now();","modo":"normal"},{"nome":"cronometro: conferencia dos campos obrigatorios","antes":"  if (intencao === \"finalizar\") {\n    await validarObrigatorias(modeloId, respostas);\n  }\n","depois":"  if (intencao === \"finalizar\") {\n    await validarObrigatorias(modeloId, respostas);\n  }\n  const tConferencia = Date.now();\n","modo":"normal"},{"nome":"cronometro: ficha","antes":"  const ficha = await obterOuCriarRascunho(\n    clienteId,\n    procedimento,\n    profissional,\n    dataFicha,\n    anamneseIdAtual,\n  );\n","depois":"  const ficha = await obterOuCriarRascunho(\n    clienteId,\n    procedimento,\n    profissional,\n    dataFicha,\n    anamneseIdAtual,\n  );\n  const tFicha = Date.now();\n","modo":"normal"},{"nome":"cronometro: gravacao","antes":"  });\n\n  await prisma.auditoria.create({\n    data: {\n      modulo: \"Clientes\",\n      acao:\n        intencao === \"finalizar\"","depois":"  });\n  const tGravacao = Date.now();\n\n  await prisma.auditoria.create({\n    data: {\n      modulo: \"Clientes\",\n      acao:\n        intencao === \"finalizar\"","modo":"normal"},{"nome":"cronometro: anotar na auditoria","antes":"      detalhes: `${clienteId} - ${procedimento || \"Sem procedimento\"} - versão ${ficha.versao}`,","depois":"      detalhes: `${clienteId} - ${procedimento || \"Sem procedimento\"} - versão ${ficha.versao} - servidor levou ${tGravacao - tInicio} ms (login ${tLogin - tInicio}, conferência ${tConferencia - tLogin}, ficha ${tFicha - tConferencia}, gravação ${tGravacao - tFicha}) - assinatura ${Math.round((assinaturaCliente?.length ?? 0) / 1024)} KB`,","modo":"normal"}]}]};
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
