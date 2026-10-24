#!/usr/bin/env node
/*
 * RETORNOS: 2a TENTATIVA E PAUSA DE 3 MESES - Studio Realcar
 *
 * Na tela Retornos, quem ja recebeu a mensagem de retorno e nao respondeu
 * aparece com a etiqueta "2a tentativa" e um TEXTO DIFERENTE, curto, que
 * pergunta dia e periodo (sem horario fixo). Depois dessa 2a mensagem a
 * cliente vai para "Em espera" e so volta em 3 meses; ai o ciclo recomeca.
 *
 * Nao mexe no banco. Pode rodar mais de uma vez; se algum trecho nao for
 * encontrado, NADA e gravado.
 *
 * Uso: node retorno-segunda-tentativa.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"lib/whatsapp.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"export function buildWhatsAppUrl(phone: string | null | undefined, message: string) {","depois":"/**\n * 2a tentativa de retorno (a 1a mensagem ficou sem resposta). Texto curto e\n * diferente da primeira, com uma pergunta facil de responder. Nao sugere\n * horario fixo: quem atende confere a agenda antes de oferecer.\n */\nexport function buildReactivationSecondWhatsAppMessage({\n  clientName,\n  procedure,\n}: WhatsAppReactivationMessageInput) {\n  const firstName = getFirstName(clientName);\n  const procedimento = (procedure || \"\").trim();\n  const oQue = /limpeza/i.test(procedimento)\n    ? \"sua próxima limpeza de pele\"\n    : procedimento\n      ? `seu próximo atendimento de ${procedimento.toLowerCase()}`\n      : \"seu próximo atendimento\";\n\n  return `Oi, ${firstName}! Tudo bem? 😊\\n\\nTe mandei uma mensagem há alguns dias e acho que acabou passando no meio da correria, então vou deixar bem simples:\\n\\nQuer que eu separe um horário para ${oQue}? É só me responder com o dia e o período (manhã ou tarde) que ficam melhores para você. 💜`;\n}\n\nexport function buildWhatsAppUrl(phone: string | null | undefined, message: string) {"}]},{"arquivo":"actions/reativacao.actions.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"// \"Vai marcar um dia\": da um prazo curto e, se nao marcou, ela volta.\nconst DIAS_VAI_MARCAR = 21;","depois":"// \"Vai marcar um dia\": da um prazo curto e, se nao marcou, ela volta.\nconst DIAS_VAI_MARCAR = 21;\n// 2a mensagem sem resposta: descansa 3 meses antes de chamar de novo.\nconst DIAS_APOS_SEGUNDA_MENSAGEM = 90;\n// Mensagens mais antigas que isso nao contam como tentativa (o ciclo recomeca).\nconst JANELA_TENTATIVAS_DIAS = 75;"},{"nome":"ajuste 2","antes":"  if (acao === \"CONTATADA\") {\n    situacao = \"Contatada\";\n    voltaEm = new Date(agora.getTime() + DIAS_APOS_MENSAGEM * DIA_MS);\n  } else","depois":"  let segundaTentativa = false;\n\n  if (acao === \"CONTATADA\") {\n    // Ja recebeu mensagem de retorno neste ciclo (depois do ultimo atendimento\n    // e nos ultimos 75 dias)? Entao esta e a 2a: depois dela, so em 3 meses.\n    const ultimoAtendimento = await prisma.agendamento.findFirst({\n      where: { clienteId, status: \"Atendido\" },\n      orderBy: { data: \"desc\" },\n      select: { data: true },\n    });\n    const desde = new Date(\n      Math.max(\n        agora.getTime() - JANELA_TENTATIVAS_DIAS * DIA_MS,\n        ultimoAtendimento?.data.getTime() ?? 0,\n      ),\n    );\n    const anteriores = await prisma.comunicacaoRegistro.count({\n      where: {\n        clienteId,\n        categoria: \"Reativação\",\n        OR: [{ status: \"Enviada\" }, { enviadoEm: { not: null } }],\n        createdAt: { gte: desde },\n      },\n    });\n    segundaTentativa = anteriores >= 1;\n\n    situacao = segundaTentativa ? \"Mais tarde\" : \"Contatada\";\n    voltaEm = new Date(\n      agora.getTime() + (segundaTentativa ? DIAS_APOS_SEGUNDA_MENSAGEM : DIAS_APOS_MENSAGEM) * DIA_MS,\n    );\n  } else"},{"nome":"ajuste 3","antes":"  revalidatePath(\"/\");\n  revalidatePath(\"/comunicacoes\");\n\n  return { ok: true };\n}","depois":"  revalidatePath(\"/\");\n  revalidatePath(\"/comunicacoes\");\n  revalidatePath(\"/retornos\");\n\n  return { ok: true, segundaTentativa };\n}"}]},{"arquivo":"app/(app)/retornos/page.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import {\n  buildReactivationWhatsAppMessage,\n  buildWhatsAppUrl,\n} from \"@/lib/whatsapp\";","depois":"import {\n  buildReactivationSecondWhatsAppMessage,\n  buildReactivationWhatsAppMessage,\n  buildWhatsAppUrl,\n} from \"@/lib/whatsapp\";"},{"nome":"ajuste 2","antes":"  const itensComMensagem = itens.map((cliente) => {\n    const principal = cliente.procedimentos[0];\n    const mensagem = buildReactivationWhatsAppMessage({\n      clientName: cliente.nome,\n      procedure: principal?.nome,\n      lastVisit: principal?.ultimaVez,\n    });","depois":"  // Quantas mensagens de retorno cada cliente ja recebeu neste ciclo (depois\n  // do ultimo atendimento e nos ultimos 75 dias). 1 ou mais = 2a tentativa,\n  // com outro texto; depois dela a cliente descansa 3 meses.\n  const JANELA_TENTATIVAS_DIAS = 75;\n  const registrosRetorno = itens.length\n    ? await prisma.comunicacaoRegistro.findMany({\n        where: {\n          clienteId: { in: itens.map((cliente) => cliente.clienteId) },\n          categoria: \"Reativação\",\n          OR: [{ status: \"Enviada\" }, { enviadoEm: { not: null } }],\n          createdAt: { gte: new Date(agora.getTime() - JANELA_TENTATIVAS_DIAS * UM_DIA_MS) },\n        },\n        select: { clienteId: true, createdAt: true },\n      })\n    : [];\n\n  const itensComMensagem = itens.map((cliente) => {\n    const principal = cliente.procedimentos[0];\n    const ultimoAtendimento = Math.max(\n      ...cliente.procedimentos.map((item) => new Date(item.ultimaVez).getTime()),\n    );\n    const tentativas = registrosRetorno.filter(\n      (registro) =>\n        registro.clienteId === cliente.clienteId &&\n        registro.createdAt.getTime() > ultimoAtendimento,\n    ).length;\n    const mensagem =\n      tentativas >= 1\n        ? buildReactivationSecondWhatsAppMessage({\n            clientName: cliente.nome,\n            procedure: principal?.nome,\n          })\n        : buildReactivationWhatsAppMessage({\n            clientName: cliente.nome,\n            procedure: principal?.nome,\n            lastVisit: principal?.ultimaVez,\n          });"},{"nome":"ajuste 3","antes":"    return {\n      ...cliente,\n      mensagem,\n      whatsappUrl: numero ? buildWhatsAppUrl(numero, mensagem) : null,\n    };","depois":"    return {\n      ...cliente,\n      tentativas,\n      mensagem,\n      whatsappUrl: numero ? buildWhatsAppUrl(numero, mensagem) : null,\n    };"}]},{"arquivo":"app/(app)/retornos/components/RetornosClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  situacao: string | null;\n  mensagem: string;\n  whatsappUrl: string | null;\n};","depois":"  situacao: string | null;\n  // Mensagens de retorno ja enviadas neste ciclo (1+ = 2a tentativa).\n  tentativas?: number;\n  mensagem: string;\n  whatsappUrl: string | null;\n};"},{"nome":"ajuste 2","antes":"      .then(() => {\n        adicionarNaEspera(cliente, \"Contatada\", 30);","depois":"      .then(() => {\n        // 2a mensagem: so chama de novo daqui a 3 meses.\n        if ((cliente.tentativas ?? 0) >= 1) adicionarNaEspera(cliente, \"Mais tarde\", 90);\n        else adicionarNaEspera(cliente, \"Contatada\", 30);"},{"nome":"ajuste 3","antes":"                        {etiqueta ? (\n                          <p className={`mt-0.5 text-[11px] font-bold ${etiqueta.classe}`}>\n                            {etiqueta.texto}\n                          </p>\n                        ) : null}","depois":"                        {(cliente.tentativas ?? 0) >= 1 ? (\n                          <p className=\"mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-200\">\n                            2ª tentativa · não respondeu a 1ª mensagem\n                          </p>\n                        ) : etiqueta ? (\n                          <p className={`mt-0.5 text-[11px] font-bold ${etiqueta.classe}`}>\n                            {etiqueta.texto}\n                          </p>\n                        ) : null}"}]}]};
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
