#!/usr/bin/env node
/*
 * MENSAGEM ENVIADA FICA CINZA - Studio Realcar
 *
 * Dashboard: depois de tocar no WhatsApp do Aniversario ou do
 * Pos-atendimento, o botao fica cinza com "Enviada", para todos que usam o
 * sistema (fica registrado, e aparece tambem em Comunicacoes). Continua
 * clicavel para mandar de novo.
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node mensagem-enviada-cinza.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{"actions/mensagem-enviada.actions.ts":"\"use server\";\n\nimport { requireCurrentUser } from \"@/lib/auth\";\nimport { prisma } from \"@/lib/prisma\";\n\nconst CATEGORIAS = new Set([\"Aniversário\", \"Pós-atendimento\"]);\n\n/**\n * Marca que a mensagem do Dashboard (aniversario, pos-atendimento) foi\n * aberta no WhatsApp, para o botao ficar cinza (\"Enviada\") para todos.\n * Usa o mesmo registro da tela Comunicacoes, entao la tambem aparece.\n * Nao repete no mesmo dia.\n */\nexport async function registrarMensagemEnviada(dados: {\n  categoria: string;\n  clienteId: number;\n  agendamentoId?: number | null;\n  destinatarioNome: string;\n  telefone?: string | null;\n}) {\n  const usuario = await requireCurrentUser();\n  if (!CATEGORIAS.has(dados.categoria)) return { ok: false as const };\n  const clienteId = Number(dados.clienteId);\n  if (!Number.isInteger(clienteId) || clienteId <= 0) return { ok: false as const };\n\n  const inicio = new Date(\n    `${new Date().toLocaleDateString(\"en-CA\", { timeZone: \"America/Sao_Paulo\" })}T00:00:00-03:00`,\n  );\n  const identidade = dados.agendamentoId ? { agendamentoId: Number(dados.agendamentoId) } : { clienteId };\n  const existente = await prisma.comunicacaoRegistro.findFirst({\n    where: { ...identidade, categoria: dados.categoria, status: \"Enviada\", createdAt: { gte: inicio } },\n    select: { id: true },\n  });\n  if (existente) return { ok: true as const };\n\n  const agora = new Date();\n  await prisma.comunicacaoRegistro.create({\n    data: {\n      clienteId,\n      agendamentoId: dados.agendamentoId ? Number(dados.agendamentoId) : null,\n      destinatarioNome: dados.destinatarioNome.trim() || \"Cliente\",\n      telefone: dados.telefone?.trim() || null,\n      categoria: dados.categoria,\n      canal: \"WhatsApp\",\n      mensagem: `${dados.categoria}: mensagem aberta no WhatsApp pelo Dashboard.`,\n      status: \"Enviada\",\n      usuario: usuario.email,\n      abertoEm: agora,\n      enviadoEm: agora,\n    },\n  });\n  return { ok: true as const };\n}\n","components/ui/whatsapp-enviado.tsx":"\"use client\";\n\nimport { useState } from \"react\";\nimport { Check } from \"lucide-react\";\n\nimport { registrarMensagemEnviada } from \"@/actions/mensagem-enviada.actions\";\nimport { WhatsAppLink } from \"@/components/ui/whatsapp-link\";\n\ntype Props = {\n  href: string;\n  enviadaInicial: boolean;\n  registro: {\n    categoria: \"Aniversário\" | \"Pós-atendimento\";\n    clienteId: number;\n    agendamentoId?: number | null;\n    destinatarioNome: string;\n    telefone?: string | null;\n  };\n  /** Classes do botao antes de enviar (verde). */\n  className: string;\n  /** Classes depois de enviada (cinza). */\n  classNameEnviada: string;\n  rotuloEnviada?: string;\n  \"aria-label\"?: string;\n  children: React.ReactNode;\n};\n\n/**\n * Botao do WhatsApp que fica cinza depois de usado (\"Enviada\"), para todo\n * mundo ver que a mensagem ja saiu. Continua clicavel para mandar de novo.\n */\nexport function WhatsAppEnviado({\n  href,\n  enviadaInicial,\n  registro,\n  className,\n  classNameEnviada,\n  rotuloEnviada = \"Enviada\",\n  children,\n  ...props\n}: Props) {\n  const [enviada, setEnviada] = useState(enviadaInicial);\n\n  return (\n    <WhatsAppLink\n      href={href}\n      aria-label={props[\"aria-label\"]}\n      title={enviada ? \"Já enviada hoje (toque para mandar de novo)\" : undefined}\n      className={enviada ? classNameEnviada : className}\n      onClick={() => {\n        if (!enviada) {\n          setEnviada(true);\n          void registrarMensagemEnviada(registro).catch(() => undefined);\n        }\n      }}\n    >\n      {enviada ? (\n        <>\n          <Check className=\"size-3.5\" />\n          {rotuloEnviada}\n        </>\n      ) : (\n        children\n      )}\n    </WhatsAppLink>\n  );\n}\n"},"arquivos":[{"arquivo":"app/(app)/page.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import { WhatsAppLink } from \"@/components/ui/whatsapp-link\";","depois":"import { WhatsAppLink } from \"@/components/ui/whatsapp-link\";\nimport { WhatsAppEnviado } from \"@/components/ui/whatsapp-enviado\";"},{"nome":"ajuste 2","antes":"  const nomeClinica = configuracaoClinica?.nome?.trim() || \"Studio Realçar\";","depois":"  const nomeClinica = configuracaoClinica?.nome?.trim() || \"Studio Realçar\";\n\n  // Mensagens do Dashboard ja enviadas (botao fica cinza). Consulta pequena.\n  const enviadasDashboard =\n    aniversariantesHoje.length + posAtendimento.length > 0\n      ? await prisma.comunicacaoRegistro.findMany({\n          where: {\n            status: \"Enviada\",\n            OR: [\n              {\n                categoria: \"Aniversário\",\n                clienteId: { in: aniversariantesHoje.map((cliente) => cliente.id) },\n                createdAt: { gte: new Date(`${hojeISO}T00:00:00-03:00`) },\n              },\n              {\n                categoria: \"Pós-atendimento\",\n                agendamentoId: { in: posAtendimento.map((item) => item.id) },\n              },\n            ],\n          },\n          select: { categoria: true, clienteId: true, agendamentoId: true },\n        })\n      : [];\n  const aniversarioEnviado = new Set(\n    enviadasDashboard.filter((item) => item.categoria === \"Aniversário\").map((item) => item.clienteId),\n  );\n  const posEnviado = new Set(\n    enviadasDashboard.filter((item) => item.categoria === \"Pós-atendimento\").map((item) => item.agendamentoId),\n  );"},{"nome":"ajuste 3","antes":"                    <WhatsAppLink\n                      href={buildWhatsAppUrl(\n                        item.cliente.whatsapp || item.cliente.telefone,\n                        buildWhatsAppMessage({\n                          template: \"postCare\",\n                          clientName: item.cliente.nome,\n                          procedure: formatarProcedimentoAgendamento(item),\n                          appointmentDate: item.data,\n                        }),\n                      )}\n                      className=\"inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700\"\n                      aria-label={`Enviar pós-atendimento para ${item.cliente.nome}`}\n                    >\n                      <MessageCircle className=\"size-4\" />\n                    </WhatsAppLink>","depois":"                    <WhatsAppEnviado\n                      href={buildWhatsAppUrl(\n                        item.cliente.whatsapp || item.cliente.telefone,\n                        buildWhatsAppMessage({\n                          template: \"postCare\",\n                          clientName: item.cliente.nome,\n                          procedure: formatarProcedimentoAgendamento(item),\n                          appointmentDate: item.data,\n                        }),\n                      )}\n                      enviadaInicial={posEnviado.has(item.id)}\n                      registro={{\n                        categoria: \"Pós-atendimento\",\n                        clienteId: item.cliente.id,\n                        agendamentoId: item.id,\n                        destinatarioNome: item.cliente.nome,\n                        telefone: item.cliente.whatsapp || item.cliente.telefone,\n                      }}\n                      className=\"inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700\"\n                      classNameEnviada=\"inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-2.5 text-xs font-bold text-slate-500 hover:bg-slate-200\"\n                      aria-label={`Enviar pós-atendimento para ${item.cliente.nome}`}\n                    >\n                      <MessageCircle className=\"size-4\" />\n                    </WhatsAppEnviado>"},{"nome":"ajuste 4","antes":"                    {mensagemAniversario ? (\n                      <WhatsAppLink\n                        href={buildWhatsAppUrl(\n                          cliente.whatsapp || cliente.telefone,\n                          mensagemAniversario,\n                        )}\n                        className=\"inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700\"\n                      >\n                        <MessageCircle className=\"size-3.5\" />\n                        Mensagem\n                      </WhatsAppLink>","depois":"                    {mensagemAniversario ? (\n                      <WhatsAppEnviado\n                        href={buildWhatsAppUrl(\n                          cliente.whatsapp || cliente.telefone,\n                          mensagemAniversario,\n                        )}\n                        enviadaInicial={aniversarioEnviado.has(cliente.id)}\n                        registro={{\n                          categoria: \"Aniversário\",\n                          clienteId: cliente.id,\n                          destinatarioNome: cliente.nome,\n                          telefone: cliente.whatsapp || cliente.telefone,\n                        }}\n                        className=\"inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700\"\n                        classNameEnviada=\"inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200\"\n                      >\n                        <MessageCircle className=\"size-3.5\" />\n                        Mensagem\n                      </WhatsAppEnviado>"}]}]};

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
