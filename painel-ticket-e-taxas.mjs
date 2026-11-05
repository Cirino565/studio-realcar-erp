#!/usr/bin/env node
/*
 * PAINEL DO DONO - ticket medio e taxa da maquininha - Studio Realcar
 *
 *  - Ticket medio: as vendas pagas do periodo divididas pelo numero de
 *    atendimentos (por atendimento) e pelo numero de clientes diferentes
 *    (por cliente). A tela mostra a conta.
 *  - Financeiro: nova categoria de despesa "Taxas da maquininha". O que for
 *    lancado nela soma com a taxa automatica na linha "Taxas da maquininha"
 *    do painel. O detalhe mostra a forma de pagamento e a taxa usada em
 *    cada recebimento.
 *
 * Precisa ter rodado antes o painel-do-dono.mjs. Nao muda o banco. Pode
 * rodar mais de uma vez; se algum trecho nao for encontrado, NADA e gravado.
 *
 * Uso: node painel-ticket-e-taxas.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"lib/painel-dono.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"    ticketAtendimento: number | null;\n    ticketCliente: number | null;\n    clientesQueCompraram: number;","depois":"    ticketAtendimento: number | null;\n    ticketCliente: number | null;\n    /** Clientes diferentes no periodo (atendidas ou que compraram): divisor do ticket por cliente. */\n    clientesQueCompraram: number;"},{"nome":"ajuste 2","antes":"          taxaPagamento: true,\n","depois":"          taxaPagamento: true,\n          taxaPercentualAplicada: true,\n          taxaFixaAplicada: true,\n          formaPagamento: true,\n"},{"nome":"ajuste 3","antes":"  const porCategoria = new Map<string, ItemDetalhe[]>();\n  for (const item of saidasPagas) {\n    const chaveCategoria = norm(item.categoria) || \"sem categoria\";","depois":"  // Taxa da maquininha lancada a mao (ex.: diferenca do fechamento do mes)\n  // soma com a taxa calculada sozinha, na mesma linha.\n  const ehTaxaManual = (categoria?: string | null) => /^taxas? da maquininha$/.test(norm(categoria));\n  const porCategoria = new Map<string, ItemDetalhe[]>();\n  for (const item of saidasPagas) {\n    if (ehTaxaManual(item.categoria)) continue;\n    const chaveCategoria = norm(item.categoria) || \"sem categoria\";"},{"nome":"ajuste 4","antes":"  const taxas = numero(\n    entradasPagas\n      .filter((item) => item.taxaPagamento > 0)\n      .map((item) => ({\n        id: `t-${item.id}`,\n        data: iso(item.data),\n        titulo: nomeCliente(item.clienteId ?? item.venda?.clienteId) ?? item.descricao,\n        detalhe: `Taxa sobre ${item.descricao}`,\n        valor: item.taxaPagamento,\n        href: null,\n      })),\n  );","depois":"  const taxas = numero([\n    ...entradasPagas\n      .filter((item) => item.taxaPagamento > 0)\n      .map((item) => {\n        const regra = [\n          item.taxaPercentualAplicada > 0 ? `${String(item.taxaPercentualAplicada).replace(\".\", \",\")}%` : null,\n          item.taxaFixaAplicada > 0 ? `R$ ${item.taxaFixaAplicada.toFixed(2).replace(\".\", \",\")} fixo` : null,\n        ]\n          .filter(Boolean)\n          .join(\" + \");\n        return {\n          id: `t-${item.id}`,\n          data: iso(item.data),\n          titulo: nomeCliente(item.clienteId ?? item.venda?.clienteId) ?? item.descricao,\n          detalhe: `Automática · ${item.formaPagamento || \"forma não informada\"}${regra ? ` (${regra})` : \"\"} sobre ${formatarReais(item.valor)}`,\n          valor: item.taxaPagamento,\n          href: null,\n        };\n      }),\n    ...saidasPagas\n      .filter((item) => ehTaxaManual(item.categoria))\n      .map((item) => ({\n        id: `tm-${item.id}`,\n        data: iso(item.data),\n        titulo: item.descricao,\n        detalhe: \"Lançada à mão\",\n        valor: item.valor,\n        href: \"/financeiro\",\n      })),\n  ]);"},{"nome":"ajuste 5","antes":"  const clientesQueCompraram = new Set(\n    vendasComValor.map((venda) => venda.clienteId).filter((id): id is number => typeof id === \"number\"),\n  ).size;\n  const somaVendasComCliente = vendasComValor\n    .filter((venda) => venda.clienteId)\n    .reduce((soma, venda) => soma + venda.valorTotal, 0);\n","depois":"  // Ticket medio: o mesmo faturamento (vendas pagas do periodo) dividido\n  // pelo numero de atendimentos ou pelo numero de clientes diferentes.\n  const clientesQueCompraram = new Set<number>([\n    ...atendidosBase.map((item) => item.clienteId),\n    ...vendasComValor.map((venda) => venda.clienteId).filter((id): id is number => typeof id === \"number\"),\n  ]).size;\n"},{"nome":"ajuste 6","antes":"      ticketAtendimento: vendasComValor.length ? arred(vendas.valor / vendasComValor.length) : null,\n      ticketCliente: clientesQueCompraram ? arred(somaVendasComCliente / clientesQueCompraram) : null,","depois":"      ticketAtendimento: atendimentos.valor > 0 ? arred(vendas.valor / atendimentos.valor) : null,\n      ticketCliente: clientesQueCompraram > 0 ? arred(vendas.valor / clientesQueCompraram) : null,"},{"nome":"ajuste 7","antes":"function formatarDia(data: Date) {","depois":"function formatarReais(valor: number) {\n  return `R$ ${valor.toFixed(2).replace(\".\", \",\")}`;\n}\n\nfunction formatarDia(data: Date) {"}]},{"arquivo":"app/(app)/painel-dono/components/PainelDonoClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"                  subtitulo={`vendas pagas de ${clientes.clientesQueCompraram} cliente(s)`}","depois":"                  subtitulo={`${formatarMoeda(clientes.vendas.valor)} em vendas ÷ ${clientes.clientesQueCompraram} cliente(s)`}"},{"nome":"ajuste 2","antes":"                  subtitulo={`${clientes.vendas.itens.length} venda(s) paga(s)`}","depois":"                  subtitulo={`${formatarMoeda(clientes.vendas.valor)} em vendas ÷ ${clientes.atendimentos.valor} atendimento(s)`}"},{"nome":"ajuste 3","antes":"            <p className=\"mt-1 text-xs text-slate-500\">Quanto cada cliente gastou, em média, no período.</p>","depois":"            <p className=\"mt-1 text-xs text-slate-500\">\n              Vendas pagas ({formatarMoeda(clientes.vendas.valor)}) ÷ {clientes.clientesQueCompraram} cliente(s) ou ÷ {clientes.atendimentos.valor} atendimento(s).\n            </p>"},{"nome":"ajuste 4","antes":"              <Linha rotulo=\"Taxas da maquininha\">\n                <Valor numero={saiu.taxas} titulo=\"Saiu · taxas da maquininha\" abrir={abrir} />","depois":"              <Linha rotulo=\"Taxas da maquininha\">\n                <Valor numero={saiu.taxas} titulo=\"Saiu · taxas da maquininha\" subtitulo=\"automáticas + lançadas à mão\" abrir={abrir} />"}]},{"arquivo":"app/(app)/financeiro/components/NovoLancamentoModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"const categoriasSaida = [\"Produtos e insumos\", \"Aluguel\", \"Marketing\", \"Equipamentos\", \"Salários\", \"Impostos\", \"Outras despesas\"];","depois":"const categoriasSaida = [\"Produtos e insumos\", \"Aluguel\", \"Marketing\", \"Equipamentos\", \"Salários\", \"Impostos\", \"Taxas da maquininha\", \"Outras despesas\"];"}]}]};
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
