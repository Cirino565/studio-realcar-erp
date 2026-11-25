#!/usr/bin/env node
/*
 * // confirmacao-enviada-cinza.mjs — Dashboard "Confirmar amanhã": depois de mandar a
 * // mensagem no WhatsApp o botão fica cinza ("Já enviada") e o selo vira "Aguardando resposta",
 * // para ninguém mandar a confirmação duas vezes. Aparece também em Comunicações.
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node confirmacao-enviada-cinza.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"actions/mensagem-enviada.actions.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"const CATEGORIAS = new Set([\"Aniversário\", \"Pós-atendimento\"]);","depois":"const CATEGORIAS = new Set([\"Aniversário\", \"Pós-atendimento\", \"Confirmação de agendamento\"]);"}]},{"arquivo":"components/ui/whatsapp-enviado.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"    categoria: \"Aniversário\" | \"Pós-atendimento\";","depois":"    categoria: \"Aniversário\" | \"Pós-atendimento\" | \"Confirmação de agendamento\";"},{"nome":"ajuste 2","antes":"  rotuloEnviada?: string;\n  \"aria-label\"?: string;","depois":"  rotuloEnviada?: string;\n  /** Avisa a tela quando a mensagem acabou de ser enviada. */\n  onEnviada?: () => void;\n  \"aria-label\"?: string;"},{"nome":"ajuste 3","antes":"  rotuloEnviada = \"Enviada\",\n  children,","depois":"  rotuloEnviada = \"Enviada\",\n  onEnviada,\n  children,"},{"nome":"ajuste 4","antes":"          setEnviada(true);\n          void registrarMensagemEnviada","depois":"          setEnviada(true);\n          onEnviada?.();\n          void registrarMensagemEnviada"}]},{"arquivo":"app/(app)/page.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"        status: \"Agendado\",\n      },\n      include: {\n        cliente: { select: { nome: true, whatsapp: true, telefone: true } },","depois":"        status: \"Agendado\",\n      },\n      include: {\n        cliente: { select: { id: true, nome: true, whatsapp: true, telefone: true } },"},{"nome":"ajuste 2","antes":"    aniversariantesHoje.length + posAtendimento.length > 0","depois":"    aniversariantesHoje.length + posAtendimento.length + confirmacoesAmanha.length > 0"},{"nome":"ajuste 3","antes":"                agendamentoId: { in: posAtendimento.map((item) => item.id) },\n              },\n            ],","depois":"                agendamentoId: { in: posAtendimento.map((item) => item.id) },\n              },\n              {\n                // Confirmacao da vespera: vale o envio dos ultimos 3 dias\n                // (sabado para segunda, por exemplo).\n                categoria: \"Confirmação de agendamento\",\n                agendamentoId: { in: confirmacoesAmanha.map((item) => item.id) },\n                createdAt: { gte: new Date(inicioHoje.getTime() - 3 * 24 * 60 * 60 * 1000) },\n              },\n            ],"},{"nome":"ajuste 4","antes":"  const posEnviado = new Set(\n    enviadasDashboard.filter((item) => item.categoria === \"Pós-atendimento\").map((item) => item.agendamentoId),\n  );","depois":"  const posEnviado = new Set(\n    enviadasDashboard.filter((item) => item.categoria === \"Pós-atendimento\").map((item) => item.agendamentoId),\n  );\n  const confirmacaoEnviada = new Set(\n    enviadasDashboard\n      .filter((item) => item.categoria === \"Confirmação de agendamento\")\n      .map((item) => item.agendamentoId),\n  );"},{"nome":"ajuste 5","antes":"  const confirmacoes = confirmacoesAmanha.map((agendamento) => ({\n    id: agendamento.id,\n    cliente: agendamento.cliente.nome,","depois":"  const confirmacoes = confirmacoesAmanha.map((agendamento) => ({\n    id: agendamento.id,\n    clienteId: agendamento.cliente.id,\n    telefone: agendamento.cliente.whatsapp || agendamento.cliente.telefone || null,\n    enviada: confirmacaoEnviada.has(agendamento.id),\n    cliente: agendamento.cliente.nome,"}]},{"arquivo":"components/dashboard/CentralDoDiaClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import { WhatsAppLink } from \"@/components/ui/whatsapp-link\";\nimport { BadgeCheck, MessageCircle } from \"lucide-react\";","depois":"import { WhatsAppEnviado } from \"@/components/ui/whatsapp-enviado\";\nimport { BadgeCheck, MessageCircle } from \"lucide-react\";"},{"nome":"ajuste 2","antes":"type ConfirmacaoItem = {\n  id: number;\n  cliente: string;","depois":"type ConfirmacaoItem = {\n  id: number;\n  clienteId: number;\n  telefone: string | null;\n  /** A mensagem de confirmacao ja foi aberta no WhatsApp. */\n  enviada: boolean;\n  cliente: string;"},{"nome":"ajuste 3","antes":"  const [confirmados, setConfirmados] = useState<number[]>([]);","depois":"  const [confirmados, setConfirmados] = useState<number[]>([]);\n  const [enviadasAgora, setEnviadasAgora] = useState<number[]>([]);"},{"nome":"ajuste 4","antes":"      {pendentes.map((item) => (\n        <div\n          key={item.id}\n          className=\"rounded-2xl border border-slate-200 bg-white p-3 shadow-sm\"\n        >","depois":"      {pendentes.map((item) => {\n        const enviada = item.enviada || enviadasAgora.includes(item.id);\n        return (\n        <div\n          key={item.id}\n          className={`rounded-2xl border p-3 shadow-sm ${enviada ? \"border-slate-200 bg-slate-50\" : \"border-slate-200 bg-white\"}`}\n        >"},{"nome":"ajuste 5","antes":"            <span className=\"shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700\">\n              Pendente\n            </span>","depois":"            {enviada ? (\n              <span className=\"shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700\">\n                Aguardando resposta\n              </span>\n            ) : (\n              <span className=\"shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700\">\n                Pendente\n              </span>\n            )}"},{"nome":"ajuste 6","antes":"            <WhatsAppLink\n              href={item.whatsappUrl}\n              className=\"inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700\"\n            >\n              <MessageCircle className=\"size-4\" />\n              WhatsApp\n            </WhatsAppLink>","depois":"            <WhatsAppEnviado\n              href={item.whatsappUrl}\n              enviadaInicial={item.enviada}\n              onEnviada={() => setEnviadasAgora((atuais) => [...atuais, item.id])}\n              registro={{\n                categoria: \"Confirmação de agendamento\",\n                clienteId: item.clienteId,\n                agendamentoId: item.id,\n                destinatarioNome: item.cliente,\n                telefone: item.telefone,\n              }}\n              rotuloEnviada=\"Já enviada\"\n              className=\"inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700\"\n              classNameEnviada=\"inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-300\"\n            >\n              <MessageCircle className=\"size-4\" />\n              WhatsApp\n            </WhatsAppEnviado>"},{"nome":"ajuste 7","antes":"          </div>\n        </div>\n      ))}\n    </div>\n  );\n}","depois":"          </div>\n        </div>\n        );\n      })}\n    </div>\n  );\n}"}]}]};

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
