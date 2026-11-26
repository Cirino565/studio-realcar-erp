#!/usr/bin/env node
/*
 * // pedir-avaliacao-google.mjs — Dashboard "Pedir avaliação hoje": clientes atendidas ontem (e dias
 * // anteriores sem pedido, até 7 dias) com telefone. Botão "Copiar mensagem" (com o primeiro nome)
 * // e "Já pedi" (some da lista e nunca mais entra). Sem mudança no banco.
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node pedir-avaliacao-google.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{"lib/avaliacao-google.ts":"// Pedido de avaliacao no Google (Dashboard > \"Pedir avaliação hoje\").\n// O registro \"ja pedi\" fica em ComunicacaoRegistro com esta categoria, uma\n// vez por cliente: quem ja recebeu nao volta para a lista.\nexport const CATEGORIA_AVALIACAO_GOOGLE = \"Avaliação Google\";\n\nconst MENSAGEM = [\n  \"Oi, [nome]! 💖\",\n  \"\",\n  \"Foi um prazer te atender aqui no Studio Realçar! ✨\",\n  \"\",\n  \"Sua opinião é muito importante pra nós e ajuda outras pessoas a conhecerem nosso trabalho 💫\",\n  \"\",\n  \"Se você gostou da sua experiência, pode deixar uma avaliação no Google? É rapidinho 😊\",\n  \"\",\n  \"👉 https://g.page/r/CTI4nUC2KD1HEBM/review\",\n  \"\",\n  \"Agradecemos muito pela confiança e esperamos te ver novamente em breve! 🥰✨\",\n].join(\"\\n\");\n\n/** \"MARIA aparecida silva\" -> \"Maria\". */\nexport function primeiroNomeCliente(nome: string) {\n  const primeiro = nome.trim().split(/\\s+/)[0] || \"\";\n  if (!primeiro) return \"\";\n  return primeiro.charAt(0).toLocaleUpperCase(\"pt-BR\") + primeiro.slice(1).toLocaleLowerCase(\"pt-BR\");\n}\n\nexport function mensagemAvaliacaoGoogle(nomeCliente: string) {\n  const nome = primeiroNomeCliente(nomeCliente);\n  return nome ? MENSAGEM.replace(\"[nome]\", nome) : MENSAGEM.replace(\", [nome]\", \"\");\n}\n","actions/avaliacao-google.actions.ts":"\"use server\";\n\nimport { requireCurrentUser } from \"@/lib/auth\";\nimport { prisma } from \"@/lib/prisma\";\nimport { CATEGORIA_AVALIACAO_GOOGLE } from \"@/lib/avaliacao-google\";\n\n/**\n * \"Ja pedi\": registra que a cliente recebeu o pedido de avaliacao no Google.\n * Uma vez por cliente (ela some da lista e nao entra de novo).\n */\nexport async function marcarAvaliacaoPedida(dados: { clienteId: number; agendamentoId?: number | null }) {\n  const usuario = await requireCurrentUser();\n  const clienteId = Number(dados.clienteId);\n  if (!Number.isInteger(clienteId) || clienteId <= 0) return { ok: false as const };\n\n  const cliente = await prisma.cliente.findUnique({\n    where: { id: clienteId },\n    select: {\n      nome: true,\n      whatsapp: true,\n      telefone: true,\n      comunicacoes: { where: { categoria: CATEGORIA_AVALIACAO_GOOGLE }, select: { id: true }, take: 1 },\n    },\n  });\n  if (!cliente) return { ok: false as const };\n  if (cliente.comunicacoes.length > 0) return { ok: true as const };\n\n  const agora = new Date();\n  await prisma.comunicacaoRegistro.create({\n    data: {\n      clienteId,\n      agendamentoId: dados.agendamentoId ? Number(dados.agendamentoId) : null,\n      destinatarioNome: cliente.nome,\n      telefone: cliente.whatsapp || cliente.telefone || null,\n      categoria: CATEGORIA_AVALIACAO_GOOGLE,\n      canal: \"WhatsApp\",\n      mensagem: \"Pedido de avaliação no Google (marcado como já pedido no Dashboard).\",\n      status: \"Enviada\",\n      usuario: usuario.email,\n      abertoEm: agora,\n      enviadoEm: agora,\n    },\n  });\n  return { ok: true as const };\n}\n","components/dashboard/PedirAvaliacaoClient.tsx":"\"use client\";\n\nimport { useState, useTransition } from \"react\";\nimport { Check, Copy, Star } from \"lucide-react\";\nimport { marcarAvaliacaoPedida } from \"@/actions/avaliacao-google.actions\";\nimport { mensagemAvaliacaoGoogle } from \"@/lib/avaliacao-google\";\n\nexport type PedirAvaliacaoItem = {\n  agendamentoId: number;\n  clienteId: number;\n  nome: string;\n  procedimento: string;\n  /** \"ontem\" ou a data curta do atendimento. */\n  quando: string;\n};\n\nasync function copiarTexto(texto: string) {\n  try {\n    await navigator.clipboard.writeText(texto);\n    return true;\n  } catch {\n    // Navegadores antigos: copia por um campo escondido.\n    const campo = document.createElement(\"textarea\");\n    campo.value = texto;\n    campo.style.position = \"fixed\";\n    campo.style.opacity = \"0\";\n    document.body.appendChild(campo);\n    campo.select();\n    const ok = document.execCommand(\"copy\");\n    campo.remove();\n    return ok;\n  }\n}\n\n/** Lista \"Pedir avaliação hoje\": copiar a mensagem e marcar \"Já pedi\". */\nexport default function PedirAvaliacaoClient({ itens }: { itens: PedirAvaliacaoItem[] }) {\n  const [pedidos, setPedidos] = useState<number[]>([]);\n  const [copiado, setCopiado] = useState<number | null>(null);\n  const [erro, setErro] = useState(\"\");\n  const [, startTransition] = useTransition();\n\n  const visiveis = itens.filter((item) => !pedidos.includes(item.clienteId));\n\n  async function copiar(item: PedirAvaliacaoItem) {\n    const ok = await copiarTexto(mensagemAvaliacaoGoogle(item.nome));\n    setCopiado(ok ? item.clienteId : null);\n    setErro(ok ? \"\" : \"Não deu para copiar. Tente de novo.\");\n  }\n\n  function jaPedi(item: PedirAvaliacaoItem) {\n    setPedidos((atuais) => [...atuais, item.clienteId]);\n    startTransition(async () => {\n      const resposta = await marcarAvaliacaoPedida({\n        clienteId: item.clienteId,\n        agendamentoId: item.agendamentoId,\n      }).catch(() => ({ ok: false as const }));\n      if (!resposta.ok) {\n        setPedidos((atuais) => atuais.filter((id) => id !== item.clienteId));\n        setErro(\"Não foi possível marcar. Tente de novo.\");\n      }\n    });\n  }\n\n  if (visiveis.length === 0) {\n    return (\n      <div className=\"rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500\">\n        Ninguém para pedir avaliação hoje.\n      </div>\n    );\n  }\n\n  return (\n    <div className=\"space-y-2\">\n      {erro ? <p className=\"text-xs font-semibold text-rose-600\">{erro}</p> : null}\n      {visiveis.map((item) => (\n        <div\n          key={item.clienteId}\n          className=\"flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3\"\n        >\n          <div className=\"min-w-0 flex-1\">\n            <p className=\"truncate font-bold text-slate-900\">{item.nome}</p>\n            <p className=\"truncate text-xs text-slate-500\">\n              {item.procedimento} · {item.quando}\n            </p>\n          </div>\n          <div className=\"flex w-full gap-2 sm:w-auto\">\n            <button\n              type=\"button\"\n              onClick={() => copiar(item)}\n              className={`inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-xs font-bold transition sm:flex-none ${\n                copiado === item.clienteId\n                  ? \"border border-emerald-200 bg-emerald-50 text-emerald-700\"\n                  : \"bg-amber-500 text-white hover:bg-amber-600\"\n              }`}\n            >\n              {copiado === item.clienteId ? <Check className=\"size-4\" /> : <Copy className=\"size-4\" />}\n              {copiado === item.clienteId ? \"Copiada\" : \"Copiar mensagem\"}\n            </button>\n            <button\n              type=\"button\"\n              onClick={() => jaPedi(item)}\n              className=\"inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 sm:flex-none\"\n            >\n              <Star className=\"size-4 text-amber-500\" />\n              Já pedi\n            </button>\n          </div>\n        </div>\n      ))}\n    </div>\n  );\n}\n"},"arquivos":[{"arquivo":"app/(app)/page.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import ReativacaoClient from \"@/components/dashboard/ReativacaoClient\";","depois":"import ReativacaoClient from \"@/components/dashboard/ReativacaoClient\";\nimport PedirAvaliacaoClient from \"@/components/dashboard/PedirAvaliacaoClient\";\nimport { CATEGORIA_AVALIACAO_GOOGLE } from \"@/lib/avaliacao-google\";"},{"nome":"ajuste 2","antes":"  const [\n    agendaHoje,\n    confirmacoesAmanha,","depois":"  // Pedir avaliacao no Google: atendidas de ontem para tras (ate 7 dias, para\n  // nao perder quem foi atendida no sabado), com telefone e que ainda nao\n  // receberam o pedido. Roda junto com as outras consultas.\n  const pedirAvaliacaoConsulta = prisma.agendamento.findMany({\n    where: {\n      data: { gte: new Date(inicioHoje.getTime() - 7 * UM_DIA_MS), lt: inicioHoje },\n      status: \"Atendido\",\n      cliente: { comunicacoes: { none: { categoria: CATEGORIA_AVALIACAO_GOOGLE } } },\n    },\n    select: {\n      id: true,\n      data: true,\n      procedimento: true,\n      cliente: { select: { id: true, nome: true, whatsapp: true, telefone: true } },\n    },\n    orderBy: { data: \"desc\" },\n    take: 60,\n  });\n\n  const [\n    agendaHoje,\n    confirmacoesAmanha,"},{"nome":"ajuste 3","antes":"      <section className=\"grid gap-4 xl:grid-cols-3\">\n        <div id=\"pos-atendimento\" className=\"premium-card p-4 sm:p-5\">","depois":"      <section id=\"pedir-avaliacao\" className=\"premium-card p-4 sm:p-5\">\n        <div className=\"mb-3 flex items-center gap-2\">\n          <Star className=\"size-5 text-amber-500\" />\n          <h2 className=\"text-lg font-bold text-slate-950\">Pedir avaliação hoje</h2>\n        </div>\n        <p className=\"-mt-2 mb-3 text-sm text-slate-500\">\n          Clientes atendidas ontem (e dias anteriores ainda sem pedido). Copie a mensagem, mande no\n          WhatsApp e toque em &quot;Já pedi&quot;.\n        </p>\n        <PedirAvaliacaoClient itens={pedirAvaliacao} />\n      </section>\n\n      <section className=\"grid gap-4 xl:grid-cols-3\">\n        <div id=\"pos-atendimento\" className=\"premium-card p-4 sm:p-5\">"},{"nome":"ajuste 4","antes":"  Sparkles,\n  Users,\n  WalletCards,\n} from \"lucide-react\";","depois":"  Sparkles,\n  Star,\n  Users,\n  WalletCards,\n} from \"lucide-react\";"},{"nome":"ajuste 5","antes":"    prisma.configuracaoClinica.findFirst({\n      select: { nome: true },\n    }),\n  ]);\n","depois":"    prisma.configuracaoClinica.findFirst({\n      select: { nome: true },\n    }),\n  ]);\n\n  // Uma linha por cliente (o atendimento mais recente), so com telefone de verdade.\n  const pedirAvaliacao = (await pedirAvaliacaoConsulta)\n    .filter((item) => (item.cliente.whatsapp || item.cliente.telefone || \"\").replace(/\\D/g, \"\").length >= 8)\n    .filter((item, indice, lista) => lista.findIndex((outro) => outro.cliente.id === item.cliente.id) === indice)\n    .slice(0, 30)\n    .map((item) => ({\n      agendamentoId: item.id,\n      clienteId: item.cliente.id,\n      nome: item.cliente.nome,\n      procedimento: item.procedimento || \"Atendimento\",\n      quando: item.data >= inicioOntem ? \"ontem\" : formatarDataCurta(item.data),\n    }));\n"}]}]};

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
