#!/usr/bin/env node
/*
 * REATIVAR PERDIDOS: FILTRO POR CAMPANHA E TEXTO NOVO - Studio Realcar
 *
 * Marketing > Reativar perdidos (tela que ja existe): novo filtro "Campanha"
 * (com quantos perdidos tem em cada uma), nome da campanha em cada pessoa da
 * lista e o texto padrao novo da mensagem (continua editavel em "Textos").
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node reativar-perdidos-campanha.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{"prisma/migrations/20261124180000_reativacao_texto_padrao/migration.sql":"-- Reativacao de perdidos: novo texto padrao (continua editavel em \"Textos\").\nINSERT INTO \"MensagemModelo\" (\"chave\", \"nome\", \"categoria\", \"corpo\", \"ativo\", \"ordem\", \"updatedAt\") VALUES\n('reativacao-perdido:padrao', 'Reativação · padrão', 'Reativação de perdidos', E'Oi, {nome}! Tudo bem? 😊 Vi que você se interessou pela nossa {servico} há um tempinho e a gente acabou não conseguindo marcar um horário. Passei só pra dizer que seguimos de portas abertas pra te receber! Se quiser, me conta qual dia e período ficam melhores que eu já separo um horário pra você. Qualquer dúvida, é só me chamar 💛', true, 0, CURRENT_TIMESTAMP)\nON CONFLICT (\"chave\") DO UPDATE SET \"corpo\" = EXCLUDED.\"corpo\", \"ativo\" = true, \"updatedAt\" = CURRENT_TIMESTAMP;\n"},"arquivos":[{"arquivo":"lib/reativacao-perdidos.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"export const TEXTO_PADRAO =\n  \"Oi, {nome}! Tudo bem? 😊 Aqui é do Studio Realçar.\\n\\n\" +\n  \"Um tempo atrás você falou com a gente sobre {servico}. Ainda tem interesse?\\n\\n\" +\n  \"Estamos com horários nesta semana e posso reservar um para você. Me conta qual dia e período (manhã ou tarde) ficam melhores. 💜\";","depois":"export const TEXTO_PADRAO =\n  \"Oi, {nome}! Tudo bem? 😊 Vi que você se interessou pela nossa {servico} há um tempinho e a gente acabou não conseguindo marcar um horário. \" +\n  \"Passei só pra dizer que seguimos de portas abertas pra te receber! \" +\n  \"Se quiser, me conta qual dia e período ficam melhores que eu já separo um horário pra você. Qualquer dúvida, é só me chamar 💛\";"}]},{"arquivo":"lib/reativacao-perdidos-dados.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  origem: string;\n  pagina: number;\n};","depois":"  origem: string;\n  campanha: string;\n  pagina: number;\n};"},{"nome":"ajuste 2","antes":"export type ItemReativacao = {\n  id: number;\n  nome: string;\n  telefone: string;","depois":"export type ItemReativacao = {\n  id: number;\n  nome: string;\n  campanha: string | null;\n  telefone: string;"},{"nome":"ajuste 3","antes":"  origens: Array<{ nome: string; quantidade: number }>;","depois":"  origens: Array<{ nome: string; quantidade: number }>;\n  campanhas: Array<{ id: string; nome: string; quantidade: number }>;"},{"nome":"ajuste 4","antes":"    origem: (params.origem || \"\").trim(),","depois":"    origem: (params.origem || \"\").trim(),\n    campanha: (params.campanha || \"\").trim(),"},{"nome":"ajuste 5","antes":"      prisma.lead.groupBy({ by: [\"origem\"], where: base, _count: { _all: true } }),\n      prisma.configuracaoClinica.findFirst({ select: { reativacaoLimiteDiario: true } }),","depois":"      prisma.lead.groupBy({ by: [\"origem\", \"campanhaId\"], where: base, _count: { _all: true } }),\n      prisma.configuracaoClinica.findFirst({ select: { reativacaoLimiteDiario: true } }),"},{"nome":"ajuste 6","antes":"  const origens = porOrigem\n    .map((grupo) => ({ nome: grupo.origem || \"Sem origem\", quantidade: grupo._count._all }))\n    .sort((a, b) => b.quantidade - a.quantidade);","depois":"  const quantidadePorOrigem = new Map<string, number>();\n  const quantidadePorCampanha = new Map<string, number>();\n  for (const grupo of porOrigem) {\n    const origem = grupo.origem || \"Sem origem\";\n    quantidadePorOrigem.set(origem, (quantidadePorOrigem.get(origem) ?? 0) + grupo._count._all);\n    const campanha = grupo.campanhaId ? String(grupo.campanhaId) : \"sem\";\n    quantidadePorCampanha.set(campanha, (quantidadePorCampanha.get(campanha) ?? 0) + grupo._count._all);\n  }\n  const origens = Array.from(quantidadePorOrigem.entries())\n    .map(([nome, quantidade]) => ({ nome, quantidade }))\n    .sort((a, b) => b.quantidade - a.quantidade);\n\n  // Campanhas de onde vieram os perdidos (filtro \"Campanha\").\n  const idsCampanhas = Array.from(quantidadePorCampanha.keys()).filter((id) => id !== \"sem\").map(Number);\n  const nomesCampanhas = idsCampanhas.length\n    ? await prisma.campanhaMarketing.findMany({ where: { id: { in: idsCampanhas } }, select: { id: true, nome: true } })\n    : [];\n  const nomeCampanha = new Map(nomesCampanhas.map((item) => [item.id, item.nome]));\n  const campanhas = Array.from(quantidadePorCampanha.entries())\n    .map(([id, quantidade]) => ({\n      id,\n      nome: id === \"sem\" ? \"Sem campanha\" : nomeCampanha.get(Number(id)) ?? `Campanha ${id}`,\n      quantidade,\n    }))\n    .sort((a, b) => b.quantidade - a.quantidade);"},{"nome":"ajuste 7","antes":"  if (filtros.origem) {\n    filtrosLista.push(filtros.origem === \"Sem origem\" ? { origem: null } : { origem: filtros.origem });\n  }","depois":"  if (filtros.origem) {\n    filtrosLista.push(filtros.origem === \"Sem origem\" ? { origem: null } : { origem: filtros.origem });\n  }\n  if (filtros.campanha) {\n    filtrosLista.push(\n      filtros.campanha === \"sem\" ? { campanhaId: null } : { campanhaId: Number(filtros.campanha) || -1 },\n    );\n  }"},{"nome":"ajuste 8","antes":"          select: { id: true, nome: true, telefone: true, interesse: true, origem: true, motivoPerda: true, perdidoEm: true },","depois":"          select: {\n            id: true,\n            nome: true,\n            telefone: true,\n            interesse: true,\n            origem: true,\n            motivoPerda: true,\n            perdidoEm: true,\n            campanha: { select: { nome: true } },\n          },"},{"nome":"ajuste 9","antes":"      id: lead.id,\n      nome: lead.nome,\n      telefone: lead.telefone || \"\",","depois":"      id: lead.id,\n      nome: lead.nome,\n      campanha: lead.campanha?.nome ?? null,\n      telefone: lead.telefone || \"\","},{"nome":"ajuste 10","antes":"    origens,\n","depois":"    origens,\n    campanhas,\n"}]},{"arquivo":"app/(app)/marketing/reativacao/components/ReativacaoClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"sm:grid-cols-[1.3fr_1fr_1fr_auto] sm:items-end\">","depois":"sm:grid-cols-2 sm:items-end lg:grid-cols-[1.3fr_1.3fr_1fr_1fr_auto]\">"},{"nome":"ajuste 2","antes":"            <label className=\"grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300\">\n              Perdido em","depois":"            <label className=\"grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300\">\n              Campanha\n              <select value={filtros.campanha} onChange={(evento) => irPara({ campanha: evento.target.value })} className={campo}>\n                <option value=\"\">Todas as campanhas</option>\n                {dados.campanhas.map((item) => (\n                  <option key={item.id} value={item.id}>\n                    {item.nome} ({item.quantidade})\n                  </option>\n                ))}\n              </select>\n            </label>\n            <label className=\"grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300\">\n              Perdido em"},{"nome":"ajuste 3","antes":"            {item.servico || \"Serviço não informado\"} · {item.origem || \"sem origem\"} · perdido em {dataCurta(item.perdidoEm)}","depois":"            {item.servico || \"Serviço não informado\"} · {item.origem || \"sem origem\"} · perdido em {dataCurta(item.perdidoEm)}\n            {item.campanha ? ` · ${item.campanha}` : \"\"}"}]}]};

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
