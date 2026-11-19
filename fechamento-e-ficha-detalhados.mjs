#!/usr/bin/env node
/*
 * FECHAMENTO E FICHA MAIS CLAROS - Studio Realcar
 *
 * Finalizar atendimento: a tela de confirmacao lista cada procedimento com o
 * seu valor (o procedimento a mais, ex. Botox, agora aparece). Procedimento
 * sem valor ganha aviso "sem valor - confira", tambem na hora de preencher.
 * Ficha da cliente (aba Procedimentos): historico por dia, com os
 * procedimentos, os produtos comprados e o total do dia. No celular o
 * historico vem antes do formulario. Resumo mostra o ultimo dia.
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node fechamento-e-ficha-detalhados.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/agenda/components/FinalizarAtendimentoModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"                              className=\"w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400\"\n                            />\n                          </label>\n                        </div>\n                      ))}","depois":"                              className=\"w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400\"\n                            />\n                          </label>\n                          {extra.nome.trim() && extra.valor <= 0 ? (\n                            <p className=\"mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold leading-4 text-amber-800\">\n                              {extra.nome} está sem valor. Digite quanto foi cobrado (deixe 0 só se for cortesia).\n                            </p>\n                          ) : null}\n                        </div>\n                      ))}"},{"nome":"ajuste 2","antes":"                  <ResumoLinha label=\"Cliente\" value={currentAppointment.cliente.nome} />\n                  <ResumoLinha label=\"Procedimento\" value={procedimentoFinal} />\n                  <ResumoLinha label=\"Serviço\" value={formatCurrency(valorServico)} />\n                  <ResumoLinha label=\"Produtos\" value={formatCurrency(totais.totalProdutos)} />","depois":"                  <ResumoLinha label=\"Cliente\" value={currentAppointment.cliente.nome} />\n                  {/* Cada procedimento com o seu valor (antes o extra nao aparecia\n                      aqui e nao dava para saber se tinha entrado). */}\n                  <div className=\"border-b border-slate-100 py-2.5\">\n                    <p className=\"text-xs text-slate-500\">\n                      {procedimentosExtras.length > 0 ? \"Procedimentos\" : \"Procedimento\"}\n                    </p>\n                    <div className=\"mt-1.5 space-y-1.5\">\n                      {[\n                        { chave: \"principal\", nome: procedimentoFinal, valor: valorServico },\n                        ...procedimentosExtras\n                          .filter((item) => item.nome.trim())\n                          .map((item) => ({ chave: item.chave, nome: item.nome.trim(), valor: item.valor })),\n                      ].map((item) => (\n                        <div key={item.chave} className=\"flex items-start justify-between gap-3 text-xs\">\n                          <span className=\"min-w-0 break-words font-semibold text-slate-800\">{item.nome}</span>\n                          <span className=\"shrink-0 text-right\">\n                            <strong className=\"text-slate-900\">{formatCurrency(item.valor)}</strong>\n                            {item.valor <= 0 && !atendimentoRetorno && !atendimentoAvaliacao ? (\n                              <span className=\"block text-[10px] font-bold text-amber-700\">sem valor · confira</span>\n                            ) : null}\n                          </span>\n                        </div>\n                      ))}\n                    </div>\n                  </div>\n                  <ResumoLinha label=\"Produtos\" value={formatCurrency(totais.totalProdutos)} />"},{"nome":"ajuste 3","antes":"Após confirmar, você poderá agendar o retorno ou voltar para a agenda.","depois":"Após confirmar, você poderá deixar o próximo horário ou voltar para a agenda."}]},{"arquivo":"app/(app)/clientes/types.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"export type ClienteEvolucaoData = {","depois":"/** Produtos (e kits) comprados numa venda, para a ficha mostrar o que levou. */\nexport type ClienteCompraData = {\n  id: number;\n  data: string;\n  itens: { descricao: string; quantidade: number; valorTotal: number }[];\n};\n\nexport type ClienteEvolucaoData = {"},{"nome":"ajuste 2","antes":"  procedimentos: ClienteProcedimentoData[];\n  evolucoes: ClienteEvolucaoData[];","depois":"  procedimentos: ClienteProcedimentoData[];\n  compras: ClienteCompraData[];\n  evolucoes: ClienteEvolucaoData[];"}]},{"arquivo":"app/(app)/clientes/[id]/page.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"      procedimentos: {\n        orderBy: { dataProcedimento: \"desc\" },\n      },","depois":"      procedimentos: {\n        orderBy: { dataProcedimento: \"desc\" },\n      },\n      // So os produtos e kits das vendas (procedimentos ja vem acima).\n      vendas: {\n        where: { situacao: { not: \"CANCELADA\" }, itens: { some: { tipo: { in: [\"PRODUTO\", \"KIT\"] } } } },\n        orderBy: { data: \"desc\" },\n        take: 80,\n        select: {\n          id: true,\n          data: true,\n          itens: {\n            where: { tipo: { in: [\"PRODUTO\", \"KIT\"] } },\n            select: { descricao: true, quantidade: true, valorTotal: true, kitNomeHistorico: true },\n            orderBy: { id: \"asc\" },\n          },\n        },\n      },"},{"nome":"ajuste 2","antes":"      dataProcedimento: toIsoString(procedimento.dataProcedimento),\n      observacoes: procedimento.observacoes,\n    })),","depois":"      dataProcedimento: toIsoString(procedimento.dataProcedimento),\n      observacoes: procedimento.observacoes,\n    })),\n    compras: cliente.vendas.map((venda) => ({\n      id: venda.id,\n      data: toIsoString(venda.data),\n      itens: venda.itens.map((item) => ({\n        descricao: item.kitNomeHistorico || item.descricao,\n        quantidade: item.quantidade,\n        valorTotal: item.valorTotal,\n      })),\n    })),"}]},{"arquivo":"app/(app)/clientes/components/ClienteClinicoTabs.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"    return {\n      totalProcedimentos,\n      totalEvolucoes,\n      totalFotos,\n      valorProcedimentos,\n    };\n  }, [data]);","depois":"    return {\n      totalProcedimentos,\n      totalEvolucoes,\n      totalFotos,\n      valorProcedimentos,\n    };\n  }, [data]);\n\n  // Historico por dia: procedimentos + produtos comprados no mesmo dia.\n  const historicoPorDia = useMemo(() => {\n    const diaDe = (iso: string) =>\n      new Date(iso).toLocaleDateString(\"en-CA\", { timeZone: \"America/Sao_Paulo\" });\n    const dias = new Map<\n      string,\n      {\n        dia: string;\n        data: string;\n        procedimentos: typeof data.procedimentos;\n        produtos: { chave: string; descricao: string; quantidade: number; valorTotal: number }[];\n      }\n    >();\n    const pegar = (iso: string) => {\n      const dia = diaDe(iso);\n      const atual = dias.get(dia) ?? { dia, data: iso, procedimentos: [], produtos: [] };\n      dias.set(dia, atual);\n      return atual;\n    };\n    for (const procedimento of data.procedimentos) {\n      pegar(procedimento.dataProcedimento).procedimentos.push(procedimento);\n    }\n    for (const compra of data.compras ?? []) {\n      const grupo = pegar(compra.data);\n      compra.itens.forEach((item, indice) =>\n        grupo.produtos.push({ chave: `${compra.id}-${indice}`, ...item }),\n      );\n    }\n    return [...dias.values()].sort((a, b) => b.dia.localeCompare(a.dia));\n  }, [data]);"},{"nome":"ajuste 2","antes":"                {data.procedimentos.length > 0 ? (\n                  data.procedimentos.map(\n                    (procedimento) => (\n                      <article\n                        key={procedimento.id}\n                        className=\"min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-5\"\n                      >","depois":"                {historicoPorDia.length > 0 ? (\n                  historicoPorDia.map((grupo) => (\n                    <section\n                      key={grupo.dia}\n                      className=\"min-w-0 space-y-3 rounded-3xl border border-slate-200 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/[0.025] sm:p-4\"\n                    >\n                      <div className=\"flex items-baseline justify-between gap-3 px-1\">\n                        <p className=\"text-sm font-bold text-slate-900 dark:text-white\">\n                          {formatarData(grupo.data)}\n                        </p>\n                        <p className=\"text-xs font-semibold text-slate-500 dark:text-slate-400\">\n                          Total do dia{\" \"}\n                          {formatarMoeda(\n                            grupo.procedimentos.reduce((soma, item) => soma + item.valor, 0) +\n                              grupo.produtos.reduce((soma, item) => soma + item.valorTotal, 0),\n                          )}\n                        </p>\n                      </div>\n                  {grupo.procedimentos.map(\n                    (procedimento) => (\n                      <article\n                        key={procedimento.id}\n                        className=\"min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-5\"\n                      >"},{"nome":"ajuste 3","antes":"                        {procedimento.observacoes ? (\n                          <p className=\"mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400\">\n                            {procedimento.observacoes}\n                          </p>\n                        ) : null}\n                      </article>\n                    ),\n                  )\n                ) : (","depois":"                        {procedimento.observacoes ? (\n                          <p className=\"mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400\">\n                            {procedimento.observacoes}\n                          </p>\n                        ) : null}\n                      </article>\n                    ),\n                  )}\n                      {grupo.produtos.length > 0 ? (\n                        <article className=\"min-w-0 rounded-3xl border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-400/20 dark:bg-white/[0.04] sm:p-5\">\n                          <p className=\"text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300\">\n                            Produtos comprados\n                          </p>\n                          <ul className=\"mt-2 space-y-1.5\">\n                            {grupo.produtos.map((item) => (\n                              <li key={item.chave} className=\"flex items-start justify-between gap-3 text-sm\">\n                                <span className=\"min-w-0 break-words text-slate-700 dark:text-slate-300\">\n                                  {item.quantidade}x {item.descricao}\n                                </span>\n                                <strong className=\"shrink-0 text-slate-900 dark:text-white\">\n                                  {formatarMoeda(item.valorTotal)}\n                                </strong>\n                              </li>\n                            ))}\n                          </ul>\n                        </article>\n                      ) : null}\n                    </section>\n                  ))\n                ) : ("},{"nome":"ajuste 4","antes":"          <p className=\"mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400\">\n            {formatarMoeda(\n              resumo.valorProcedimentos,\n            )}{\" \"}\n            registrados\n          </p>","depois":"          <p className=\"mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400\">\n            {formatarMoeda(\n              resumo.valorProcedimentos,\n            )}{\" \"}\n            registrados\n          </p>\n          {historicoPorDia[0] ? (\n            <button\n              type=\"button\"\n              onClick={() => ativarAba(\"procedimentos\")}\n              className=\"mt-2 block w-full text-left text-xs leading-5 text-slate-600 underline-offset-2 hover:underline dark:text-slate-300\"\n            >\n              <span className=\"font-semibold\">Último dia ({formatarData(historicoPorDia[0].data)}):</span>{\" \"}\n              {[\n                ...historicoPorDia[0].procedimentos.map((item) => item.nome),\n                ...(historicoPorDia[0].produtos.length > 0\n                  ? [`${historicoPorDia[0].produtos.reduce((soma, item) => soma + item.quantidade, 0)} produto(s)`]\n                  : []),\n              ].join(\" · \")}\n            </button>\n          ) : null}"},{"nome":"ajuste 5","antes":"              description=\"Histórico de procedimentos, valores e profissional responsável.\"","depois":"              description=\"Tudo o que ela fez e comprou, por dia: procedimentos, valores e produtos.\""},{"nome":"ajuste 6","antes":"                action={criarProcedimentoCliente}\n                className=\"h-fit space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]\"","depois":"                action={criarProcedimentoCliente}\n                className=\"order-2 h-fit space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04] lg:order-none\""},{"nome":"ajuste 7","antes":"              <div className=\"min-w-0 space-y-4\">\n                {historicoPorDia.length > 0 ? (","depois":"              {/* No celular o historico vem antes do formulario manual. */}\n              <div className=\"order-1 min-w-0 space-y-4 lg:order-none\">\n                {historicoPorDia.length > 0 ? ("}]}]};

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
