#!/usr/bin/env node
/*
 * PRODUTO ENTRA NA VENDA AO ESCOLHER - Studio Realcar
 *
 * Antes: escolher o produto na lista nao bastava, era preciso tocar em
 * "Adicionar". Quem esquecia fechava a venda sem o produto e o estoque nao
 * baixava. Agora escolher na lista ja coloca o produto na venda (finalizar
 * atendimento e Vendas). Kit fixo idem. Produto com estoque zerado aparece
 * bloqueado, com aviso, em vez de sumir da lista.
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node produto-entra-ao-escolher.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"components/vendas/ProdutosVendaEditor.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import { useMemo, useState } from \"react\";\nimport { Minus, PackagePlus, Plus, Trash2 } from \"lucide-react\";","depois":"import { useMemo } from \"react\";\nimport { Minus, Plus, Trash2 } from \"lucide-react\";"},{"nome":"ajuste 2","antes":"  const [produtoSelecionado, setProdutoSelecionado] = useState(\"\");\n\n  const produtosDisponiveis","depois":"  const produtosDisponiveis","modo":"remover"},{"nome":"ajuste 3","antes":"    [produtos, podeExcederEstoque],\n  );\n\n  function adicionarProduto() {\n    const id = Number(produtoSelecionado);\n    const produto","depois":"    [produtos, podeExcederEstoque],\n  );\n  // Ativos com estoque zerado no sistema: aparecem na lista (bloqueados) para\n  // a equipe entender por que nao da para escolher.\n  const produtosSemEstoque = useMemo(\n    () =>\n      podeExcederEstoque\n        ? []\n        : produtos.filter(\n            (produto) => produto.status.toLowerCase() === \"ativo\" && produto.quantidade <= 0,\n          ),\n    [produtos, podeExcederEstoque],\n  );\n\n  // Escolher na lista ja coloca o produto na venda (antes precisava tocar em\n  // \"Adicionar\"; quem esquecia vendia sem baixar o estoque).\n  function adicionarProduto(valor: string) {\n    const id = Number(valor);\n    const produto"},{"nome":"ajuste 4","antes":"      ]);\n    }\n\n    setProdutoSelecionado(\"\");\n  }","depois":"      ]);\n    }\n  }"},{"nome":"ajuste 5","antes":"      <div className=\"flex gap-2\">\n        <select\n          value={produtoSelecionado}\n          onChange={(event) => setProdutoSelecionado(event.target.value)}\n          className=\"h-10 min-w-0 flex-1 rounded-xl","depois":"      <div>\n        <select\n          value=\"\"\n          onChange={(event) => adicionarProduto(event.target.value)}\n          aria-label=\"Adicionar produto\"\n          className=\"h-10 w-full min-w-0 rounded-xl"},{"nome":"ajuste 6","antes":"              {produto.nome} · estoque {produto.quantidade} · {formatarMoeda(produto.valorVenda)}\n            </option>\n          ))}\n        </select>\n        <button\n          type=\"button\"\n          onClick={adicionarProduto}\n          disabled={!produtoSelecionado}\n          className=\"inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white transition hover:bg-violet-700 disabled:opacity-40\"\n        >\n          <PackagePlus className=\"size-4\" />\n          <span className=\"hidden sm:inline\">Adicionar</span>\n        </button>\n      </div>","depois":"              {produto.nome} · estoque {produto.quantidade} · {formatarMoeda(produto.valorVenda)}\n            </option>\n          ))}\n          {produtosSemEstoque.length > 0 ? (\n            <optgroup label=\"Sem estoque no sistema (confira o Estoque)\">\n              {produtosSemEstoque.map((produto) => (\n                <option key={produto.id} value={produto.id} disabled>\n                  {produto.nome} · estoque {produto.quantidade}\n                </option>\n              ))}\n            </optgroup>\n          ) : null}\n        </select>\n      </div>"}]},{"arquivo":"components/vendas/KitsVendaEditor.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  function mudarKit(value: string) {\n    setKitSelecionado(value);\n    setSelecaoFlexivel({});\n    setErro(\"\");\n  }","depois":"  function mudarKit(value: string) {\n    // Kit fixo: escolher na lista ja coloca na venda (nao depende de tocar\n    // em \"Adicionar kit\"). Kit de selecao livre: escolhe os produtos antes.\n    const escolhido = kitsAtivos.find((kit) => kit.id === Number(value));\n    if (escolhido && escolhido.tipo === \"FIXO\") {\n      adicionarKit(escolhido);\n      return;\n    }\n    setKitSelecionado(value);\n    setSelecaoFlexivel({});\n    setErro(\"\");\n  }"},{"nome":"ajuste 2","antes":"  function adicionarKit() {\n    if (!kitAtual) return;\n","depois":"  function adicionarKit(kitEscolhido?: typeof kitAtual) {\n    const kitAtual = kitEscolhido ?? kitsAtivos.find((kit) => kit.id === Number(kitSelecionado));\n    if (!kitAtual) return;\n"},{"nome":"ajuste 3","antes":"            onClick={adicionarKit}\n            disabled={!kitAtual || (kitAtual.tipo === \"FLEXIVEL\" && totalSelecionado <= 0)}","depois":"            onClick={() => adicionarKit()}\n            disabled={!kitAtual || (kitAtual.tipo === \"FLEXIVEL\" && totalSelecionado <= 0)}"},{"nome":"ajuste 4","antes":"                Selecione livremente os produtos\n              </p>","depois":"                Escolha os produtos e toque em &quot;Adicionar kit&quot; (só entra na venda depois disso)\n              </p>"}]}]};
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
