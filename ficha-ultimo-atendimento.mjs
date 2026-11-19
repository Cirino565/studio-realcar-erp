#!/usr/bin/env node
/*
 * FICHA: O QUE FEZ E QUANDO - Studio Realcar
 *
 * Topo da ficha da cliente: o quadro Procedimentos mostra os ultimos
 * procedimentos com a data (e "Ver todos"); "Ultimo procedimento" vira
 * "Ultimo atendimento", com tudo o que fez no dia e quantos produtos levou.
 * Tira a linha repetida do resumo de baixo. No formulario manual da aba
 * Procedimentos, aviso de que anotar ali nao entra no caixa.
 * Rode DEPOIS do fechamento-e-ficha-detalhados.mjs.
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node ficha-ultimo-atendimento.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/clientes/components/ClienteProfileHeader.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  const ultimoProcedimento = data.procedimentos[0];\n  const ultimaEvolucao = data.evolucoes[0];","depois":"  // Atendimentos por dia (procedimentos + produtos comprados no mesmo dia),\n  // do mais recente para o mais antigo.\n  const diaDe = (iso: string) =>\n    new Date(iso).toLocaleDateString(\"en-CA\", { timeZone: \"America/Sao_Paulo\" });\n  const porDia = new Map<string, { data: string; nomes: string[]; produtos: number }>();\n  for (const procedimento of data.procedimentos) {\n    const dia = diaDe(procedimento.dataProcedimento);\n    const grupo = porDia.get(dia) ?? { data: procedimento.dataProcedimento, nomes: [], produtos: 0 };\n    if (!grupo.nomes.includes(procedimento.nome)) grupo.nomes.push(procedimento.nome);\n    porDia.set(dia, grupo);\n  }\n  for (const compra of data.compras ?? []) {\n    const dia = diaDe(compra.data);\n    const grupo = porDia.get(dia) ?? { data: compra.data, nomes: [], produtos: 0 };\n    grupo.produtos += compra.itens.reduce((soma, item) => soma + item.quantidade, 0);\n    porDia.set(dia, grupo);\n  }\n  const atendimentos = [...porDia.entries()]\n    .sort(([a], [b]) => b.localeCompare(a))\n    .map(([, grupo]) => grupo);\n  const ultimoAtendimento = atendimentos[0];\n  const ultimaEvolucao = data.evolucoes[0];"},{"nome":"ajuste 2","antes":"            <p className=\"mt-2 text-2xl font-bold text-slate-900 dark:text-white\">\n              {totalProcedimentos}\n            </p>\n          </div>","depois":"            <p className=\"mt-2 text-2xl font-bold text-slate-900 dark:text-white\">\n              {totalProcedimentos}\n            </p>\n\n            {/* O que fez e quando (os 3 ultimos), com atalho para a lista. */}\n            {data.procedimentos.length > 0 ? (\n              <a href=\"#procedimentos\" className=\"mt-1 block space-y-0.5 text-xs text-slate-600 hover:text-violet-700 dark:text-slate-300\">\n                {data.procedimentos.slice(0, 3).map((procedimento) => (\n                  <span key={procedimento.id} className=\"block truncate\">\n                    {procedimento.nome} · {formatarData(procedimento.dataProcedimento)}\n                  </span>\n                ))}\n                {data.procedimentos.length > 3 ? (\n                  <span className=\"block font-semibold text-violet-700 dark:text-violet-300\">\n                    Ver todos ({data.procedimentos.length})\n                  </span>\n                ) : null}\n              </a>\n            ) : null}\n          </div>"},{"nome":"ajuste 3","antes":"              <span className=\"text-xs font-semibold uppercase tracking-wide\">\n                Último procedimento\n              </span>\n            </div>\n\n            <p className=\"mt-2 truncate text-sm font-semibold text-slate-900 dark:text-white\">\n              {ultimoProcedimento?.nome ?? \"Nenhum\"}\n            </p>\n\n            {ultimoProcedimento ? (\n              <p className=\"mt-1 text-xs text-slate-500\">\n                {formatarData(ultimoProcedimento.dataProcedimento)}\n              </p>\n            ) : null}","depois":"              <span className=\"text-xs font-semibold uppercase tracking-wide\">\n                Último atendimento\n              </span>\n            </div>\n\n            {ultimoAtendimento ? (\n              <a href=\"#procedimentos\" className=\"block hover:text-violet-700\">\n                <p className=\"mt-2 text-sm font-semibold text-slate-900 dark:text-white\">\n                  {ultimoAtendimento.nomes.join(\" + \") || \"Compra de produtos\"}\n                </p>\n                <p className=\"mt-1 text-xs text-slate-500\">\n                  {formatarData(ultimoAtendimento.data)}\n                  {ultimoAtendimento.produtos > 0\n                    ? ` · ${ultimoAtendimento.produtos} produto${ultimoAtendimento.produtos === 1 ? \"\" : \"s\"}`\n                    : \"\"}\n                </p>\n              </a>\n            ) : (\n              <p className=\"mt-2 text-sm font-semibold text-slate-900 dark:text-white\">Nenhum</p>\n            )}"}]},{"arquivo":"app/(app)/clientes/components/ClienteClinicoTabs.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"          {historicoPorDia[0] ? (\n            <button\n              type=\"button\"\n              onClick={() => ativarAba(\"procedimentos\")}\n              className=\"mt-2 block w-full text-left text-xs leading-5 text-slate-600 underline-offset-2 hover:underline dark:text-slate-300\"\n            >\n              <span className=\"font-semibold\">Último dia ({formatarData(historicoPorDia[0].data)}):</span>{\" \"}\n              {[\n                ...historicoPorDia[0].procedimentos.map((item) => item.nome),\n                ...(historicoPorDia[0].produtos.length > 0\n                  ? [`${historicoPorDia[0].produtos.reduce((soma, item) => soma + item.quantidade, 0)} produto(s)`]\n                  : []),\n              ].join(\" · \")}\n            </button>\n          ) : null}","depois":"","modo":"remover"},{"nome":"ajuste 2","antes":"                <BotaoSalvar salvandoLabel=\"Salvando procedimento...\">\n                  <Plus size={17} />\n                  Registrar procedimento","depois":"                <p className=\"rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800\">\n                  Isto só anota na ficha: <strong>não entra no caixa</strong>. Procedimento feito e cobrado no\n                  atendimento vai em Finalizar atendimento &gt; &quot;Outros procedimentos fechados agora&quot;.\n                </p>\n\n                <BotaoSalvar salvandoLabel=\"Salvando procedimento...\">\n                  <Plus size={17} />\n                  Registrar procedimento"}]}]};

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
