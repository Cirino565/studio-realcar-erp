#!/usr/bin/env node
/*
 * // avaliacao-botao-whatsapp.mjs — "Pedir avaliação hoje": botão WhatsApp que abre a conversa
 * // com a mensagem pronta. Ao abrir, já conta como pedido (fica cinza e não volta).
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node avaliacao-botao-whatsapp.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/page.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"      quando: item.data >= inicioOntem ? \"ontem\" : formatarDataCurta(item.data),\n      finalizado: item.status === \"Atendido\",","depois":"      quando: item.data >= inicioOntem ? \"ontem\" : formatarDataCurta(item.data),\n      finalizado: item.status === \"Atendido\",\n      telefone: item.cliente.whatsapp || item.cliente.telefone || \"\","}]},{"arquivo":"components/dashboard/PedirAvaliacaoClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import { Check, Copy, Star } from \"lucide-react\";\nimport { marcarAvaliacaoPedida } from \"@/actions/avaliacao-google.actions\";\nimport { mensagemAvaliacaoGoogle } from \"@/lib/avaliacao-google\";","depois":"import { Check, Copy, MessageCircle, Star } from \"lucide-react\";\nimport { marcarAvaliacaoPedida } from \"@/actions/avaliacao-google.actions\";\nimport { mensagemAvaliacaoGoogle } from \"@/lib/avaliacao-google\";\nimport { buildWhatsAppUrl } from \"@/lib/whatsapp\";\nimport { WhatsAppLink } from \"@/components/ui/whatsapp-link\";"},{"nome":"ajuste 2","antes":"  /** false = horario ja passou, mas o atendimento ainda nao foi finalizado. */\n  finalizado?: boolean;\n};","depois":"  /** false = horario ja passou, mas o atendimento ainda nao foi finalizado. */\n  finalizado?: boolean;\n  /** Telefone para abrir o WhatsApp com a mensagem pronta. */\n  telefone?: string;\n};"},{"nome":"ajuste 3","antes":"  const [pedidos, setPedidos] = useState<number[]>([]);","depois":"  const [pedidos, setPedidos] = useState<number[]>([]);\n  // Abriu o WhatsApp: fica cinza na tela (\"Pedido enviado\") e ja conta como pedido.\n  const [enviados, setEnviados] = useState<number[]>([]);"},{"nome":"ajuste 4","antes":"  function jaPedi(item: PedirAvaliacaoItem) {\n    setPedidos((atuais) => [...atuais, item.clienteId]);\n    startTransition(async () => {","depois":"  function registrar(item: PedirAvaliacaoItem, desfazer: () => void) {\n    startTransition(async () => {"},{"nome":"ajuste 5","antes":"      if (!resposta.ok) {\n        setPedidos((atuais) => atuais.filter((id) => id !== item.clienteId));\n        setErro(\"Não foi possível marcar. Tente de novo.\");\n      }\n    });\n  }","depois":"      if (!resposta.ok) {\n        desfazer();\n        setErro(\"Não foi possível marcar. Tente de novo.\");\n      }\n    });\n  }\n\n  function jaPedi(item: PedirAvaliacaoItem) {\n    setPedidos((atuais) => [...atuais, item.clienteId]);\n    registrar(item, () => setPedidos((atuais) => atuais.filter((id) => id !== item.clienteId)));\n  }\n\n  function abriuWhatsapp(item: PedirAvaliacaoItem) {\n    if (enviados.includes(item.clienteId)) return;\n    setEnviados((atuais) => [...atuais, item.clienteId]);\n    registrar(item, () => setEnviados((atuais) => atuais.filter((id) => id !== item.clienteId)));\n  }"},{"nome":"ajuste 6","antes":"      {visiveis.map((item) => (\n        <div\n          key={item.clienteId}\n          className=\"flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3\"\n        >","depois":"      {visiveis.map((item) => {\n        const enviado = enviados.includes(item.clienteId);\n        return (\n        <div\n          key={item.clienteId}\n          className={`flex flex-wrap items-center gap-2 rounded-2xl border p-3 ${\n            enviado ? \"border-slate-200 bg-slate-100 opacity-70\" : \"border-slate-200 bg-slate-50\"\n          }`}\n        >"},{"nome":"ajuste 7","antes":"          <div className=\"flex w-full gap-2 sm:w-auto\">\n            <button\n              type=\"button\"\n              onClick={() => copiar(item)}","depois":"          <div className=\"flex w-full gap-2 sm:w-auto\">\n            {item.telefone ? (\n              <WhatsAppLink\n                href={buildWhatsAppUrl(item.telefone, mensagemAvaliacaoGoogle(item.nome))}\n                onClick={() => abriuWhatsapp(item)}\n                className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-xs font-bold transition sm:flex-none ${\n                  enviado\n                    ? \"border border-slate-200 bg-slate-200 text-slate-500\"\n                    : \"bg-emerald-600 text-white hover:bg-emerald-700\"\n                }`}\n              >\n                <MessageCircle className=\"size-4 shrink-0\" />\n                {enviado ? \"Pedido enviado\" : \"WhatsApp\"}\n              </WhatsAppLink>\n            ) : null}\n            <button\n              type=\"button\"\n              onClick={() => copiar(item)}"},{"nome":"ajuste 8","antes":"              {copiado === item.clienteId ? <Check className=\"size-4\" /> : <Copy className=\"size-4\" />}\n              {copiado === item.clienteId ? \"Copiada\" : \"Copiar mensagem\"}\n            </button>","depois":"              {copiado === item.clienteId ? <Check className=\"size-4\" /> : <Copy className=\"size-4\" />}\n              {copiado === item.clienteId ? \"Copiada\" : \"Copiar\"}\n            </button>"},{"nome":"ajuste 9","antes":"              ? \"border border-emerald-200 bg-emerald-50 text-emerald-700\"\n                  : \"bg-amber-500 text-white hover:bg-amber-600\"","depois":"              ? \"border border-emerald-200 bg-emerald-50 text-emerald-700\"\n                  : \"border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100\""},{"nome":"ajuste 10","antes":"            <button\n              type=\"button\"\n              onClick={() => jaPedi(item)}","depois":"            {enviado ? null : (\n            <button\n              type=\"button\"\n              onClick={() => jaPedi(item)}"},{"nome":"ajuste 11","antes":"              <Star className=\"size-4 text-amber-500\" />\n              Já pedi\n            </button>\n          </div>\n        </div>\n      ))}","depois":"              <Star className=\"size-4 text-amber-500\" />\n              Já pedi\n            </button>\n            )}\n          </div>\n        </div>\n        );\n      })}"}]}]};

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
