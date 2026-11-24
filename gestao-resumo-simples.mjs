#!/usr/bin/env node
/*
 * // gestao-resumo-simples.mjs — Gestão: "O resultado em palavras" com cores no topo
 * // (entrou, material, despesas, lucro, lucro com produtos e por que o caixa é diferente do lucro).
 * // Os números detalhados ficam recolhidos em "Ver os números em detalhe".
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node gestao-resumo-simples.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{"app/(app)/gestao/components/ResultadoSimples.tsx":"import { formatarMoeda } from \"@/lib/format\";\nimport type { GestaoData } from \"@/lib/gestao\";\n\n/**\n * O resultado do periodo em palavras e cores, para quem nao e da area:\n * quanto entrou, para onde foi (material e despesas) e quanto sobrou de\n * lucro, com \"de cada R$ 100\". Os numeros detalhados continuam abaixo.\n */\nexport default function ResultadoSimples({ financeiro }: { financeiro: GestaoData[\"financeiro\"] }) {\n  const entrou = financeiro.receitaLiquidaRecebida;\n  const material = financeiro.custoDiretoTotal;\n  const despesas = financeiro.despesasOperacionaisPagas;\n  const lucro = financeiro.resultadoGerencial;\n  const caixa = financeiro.saldoRealizado;\n  const lucroProdutos = financeiro.receitaProdutos - financeiro.custoProdutosVendidos;\n\n  if (entrou <= 0 && material <= 0 && despesas <= 0) return null;\n\n  const base = Math.max(entrou, material + despesas, 1);\n  const deCada100 = (valor: number) => (entrou > 0 ? Math.round((valor / entrou) * 100) : 0);\n  const largura = (valor: number) => `${Math.max(0, (valor / base) * 100)}%`;\n  const diferencaCaixa = caixa - lucro;\n\n  const partes = [\n    {\n      cor: \"bg-amber-400\",\n      ponto: \"bg-amber-400\",\n      titulo: \"Material usado\",\n      texto: \"produtos e insumos gastos nos atendimentos e nos produtos vendidos\",\n      valor: material,\n    },\n    {\n      cor: \"bg-rose-400\",\n      ponto: \"bg-rose-400\",\n      titulo: \"Despesas do studio\",\n      texto: \"aluguel, marketing, contas, salários e outras saídas\",\n      valor: despesas,\n    },\n  ];\n\n  return (\n    <section className=\"premium-card p-4 sm:p-5\">\n      <h2 className=\"text-lg font-bold text-slate-950\">O resultado em palavras</h2>\n      <p className=\"mt-0.5 text-sm text-slate-500\">\n        Entrou <strong className=\"text-slate-800\">{formatarMoeda(entrou)}</strong>\n        {financeiro.taxasRecebimento > 0 ? ` (já sem ${formatarMoeda(financeiro.taxasRecebimento)} de taxas da maquininha)` : \"\"}.\n        Veja para onde foi:\n      </p>\n\n      {/* Barra: cada cor e uma parte do dinheiro que entrou. */}\n      <div className=\"mt-4 flex h-5 w-full overflow-hidden rounded-full bg-slate-100\" aria-hidden=\"true\">\n        <div className=\"h-full bg-amber-400\" style={{ width: largura(material) }} />\n        <div className=\"h-full bg-rose-400\" style={{ width: largura(despesas) }} />\n        {lucro > 0 ? <div className=\"h-full bg-emerald-500\" style={{ width: largura(lucro) }} /> : null}\n      </div>\n\n      <ul className=\"mt-4 space-y-2.5\">\n        {partes.map((parte) => (\n          <li key={parte.titulo} className=\"flex items-start gap-3\">\n            <span className={`mt-1.5 size-3 shrink-0 rounded-full ${parte.ponto}`} />\n            <div className=\"min-w-0 flex-1\">\n              <p className=\"flex flex-wrap items-baseline justify-between gap-x-3 text-sm\">\n                <span className=\"font-semibold text-slate-800\">{parte.titulo}</span>\n                <span className=\"font-bold text-slate-900\">{formatarMoeda(parte.valor)}</span>\n              </p>\n              <p className=\"text-xs text-slate-500\">\n                {parte.texto}\n                {entrou > 0 ? ` · R$ ${deCada100(parte.valor)} de cada R$ 100 que entraram` : \"\"}\n              </p>\n            </div>\n          </li>\n        ))}\n        <li className={`flex items-start gap-3 rounded-2xl border p-3 ${lucro >= 0 ? \"border-emerald-200 bg-emerald-50\" : \"border-rose-200 bg-rose-50\"}`}>\n          <span className={`mt-1.5 size-3 shrink-0 rounded-full ${lucro >= 0 ? \"bg-emerald-500\" : \"bg-rose-600\"}`} />\n          <div className=\"min-w-0 flex-1\">\n            <p className=\"flex flex-wrap items-baseline justify-between gap-x-3\">\n              <span className=\"font-bold text-slate-900\">{lucro >= 0 ? \"Lucro: o que o studio ganhou\" : \"Prejuízo no período\"}</span>\n              <span className={`text-2xl font-black ${lucro >= 0 ? \"text-emerald-700\" : \"text-rose-700\"}`}>{formatarMoeda(lucro)}</span>\n            </p>\n            <p className=\"text-xs text-slate-600\">\n              {lucro >= 0\n                ? `Sobraram R$ ${deCada100(lucro)} de cada R$ 100 que entraram, depois de pagar material e despesas.`\n                : \"O material e as despesas passaram do que entrou.\"}{\" \"}\n              Se o seu salário (pró-labore) não está lançado no Financeiro, ele ainda sai daqui.\n            </p>\n          </div>\n        </li>\n      </ul>\n\n      <div className=\"mt-4 grid gap-3 sm:grid-cols-2\">\n        <div className=\"rounded-2xl border border-violet-100 bg-violet-50/70 p-3\">\n          <p className=\"text-xs font-bold uppercase tracking-wide text-violet-700\">Só os produtos</p>\n          <p className=\"mt-1 text-sm text-slate-700\">\n            Vendeu <strong>{formatarMoeda(financeiro.receitaProdutos)}</strong> · custaram{\" \"}\n            <strong>{formatarMoeda(financeiro.custoProdutosVendidos)}</strong>\n          </p>\n          <p className={`mt-1 text-lg font-black ${lucroProdutos >= 0 ? \"text-violet-800\" : \"text-rose-700\"}`}>\n            Lucro com produtos: {formatarMoeda(lucroProdutos)}\n          </p>\n        </div>\n        <div className=\"rounded-2xl border border-sky-100 bg-sky-50/70 p-3\">\n          <p className=\"text-xs font-bold uppercase tracking-wide text-sky-700\">Dinheiro que sobrou no caixa</p>\n          <p className=\"mt-1 text-lg font-black text-sky-900\">{formatarMoeda(caixa)}</p>\n          <p className=\"mt-1 text-xs leading-5 text-slate-600\">\n            {Math.abs(diferencaCaixa) < 1\n              ? \"Igual ao lucro.\"\n              : diferencaCaixa > 0\n                ? `É ${formatarMoeda(diferencaCaixa)} a mais que o lucro porque o material usado custou mais do que as compras pagas no período (material comprado antes ou compra não lançada). Quando o estoque acabar, esse dinheiro sai.`\n                : `É ${formatarMoeda(-diferencaCaixa)} a menos que o lucro porque vocês compraram mais estoque do que usaram: esse dinheiro está nas prateleiras.`}\n          </p>\n        </div>\n      </div>\n    </section>\n  );\n}\n"},"arquivos":[{"arquivo":"app/(app)/gestao/components/GestaoDashboard.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import { formatarMoeda } from \"@/lib/format\";","depois":"import { formatarMoeda } from \"@/lib/format\";\nimport ResultadoSimples from \"./ResultadoSimples\";"},{"nome":"ajuste 2","antes":"    <div className=\"min-w-0 space-y-5 pb-4\">\n      <section className=\"grid gap-3 sm:grid-cols-2 xl:grid-cols-4\">","depois":"    <div className=\"min-w-0 space-y-5 pb-4\">\n      <ResultadoSimples financeiro={data.financeiro} />\n\n      <section className=\"grid gap-3 sm:grid-cols-2 xl:grid-cols-4\">"},{"nome":"ajuste 3","antes":"          <div className=\"mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3\">\n            <LeituraFinanceiraCard\n              label=\"Receita de serviços\"","depois":"          {/* Os numeros detalhados ficam recolhidos (o resumo em palavras esta no topo). */}\n          <details className=\"group mt-4\">\n            <summary className=\"flex cursor-pointer list-none items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100\">\n              Ver os números em detalhe\n              <span className=\"text-xs text-violet-700 group-open:hidden\">abrir</span>\n              <span className=\"hidden text-xs text-violet-700 group-open:inline\">fechar</span>\n            </summary>\n          <div className=\"mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3\">\n            <LeituraFinanceiraCard\n              label=\"Receita de serviços\""},{"nome":"ajuste 4","antes":"              <p className=\"mt-1 text-[11px] text-slate-600\">{data.financeiro.quantidadeAReceber} lançamento(s) ainda não marcado(s) como pago.</p>\n            </div>\n          </div>\n        </div>","depois":"              <p className=\"mt-1 text-[11px] text-slate-600\">{data.financeiro.quantidadeAReceber} lançamento(s) ainda não marcado(s) como pago.</p>\n            </div>\n          </div>\n          </details>\n        </div>"}]}]};

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
