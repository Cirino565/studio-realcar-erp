#!/usr/bin/env node
/**
 * adicionar-historico-de-visitas.mjs
 * ------------------------------------------------------------------
 * O QUE ESTE SCRIPT FAZ
 *
 * Adiciona uma nova aba "Histórico" na ficha da cliente, mostrando:
 *   - quantos dias, no total, a cliente já esteve na clínica;
 *   - a lista de cada um desses dias, com o procedimento feito, o
 *     profissional que atendeu e o valor daquele atendimento.
 *
 * A lista vem dos atendimentos com status "Atendido" (ou seja, dias em
 * que ela realmente veio e foi atendida - não conta agendamento futuro
 * nem cancelado).
 *
 * Esse script muda 3 arquivos:
 *   - app/(app)/clientes/types.ts
 *   - app/(app)/clientes/[id]/page.tsx
 *   - app/(app)/clientes/components/ClienteClinicoTabs.tsx
 *
 * DIFERENTE dos scripts anteriores, este NÃO substitui o arquivo
 * inteiro - ele procura por um trecho pequeno e conhecido dentro de
 * cada arquivo e insere o código novo ao lado dele. Isso é mais seguro
 * porque não corre o risco de "voltar atrás" em alguma outra função
 * (Pacotes, evolução editável, fotos, etc.) que já esteja funcionando
 * no seu projeto real, seja qual for o estado atual desses arquivos.
 *
 * É IDEMPOTENTE: se rodar de novo, cada trecho que já foi aplicado
 * aparece como "[pulou]" e nada é duplicado.
 *
 * SE ALGUM TRECHO NÃO FOR ENCONTRADO: o script avisa exatamente qual
 * trecho faltou e NÃO SALVA NADA em nenhum dos 3 arquivos (para não
 * aplicar só a metade). Nesse caso, me mande a mensagem completa que
 * aparecer no terminal.
 * ------------------------------------------------------------------
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const RAIZ = process.cwd();

const ARQUIVOS = {
  "types": "app/(app)/clientes/types.ts",
  "page": "app/(app)/clientes/[id]/page.tsx",
  "tabs": "app/(app)/clientes/components/ClienteClinicoTabs.tsx"
};

const PATCHES = [
  {
    "arquivo": "types",
    "rotulo": "tipo ClienteHistoricoVisitaData (types.ts)",
    "buscar": "export type ClienteEvolucaoPendenteData = {\n  id: number;\n  clienteId: number;\n  cliente: string;\n  procedimento: string;\n  profissional: string | null;\n  data: string;\n  pendenteDesde: string;\n};",
    "substituir": "export type ClienteEvolucaoPendenteData = {\n  id: number;\n  clienteId: number;\n  cliente: string;\n  procedimento: string;\n  profissional: string | null;\n  data: string;\n  pendenteDesde: string;\n};\n\nexport type ClienteHistoricoVisitaData = {\n  id: number;\n  data: string;\n  procedimento: string;\n  profissional: string | null;\n  valor: number;\n};",
    "jaAplicadoSe": "ClienteHistoricoVisitaData"
  },
  {
    "arquivo": "types",
    "rotulo": "campo historicoVisitas em ClienteClinicoData (types.ts)",
    "buscar": "  evolucoesPendentes: ClienteEvolucaoPendenteData[];\n  podeRegistrarEvolucao: boolean;",
    "substituir": "  evolucoesPendentes: ClienteEvolucaoPendenteData[];\n  historicoVisitas: ClienteHistoricoVisitaData[];\n  podeRegistrarEvolucao: boolean;",
    "jaAplicadoSe": "historicoVisitas: ClienteHistoricoVisitaData[];"
  },
  {
    "arquivo": "page",
    "rotulo": "busca das visitas atendidas (page.tsx)",
    "buscar": "  const anamneses = cliente.anamneses.map(mapAnamnese);",
    "substituir": "  const visitasAtendidas = await prisma.agendamento.findMany({\n    where: { clienteId, status: \"Atendido\" },\n    orderBy: { data: \"desc\" },\n    include: { profissional: { select: { nome: true } } },\n  });\n\n  const anamneses = cliente.anamneses.map(mapAnamnese);",
    "jaAplicadoSe": "const visitasAtendidas = await prisma.agendamento.findMany("
  },
  {
    "arquivo": "page",
    "rotulo": "campo historicoVisitas nos dados enviados a ficha (page.tsx)",
    "buscar": "    podeRegistrarEvolucao: canAccess(usuario, \"clientes.clinico\"),",
    "substituir": "    historicoVisitas: visitasAtendidas.map((visita) => ({\n      id: visita.id,\n      data: toIsoString(visita.data),\n      procedimento: visita.procedimento,\n      profissional: visita.profissional?.nome || null,\n      valor: visita.valor,\n    })),\n    podeRegistrarEvolucao: canAccess(usuario, \"clientes.clinico\"),",
    "jaAplicadoSe": "historicoVisitas: visitasAtendidas.map("
  },
  {
    "arquivo": "tabs",
    "rotulo": "importar o icone History (ClienteClinicoTabs.tsx)",
    "buscar": "  FileText,\n  ImageIcon,",
    "substituir": "  FileText,\n  History,\n  ImageIcon,",
    "jaAplicadoSe": "  History,"
  },
  {
    "arquivo": "tabs",
    "rotulo": "aba 'historico' no tipo AbaClinica (ClienteClinicoTabs.tsx)",
    "buscar": "type AbaClinica =\n  | \"anamnese\"",
    "substituir": "type AbaClinica =\n  | \"anamnese\"\n  | \"historico\"",
    "jaAplicadoSe": "| \"historico\""
  },
  {
    "arquivo": "tabs",
    "rotulo": "aba 'historico' na lista de abas (ClienteClinicoTabs.tsx)",
    "buscar": "  { id: \"anamnese\", label: \"Anamnese\", icon: ClipboardList },",
    "substituir": "  { id: \"anamnese\", label: \"Anamnese\", icon: ClipboardList },\n  { id: \"historico\", label: \"Histórico\", icon: History },",
    "jaAplicadoSe": "{ id: \"historico\", label: \"Histórico\", icon: History },"
  },
  {
    "arquivo": "tabs",
    "rotulo": "conteudo da aba Historico de visitas (ClienteClinicoTabs.tsx)",
    "buscar": "{activeTab === \"fotos\" && (",
    "substituir": "{activeTab === \"historico\" && (\n          <div id=\"historico\">\n            <SectionHeader\n              icon={History}\n              title=\"Histórico de visitas\"\n              description=\"Todos os dias em que a cliente já esteve na clínica, do mais recente para o mais antigo.\"\n            />\n\n            <div className=\"p-4 sm:p-6\">\n              {data.historicoVisitas.length > 0 ? (\n                <>\n                  <p className=\"mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300\">\n                    {(() => {\n                      const dias = new Set(\n                        data.historicoVisitas.map((visita) => visita.data.slice(0, 10)),\n                      );\n                      const totalDias = dias.size;\n                      const totalVisitas = data.historicoVisitas.length;\n                      return `${totalDias} ${totalDias === 1 ? \"dia\" : \"dias\"} de visita registrados (${totalVisitas} ${totalVisitas === 1 ? \"atendimento\" : \"atendimentos\"})`;\n                    })()}\n                  </p>\n\n                  <div className=\"space-y-3\">\n                    {data.historicoVisitas.map((visita) => (\n                      <div\n                        key={visita.id}\n                        className=\"flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]\"\n                      >\n                        <div className=\"min-w-0\">\n                          <p className=\"font-semibold text-slate-900 dark:text-white\">\n                            {formatarData(visita.data)}\n                          </p>\n                          <p className=\"mt-1 text-xs text-slate-500\">\n                            {visita.procedimento}\n                            {visita.profissional ? ` • ${visita.profissional}` : \"\"}\n                          </p>\n                        </div>\n\n                        <p className=\"shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200\">\n                          {formatarMoeda(visita.valor)}\n                        </p>\n                      </div>\n                    ))}\n                  </div>\n                </>\n              ) : (\n                <EmptyState\n                  icon={History}\n                  title=\"Nenhuma visita registrada\"\n                  text=\"Assim que um atendimento for finalizado para esta cliente, ele aparece aqui.\"\n                />\n              )}\n            </div>\n          </div>\n        )}\n\n        {activeTab === \"fotos\" && (",
    "jaAplicadoSe": "activeTab === \"historico\""
  }
];

function caminhoDe(chave) {
  return join(RAIZ, ...ARQUIVOS[chave].split("/"));
}

function contarOcorrencias(conteudo, trecho) {
  if (trecho === "") return 0;
  return conteudo.split(trecho).length - 1;
}

console.log("Adicionando a aba \"Histórico\" na ficha da cliente...\n");

const original = {};
const usaCRLF = {};
const conteudos = {};
const caminhos = {};

for (const chave of Object.keys(ARQUIVOS)) {
  const caminho = caminhoDe(chave);
  caminhos[chave] = caminho;

  if (!existsSync(caminho)) {
    console.log(`[erro] Não encontrei o arquivo: ${caminho}`);
    process.exitCode = 1;
    continue;
  }

  const bruto = readFileSync(caminho, "utf-8");
  original[chave] = bruto;
  usaCRLF[chave] = bruto.includes("\r\n");
  // Normaliza para \n só para comparar/substituir os trechos - o arquivo
  // é salvo de volta no mesmo estilo de quebra de linha que já tinha.
  conteudos[chave] = bruto.replace(/\r\n/g, "\n");
}

if (process.exitCode === 1) {
  console.log("\nNada foi salvo. Confira se está rodando o script na pasta principal do projeto.");
  process.exit(1);
}

let algumErro = false;

for (const patch of PATCHES) {
  const { arquivo, rotulo, buscar, substituir, jaAplicadoSe } = patch;
  const conteudoAtual = conteudos[arquivo];

  if (conteudoAtual.includes(jaAplicadoSe)) {
    console.log(`[pulou] ${rotulo} - já estava aplicado.`);
    continue;
  }

  const vezes = contarOcorrencias(conteudoAtual, buscar);

  if (vezes !== 1) {
    console.log(
      `[erro] ${rotulo} - não encontrei o trecho esperado (${vezes} ocorrência(s), esperado 1).`,
    );
    console.log("Manda esta mensagem inteira no chat que eu ajusto.");
    algumErro = true;
    continue;
  }

  conteudos[arquivo] = conteudoAtual.replace(buscar, substituir);
  console.log(`[ok] ${rotulo}`);
}

if (algumErro) {
  console.log("\nAlgum trecho não foi encontrado - NADA foi salvo em nenhum arquivo.");
  process.exit(1);
}

for (const chave of Object.keys(ARQUIVOS)) {
  const final = usaCRLF[chave]
    ? conteudos[chave].replace(/\n/g, "\r\n")
    : conteudos[chave];

  if (final === original[chave]) {
    continue;
  }

  writeFileSync(caminhos[chave], final, "utf-8");
}

console.log("\nConcluído. A nova aba \"Histórico\" já aparece na ficha da cliente.");
