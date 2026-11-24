#!/usr/bin/env node
/*
 * PIPELINE ENCERRADOS MAIS LIMPO - Studio Realcar
 *
 * Marketing > Pipeline > Encerrados: Convertidos e Perdidos em linhas curtas
 * (nome, interesse, campanha, data), 20 por vez. Perdidos separados em
 * "Para contato" (tem telefone e ainda nao recebeu a ultima mensagem, com
 * botao "Mandar a ultima mensagem") e "Arquivo" (sem telefone ou ja recebeu
 * e nao voltou). Detalhes e WhatsApp continuam em cada linha.
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node pipeline-encerrados-limpo.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/marketing/components/MarketingClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  const total = leads.reduce((acc, lead) => acc + lead.valorPrevisto, 0);\n  const encerrada = etapa === \"Convertido\" || etapa === \"Perdido\";\n  const [quantosVer, setQuantosVer] = useState(LEADS_ENCERRADOS_POR_VEZ);\n  const visiveis = encerrada ? leads.slice(0, quantosVer) : leads;\n  const faltam = leads.length - visiveis.length;","depois":"  const total = leads.reduce((acc, lead) => acc + lead.valorPrevisto, 0);\n  const encerrada = etapa === \"Convertido\" || etapa === \"Perdido\";\n  const [quantosVer, setQuantosVer] = useState(LEADS_ENCERRADOS_POR_VEZ);\n  // Perdidos: \"Para contato\" = tem telefone e ainda nao recebeu a ultima\n  // mensagem (Reativar perdidos). O resto (sem telefone ou ja recebeu e nao\n  // voltou) fica no \"Arquivo\", fora do caminho.\n  const [visaoPerdidos, setVisaoPerdidos] = useState<\"contato\" | \"arquivo\">(\"contato\");\n  const perdidoParaContato = (lead: MarketingLead) =>\n    Boolean((lead.telefone || \"\").replace(/\\D/g, \"\")) && !lead.reativacaoEnviadaEm;\n  const paraContato = etapa === \"Perdido\" ? leads.filter(perdidoParaContato) : leads;\n  const arquivo = etapa === \"Perdido\" ? leads.filter((lead) => !perdidoParaContato(lead)) : [];\n  const daVisao = etapa === \"Perdido\" && visaoPerdidos === \"arquivo\" ? arquivo : paraContato;\n  const visiveis = encerrada ? daVisao.slice(0, quantosVer) : leads;\n  const faltam = daVisao.length - visiveis.length;"},{"nome":"ajuste 2","antes":"      <div className=\"mb-4 rounded-2xl border border-white/[0.08] bg-black/10 px-3 py-2 text-xs text-slate-400\">Valor previsto: <strong className=\"text-slate-100\">{formatarMoeda(total)}</strong></div>\n\n      <div className=\"space-y-3\">\n        {leads.length === 0 ? (\n          <div className=\"rounded-2xl border border-dashed border-white/[0.12] p-4 text-center text-xs text-slate-500\">Nenhum lead nesta etapa.</div>\n        ) : visiveis.map((lead) => (","depois":"      {etapa === \"Perdido\" ? (\n        <div className=\"mb-3 space-y-2\">\n          <div className=\"grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1\" role=\"group\" aria-label=\"Perdidos\">\n            {(\n              [\n                { valor: \"contato\", rotulo: `Para contato (${paraContato.length})` },\n                { valor: \"arquivo\", rotulo: `Arquivo (${arquivo.length})` },\n              ] as const\n            ).map((opcao) => (\n              <button\n                key={opcao.valor}\n                type=\"button\"\n                onClick={() => {\n                  setVisaoPerdidos(opcao.valor);\n                  setQuantosVer(LEADS_ENCERRADOS_POR_VEZ);\n                }}\n                aria-pressed={visaoPerdidos === opcao.valor}\n                className={`h-8 rounded-lg text-xs font-semibold transition ${\n                  visaoPerdidos === opcao.valor ? \"bg-white text-violet-700 shadow-sm\" : \"text-slate-600 hover:text-slate-900\"\n                }`}\n              >\n                {opcao.rotulo}\n              </button>\n            ))}\n          </div>\n          <p className=\"text-[11px] leading-4 text-slate-500\">\n            {visaoPerdidos === \"contato\"\n              ? \"Têm telefone e ainda não receberam a última mensagem.\"\n              : \"Sem telefone ou já receberam a última mensagem e não voltaram.\"}\n          </p>\n          {visaoPerdidos === \"contato\" && paraContato.length > 0 ? (\n            <Link\n              href=\"/marketing/reativacao\"\n              className=\"flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 text-sm font-bold text-white hover:bg-violet-700\"\n            >\n              <MessageCircle className=\"size-4\" /> Mandar a última mensagem\n            </Link>\n          ) : null}\n        </div>\n      ) : (\n        <div className=\"mb-4 rounded-2xl border border-white/[0.08] bg-black/10 px-3 py-2 text-xs text-slate-400\">Valor previsto: <strong className=\"text-slate-100\">{formatarMoeda(total)}</strong></div>\n      )}\n\n      <div className={encerrada ? \"space-y-1.5\" : \"space-y-3\"}>\n        {daVisao.length === 0 ? (\n          <div className=\"rounded-2xl border border-dashed border-white/[0.12] p-4 text-center text-xs text-slate-500\">Nenhum lead nesta etapa.</div>\n        ) : encerrada ? visiveis.map((lead) => (\n          <LinhaLeadEncerrado key={lead.id} lead={lead} onMessage={onMessage} onDetails={onDetails} />\n        )) : visiveis.map((lead) => ("},{"nome":"ajuste 3","antes":"function LeadCard({\n  lead,\n  currentEtapa,","depois":"// Linha curta para Convertidos e Perdidos (lista longa sem rolar tanto).\nfunction LinhaLeadEncerrado({\n  lead,\n  onMessage,\n  onDetails,\n}: {\n  lead: MarketingLead;\n  onMessage: (lead: MarketingLead) => void;\n  onDetails: (lead: MarketingLead) => void;\n}) {\n  const telefone = (lead.telefone || \"\").replace(/\\D/g, \"\");\n  const quando = lead.etapa === \"Perdido\" ? lead.perdidoEm ?? lead.updatedAt : lead.updatedAt;\n  const dataCurta = quando\n    ? new Date(quando).toLocaleDateString(\"pt-BR\", { day: \"2-digit\", month: \"2-digit\", timeZone: \"America/Sao_Paulo\" })\n    : \"\";\n  const extra =\n    lead.etapa === \"Perdido\"\n      ? !telefone\n        ? \"sem telefone\"\n        : lead.reativacaoEnviadaEm\n          ? `última mensagem em ${new Date(lead.reativacaoEnviadaEm).toLocaleDateString(\"pt-BR\", { day: \"2-digit\", month: \"2-digit\", timeZone: \"America/Sao_Paulo\" })}`\n          : lead.motivoPerda || \"\"\n      : \"\";\n\n  return (\n    <div className=\"flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2\">\n      <button type=\"button\" onClick={() => onDetails(lead)} className=\"min-w-0 flex-1 text-left\">\n        <p className=\"truncate text-sm font-semibold text-slate-900\">{lead.nome}</p>\n        <p className=\"truncate text-[11px] text-slate-500\">\n          {[lead.interesse, lead.campanha?.nome || lead.origem, dataCurta, extra].filter(Boolean).join(\" · \")}\n        </p>\n      </button>\n      {telefone ? (\n        <button\n          type=\"button\"\n          onClick={() => onMessage(lead)}\n          aria-label={`WhatsApp de ${lead.nome}`}\n          className=\"inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100\"\n        >\n          <MessageCircle className=\"size-4\" />\n        </button>\n      ) : null}\n      <button\n        type=\"button\"\n        onClick={() => onDetails(lead)}\n        className=\"h-9 shrink-0 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50\"\n      >\n        Detalhes\n      </button>\n    </div>\n  );\n}\n\nfunction LeadCard({\n  lead,\n  currentEtapa,"},{"nome":"ajuste 4","antes":"const LEADS_ENCERRADOS_POR_VEZ = 10;","depois":"const LEADS_ENCERRADOS_POR_VEZ = 20;"}]}]};

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
