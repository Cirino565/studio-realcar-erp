#!/usr/bin/env node
/*
 * MOTIVO DO CANCELAMENTO A VISTA - Studio Realcar
 *
 * Agenda: na faixa "Cancelados neste dia/semana", botao "Ver motivos" abre a
 * lista com o que foi escrito ao desmarcar (tocar abre o agendamento).
 * Lista "Para remarcar": mostra o motivo embaixo de cada cliente, e o nome
 * leva ao dia em que ela estava marcada.
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node motivo-cancelamento.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{"lib/motivo-desmarque.ts":"/**\n * Motivo de um desmarque/falta, a partir da observacao do agendamento.\n * O \"Cliente desmarcou\" grava uma linha assim:\n *   [Cancelou em 24/11 10:12, 1 dia antes. Vai remarcar. Viagem a trabalho]\n * Mostramos o conteudo da ultima linha dessas; sem ela, a observacao livre.\n */\nexport function motivoDesmarque(observacoes?: string | null): string | null {\n  const texto = (observacoes || \"\").trim();\n  if (!texto) return null;\n  const linhas = [...texto.matchAll(/\\[((?:Cancelou|Faltou) em [^\\]]*)\\]/g)];\n  const ultima = linhas[linhas.length - 1]?.[1];\n  if (ultima) return ultima.trim();\n  return texto.replace(/\\s+/g, \" \").slice(0, 240);\n}\n"},"arquivos":[{"arquivo":"lib/remarcacao.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  sinalGuardado: boolean;\n  valorSinal: number;\n};","depois":"  sinalGuardado: boolean;\n  valorSinal: number;\n  /** O que foi escrito ao desmarcar (motivo). */\n  motivo: string | null;\n};"},{"nome":"ajuste 2","antes":"      sinalLancamentoId: true,\n      cliente: { select: { nome: true, telefone: true, whatsapp: true } },\n    },\n  });\n\n  return itens.map((item) => ({","depois":"      sinalLancamentoId: true,\n      observacoes: true,\n      cliente: { select: { nome: true, telefone: true, whatsapp: true } },\n    },\n  });\n\n  return itens.map((item) => ({"},{"nome":"ajuste 3","antes":"    valorSinal: item.sinalGuardado ? item.valorSinal : 0,\n  }));\n}","depois":"    valorSinal: item.sinalGuardado ? item.valorSinal : 0,\n    motivo: motivoDesmarque(item.observacoes),\n  }));\n}"},{"nome":"ajuste 4","antes":"import { prisma } from \"@/lib/prisma\";\n","depois":"import { prisma } from \"@/lib/prisma\";\nimport { motivoDesmarque } from \"@/lib/motivo-desmarque\";\n"}]},{"arquivo":"app/(app)/agenda/components/ParaRemarcarPainel.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"                    <p className=\"break-words font-bold text-slate-900 dark:text-white\">{pendente.clienteNome}</p>\n                    <p className=\"text-xs text-slate-600 dark:text-slate-300\">\n                      {pendente.procedimento}\n                      {pendente.naturezaAtendimento === \"RETORNO\" ? \" (retorno)\" : \"\"} · era {dataCurta(pendente.data)}\n                      {pendente.status === \"Faltou\" ? \" · faltou\" : ` · desmarcou ${dataCurta(pendente.desmarcadoEm)}`}\n                    </p>","depois":"                    {/* Nome leva ao dia em que estava marcada. */}\n                    <a\n                      href={`/agenda?data=${diaISO(pendente.data)}&agendamentoId=${pendente.id}`}\n                      title=\"Ver o dia em que estava marcada\"\n                      className=\"break-words font-bold text-slate-900 underline-offset-2 hover:text-violet-700 hover:underline dark:text-white\"\n                    >\n                      {pendente.clienteNome}\n                    </a>\n                    <p className=\"text-xs text-slate-600 dark:text-slate-300\">\n                      {pendente.procedimento}\n                      {pendente.naturezaAtendimento === \"RETORNO\" ? \" (retorno)\" : \"\"} · era {dataCurta(pendente.data)}\n                      {pendente.status === \"Faltou\" ? \" · faltou\" : ` · desmarcou ${dataCurta(pendente.desmarcadoEm)}`}\n                    </p>\n                    {pendente.motivo ? (\n                      <p className=\"mt-0.5 text-xs italic text-slate-500 dark:text-slate-400\">{pendente.motivo}</p>\n                    ) : null}"},{"nome":"ajuste 2","antes":"function primeiroNome(nome: string) {","depois":"function diaISO(valor: string) {\n  return new Date(valor).toLocaleDateString(\"en-CA\", { timeZone: \"America/Sao_Paulo\" });\n}\n\nfunction primeiroNome(nome: string) {"}]},{"arquivo":"app/(app)/agenda/components/AgendaCalendar.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"            {cancelados.length > LIMITE ? (\n              <span className=\"text-[11px] font-semibold text-slate-500\">+{cancelados.length - LIMITE}</span>\n            ) : null}\n            <button\n              type=\"button\"\n              onClick={() => setMostrarCancelados((atual) => !atual)}","depois":"            {cancelados.length > LIMITE ? (\n              <span className=\"text-[11px] font-semibold text-slate-500\">+{cancelados.length - LIMITE}</span>\n            ) : null}\n            <button\n              type=\"button\"\n              onClick={() => setVerMotivosCancelados((atual) => !atual)}\n              aria-expanded={verMotivosCancelados}\n              className=\"shrink-0 rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-bold text-rose-700 transition hover:bg-rose-50 dark:border-rose-400/30 dark:bg-slate-800 dark:text-rose-200\"\n            >\n              {verMotivosCancelados ? \"Esconder motivos\" : \"Ver motivos\"}\n            </button>\n            {verMotivosCancelados ? (\n              <ul className=\"order-last w-full space-y-1 pt-1\">\n                {cancelados.map((appointment) => (\n                  <li key={`motivo-${appointment.id}`}>\n                    <button\n                      type=\"button\"\n                      onClick={() => onSelectAppointment(appointment)}\n                      className=\"w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-[11px] leading-4 hover:border-rose-300 dark:border-slate-700 dark:bg-slate-800\"\n                    >\n                      <span className=\"font-bold text-slate-800 dark:text-slate-100\">\n                        {appointment.cliente.nome} · {viewMode === \"week\" ? `${diaCurto(appointment.data)} ` : \"\"}\n                        {formatTime(appointment.data)}\n                      </span>\n                      <span className=\"block text-slate-600 dark:text-slate-300\">\n                        {motivoDesmarque(appointment.observacoes) || \"Sem observação.\"}\n                      </span>\n                    </button>\n                  </li>\n                ))}\n              </ul>\n            ) : null}\n            <button\n              type=\"button\"\n              onClick={() => setMostrarCancelados((atual) => !atual)}"},{"nome":"ajuste 2","antes":"  const [mostrarCancelados, setMostrarCancelados] = useState(false);","depois":"  const [mostrarCancelados, setMostrarCancelados] = useState(false);\n  // Lista com o motivo de cada cancelado (o que foi escrito ao desmarcar).\n  const [verMotivosCancelados, setVerMotivosCancelados] = useState(false);"},{"nome":"ajuste 3","antes":"import { feriadoDoDia, rotuloTipoFeriado } from \"@/lib/feriados\";","depois":"import { feriadoDoDia, rotuloTipoFeriado } from \"@/lib/feriados\";\nimport { motivoDesmarque } from \"@/lib/motivo-desmarque\";"}]}]};

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
