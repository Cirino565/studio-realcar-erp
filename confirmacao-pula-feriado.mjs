#!/usr/bin/env node
/*
 * CONFIRMACOES PULANDO DOMINGO E FERIADO - Studio Realcar
 *
 * A lista "Confirmar amanha" (Inicio e Comunicacoes) passa a mostrar os
 * atendimentos do PROXIMO DIA DE ATENDIMENTO quando amanha e domingo ou
 * feriado: no sabado ja aparecem os de segunda; na vespera de feriado, os do
 * dia util seguinte. O titulo mostra o dia ("Confirmar segunda (26/10)") e um
 * aviso explica o pulo. Ponto facultativo (Carnaval) conta como dia normal.
 *
 * Nao mexe no banco. Pode rodar mais de uma vez; se algum trecho nao for
 * encontrado, NADA e gravado.
 *
 * Uso: node confirmacao-pula-feriado.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{"lib/janela-confirmacao.ts":"import { feriadoDoDia, type Feriado } from \"@/lib/feriados\";\n\n/**\n * Quais atendimentos aparecem para confirmar hoje.\n *\n * Normalmente sao os de amanha. Mas se amanha for domingo ou feriado (dia sem\n * atendimento), ja entram tambem os do proximo dia de atendimento - assim, no\n * sabado aparecem os de segunda, e na vespera de um feriado aparecem os do dia\n * util seguinte. Ninguem precisa mandar mensagem no domingo nem no feriado.\n *\n * Feriado nacional, estadual e municipal fecham; ponto facultativo (Carnaval)\n * conta como dia normal.\n */\n\nconst DIAS_SEMANA = [\"domingo\", \"segunda\", \"terça\", \"quarta\", \"quinta\", \"sexta\", \"sábado\"];\n\nfunction somarDias(dataISO: string, dias: number) {\n  const [ano, mes, dia] = dataISO.split(\"-\").map(Number);\n  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);\n}\n\nfunction diaDaSemana(dataISO: string) {\n  return new Date(`${dataISO}T12:00:00Z`).getUTCDay();\n}\n\nfunction diaMes(dataISO: string) {\n  return `${dataISO.slice(8, 10)}/${dataISO.slice(5, 7)}`;\n}\n\n/** Domingo ou feriado (que nao seja ponto facultativo). */\nexport function diaSemAtendimento(dataISO: string): { fechado: boolean; motivo: string | null } {\n  if (diaDaSemana(dataISO) === 0) return { fechado: true, motivo: \"domingo\" };\n  const feriado: Feriado | null = feriadoDoDia(dataISO);\n  if (feriado && feriado.tipo !== \"facultativo\") return { fechado: true, motivo: feriado.nome };\n  return { fechado: false, motivo: null };\n}\n\nexport type JanelaConfirmacao = {\n  /** Primeiro dia (amanha), \"AAAA-MM-DD\". */\n  inicioISO: string;\n  /** Dia de atendimento que sera confirmado, \"AAAA-MM-DD\". */\n  diaAtendimentoISO: string;\n  /** Dia seguinte ao ultimo (limite, sem incluir). */\n  fimExclusivoISO: string;\n  /** Mais de um dia no meio (domingo/feriado pulados). */\n  pulouDias: boolean;\n  /** \"amanhã\" ou \"segunda (26/10)\". */\n  rotulo: string;\n  /** Explicacao curta quando pulou dias, ex.: \"Domingo sem atendimento: já aparecem os de segunda (26/10).\" */\n  aviso: string | null;\n};\n\nexport function janelaConfirmacao(hojeISO: string): JanelaConfirmacao {\n  const inicioISO = somarDias(hojeISO, 1);\n  let diaAtendimentoISO = inicioISO;\n  const pulados: string[] = [];\n\n  // No maximo uma semana para frente (nunca trava).\n  for (let i = 0; i < 7; i += 1) {\n    const situacao = diaSemAtendimento(diaAtendimentoISO);\n    if (!situacao.fechado) break;\n    if (situacao.motivo && !pulados.includes(situacao.motivo)) pulados.push(situacao.motivo);\n    diaAtendimentoISO = somarDias(diaAtendimentoISO, 1);\n  }\n\n  const pulouDias = diaAtendimentoISO !== inicioISO;\n  const nomeDia = `${DIAS_SEMANA[diaDaSemana(diaAtendimentoISO)]} (${diaMes(diaAtendimentoISO)})`;\n  const motivos = pulados.map((motivo) => (motivo === \"domingo\" ? \"Domingo\" : `feriado (${motivo})`));\n  const textoMotivos = motivos.join(\" e \");\n\n  return {\n    inicioISO,\n    diaAtendimentoISO,\n    fimExclusivoISO: somarDias(diaAtendimentoISO, 1),\n    pulouDias,\n    rotulo: pulouDias ? nomeDia : \"amanhã\",\n    aviso: pulouDias\n      ? `${textoMotivos.charAt(0).toUpperCase()}${textoMotivos.slice(1)} sem atendimento: já aparecem os de ${nomeDia}.`\n      : null,\n  };\n}\n"},"arquivos":[{"arquivo":"app/(app)/page.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import { decodificarMensagemModelo } from \"@/lib/mensagem-modelo.server\";\n","depois":"import { decodificarMensagemModelo } from \"@/lib/mensagem-modelo.server\";\nimport { janelaConfirmacao } from \"@/lib/janela-confirmacao\";\n"},{"nome":"ajuste 2","antes":"  const inicioDepoisAmanha = inicioDiaSaoPaulo(depoisAmanhaISO);\n","depois":"  const inicioDepoisAmanha = inicioDiaSaoPaulo(depoisAmanhaISO);\n  void inicioDepoisAmanha;\n\n  // Confirmacoes: amanha, ou - se amanha for domingo/feriado - ate o proximo\n  // dia de atendimento (no sabado ja aparecem os de segunda).\n  const janela = janelaConfirmacao(hojeISO);\n  const inicioJanelaConfirmacao = inicioDiaSaoPaulo(janela.inicioISO);\n  const fimJanelaConfirmacao = inicioDiaSaoPaulo(janela.fimExclusivoISO);\n  const horarioConfirmacao = (data: Date) =>\n    dataISOEmSaoPaulo(data) === janela.diaAtendimentoISO\n      ? formatarHorario(data)\n      : `${dataISOEmSaoPaulo(data).slice(8, 10)}/${dataISOEmSaoPaulo(data).slice(5, 7)} · ${formatarHorario(data)}`;\n"},{"nome":"ajuste 3","antes":"        data: { gte: inicioAmanha, lt: inicioDepoisAmanha },\n        status: \"Agendado\",","depois":"        data: { gte: inicioJanelaConfirmacao, lt: fimJanelaConfirmacao },\n        status: \"Agendado\","},{"nome":"ajuste 4","antes":"        data: { gte: inicioAmanha, lt: inicioDepoisAmanha },\n        status: \"Confirmado\",","depois":"        data: { gte: inicioJanelaConfirmacao, lt: fimJanelaConfirmacao },\n        status: \"Confirmado\","},{"nome":"ajuste 5","antes":"  const confirmacoes = confirmacoesAmanha.map((agendamento) => ({\n    id: agendamento.id,\n    cliente: agendamento.cliente.nome,\n    procedimento: formatarProcedimentoAgendamento(agendamento),\n    horario: formatarHorario(agendamento.data),","depois":"  const confirmacoes = confirmacoesAmanha.map((agendamento) => ({\n    id: agendamento.id,\n    cliente: agendamento.cliente.nome,\n    procedimento: formatarProcedimentoAgendamento(agendamento),\n    horario: horarioConfirmacao(agendamento.data),"},{"nome":"ajuste 6","antes":"  const clientesConfirmadosAmanha = confirmadosAmanha.map((agendamento) => ({\n    id: agendamento.id,\n    cliente: agendamento.cliente.nome,\n    procedimento: formatarProcedimentoAgendamento(agendamento),\n    horario: formatarHorario(agendamento.data),","depois":"  const clientesConfirmadosAmanha = confirmadosAmanha.map((agendamento) => ({\n    id: agendamento.id,\n    cliente: agendamento.cliente.nome,\n    procedimento: formatarProcedimentoAgendamento(agendamento),\n    horario: horarioConfirmacao(agendamento.data),"},{"nome":"ajuste 7","antes":"  const dataAgendaAmanha = amanhaISO;","depois":"  const dataAgendaAmanha = janela.pulouDias ? janela.diaAtendimentoISO : amanhaISO;\n  const rotuloDiaConfirmacao = janela.rotulo;"},{"nome":"ajuste 8","antes":"          titulo=\"Confirmar amanhã\"\n          valor={confirmacoesAmanha.length}","depois":"          titulo={`Confirmar ${rotuloDiaConfirmacao}`}\n          valor={confirmacoesAmanha.length}"},{"nome":"ajuste 9","antes":"          titulo=\"Confirmados amanhã\"\n          valor={confirmadosAmanha.length}","depois":"          titulo={`Confirmados ${rotuloDiaConfirmacao}`}\n          valor={confirmadosAmanha.length}"},{"nome":"ajuste 10","antes":"                  <h2 className=\"text-lg font-bold text-slate-950\">Confirmar amanhã</h2>\n                </div>\n                <p className=\"mt-1 text-sm text-slate-500\">\n                  Envie a mensagem e marque a presença confirmada.\n                </p>\n              </div>\n              <Link\n                href={`/agenda?data=${dataAgendaAmanha}`}\n                className=\"shrink-0 text-xs font-bold text-violet-700\"\n              >\n                Ver amanhã\n              </Link>","depois":"                  <h2 className=\"text-lg font-bold text-slate-950\">Confirmar {rotuloDiaConfirmacao}</h2>\n                </div>\n                <p className=\"mt-1 text-sm text-slate-500\">\n                  Envie a mensagem e marque a presença confirmada.\n                </p>\n                {janela.aviso ? (\n                  <p className=\"mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800\">\n                    {janela.aviso}\n                  </p>\n                ) : null}\n              </div>\n              <Link\n                href={`/agenda?data=${dataAgendaAmanha}`}\n                className=\"shrink-0 text-xs font-bold text-violet-700\"\n              >\n                Ver {janela.pulouDias ? \"agenda\" : \"amanhã\"}\n              </Link>"},{"nome":"ajuste 11","antes":"                  <h2 className=\"text-lg font-bold text-slate-950\">Confirmados de amanhã</h2>","depois":"                  <h2 className=\"text-lg font-bold text-slate-950\">Confirmados de {rotuloDiaConfirmacao}</h2>"},{"nome":"ajuste 12","antes":"                Ver amanhã\n              </Link>\n            </div>\n\n            <div className=\"mt-4 space-y-2.5\">","depois":"                Ver {janela.pulouDias ? \"agenda\" : \"amanhã\"}\n              </Link>\n            </div>\n\n            <div className=\"mt-4 space-y-2.5\">"},{"nome":"ajuste 13","antes":"                    Nenhum cliente confirmado para amanhã.","depois":"                    Nenhum cliente confirmado para {rotuloDiaConfirmacao}."},{"nome":"ajuste 14","antes":"              <CentralDoDiaClient\n                confirmacoes={confirmacoes}","depois":"              <CentralDoDiaClient\n                rotuloDia={rotuloDiaConfirmacao}\n                confirmacoes={confirmacoes}"},{"nome":"ajuste 15","antes":"confirmação(ões) pendente(s) para amanhã.</p>","depois":"confirmação(ões) pendente(s) para {rotuloDiaConfirmacao}.</p>"},{"nome":"ajuste 16","antes":"cliente(s) confirmado(s) para amanhã.</p>","depois":"cliente(s) confirmado(s) para {rotuloDiaConfirmacao}.</p>"}]},{"arquivo":"components/dashboard/CentralDoDiaClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"type Props = {\n  confirmacoes: ConfirmacaoItem[];","depois":"type Props = {\n  confirmacoes: ConfirmacaoItem[];\n  // \"amanhã\" ou \"segunda (26/10)\" quando domingo/feriado ficam no meio.\n  rotuloDia?: string;"},{"nome":"ajuste 2","antes":"export default function CentralDoDiaClient({\n  confirmacoes,","depois":"export default function CentralDoDiaClient({\n  confirmacoes,\n  rotuloDia = \"amanhã\","},{"nome":"ajuste 3","antes":"          Nenhuma confirmação pendente para amanhã.\n        </p>\n        <p className=\"mt-1 text-xs text-emerald-700\">\n          A agenda de amanhã está sem atendimentos aguardando confirmação.","depois":"          Nenhuma confirmação pendente para {rotuloDia}.\n        </p>\n        <p className=\"mt-1 text-xs text-emerald-700\">\n          A agenda de {rotuloDia} está sem atendimentos aguardando confirmação."}]},{"arquivo":"app/(app)/comunicacoes/page.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import { decodificarMensagemModelo } from \"@/lib/mensagem-modelo.server\";\n","depois":"import { decodificarMensagemModelo } from \"@/lib/mensagem-modelo.server\";\nimport { janelaConfirmacao } from \"@/lib/janela-confirmacao\";\n"},{"nome":"ajuste 2","antes":"  const inicioDepoisAmanha = inicioDia(depoisAmanhaISO);\n","depois":"  const inicioDepoisAmanha = inicioDia(depoisAmanhaISO);\n  void inicioDepoisAmanha;\n  // Confirmacoes: amanha, ou ate o proximo dia de atendimento quando domingo\n  // ou feriado ficam no meio (no sabado ja aparecem os de segunda).\n  const janela = janelaConfirmacao(hojeISO);\n"},{"nome":"ajuste 3","antes":"        data: { gte: inicioAmanha, lt: inicioDepoisAmanha },\n        status: \"Agendado\",","depois":"        data: { gte: inicioDia(janela.inicioISO), lt: inicioDia(janela.fimExclusivoISO) },\n        status: \"Agendado\","}]},{"arquivo":"app/(app)/automacoes/page.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import { prisma } from \"@/lib/prisma\";\n","depois":"import { prisma } from \"@/lib/prisma\";\nimport { janelaConfirmacao } from \"@/lib/janela-confirmacao\";\n"},{"nome":"ajuste 2","antes":"function amanhaRange() {\n  const agora = new Date();\n  const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);\n  const fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 2);\n\n  return { inicio, fim };\n}","depois":"// Amanha, ou ate o proximo dia de atendimento quando domingo/feriado ficam no meio.\nfunction amanhaRange() {\n  const hojeISO = new Intl.DateTimeFormat(\"en-CA\", {\n    year: \"numeric\",\n    month: \"2-digit\",\n    day: \"2-digit\",\n    timeZone: \"America/Sao_Paulo\",\n  }).format(new Date());\n  const janela = janelaConfirmacao(hojeISO);\n  const inicio = new Date(`${janela.inicioISO}T00:00:00-03:00`);\n  const fim = new Date(`${janela.fimExclusivoISO}T00:00:00-03:00`);\n\n  return { inicio, fim };\n}"}]}]};
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
