#!/usr/bin/env node
/**
 * historico-na-busca-da-agenda.mjs
 * ------------------------------------------------------------------
 * O QUE ESTE SCRIPT FAZ
 *
 * 1) Na busca da AGENDA, quando você digita o nome de uma cliente,
 *    aparece (abaixo dos "Próximos agendamentos") uma linha
 *    "Histórico de visitas", FECHADA. Ao clicar, abre a lista completa
 *    de todos os dias em que ela foi atendida (e as faltas), com o
 *    procedimento e quem atendeu, e o total de visitas no título.
 *    Ela substitui o antigo "Histórico recente" (que mostrava só 3).
 *
 *    Para não pesar: o histórico só é buscado no servidor quando alguém
 *    clica para abrir. Digitar na busca continua tão rápido quanto antes.
 *
 * 2) Remove a aba "Histórico" da ficha da cliente, que tínhamos colocado
 *    no script anterior (a aba Procedimentos já mostra essa informação).
 *
 * Arquivos alterados:
 *   - app/(app)/agenda/components/AgendaSearch.tsx
 *   - actions/agendamento.actions.ts
 *   - app/(app)/clientes/types.ts
 *   - app/(app)/clientes/[id]/page.tsx
 *   - app/(app)/clientes/components/ClienteClinicoTabs.tsx
 *
 * Não substitui arquivos inteiros: só mexe nos trechos exatos acima,
 * sem tocar em Pacotes, fotos, evolução etc.
 *
 * É IDEMPOTENTE: rodando de novo, tudo aparece como "[pulou]".
 * Se algum trecho não for encontrado, NADA é salvo em nenhum arquivo e
 * o script mostra qual trecho faltou - me mande a mensagem inteira.
 * ------------------------------------------------------------------
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const RAIZ = process.cwd();
const ARQUIVOS = {
  "types": "app/(app)/clientes/types.ts",
  "page": "app/(app)/clientes/[id]/page.tsx",
  "tabs": "app/(app)/clientes/components/ClienteClinicoTabs.tsx",
  "acoes": "actions/agendamento.actions.ts",
  "busca": "app/(app)/agenda/components/AgendaSearch.tsx"
};
const PATCHES = [
  {
    "arquivo": "tabs",
    "rotulo": "remover da ficha: conteudo da aba Historico de visitas (ClienteClinicoTabs.tsx)",
    "buscar": "{activeTab === \"historico\" && (\n          <div id=\"historico\">\n            <SectionHeader\n              icon={History}\n              title=\"Histórico de visitas\"\n              description=\"Todos os dias em que a cliente já esteve na clínica, do mais recente para o mais antigo.\"\n            />\n\n            <div className=\"p-4 sm:p-6\">\n              {data.historicoVisitas.length > 0 ? (\n                <>\n                  <p className=\"mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300\">\n                    {(() => {\n                      const dias = new Set(\n                        data.historicoVisitas.map((visita) => visita.data.slice(0, 10)),\n                      );\n                      const totalDias = dias.size;\n                      const totalVisitas = data.historicoVisitas.length;\n                      return `${totalDias} ${totalDias === 1 ? \"dia\" : \"dias\"} de visita registrados (${totalVisitas} ${totalVisitas === 1 ? \"atendimento\" : \"atendimentos\"})`;\n                    })()}\n                  </p>\n\n                  <div className=\"space-y-3\">\n                    {data.historicoVisitas.map((visita) => (\n                      <div\n                        key={visita.id}\n                        className=\"flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]\"\n                      >\n                        <div className=\"min-w-0\">\n                          <p className=\"font-semibold text-slate-900 dark:text-white\">\n                            {formatarData(visita.data)}\n                          </p>\n                          <p className=\"mt-1 text-xs text-slate-500\">\n                            {visita.procedimento}\n                            {visita.profissional ? ` • ${visita.profissional}` : \"\"}\n                          </p>\n                        </div>\n\n                        <p className=\"shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200\">\n                          {formatarMoeda(visita.valor)}\n                        </p>\n                      </div>\n                    ))}\n                  </div>\n                </>\n              ) : (\n                <EmptyState\n                  icon={History}\n                  title=\"Nenhuma visita registrada\"\n                  text=\"Assim que um atendimento for finalizado para esta cliente, ele aparece aqui.\"\n                />\n              )}\n            </div>\n          </div>\n        )}\n\n        {activeTab === \"fotos\" && (",
    "substituir": "{activeTab === \"fotos\" && (",
    "pularSeAusente": "activeTab === \"historico\""
  },
  {
    "arquivo": "tabs",
    "rotulo": "remover da ficha: aba 'historico' na lista de abas (ClienteClinicoTabs.tsx)",
    "buscar": "  { id: \"anamnese\", label: \"Anamnese\", icon: ClipboardList },\n  { id: \"historico\", label: \"Histórico\", icon: History },",
    "substituir": "  { id: \"anamnese\", label: \"Anamnese\", icon: ClipboardList },",
    "pularSeAusente": "{ id: \"historico\", label: \"Histórico\", icon: History },"
  },
  {
    "arquivo": "tabs",
    "rotulo": "remover da ficha: aba 'historico' no tipo AbaClinica (ClienteClinicoTabs.tsx)",
    "buscar": "type AbaClinica =\n  | \"anamnese\"\n  | \"historico\"",
    "substituir": "type AbaClinica =\n  | \"anamnese\"",
    "pularSeAusente": "| \"historico\""
  },
  {
    "arquivo": "tabs",
    "rotulo": "remover da ficha: importar o icone History (ClienteClinicoTabs.tsx)",
    "buscar": "  FileText,\n  History,\n  ImageIcon,",
    "substituir": "  FileText,\n  ImageIcon,",
    "pularSeAusente": "  History,"
  },
  {
    "arquivo": "page",
    "rotulo": "remover da ficha: campo historicoVisitas nos dados enviados a ficha (page.tsx)",
    "buscar": "    historicoVisitas: visitasAtendidas.map((visita) => ({\n      id: visita.id,\n      data: toIsoString(visita.data),\n      procedimento: visita.procedimento,\n      profissional: visita.profissional?.nome || null,\n      valor: visita.valor,\n    })),\n    podeRegistrarEvolucao: canAccess(usuario, \"clientes.clinico\"),",
    "substituir": "    podeRegistrarEvolucao: canAccess(usuario, \"clientes.clinico\"),",
    "pularSeAusente": "historicoVisitas: visitasAtendidas.map("
  },
  {
    "arquivo": "page",
    "rotulo": "remover da ficha: busca das visitas atendidas (page.tsx)",
    "buscar": "  const visitasAtendidas = await prisma.agendamento.findMany({\n    where: { clienteId, status: \"Atendido\" },\n    orderBy: { data: \"desc\" },\n    include: { profissional: { select: { nome: true } } },\n  });\n\n  const anamneses = cliente.anamneses.map(mapAnamnese);",
    "substituir": "  const anamneses = cliente.anamneses.map(mapAnamnese);",
    "pularSeAusente": "const visitasAtendidas = await prisma.agendamento.findMany("
  },
  {
    "arquivo": "types",
    "rotulo": "remover da ficha: campo historicoVisitas em ClienteClinicoData (types.ts)",
    "buscar": "  evolucoesPendentes: ClienteEvolucaoPendenteData[];\n  historicoVisitas: ClienteHistoricoVisitaData[];\n  podeRegistrarEvolucao: boolean;",
    "substituir": "  evolucoesPendentes: ClienteEvolucaoPendenteData[];\n  podeRegistrarEvolucao: boolean;",
    "pularSeAusente": "historicoVisitas: ClienteHistoricoVisitaData[];"
  },
  {
    "arquivo": "types",
    "rotulo": "remover da ficha: tipo ClienteHistoricoVisitaData (types.ts)",
    "buscar": "export type ClienteEvolucaoPendenteData = {\n  id: number;\n  clienteId: number;\n  cliente: string;\n  procedimento: string;\n  profissional: string | null;\n  data: string;\n  pendenteDesde: string;\n};\n\nexport type ClienteHistoricoVisitaData = {\n  id: number;\n  data: string;\n  procedimento: string;\n  profissional: string | null;\n  valor: number;\n};",
    "substituir": "export type ClienteEvolucaoPendenteData = {\n  id: number;\n  clienteId: number;\n  cliente: string;\n  procedimento: string;\n  profissional: string | null;\n  data: string;\n  pendenteDesde: string;\n};",
    "pularSeAusente": "ClienteHistoricoVisitaData"
  },
  {
    "arquivo": "acoes",
    "rotulo": "nova busca do historico completo (agendamento.actions.ts)",
    "adicionarNoFim": "\n\n/**\n * HISTORICO DE VISITAS NA BUSCA DA AGENDA\n *\n * Usada quando a pessoa busca uma cliente na Agenda e clica em\n * \"Histórico de visitas\". So roda nesse clique (nao na hora de digitar),\n * entao a busca continua leve: o historico de cada cliente so e carregado\n * se alguem realmente pedir para ver.\n *\n * Traz os atendimentos finalizados (\"Atendido\") e as faltas (\"Faltou\"),\n * do mais recente para o mais antigo.\n */\nexport type HistoricoVisitasCliente = {\n  visitas: ResultadoBuscaAgendamentoAgenda[];\n  totalAtendidas: number;\n  totalFaltas: number;\n};\n\nexport async function buscarHistoricoVisitasCliente(\n  clienteId: number,\n): Promise<HistoricoVisitasCliente> {\n  await requirePermission(\"agenda.visualizar\");\n\n  const id = Number(clienteId);\n\n  if (!Number.isInteger(id) || id <= 0) {\n    return { visitas: [], totalAtendidas: 0, totalFaltas: 0 };\n  }\n\n  const [agendamentos, totalAtendidas, totalFaltas] = await Promise.all([\n    prisma.agendamento.findMany({\n      where: {\n        clienteId: id,\n        status: { in: [\"Atendido\", \"Faltou\"] },\n      },\n      select: {\n        id: true,\n        clienteId: true,\n        procedimento: true,\n        data: true,\n        status: true,\n        profissionalId: true,\n        cliente: {\n          select: { nome: true, telefone: true, whatsapp: true },\n        },\n        profissional: {\n          select: { nome: true },\n        },\n      },\n      orderBy: { data: \"desc\" },\n      take: 200,\n    }),\n    prisma.agendamento.count({\n      where: { clienteId: id, status: \"Atendido\" },\n    }),\n    prisma.agendamento.count({\n      where: { clienteId: id, status: \"Faltou\" },\n    }),\n  ]);\n\n  return {\n    totalAtendidas,\n    totalFaltas,\n    visitas: agendamentos.map((agendamento) => ({\n      id: agendamento.id,\n      clienteId: agendamento.clienteId,\n      clienteNome: agendamento.cliente.nome,\n      clienteTelefone: agendamento.cliente.telefone,\n      clienteWhatsapp: agendamento.cliente.whatsapp,\n      procedimento: agendamento.procedimento,\n      data: agendamento.data.toISOString(),\n      dataAgenda: formatDateSaoPaulo(agendamento.data),\n      status: agendamento.status,\n      profissionalId: agendamento.profissionalId,\n      profissionalNome: agendamento.profissional?.nome ?? null,\n    })),\n  };\n}\n",
    "pularSePresente": "export async function buscarHistoricoVisitasCliente("
  },
  {
    "arquivo": "busca",
    "rotulo": "icones da busca (AgendaSearch.tsx)",
    "buscar": "import {\n  CalendarDays,\n  Loader2,",
    "substituir": "import {\n  CalendarDays,\n  ChevronDown,\n  History,\n  Loader2,",
    "pularSePresente": "  ChevronDown,\n  History,\n  Loader2,"
  },
  {
    "arquivo": "busca",
    "rotulo": "ligar a busca do historico (AgendaSearch.tsx)",
    "buscar": "  buscarAgendamentosAgendaPorClientes,\n  type ResultadoBuscaAgendamentoAgenda,\n} from \"@/actions/agendamento.actions\";",
    "substituir": "  buscarAgendamentosAgendaPorClientes,\n  buscarHistoricoVisitasCliente,\n  type HistoricoVisitasCliente,\n  type ResultadoBuscaAgendamentoAgenda,\n} from \"@/actions/agendamento.actions\";",
    "pularSePresente": "  buscarHistoricoVisitasCliente,\n"
  },
  {
    "arquivo": "busca",
    "rotulo": "lista do historico completo (AgendaSearch.tsx)",
    "buscar": "export default function AgendaSearch({",
    "substituir": "type EstadoHistorico =\n  | HistoricoVisitasCliente\n  | \"carregando\"\n  | \"erro\"\n  | undefined;\n\n// Lista do historico completo, mostrada so quando a pessoa clica em\n// \"Histórico de visitas\" dentro do resultado da busca.\nfunction HistoricoVisitasLista({\n  estado,\n  onSelect,\n}: {\n  estado: EstadoHistorico;\n  onSelect: (resultado: ResultadoBuscaAgendamentoAgenda) => void;\n}) {\n  if (estado === undefined || estado === \"carregando\") {\n    return (\n      <div className=\"flex items-center gap-2 px-3 pb-3 text-xs text-slate-500 dark:text-slate-400\">\n        <Loader2 size={14} className=\"animate-spin\" />\n        Carregando histórico...\n      </div>\n    );\n  }\n\n  if (estado === \"erro\") {\n    return (\n      <p className=\"px-3 pb-3 text-xs text-rose-600 dark:text-rose-400\">\n        Não foi possível carregar o histórico. Feche e abra de novo para tentar outra vez.\n      </p>\n    );\n  }\n\n  if (estado.visitas.length === 0) {\n    return (\n      <p className=\"px-3 pb-3 text-xs text-slate-500 dark:text-slate-400\">\n        Nenhum atendimento finalizado ainda.\n      </p>\n    );\n  }\n\n  return (\n    <div className=\"space-y-1 px-1.5 pb-2\">\n      {estado.visitas.map((resultado) => {\n        const { dia, hora } = formatarDataHora(resultado.data);\n\n        return (\n          <button\n            key={resultado.id}\n            type=\"button\"\n            onClick={() => onSelect(resultado)}\n            className=\"flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800\"\n          >\n            <CalendarDays size={14} className=\"mt-0.5 shrink-0 text-slate-400\" />\n\n            <div className=\"min-w-0 flex-1\">\n              <div className=\"flex items-center justify-between gap-2\">\n                <p className=\"text-xs font-semibold text-slate-700 dark:text-slate-200\">\n                  {dia} • {hora}\n                </p>\n\n                <span\n                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusBadgeClass(\n                    resultado.status,\n                  )}`}\n                >\n                  {resultado.status}\n                </span>\n              </div>\n\n              <p className=\"mt-0.5 truncate text-[11px] text-slate-600 dark:text-slate-300\">\n                {resultado.procedimento}\n                {resultado.profissionalNome ? ` • ${resultado.profissionalNome}` : \"\"}\n              </p>\n            </div>\n          </button>\n        );\n      })}\n    </div>\n  );\n}\n\nexport default function AgendaSearch({",
    "pularSePresente": "function HistoricoVisitasLista({"
  },
  {
    "arquivo": "busca",
    "rotulo": "controle de abrir/fechar o historico (AgendaSearch.tsx)",
    "buscar": "  const [aberta, setAberta] = useState(false);",
    "substituir": "  const [aberta, setAberta] = useState(false);\n\n  // Historico de cada cliente: fica fechado ate alguem clicar. Na primeira\n  // vez que abre, busca no servidor; depois fica guardado enquanto a\n  // busca estiver aberta, entao abrir e fechar de novo e instantaneo.\n  const [historicoAberto, setHistoricoAberto] = useState<\n    Record<number, boolean>\n  >({});\n  const [historicoCache, setHistoricoCache] = useState<\n    Record<number, EstadoHistorico>\n  >({});\n\n  function alternarHistorico(clienteId: number) {\n    const abrir = !historicoAberto[clienteId];\n\n    setHistoricoAberto((atual) => ({ ...atual, [clienteId]: abrir }));\n\n    if (!abrir) return;\n\n    const atual = historicoCache[clienteId];\n    if (atual !== undefined && atual !== \"erro\") return;\n\n    setHistoricoCache((cache) => ({ ...cache, [clienteId]: \"carregando\" }));\n\n    buscarHistoricoVisitasCliente(clienteId)\n      .then((resposta) => {\n        setHistoricoCache((cache) => ({ ...cache, [clienteId]: resposta }));\n      })\n      .catch((error) => {\n        console.error(\"Erro ao buscar histórico da cliente:\", error);\n        setHistoricoCache((cache) => ({ ...cache, [clienteId]: \"erro\" }));\n      });\n  }\n\n  function resumoHistorico(clienteId: number) {\n    const estado = historicoCache[clienteId];\n    if (!estado || typeof estado === \"string\") return \"\";\n\n    const partes = [\n      `${estado.totalAtendidas} ${estado.totalAtendidas === 1 ? \"visita\" : \"visitas\"}`,\n    ];\n\n    if (estado.totalFaltas > 0) {\n      partes.push(\n        `${estado.totalFaltas} ${estado.totalFaltas === 1 ? \"falta\" : \"faltas\"}`,\n      );\n    }\n\n    return ` · ${partes.join(\" · \")}`;\n  }",
    "pularSePresente": "function alternarHistorico("
  },
  {
    "arquivo": "busca",
    "rotulo": "limpar historico guardado ao limpar a busca (AgendaSearch.tsx)",
    "buscar": "    setCarregando(false);\n    setAberta(false);\n  }",
    "substituir": "    setCarregando(false);\n    setAberta(false);\n    setHistoricoAberto({});\n    setHistoricoCache({});\n  }",
    "pularSePresente": "    setHistoricoCache({});\n"
  },
  {
    "arquivo": "busca",
    "rotulo": "trocar 'Histórico recente' por 'Histórico de visitas' recolhido (AgendaSearch.tsx)",
    "buscar": "                        {historico.length > 0 ? (\n                          <>\n                            <div className=\"border-t border-slate-100 px-3 pb-1 pt-3 dark:border-slate-800\">\n                              <p className=\"text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400\">\n                                Histórico recente\n                              </p>\n                            </div>\n\n                            <div className=\"space-y-1 px-1.5 pb-2\">\n                              {historico.map(\n                                (resultado) => {\n                                  const { dia, hora } =\n                                    formatarDataHora(\n                                      resultado.data,\n                                    );\n\n                                  return (\n                                    <button\n                                      key={resultado.id}\n                                      type=\"button\"\n                                      onClick={() =>\n                                        onSelect(resultado)\n                                      }\n                                      className=\"flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800\"\n                                    >\n                                      <CalendarDays\n                                        size={14}\n                                        className=\"mt-0.5 shrink-0 text-slate-400\"\n                                      />\n\n                                      <div className=\"min-w-0 flex-1\">\n                                        <p className=\"text-xs font-semibold text-slate-700 dark:text-slate-200\">\n                                          {dia} • {hora}\n                                        </p>\n\n                                        <div className=\"mt-0.5 flex items-center gap-1.5\">\n                                          <p className=\"min-w-0 truncate text-[11px] text-slate-500 dark:text-slate-400\">\n                                            {resultado.procedimento}\n                                          </p>\n\n                                          <span\n                                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusBadgeClass(\n                                              resultado.status,\n                                            )}`}\n                                          >\n                                            {resultado.status}\n                                          </span>\n                                        </div>\n                                      </div>\n                                    </button>\n                                  );\n                                },\n                              )}\n                            </div>\n                          </>\n                        ) : null}",
    "substituir": "                        {historico.length > 0 ? (\n                          <div className=\"border-t border-slate-100 dark:border-slate-800\">\n                            <button\n                              type=\"button\"\n                              onClick={() => alternarHistorico(cliente.id)}\n                              aria-expanded={Boolean(historicoAberto[cliente.id])}\n                              className=\"flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800\"\n                            >\n                              <History size={14} className=\"shrink-0 text-slate-400\" />\n\n                              <span className=\"min-w-0 flex-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400\">\n                                Histórico de visitas\n                                {resumoHistorico(cliente.id)}\n                              </span>\n\n                              <ChevronDown\n                                size={15}\n                                className={`shrink-0 text-slate-400 transition-transform ${\n                                  historicoAberto[cliente.id] ? \"\" : \"-rotate-90\"\n                                }`}\n                              />\n                            </button>\n\n                            {historicoAberto[cliente.id] ? (\n                              <HistoricoVisitasLista\n                                estado={historicoCache[cliente.id]}\n                                onSelect={onSelect}\n                              />\n                            ) : null}\n                          </div>\n                        ) : null}",
    "pularSePresente": "onClick={() => alternarHistorico(cliente.id)}"
  }
];

function contar(conteudo, trecho) {
  return conteudo.split(trecho).length - 1;
}

console.log("Aplicando: histórico de visitas na busca da Agenda...\n");

const original = {};
const usaCRLF = {};
const conteudos = {};
const caminhos = {};
let faltouArquivo = false;

for (const [chave, relativo] of Object.entries(ARQUIVOS)) {
  const caminho = join(RAIZ, ...relativo.split("/"));
  caminhos[chave] = caminho;
  if (!existsSync(caminho)) {
    console.log(`[erro] Não encontrei o arquivo: ${relativo}`);
    faltouArquivo = true;
    continue;
  }
  const bruto = readFileSync(caminho, "utf-8");
  original[chave] = bruto;
  usaCRLF[chave] = bruto.includes("\r\n");
  conteudos[chave] = bruto.replace(/\r\n/g, "\n");
}

if (faltouArquivo) {
  console.log("\nNada foi salvo. Confira se está rodando na pasta principal do projeto.");
  process.exit(1);
}

let algumErro = false;

for (const p of PATCHES) {
  const atual = conteudos[p.arquivo];

  if (p.pularSePresente && atual.includes(p.pularSePresente)) {
    console.log(`[pulou] ${p.rotulo}`);
    continue;
  }
  if (p.pularSeAusente && !atual.includes(p.pularSeAusente)) {
    console.log(`[pulou] ${p.rotulo}`);
    continue;
  }

  if (p.adicionarNoFim) {
    conteudos[p.arquivo] = atual.replace(/\s*$/, "") + p.adicionarNoFim;
    console.log(`[ok] ${p.rotulo}`);
    continue;
  }

  const vezes = contar(atual, p.buscar);
  if (vezes !== 1) {
    console.log(`[erro] ${p.rotulo} - não encontrei o trecho esperado (${vezes} ocorrência(s), esperado 1).`);
    algumErro = true;
    continue;
  }

  conteudos[p.arquivo] = atual.replace(p.buscar, () => p.substituir);
  console.log(`[ok] ${p.rotulo}`);
}

if (algumErro) {
  console.log("\nAlgum trecho não foi encontrado - NADA foi salvo. Manda esta mensagem inteira no chat que eu ajusto.");
  process.exit(1);
}

for (const chave of Object.keys(ARQUIVOS)) {
  const final = usaCRLF[chave]
    ? conteudos[chave].replace(/\n/g, "\r\n")
    : conteudos[chave];
  if (final !== original[chave]) {
    writeFileSync(caminhos[chave], final, "utf-8");
  }
}

console.log("\nConcluído.");
