#!/usr/bin/env node
/*
 * // pacote-varias-sessoes.mjs — Finalização: dá para marcar mais de um pacote feito no mesmo dia
 * // (ex.: axila e virilha). Cada pacote marcado conta +1 sessão. Nada é marcado à força.
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node pacote-varias-sessoes.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"actions/agendamento.actions.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  /** Esta sessao faz parte deste pacote: conta +1 sessao feita. */\n  pacoteSessaoId?: number | null;","depois":"  /** Esta sessao faz parte deste pacote: conta +1 sessao feita. */\n  pacoteSessaoId?: number | null;\n  /** Varios pacotes feitos no mesmo dia (ex.: axila e virilha): +1 em cada. */\n  pacoteSessaoIds?: number[];"},{"nome":"ajuste 2","antes":"    // Sessao de pacote: conta mais uma sessao feita (so pacote desta cliente).\n    const pacoteSessaoId = Math.trunc(Number(dados.pacoteSessaoId) || 0);\n    if (pacoteSessaoId > 0) {\n      const pacoteSessao = await tx.pacoteCliente.findFirst({","depois":"    // Sessao de pacote: conta mais uma sessao feita em cada pacote escolhido\n    // (so pacotes desta cliente, cada um uma vez).\n    const idsSessao = Array.from(\n      new Set(\n        [...(dados.pacoteSessaoIds ?? []), dados.pacoteSessaoId]\n          .map((id) => Math.trunc(Number(id) || 0))\n          .filter((id) => id > 0),\n      ),\n    ).slice(0, 10);\n    for (const pacoteSessaoId of idsSessao) {\n      const pacoteSessao = await tx.pacoteCliente.findFirst({"}]},{"arquivo":"app/(app)/agenda/components/FinalizarAtendimentoModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  // Sessao de pacote: undefined = escolha automatica; null = nao e do pacote.\n  const [sessaoPacoteEscolha, setSessaoPacoteEscolha] = useState<number | null | undefined>(undefined);","depois":"  // Sessoes de pacote: undefined = escolha automatica; [] = nao e de pacote.\n  const [sessaoPacoteEscolha, setSessaoPacoteEscolha] = useState<number[] | undefined>(undefined);"},{"nome":"ajuste 2","antes":"  // Automatico: um pacote so com sessoes e a sessao sem cobranca (retorno ou R$ 0).\n  const sessaoPacoteId =\n    sessaoPacoteEscolha !== undefined\n      ? sessaoPacoteEscolha\n      : pacotesComSessao.length === 1 && (atendimentoRetorno || valorServico <= 0)\n        ? pacotesComSessao[0].id\n        : null;","depois":"  // Automatico so quando ha um pacote e a sessao e sem cobranca (retorno ou\n  // R$ 0). Com dois ou mais, quem atende toca em cada um que fez hoje.\n  const sessaoPacoteIds: number[] =\n    sessaoPacoteEscolha !== undefined\n      ? sessaoPacoteEscolha\n      : pacotesComSessao.length === 1 && (atendimentoRetorno || valorServico <= 0)\n        ? [pacotesComSessao[0].id]\n        : [];\n  function alternarSessaoPacote(id: number) {\n    setSessaoPacoteEscolha(\n      sessaoPacoteIds.includes(id)\n        ? sessaoPacoteIds.filter((item) => item !== id)\n        : [...sessaoPacoteIds, id],\n    );\n  }"},{"nome":"ajuste 3","antes":"          pacoteSessaoId: sessaoPacoteId,","depois":"          pacoteSessaoIds: sessaoPacoteIds,"},{"nome":"ajuste 4","antes":"                        <p className=\"text-xs font-bold text-violet-900\">\n                          Esta sessão é de pacote?\n                        </p>\n                        <div className=\"mt-2 flex flex-col gap-1.5\">\n                          {pacotesComSessao.map((pacote) => {\n                            const escolhido = sessaoPacoteId === pacote.id;\n                            return (\n                              <button\n                                key={pacote.id}\n                                type=\"button\"\n                                onClick={() => setSessaoPacoteEscolha(pacote.id)}","depois":"                        <p className=\"text-xs font-bold text-violet-900\">\n                          Esta sessão é de pacote?\n                        </p>\n                        {pacotesComSessao.length > 1 ? (\n                          <p className=\"mt-0.5 text-[11px] text-violet-800\">\n                            Toque em cada pacote feito hoje (pode ser mais de um).\n                          </p>\n                        ) : null}\n                        <div className=\"mt-2 flex flex-col gap-1.5\">\n                          {pacotesComSessao.map((pacote) => {\n                            const escolhido = sessaoPacoteIds.includes(pacote.id);\n                            return (\n                              <button\n                                key={pacote.id}\n                                type=\"button\"\n                                aria-pressed={escolhido}\n                                onClick={() => alternarSessaoPacote(pacote.id)}"},{"nome":"ajuste 5","antes":"                            onClick={() => setSessaoPacoteEscolha(null)}\n                            className={`min-h-9 rounded-lg border px-3 text-[11px] font-semibold transition ${\n                              sessaoPacoteId === null\n                                ? \"border-slate-500 bg-slate-200 text-slate-900\"\n                                : \"border-slate-200 bg-white text-slate-600 hover:bg-slate-50\"\n                            }`}\n                          >\n                            {sessaoPacoteId === null ? \"✓ \" : \"\"}Não é sessão de pacote","depois":"                            onClick={() => setSessaoPacoteEscolha([])}\n                            className={`min-h-9 rounded-lg border px-3 text-[11px] font-semibold transition ${\n                              sessaoPacoteIds.length === 0\n                                ? \"border-slate-500 bg-slate-200 text-slate-900\"\n                                : \"border-slate-200 bg-white text-slate-600 hover:bg-slate-50\"\n                            }`}\n                          >\n                            {sessaoPacoteIds.length === 0 ? \"✓ \" : \"\"}Não é sessão de pacote"}]}]};

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
