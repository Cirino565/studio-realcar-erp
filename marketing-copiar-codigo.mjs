#!/usr/bin/env node
/*
 * // marketing-copiar-codigo.mjs — Cartão do lead: o código SR vira um botão "copiar"
 * // (não abre mais os Detalhes) e o telefone dá para selecionar e copiar.
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node marketing-copiar-codigo.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/marketing/components/MarketingClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"            <p className=\"truncate text-xs text-slate-400\">{lead.interesse || \"Interesse não informado\"}</p>\n            <p className=\"mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500\">","depois":"            <p className=\"truncate text-xs text-slate-400\">{lead.interesse || \"Interesse não informado\"}</p>\n          </div>\n        </div>\n      </button>\n      {/* Fora do botao: da para selecionar o telefone e copiar o codigo SR\n          sem abrir os Detalhes. */}\n      <div className=\"pl-[42px]\">\n            <p className=\"mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500\">"},{"nome":"ajuste 2","antes":"              {lead.codigoAtendimento ? (\n                <span className=\"inline-flex items-center gap-0.5 font-mono text-[10px] tracking-tight text-slate-500\"><Hash className=\"size-3\" />{lead.codigoAtendimento}</span>\n              ) : null}\n            </p>\n          </div>\n        </div>\n      </button>\n","depois":"              {lead.codigoAtendimento ? (\n                <button\n                  type=\"button\"\n                  onClick={() => {\n                    const codigo = lead.codigoAtendimento ?? \"\";\n                    void navigator.clipboard\n                      ?.writeText(codigo)\n                      .then(() => {\n                        setCodigoCopiado(true);\n                        window.setTimeout(() => setCodigoCopiado(false), 1500);\n                      })\n                      .catch(() => undefined);\n                  }}\n                  title=\"Copiar o código\"\n                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] tracking-tight transition ${\n                    codigoCopiado\n                      ? \"border-emerald-300/30 bg-emerald-400/10 text-emerald-300\"\n                      : \"border-white/[0.10] bg-white/[0.04] text-slate-300 hover:bg-white/[0.10]\"\n                  }`}\n                >\n                  {codigoCopiado ? <CheckCircle2 className=\"size-3\" /> : <Hash className=\"size-3\" />}\n                  {codigoCopiado ? \"Copiado\" : lead.codigoAtendimento}\n                  {codigoCopiado ? null : <Copy className=\"size-3 opacity-70\" />}\n                </button>\n              ) : null}\n            </p>\n      </div>\n"},{"nome":"ajuste 3","antes":"  const [maisAberto, setMaisAberto] = useState(false);","depois":"  const [maisAberto, setMaisAberto] = useState(false);\n  const [codigoCopiado, setCodigoCopiado] = useState(false);"}]}]};

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
