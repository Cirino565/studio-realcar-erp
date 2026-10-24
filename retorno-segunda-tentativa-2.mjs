#!/usr/bin/env node
/*
 * RETORNOS: 2a TENTATIVA TAMBEM PARA QUEM FOI MARCADA - Studio Realcar
 *
 * Conta como 1a tentativa tambem quem esta marcada como "ja recebeu" ou
 * "tinha dito que ia marcar" neste ciclo (mesmo se a 1a mensagem saiu fora do
 * sistema). Quem disse que ia marcar recebe um texto proprio ("voce tinha
 * comentado que ia marcar...").
 *
 * Precisa ter rodado antes o retorno-segunda-tentativa.mjs.
 * Nao mexe no banco. Pode rodar mais de uma vez; se algum trecho nao for
 * encontrado, NADA e gravado.
 *
 * Uso: node retorno-segunda-tentativa-2.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"lib/whatsapp.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"export function buildReactivationSecondWhatsAppMessage({\n  clientName,\n  procedure,\n}: WhatsAppReactivationMessageInput) {","depois":"export function buildReactivationSecondWhatsAppMessage({\n  clientName,\n  procedure,\n  disseQueIaMarcar = false,\n}: WhatsAppReactivationMessageInput & { disseQueIaMarcar?: boolean }) {"},{"nome":"ajuste 2","antes":"  return `Oi, ${firstName}! Tudo bem? 😊\\n\\nTe mandei uma mensagem há alguns dias","depois":"  if (disseQueIaMarcar) {\n    return `Oi, ${firstName}! Tudo bem? 😊\\n\\nVocê tinha comentado que ia marcar ${oQue}. Quer que eu já veja um horário para você?\\n\\nÉ só me responder com o dia e o período (manhã ou tarde) que ficam melhores. 💜`;\n  }\n\n  return `Oi, ${firstName}! Tudo bem? 😊\\n\\nTe mandei uma mensagem há alguns dias"}]},{"arquivo":"app/(app)/retornos/page.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"          reativacaoVoltaEm: true,","depois":"          reativacaoVoltaEm: true,\n          reativacaoAtualizadaEm: true,"},{"nome":"ajuste 2","antes":"      situacao: string | null;\n      procedimentos: Array<{","depois":"      situacao: string | null;\n      situacaoEm: Date | null;\n      procedimentos: Array<{"},{"nome":"ajuste 3","antes":"      situacao: atendimento.cliente.reativacaoSituacao ?? null,","depois":"      situacao: atendimento.cliente.reativacaoSituacao ?? null,\n      situacaoEm: atendimento.cliente.reativacaoAtualizadaEm ?? null,"},{"nome":"ajuste 4","antes":"    const tentativas = registrosRetorno.filter(\n      (registro) =>\n        registro.clienteId === cliente.clienteId &&\n        registro.createdAt.getTime() > ultimoAtendimento,\n    ).length;\n    const mensagem =\n      tentativas >= 1\n        ? buildReactivationSecondWhatsAppMessage({\n            clientName: cliente.nome,\n            procedure: principal?.nome,\n          })","depois":"    const registros = registrosRetorno.filter(\n      (registro) =>\n        registro.clienteId === cliente.clienteId &&\n        registro.createdAt.getTime() > ultimoAtendimento,\n    ).length;\n    // Tambem conta como 1a tentativa quem foi marcada como \"ja recebeu\" ou\n    // \"vai marcar\" neste ciclo (mesmo se a mensagem saiu fora do sistema).\n    const marcadaNesteCiclo =\n      (cliente.situacao === \"Contatada\" || cliente.situacao === \"Vai marcar\") &&\n      cliente.situacaoEm !== null &&\n      cliente.situacaoEm.getTime() > ultimoAtendimento &&\n      cliente.situacaoEm.getTime() > agora.getTime() - JANELA_TENTATIVAS_DIAS * UM_DIA_MS;\n    const tentativas = Math.max(registros, marcadaNesteCiclo ? 1 : 0);\n    const mensagem =\n      tentativas >= 1\n        ? buildReactivationSecondWhatsAppMessage({\n            clientName: cliente.nome,\n            procedure: principal?.nome,\n            disseQueIaMarcar: cliente.situacao === \"Vai marcar\",\n          })"},{"nome":"ajuste 5","antes":"    return {\n      ...cliente,\n      tentativas,","depois":"    const { situacaoEm, ...restoCliente } = cliente;\n    void situacaoEm;\n    return {\n      ...restoCliente,\n      tentativas,"}]},{"arquivo":"actions/reativacao.actions.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  const cliente = await prisma.cliente.findUnique({\n    where: { id: clienteId },\n    select: { id: true, nome: true, telefone: true, whatsapp: true },\n  });","depois":"  const cliente = await prisma.cliente.findUnique({\n    where: { id: clienteId },\n    select: {\n      id: true,\n      nome: true,\n      telefone: true,\n      whatsapp: true,\n      reativacaoSituacao: true,\n      reativacaoAtualizadaEm: true,\n    },\n  });"},{"nome":"ajuste 2","antes":"    segundaTentativa = anteriores >= 1;","depois":"    // Marcada como \"ja recebeu\"/\"vai marcar\" neste ciclo tambem conta, mesmo\n    // se a 1a mensagem saiu fora do sistema.\n    const marcadaNesteCiclo =\n      (cliente.reativacaoSituacao === \"Contatada\" || cliente.reativacaoSituacao === \"Vai marcar\") &&\n      cliente.reativacaoAtualizadaEm !== null &&\n      cliente.reativacaoAtualizadaEm >= desde;\n    segundaTentativa = anteriores >= 1 || marcadaNesteCiclo;"}]},{"arquivo":"app/(app)/retornos/components/RetornosClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"                            2ª tentativa · não respondeu a 1ª mensagem","depois":"                            {cliente.situacao === \"Vai marcar\"\n                              ? \"2ª mensagem · disse que ia marcar e não marcou\"\n                              : \"2ª tentativa · não respondeu a 1ª mensagem\"}"}]}]};
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
