#!/usr/bin/env node
/*
 * REATIVACAO: SO QUEM JA ESFRIOU - Studio Realcar
 *
 * A lista de Reativar perdidos so mostra quem foi marcado como perdido ha
 * mais de 7 dias (escolha "3, 5, 7, 10, 15 ou 30 dias" no topo da tela).
 * Quem e recente fica fora (ainda quente, para retorno direto) e entra
 * sozinho ao completar os dias; o topo mostra quantos estao nessa espera.
 * Cria 1 coluna na configuracao (migracao automatica no deploy).
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node reativacao-so-esfriados.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{"prisma/migrations/20261124190000_reativacao_dias_esfriar/migration.sql":"-- Reativacao de perdidos: so entra quem foi perdido ha mais de X dias (padrao 7).\nALTER TABLE \"ConfiguracaoClinica\" ADD COLUMN IF NOT EXISTS \"reativacaoDiasEsfriar\" INTEGER NOT NULL DEFAULT 7;\n"},"arquivos":[{"arquivo":"prisma/schema.prisma","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  reativacaoLimiteDiario Int @default(15)","depois":"  reativacaoLimiteDiario Int @default(15)\n  // Reativacao: so entra quem foi marcado como perdido ha mais de X dias.\n  reativacaoDiasEsfriar Int @default(7)"}]},{"arquivo":"lib/reativacao-perdidos-dados.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  foraDaLista: { perdidos: number; semTelefone: number; comHorario: number; jaEnviados: number };\n  limiteDiario: number;","depois":"  foraDaLista: { perdidos: number; semTelefone: number; comHorario: number; jaEnviados: number; recentes: number };\n  limiteDiario: number;\n  /** So aparece quem foi perdido ha mais de tantos dias (ja esfriou). */\n  diasEsfriar: number;"},{"nome":"ajuste 2","antes":"export async function carregarReativacao(filtros: FiltrosReativacao): Promise<DadosReativacao> {\n  const agora = new Date();\n\n  // Quem pode receber: perdido, com telefone, nunca recebeu e sem horario marcado.\n  const base: Prisma.LeadWhereInput = {\n    etapa: \"Perdido\",\n    reativacaoEnviadaEm: null,\n    telefone: { not: null },\n    NOT: [","depois":"export async function carregarReativacao(filtros: FiltrosReativacao): Promise<DadosReativacao> {\n  const agora = new Date();\n  const configEsfriar = await prisma.configuracaoClinica.findFirst({ select: { reativacaoDiasEsfriar: true } });\n  const diasEsfriar = configEsfriar?.reativacaoDiasEsfriar ?? 7;\n  // Perdido recente ainda esta \"quente\": recebe retorno direto, nao a reativacao.\n  const corteEsfriou = new Date(agora.getTime() - diasEsfriar * 86_400_000);\n  const jaEsfriou: Prisma.LeadWhereInput = { OR: [{ perdidoEm: null }, { perdidoEm: { lte: corteEsfriou } }] };\n\n  // Quem pode receber: perdido ha mais de X dias, com telefone, nunca recebeu e sem horario marcado.\n  const base: Prisma.LeadWhereInput = {\n    etapa: \"Perdido\",\n    reativacaoEnviadaEm: null,\n    telefone: { not: null },\n    ...jaEsfriou,\n    NOT: ["},{"nome":"ajuste 3","antes":"  const [foraPerdidos, foraSemTelefone, foraComHorario, foraJaEnviados] = await Promise.all([","depois":"  const [foraPerdidos, foraSemTelefone, foraComHorario, foraJaEnviados, foraRecentes] = await Promise.all(["},{"nome":"ajuste 4","antes":"    prisma.lead.count({ where: { etapa: \"Perdido\", reativacaoEnviadaEm: { not: null }, NOT: semTelefone } }),\n  ]);","depois":"    prisma.lead.count({ where: { etapa: \"Perdido\", reativacaoEnviadaEm: { not: null }, NOT: semTelefone } }),\n    prisma.lead.count({\n      where: { etapa: \"Perdido\", reativacaoEnviadaEm: null, perdidoEm: { gt: corteEsfriou }, NOT: semTelefone },\n    }),\n  ]);"},{"nome":"ajuste 5","antes":"      jaEnviados: foraJaEnviados,\n    },\n    limiteDiario: config?.reativacaoLimiteDiario ?? 15,","depois":"      jaEnviados: foraJaEnviados,\n      recentes: foraRecentes,\n    },\n    limiteDiario: config?.reativacaoLimiteDiario ?? 15,\n    diasEsfriar,"}]},{"arquivo":"actions/reativacao-perdidos.actions.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"export async function definirLimiteDiarioReativacao(limite: number) {","depois":"/** Quantos dias depois de perdido a pessoa entra na lista (padrao 7). */\nexport async function definirDiasEsfriarReativacao(dias: number) {\n  await requirePermission(\"marketing.gerenciar\");\n  const valor = Math.min(90, Math.max(0, Math.round(Number(dias))));\n  if (!Number.isFinite(valor)) throw new Error(\"Escolha a quantidade de dias.\");\n  const atual = await prisma.configuracaoClinica.findFirst({ select: { id: true } });\n  if (atual) {\n    await prisma.configuracaoClinica.update({ where: { id: atual.id }, data: { reativacaoDiasEsfriar: valor } });\n  } else {\n    await prisma.configuracaoClinica.create({ data: { reativacaoDiasEsfriar: valor } });\n  }\n  revalidar();\n  return { ok: true as const, dias: valor };\n}\n\nexport async function definirLimiteDiarioReativacao(limite: number) {"}]},{"arquivo":"app/(app)/marketing/reativacao/components/ReativacaoClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  definirLimiteDiarioReativacao,","depois":"  definirDiasEsfriarReativacao,\n  definirLimiteDiarioReativacao,"},{"nome":"ajuste 2","antes":"const OPCOES_LIMITE = [5, 10, 15, 20, 30];","depois":"const OPCOES_LIMITE = [5, 10, 15, 20, 30];\nconst OPCOES_ESFRIAR = [3, 5, 7, 10, 15, 30];"},{"nome":"ajuste 3","antes":"  function mudarLimite(valor: number) {","depois":"  function mudarDiasEsfriar(valor: number) {\n    setErro(\"\");\n    iniciar(async () => {\n      try {\n        await definirDiasEsfriarReativacao(valor);\n        router.refresh();\n      } catch (e) {\n        setErro(mensagemErro(e));\n      }\n    });\n  }\n\n  function mudarLimite(valor: number) {"},{"nome":"ajuste 4","antes":"            {dados.foraDaLista.comHorario > 0 ? (\n              <>\n                <strong>{dados.foraDaLista.comHorario}</strong> já têm horário marcado.{\" \"}\n              </>\n            ) : null}","depois":"            {dados.foraDaLista.comHorario > 0 ? (\n              <>\n                <strong>{dados.foraDaLista.comHorario}</strong> já têm horário marcado.{\" \"}\n              </>\n            ) : null}\n            {dados.foraDaLista.recentes > 0 ? (\n              <>\n                <strong>{dados.foraDaLista.recentes}</strong> foram perdidos há menos de {dados.diasEsfriar} dias\n                (ainda quentes, para retorno direto) e entram sozinhos quando completarem {dados.diasEsfriar} dias.{\" \"}\n              </>\n            ) : null}"},{"nome":"ajuste 5","antes":"        <div className=\"mt-4 grid grid-cols-3 gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr] sm:gap-3\">","depois":"        {podeGerenciar ? (\n          <label className=\"mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300\">\n            Mostrar só quem foi perdido há mais de\n            <select\n              value={OPCOES_ESFRIAR.includes(dados.diasEsfriar) ? dados.diasEsfriar : \"\"}\n              onChange={(evento) => mudarDiasEsfriar(Number(evento.target.value))}\n              disabled={pendente}\n              className=\"h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-white/10 dark:bg-slate-900\"\n            >\n              {!OPCOES_ESFRIAR.includes(dados.diasEsfriar) ? <option value=\"\">{dados.diasEsfriar}</option> : null}\n              {OPCOES_ESFRIAR.map((opcao) => (\n                <option key={opcao} value={opcao}>\n                  {opcao} dias\n                </option>\n              ))}\n            </select>\n          </label>\n        ) : null}\n\n        <div className=\"mt-4 grid grid-cols-3 gap-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr] sm:gap-3\">"}]}]};

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
