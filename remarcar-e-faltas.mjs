#!/usr/bin/env node
/*
 * REMARCAR E FALTAS NA FICHA - Studio Realcar
 *
 *  - Agendamento cancelado ou com falta: o botao "Agendar proximo" vira
 *    "Remarcar" e abre o novo horario ja preenchido (mesmo procedimento,
 *    retorno continua retorno). O antigo fica no historico; se estava em
 *    "Para remarcar", sai da lista ao salvar.
 *  - Ficha da cliente: "Faltas e desmarcacoes" (faltou X, desmarcou Y, com
 *    as datas e com quanto tempo de aviso). Destaque quando costuma faltar.
 *  - Indice novo no banco para a ficha e a agenda buscarem mais rapido.
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node remarcar-e-faltas.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{"prisma/migrations/20261106170000_agendamento_cliente_status_idx/migration.sql":"-- Ficha da cliente e agenda: busca rapida dos agendamentos de uma cliente por situacao.\nCREATE INDEX IF NOT EXISTS \"Agendamento_clienteId_status_idx\" ON \"Agendamento\"(\"clienteId\", \"status\");\n"},"arquivos":[{"arquivo":"app/(app)/agenda/components/AgendaClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"    opcoes?: { procedimento?: string; duracao?: number; observacoes?: string },\n  ) {\n    const dataBase = new Date(appointment.data);\n","depois":"    opcoes?: { procedimento?: string; duracao?: number; observacoes?: string },\n  ) {\n    // Cancelado ou faltou: \"Remarcar\" - novo horario igual ao que foi perdido\n    // (mesmo procedimento, retorno continua retorno). O antigo fica no\n    // historico e, se estava em \"Para remarcar\", sai da lista ao salvar.\n    const statusAtual = (appointment.status || \"\").trim().toLowerCase();\n    if (statusAtual === \"cancelado\" || statusAtual === \"faltou\") {\n      const hojeInput = toDateInput(new Date());\n      const selecionadoInput = toDateInput(selectedDate);\n      setSelectedAppointment(null);\n      setFinishAppointment(null);\n      setNovoHorario({\n        modo: \"novo\",\n        tipoAtendimento: \"agendamento\",\n        data: selecionadoInput < hojeInput ? hojeInput : selecionadoInput,\n        hora: toTimeInput(appointment.data),\n        profissionalId: appointment.profissionalId || undefined,\n        clienteId: appointment.clienteId,\n        procedimento: appointment.procedimento,\n        procedimentosExtras: lerProcedimentosExtras(appointment.procedimentosExtras),\n        duracao: appointment.duracao || 60,\n        naturezaAtendimento: appointment.naturezaAtendimento,\n        agendamentoOrigemId: appointment.agendamentoOrigemId,\n        valor: appointment.naturezaAtendimento === \"RETORNO\" ? 0 : appointment.valor || 0,\n        status: \"Agendado\",\n        sinalPago: false,\n        observacoes: `Remarcação do horário de ${formatarDataCurta(appointment.data)}.`,\n      });\n      return;\n    }\n\n    const dataBase = new Date(appointment.data);\n"}]},{"arquivo":"app/(app)/agenda/components/AppointmentDetailsModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"            <AcaoRapida\n              icon={CalendarClock}\n              label=\"Agendar próximo\"\n              onClick={agendarProximo}\n            />","depois":"            <AcaoRapida\n              icon={CalendarClock}\n              label={\n                currentAppointment.status === \"Cancelado\" || currentAppointment.status === \"Faltou\"\n                  ? \"Remarcar\"\n                  : \"Agendar próximo\"\n              }\n              onClick={agendarProximo}\n            />"}]},{"arquivo":"app/(app)/clientes/[id]/page.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  const [cliente, anamneseModelos, pacotes, formasPagamento, contas] =\n    await Promise.all([","depois":"  const [cliente, anamneseModelos, pacotes, formasPagamento, contas, faltasEDesmarques, atendidosTotal] =\n    await Promise.all(["},{"nome":"ajuste 2","antes":"      prisma.contaFinanceira.findMany({\n        where: { status: \"Ativa\" },\n        orderBy: [{ principal: \"desc\" }, { nome: \"asc\" }],\n        select: { id: true, nome: true, principal: true },\n      }),\n    ]);","depois":"      prisma.contaFinanceira.findMany({\n        where: { status: \"Ativa\" },\n        orderBy: [{ principal: \"desc\" }, { nome: \"asc\" }],\n        select: { id: true, nome: true, principal: true },\n      }),\n      // Faltas e desmarcacoes (so o necessario, para a ficha continuar leve).\n      prisma.agendamento.findMany({\n        where: {\n          clienteId,\n          OR: [{ status: \"Faltou\" }, { status: \"Cancelado\", desmarcadoEm: { not: null } }],\n        },\n        select: { id: true, data: true, status: true, procedimento: true, desmarcadoEm: true },\n        orderBy: { data: \"desc\" },\n        take: 40,\n      }),\n      prisma.agendamento.count({ where: { clienteId, status: \"Atendido\" } }),\n    ]);"},{"nome":"ajuste 3","antes":"        atribuicao={atribuicao}\n        podeJuntar={canAccess(usuario, \"clientes.gerenciar\")}","depois":"        atribuicao={atribuicao}\n        presenca={{\n          atendidos: atendidosTotal,\n          itens: faltasEDesmarques.map((item) => ({\n            id: item.id,\n            data: item.data.toISOString(),\n            procedimento: item.procedimento,\n            faltou: item.status === \"Faltou\",\n            horasDeAviso:\n              item.status !== \"Faltou\" && item.desmarcadoEm\n                ? Math.max(0, Math.round((item.data.getTime() - item.desmarcadoEm.getTime()) / 3_600_000))\n                : null,\n          })),\n        }}\n        podeJuntar={canAccess(usuario, \"clientes.gerenciar\")}"}]},{"arquivo":"app/(app)/clientes/components/ClienteProfileHeader.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"    campanha: string | null;\n    cliquePago: boolean;\n  };\n};","depois":"    campanha: string | null;\n    cliquePago: boolean;\n  };\n  // Faltas e desmarcacoes da cliente (para saber quem costuma faltar).\n  presenca?: {\n    atendidos: number;\n    itens: Array<{\n      id: number;\n      data: string;\n      procedimento: string;\n      faltou: boolean;\n      horasDeAviso: number | null;\n    }>;\n  };\n};"},{"nome":"ajuste 2","antes":"  atribuicao,\n  podeJuntar = false,\n}: Props) {","depois":"  atribuicao,\n  presenca,\n  podeJuntar = false,\n}: Props) {"},{"nome":"ajuste 3","antes":"        <AvisoPacoteAberto\n          pacotes={data.pacotes.filter((pacote) => pacote.status === \"Aberto\")}","depois":"        {presenca && presenca.itens.length > 0 ? (() => {\n          const faltas = presenca.itens.filter((item) => item.faltou).length;\n          const desmarcou = presenca.itens.length - faltas;\n          const atencao = faltas >= 2 || presenca.itens.length >= 3;\n          return (\n            <details\n              className={`rounded-2xl border px-4 py-3 text-sm ${\n                atencao\n                  ? \"border-amber-200 bg-amber-50 dark:border-amber-400/20 dark:bg-amber-500/10\"\n                  : \"border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04]\"\n              }`}\n            >\n              <summary className=\"cursor-pointer list-none\">\n                <p className=\"text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400\">\n                  Faltas e desmarcações\n                </p>\n                <p className=\"mt-1 font-medium text-slate-800 dark:text-slate-100\">\n                  Faltou {faltas}x · Desmarcou {desmarcou}x\n                  <span className=\"font-normal text-slate-500 dark:text-slate-400\">\n                    {\" \"}· {presenca.atendidos} atendimento(s) realizado(s)\n                  </span>\n                </p>\n                <p className=\"mt-0.5 text-xs text-slate-500 dark:text-slate-400\">\n                  {atencao ? \"Costuma faltar ou desmarcar: vale pedir sinal. \" : \"\"}\n                  <span className=\"underline decoration-dotted underline-offset-2\">Ver datas</span>\n                </p>\n              </summary>\n              <ul className=\"mt-2 space-y-1 border-t border-slate-200 pt-2 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300\">\n                {presenca.itens.map((item) => (\n                  <li key={item.id} className=\"flex flex-wrap justify-between gap-x-3\">\n                    <span>\n                      {formatarData(item.data)} · {item.procedimento}\n                    </span>\n                    <span className={item.faltou ? \"font-semibold text-rose-600 dark:text-rose-300\" : \"text-slate-500 dark:text-slate-400\"}>\n                      {item.faltou\n                        ? \"Faltou\"\n                        : item.horasDeAviso !== null\n                          ? `Desmarcou ${item.horasDeAviso >= 48 ? `${Math.round(item.horasDeAviso / 24)} dias` : `${item.horasDeAviso}h`} antes`\n                          : \"Desmarcou\"}\n                    </span>\n                  </li>\n                ))}\n              </ul>\n            </details>\n          );\n        })() : null}\n\n        <AvisoPacoteAberto\n          pacotes={data.pacotes.filter((pacote) => pacote.status === \"Aberto\")}"}]},{"arquivo":"prisma/schema.prisma","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  @@index([aguardandoRemarcacao, clienteId])","depois":"  @@index([aguardandoRemarcacao, clienteId])\n  @@index([clienteId, status])"}]}]};
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
