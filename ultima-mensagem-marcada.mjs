#!/usr/bin/env node
/*
 * ULTIMA MENSAGEM PARA PERDIDOS FICA MARCADA - Studio Realcar
 *
 * Marketing > Encerrados > Perdidos > Arquivo agora em 3 partes: "Falta a
 * ultima" (tem telefone, ja recebeu a reativacao), "Ja recebeu a ultima" e
 * "Sem telefone". Mandar pelo botao do WhatsApp no Arquivo marca na hora e o
 * botao fica cinza (nao manda de novo). Botao "Ja mandei para todos estes"
 * para marcar de uma vez quem ja recebeu. Quem recebeu a ultima nao volta
 * para nenhuma lista de envio. Cria 1 coluna em Lead (migracao automatica).
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node ultima-mensagem-marcada.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{"prisma/migrations/20261124200000_lead_ultima_mensagem/migration.sql":"-- Ultima mensagem para perdido (Arquivo do pipeline): nao manda de novo.\nALTER TABLE \"Lead\" ADD COLUMN IF NOT EXISTS \"ultimaMensagemEm\" TIMESTAMP(3);\n"},"arquivos":[{"arquivo":"prisma/schema.prisma","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  reativacaoEnviadaEm   DateTime?","depois":"  reativacaoEnviadaEm   DateTime?\n  // \"Ultima das ultimas\" mensagem para perdido (Arquivo): nao manda de novo.\n  ultimaMensagemEm      DateTime?"}]},{"arquivo":"actions/reativacao-perdidos.actions.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"/** Quantos dias depois de perdido a pessoa entra na lista (padrao 7). */","depois":"/**\n * Marca que o perdido recebeu a ULTIMA mensagem (pelo Arquivo do pipeline).\n * Depois disso o botao fica cinza e ele nao entra mais em nenhuma lista de\n * envio. Serve para um lead ou para varios de uma vez.\n */\nexport async function marcarUltimaMensagemPerdidos(leadIds: number[]) {\n  await requirePermission(\"marketing.gerenciar\");\n  const ids = Array.from(new Set((leadIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))).slice(0, 2000);\n  if (ids.length === 0) return { ok: true as const, marcados: 0 };\n\n  const agora = new Date();\n  const pendentes = await prisma.lead.findMany({\n    where: { id: { in: ids }, ultimaMensagemEm: null },\n    select: { id: true },\n  });\n  if (pendentes.length > 0) {\n    const idsPendentes = pendentes.map((item) => item.id);\n    await prisma.$transaction([\n      prisma.lead.updateMany({ where: { id: { in: idsPendentes } }, data: { ultimaMensagemEm: agora } }),\n      prisma.leadInteracao.createMany({\n        data: idsPendentes.map((leadId) => ({\n          leadId,\n          tipo: \"Reativação\",\n          descricao: \"Última mensagem enviada pelo WhatsApp (arquivo). Não enviar de novo.\",\n        })),\n      }),\n    ]);\n  }\n\n  revalidar();\n  return { ok: true as const, marcados: pendentes.length };\n}\n\n/** Quantos dias depois de perdido a pessoa entra na lista (padrao 7). */"}]},{"arquivo":"lib/reativacao-perdidos-dados.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"    etapa: \"Perdido\",\n    reativacaoEnviadaEm: null,\n    telefone: { not: null },\n    ...jaEsfriou,","depois":"    etapa: \"Perdido\",\n    reativacaoEnviadaEm: null,\n    ultimaMensagemEm: null,\n    telefone: { not: null },\n    ...jaEsfriou,"}]},{"arquivo":"app/(app)/marketing/components/MarketingClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import { registrarLeadInstagram, type ResultadoLeadInstagram } from \"@/actions/lead-instagram.actions\";","depois":"import { registrarLeadInstagram, type ResultadoLeadInstagram } from \"@/actions/lead-instagram.actions\";\nimport { marcarUltimaMensagemPerdidos } from \"@/actions/reativacao-perdidos.actions\";"},{"nome":"ajuste 2","antes":"  const [visaoPerdidos, setVisaoPerdidos] = useState<\"contato\" | \"arquivo\">(\"contato\");\n  const perdidoParaContato = (lead: MarketingLead) =>\n    Boolean((lead.telefone || \"\").replace(/\\D/g, \"\")) && !lead.reativacaoEnviadaEm;\n  const paraContato = etapa === \"Perdido\" ? leads.filter(perdidoParaContato) : leads;\n  const arquivo = etapa === \"Perdido\" ? leads.filter((lead) => !perdidoParaContato(lead)) : [];\n  const daVisao = etapa === \"Perdido\" && visaoPerdidos === \"arquivo\" ? arquivo : paraContato;","depois":"  const [visaoPerdidos, setVisaoPerdidos] = useState<\"contato\" | \"arquivo\">(\"contato\");\n  // Arquivo em 3 partes: falta a ultima mensagem / ja recebeu tudo / sem telefone.\n  const [parteArquivo, setParteArquivo] = useState<\"pendente\" | \"enviada\" | \"semTelefone\">(\"pendente\");\n  const [marcadosAgora, setMarcadosAgora] = useState<Record<number, string>>({});\n  const [marcandoTodos, setMarcandoTodos] = useState(false);\n  const temTelefone = (lead: MarketingLead) => Boolean((lead.telefone || \"\").replace(/\\D/g, \"\"));\n  const ultimaEm = (lead: MarketingLead) =>\n    marcadosAgora[lead.id] ?? (lead.ultimaMensagemEm ? new Date(lead.ultimaMensagemEm).toISOString() : null);\n  const perdidoParaContato = (lead: MarketingLead) => temTelefone(lead) && !lead.reativacaoEnviadaEm && !ultimaEm(lead);\n  const paraContato = etapa === \"Perdido\" ? leads.filter(perdidoParaContato) : leads;\n  const arquivo = etapa === \"Perdido\" ? leads.filter((lead) => !perdidoParaContato(lead)) : [];\n  const arquivoPendente = arquivo.filter((lead) => temTelefone(lead) && !ultimaEm(lead));\n  const arquivoEnviada = arquivo.filter((lead) => Boolean(ultimaEm(lead)));\n  const arquivoSemTelefone = arquivo.filter((lead) => !temTelefone(lead) && !ultimaEm(lead));\n  const daVisao =\n    etapa === \"Perdido\" && visaoPerdidos === \"arquivo\"\n      ? parteArquivo === \"pendente\"\n        ? arquivoPendente\n        : parteArquivo === \"enviada\"\n          ? arquivoEnviada\n          : arquivoSemTelefone\n      : paraContato;\n\n  function marcarUltima(ids: number[]) {\n    const agora = new Date().toISOString();\n    setMarcadosAgora((atual) => ({ ...atual, ...Object.fromEntries(ids.map((id) => [id, agora])) }));\n    return marcarUltimaMensagemPerdidos(ids);\n  }"},{"nome":"ajuste 3","antes":"          <p className=\"text-[11px] leading-4 text-slate-500\">\n            {visaoPerdidos === \"contato\"\n              ? \"Têm telefone e ainda não receberam a última mensagem.\"\n              : \"Sem telefone ou já receberam a última mensagem e não voltaram.\"}\n          </p>","depois":"          {visaoPerdidos === \"arquivo\" ? (\n            <div className=\"flex flex-wrap gap-1.5\">\n              {(\n                [\n                  { valor: \"pendente\", rotulo: `Falta a última (${arquivoPendente.length})` },\n                  { valor: \"enviada\", rotulo: `Já recebeu a última (${arquivoEnviada.length})` },\n                  { valor: \"semTelefone\", rotulo: `Sem telefone (${arquivoSemTelefone.length})` },\n                ] as const\n              ).map((opcao) => (\n                <button\n                  key={opcao.valor}\n                  type=\"button\"\n                  onClick={() => {\n                    setParteArquivo(opcao.valor);\n                    setQuantosVer(LEADS_ENCERRADOS_POR_VEZ);\n                  }}\n                  aria-pressed={parteArquivo === opcao.valor}\n                  className={`h-7 rounded-full border px-2.5 text-[11px] font-semibold ${\n                    parteArquivo === opcao.valor\n                      ? \"border-violet-600 bg-violet-600 text-white\"\n                      : \"border-slate-200 bg-white text-slate-600 hover:border-violet-300\"\n                  }`}\n                >\n                  {opcao.rotulo}\n                </button>\n              ))}\n            </div>\n          ) : null}\n          <p className=\"text-[11px] leading-4 text-slate-500\">\n            {visaoPerdidos === \"contato\"\n              ? \"Têm telefone e ainda não receberam a mensagem de reativação.\"\n              : parteArquivo === \"pendente\"\n                ? \"Já receberam a reativação e não voltaram. Mandou a última pelo botão do WhatsApp? Ela fica marcada e o botão fica cinza.\"\n                : parteArquivo === \"enviada\"\n                  ? \"Já receberam a última mensagem. Não mandar de novo.\"\n                  : \"Sem telefone: não dá para mandar mensagem.\"}\n          </p>\n          {visaoPerdidos === \"arquivo\" && parteArquivo === \"pendente\" && arquivoPendente.length > 0 && podeGerenciarMarketing ? (\n            <button\n              type=\"button\"\n              disabled={marcandoTodos}\n              onClick={async () => {\n                if (!window.confirm(`Marcar os ${arquivoPendente.length} desta lista como \"já recebeu a última mensagem\"? Use se você já mandou para todos.`)) return;\n                setMarcandoTodos(true);\n                try {\n                  await marcarUltima(arquivoPendente.map((lead) => lead.id));\n                } finally {\n                  setMarcandoTodos(false);\n                }\n              }}\n              className=\"h-9 w-full rounded-xl border border-violet-200 bg-white px-3 text-xs font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50\"\n            >\n              {marcandoTodos ? \"Marcando...\" : `Já mandei para todos estes (${arquivoPendente.length})`}\n            </button>\n          ) : null}"},{"nome":"ajuste 4","antes":"        ) : encerrada ? visiveis.map((lead) => (\n          <LinhaLeadEncerrado key={lead.id} lead={lead} onMessage={onMessage} onDetails={onDetails} />\n        )) : visiveis.map((lead) => (","depois":"        ) : encerrada ? visiveis.map((lead) => (\n          <LinhaLeadEncerrado\n            key={lead.id}\n            lead={lead}\n            onMessage={(item) => {\n              // No Arquivo, mandar pelo WhatsApp ja marca como \"ultima mensagem\".\n              if (etapa === \"Perdido\" && visaoPerdidos === \"arquivo\" && podeGerenciarMarketing) {\n                void marcarUltima([item.id]).catch(() => undefined);\n              }\n              onMessage(item);\n            }}\n            onDetails={onDetails}\n            ultimaEnviadaEm={etapa === \"Perdido\" ? ultimaEm(lead) : null}\n          />\n        )) : visiveis.map((lead) => ("},{"nome":"ajuste 5","antes":"function LinhaLeadEncerrado({\n  lead,\n  onMessage,\n  onDetails,\n}: {\n  lead: MarketingLead;\n  onMessage: (lead: MarketingLead) => void;\n  onDetails: (lead: MarketingLead) => void;\n}) {","depois":"function LinhaLeadEncerrado({\n  lead,\n  onMessage,\n  onDetails,\n  ultimaEnviadaEm,\n}: {\n  lead: MarketingLead;\n  onMessage: (lead: MarketingLead) => void;\n  onDetails: (lead: MarketingLead) => void;\n  ultimaEnviadaEm?: string | null;\n}) {"},{"nome":"ajuste 6","antes":"  const extra =\n    lead.etapa === \"Perdido\"\n      ? !telefone\n        ? \"sem telefone\"\n        : lead.reativacaoEnviadaEm","depois":"  const extra =\n    lead.etapa === \"Perdido\"\n      ? ultimaEnviadaEm\n        ? `última enviada em ${new Date(ultimaEnviadaEm).toLocaleDateString(\"pt-BR\", { day: \"2-digit\", month: \"2-digit\", timeZone: \"America/Sao_Paulo\" })}`\n        : !telefone\n        ? \"sem telefone\"\n        : lead.reativacaoEnviadaEm"},{"nome":"ajuste 7","antes":"      {telefone ? (\n        <button\n          type=\"button\"\n          onClick={() => onMessage(lead)}\n          aria-label={`WhatsApp de ${lead.nome}`}\n          className=\"inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100\"\n        >\n          <MessageCircle className=\"size-4\" />\n        </button>\n      ) : null}","depois":"      {telefone && ultimaEnviadaEm ? (\n        <span\n          title=\"Já recebeu a última mensagem\"\n          className=\"inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400\"\n        >\n          <CheckCircle2 className=\"size-4\" />\n        </span>\n      ) : telefone ? (\n        <button\n          type=\"button\"\n          onClick={() => onMessage(lead)}\n          aria-label={`WhatsApp de ${lead.nome}`}\n          className=\"inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100\"\n        >\n          <MessageCircle className=\"size-4\" />\n        </button>\n      ) : null}"}]}]};

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
