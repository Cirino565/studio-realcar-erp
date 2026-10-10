#!/usr/bin/env node
/*
 * AVISO NA AVALIACAO - Studio Realcar
 *
 * Ao finalizar um agendamento com "Avaliacao" no nome, a tela avisa que nela entra so o
 * sinal e que o procedimento e cobrado no dia em que for feito. Tem botao "Zerar valor".
 * Se mesmo assim houver valor, so finaliza depois de marcar que a cliente pagou o
 * procedimento hoje. Nao mexe no banco. Pode rodar mais de uma vez.
 *
 * Uso: node aviso-na-avaliacao.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/agenda/components/FinalizarAtendimentoModal.tsx","obrigatorio":true,"patches":[{"nome":"guardar a confirmacao","antes":"  const [confirmando, setConfirmando] = useState(false);\n","depois":"  const [confirmando, setConfirmando] = useState(false);\n  // Avaliacao: so o sinal entra. Cobrar o procedimento aqui exige confirmar.\n  const [cobrancaNaAvaliacaoOk, setCobrancaNaAvaliacaoOk] = useState(false);\n"},{"nome":"limpar ao abrir","antes":"    setPacoteRegistrado(null);\n    setItensProdutos([]);\n","depois":"    setPacoteRegistrado(null);\n    setCobrancaNaAvaliacaoOk(false);\n    setItensProdutos([]);\n"},{"nome":"regra da avaliacao","antes":"  const atendimentoRetorno =\n    currentAppointment.naturezaAtendimento === \"RETORNO\";\n","depois":"  const atendimentoRetorno =\n    currentAppointment.naturezaAtendimento === \"RETORNO\";\n  // Agendamento de AVALIACAO: nele entra so o sinal. O procedimento e cobrado\n  // no dia em que for feito.\n  const atendimentoAvaliacao =\n    !atendimentoRetorno &&\n    normalizarTexto(currentAppointment.procedimento).includes(\"avalia\");\n  const cobrandoNaAvaliacao =\n    atendimentoAvaliacao && valorServico + totais.totalExtras > 0;\n"},{"nome":"bloquear cobranca sem confirmar","antes":"    if (totais.total > 0 && !formaConfig) {\n      setError(\n        \"Cadastre ou selecione uma forma de pagamento ativa no Financeiro antes de finalizar uma venda com cobrança.\",","depois":"    if (cobrandoNaAvaliacao && !cobrancaNaAvaliacaoOk) {\n      setError(\n        \"Esta é uma avaliação: nela entra só o sinal. Zere o valor do serviço ou marque que a cliente pagou o procedimento hoje.\",\n      );\n      return;\n    }\n\n    if (totais.total > 0 && !formaConfig) {\n      setError(\n        \"Cadastre ou selecione uma forma de pagamento ativa no Financeiro antes de finalizar uma venda com cobrança.\","},{"nome":"aviso na tela","antes":"                    <div className=\"grid gap-3 sm:grid-cols-2\">\n                      <label>\n                        <span className=\"mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400\">Valor vendido do serviço</span>","depois":"                    {atendimentoAvaliacao ? (\n                      <div className=\"mb-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-3\">\n                        <div className=\"flex items-start gap-2\">\n                          <AlertTriangle\n                            size={16}\n                            className=\"mt-0.5 shrink-0 text-amber-700\"\n                          />\n                          <div className=\"min-w-0 flex-1\">\n                            <p className=\"text-xs font-bold text-amber-900\">\n                              Esta é uma avaliação\n                            </p>\n                            <p className=\"mt-1 text-[11px] leading-4 text-amber-800\">\n                              Na avaliação entra só o sinal (que se registra no\n                              agendamento). O procedimento é cobrado no dia em\n                              que for feito, com o valor cheio - o sistema\n                              desconta o sinal sozinho. Lançar o procedimento\n                              aqui faz a venda e o envio ao Google Ads caírem no\n                              dia errado. Se a cliente fechou um pacote hoje, use\n                              &quot;Registrar pacote&quot;.\n                            </p>\n\n                            {valorServico > 0 ? (\n                              <button\n                                type=\"button\"\n                                onClick={() => {\n                                  setValorServico(0);\n                                  setCobrancaNaAvaliacaoOk(false);\n                                }}\n                                className=\"mt-2 inline-flex min-h-9 items-center justify-center rounded-lg bg-amber-600 px-3 text-[11px] font-bold text-white transition hover:bg-amber-700\"\n                              >\n                                Zerar valor (avaliação não é venda)\n                              </button>\n                            ) : (\n                              <p className=\"mt-2 text-[11px] font-bold text-emerald-700\">\n                                Valor do serviço em R$ 0,00 - correto para uma\n                                avaliação.\n                              </p>\n                            )}\n\n                            {cobrandoNaAvaliacao ? (\n                              <label className=\"mt-2 flex items-start gap-2 rounded-lg border border-amber-300 bg-white/70 p-2.5\">\n                                <input\n                                  type=\"checkbox\"\n                                  checked={cobrancaNaAvaliacaoOk}\n                                  onChange={(event) =>\n                                    setCobrancaNaAvaliacaoOk(event.target.checked)\n                                  }\n                                  className=\"mt-0.5 size-4\"\n                                />\n                                <span className=\"text-[11px] font-semibold text-amber-900\">\n                                  A cliente pagou o procedimento hoje, mesmo\n                                  sendo uma avaliação.\n                                </span>\n                              </label>\n                            ) : null}\n                          </div>\n                        </div>\n                      </div>\n                    ) : null}\n                    <div className=\"grid gap-3 sm:grid-cols-2\">\n                      <label>\n                        <span className=\"mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400\">Valor vendido do serviço</span>"}]}]};
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
