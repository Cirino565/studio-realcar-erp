#!/usr/bin/env node
/*
 * LEAD DO INSTAGRAM: ESCOLHER A CAMPANHA - Studio Realcar
 *
 * O botao "Lead do Instagram" ganha a lista "Campanha" com as campanhas de
 * Instagram ativas (canal Instagram ou nome comecando com "Instagram").
 * Com mais de uma, e preciso escolher. O lead cai na campanha escolhida,
 * origem Instagram Ads (clique pago). Sem interesse digitado, usa o do nome
 * da campanha ("Instagram | Despigmentacao | WhatsApp" -> Despigmentacao).
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node lead-instagram-escolher-campanha.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{"lib/campanha-instagram.ts":"/**\n * Campanhas de anuncio do Instagram (clique para o WhatsApp), para o botao\n * \"Lead do Instagram\" escolher de qual campanha a pessoa veio.\n */\n\nfunction semAcento(texto?: string | null) {\n  return (texto || \"\")\n    .normalize(\"NFD\")\n    .replace(/[̀-ͯ]/g, \"\")\n    .trim()\n    .toLowerCase();\n}\n\n/** Canal Instagram/Meta/Facebook, ou nome comecando com \"Instagram\". */\nexport function campanhaEhInstagram(campanha: { canal?: string | null; nome?: string | null }) {\n  const canal = semAcento(campanha.canal);\n  return (\n    canal.includes(\"instagram\") ||\n    canal.includes(\"meta\") ||\n    canal.includes(\"facebook\") ||\n    semAcento(campanha.nome).startsWith(\"instagram\")\n  );\n}\n\n/** \"Instagram | Despigmentação | WhatsApp\" -> \"Despigmentação\" (interesse do lead). */\nexport function interesseDaCampanha(nome?: string | null): string | null {\n  const partes = (nome || \"\").split(\"|\").map((parte) => parte.trim()).filter(Boolean);\n  if (partes.length < 2) return null;\n  const meio = partes.filter(\n    (parte) => ![\"instagram\", \"whatsapp\", \"meta\", \"facebook\"].includes(semAcento(parte)),\n  );\n  return meio[0] || null;\n}\n"},"arquivos":[{"arquivo":"actions/lead-instagram.actions.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import { requirePermission } from \"@/lib/auth\";\n","depois":"import { requirePermission } from \"@/lib/auth\";\nimport { campanhaEhInstagram, interesseDaCampanha } from \"@/lib/campanha-instagram\";\n"},{"nome":"ajuste 2","antes":" * Botao \"Lead do Instagram\": quem chamou no WhatsApp pelo anuncio do\n * Instagram (clique pro WhatsApp). A equipe cola o numero e o CRM:\n *  - acha a campanha pelo identificador (utm_campaign) cadastrado nela;","depois":" * Botao \"Lead do Instagram\": quem chamou no WhatsApp pelo anuncio do\n * Instagram (clique pro WhatsApp). A equipe cola o numero, escolhe a\n * campanha (o WhatsApp mostra o anuncio no topo da conversa) e o CRM:\n *  - usa a campanha escolhida (sem escolha: a do identificador abaixo);"},{"nome":"ajuste 3","antes":"export async function registrarLeadInstagram(dados: {\n  telefone: string;\n  nome?: string;\n  interesse?: string;\n}): Promise<ResultadoLeadInstagram> {","depois":"export async function registrarLeadInstagram(dados: {\n  telefone: string;\n  nome?: string;\n  interesse?: string;\n  campanhaId?: number | null;\n}): Promise<ResultadoLeadInstagram> {"},{"nome":"ajuste 4","antes":"  const interesse = (dados.interesse || \"\").trim() || null;\n\n  const campanhas = await prisma.campanhaMarketing.findMany({\n    where: { utmCampaign: { not: null } },\n    select: { id: true, nome: true, utmCampaign: true },\n  });\n  const campanha = campanhas.find(\n    (item) => normalizar(item.utmCampaign) === UTM_CAMPANHA_INSTAGRAM,\n  );\n  if (!campanha) {\n    throw new Error(\n      `Não achei a campanha do Instagram. Em Marketing > Campanhas, edite a campanha do Instagram e preencha o identificador com ${UTM_CAMPANHA_INSTAGRAM}.`,\n    );\n  }\n","depois":"  const campanhaEscolhida = Number(dados.campanhaId) || 0;\n  let campanha: { id: number; nome: string } | null = null;\n  if (campanhaEscolhida > 0) {\n    const achada = await prisma.campanhaMarketing.findUnique({\n      where: { id: campanhaEscolhida },\n      select: { id: true, nome: true, canal: true },\n    });\n    if (!achada || !campanhaEhInstagram(achada)) {\n      throw new Error(\"Essa campanha não é do Instagram. Escolha outra na lista.\");\n    }\n    campanha = { id: achada.id, nome: achada.nome };\n  } else {\n    const campanhas = await prisma.campanhaMarketing.findMany({\n      where: { utmCampaign: { not: null } },\n      select: { id: true, nome: true, utmCampaign: true },\n    });\n    campanha =\n      campanhas.find((item) => normalizar(item.utmCampaign) === UTM_CAMPANHA_INSTAGRAM) ?? null;\n  }\n  if (!campanha) {\n    throw new Error(\"Escolha a campanha do Instagram de onde a pessoa veio.\");\n  }\n  // Sem interesse digitado: usa o procedimento do nome da campanha\n  // (\"Instagram | Despigmentação | WhatsApp\" -> \"Despigmentação\").\n  const interesse = (dados.interesse || \"\").trim() || interesseDaCampanha(campanha.nome);\n"},{"nome":"ajuste 5","antes":"          ...(interesse ? { interesse } : {}),\n          ...(semCampanhaOuEsta ? { campanhaId: campanha.id } : {}),","depois":"          ...((dados.interesse || \"\").trim() && interesse ? { interesse } : {}),\n          ...(semCampanhaOuEsta ? { campanhaId: campanha.id } : {}),"},{"nome":"ajuste 6","antes":"        ? `${ativo.nome} já estava no CRM (${ativo.etapa}). Não criei outro lead: registrei o contato e deixei na campanha do Instagram.`","depois":"        ? `${ativo.nome} já estava no CRM (${ativo.etapa}). Não criei outro lead: registrei o contato e deixei na campanha ${campanha.nome}.`"},{"nome":"ajuste 7","antes":"        mensagem: `${perdido.nome} já tinha um lead marcado como Perdido. Não criei outro: ele voltou para Novo, na campanha do Instagram.`,","depois":"        mensagem: `${perdido.nome} já tinha um lead marcado como Perdido. Não criei outro: ele voltou para Novo, na campanha ${campanha.nome}.`,"},{"nome":"ajuste 8","antes":"        ? `${cliente.nome} já é cliente. Criei a oportunidade ligada ao cadastro dela (sem cadastro novo), na campanha do Instagram.`\n        : `Lead criado: ${nome}, origem Instagram Ads, na campanha do Instagram.`,","depois":"        ? `${cliente.nome} já é cliente. Criei a oportunidade ligada ao cadastro dela (sem cadastro novo), na campanha ${campanha.nome}.`\n        : `Lead criado: ${nome}, origem Instagram Ads, na campanha ${campanha.nome}.`,"}]},{"arquivo":"app/(app)/marketing/components/MarketingClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import { registrarLeadInstagram, type ResultadoLeadInstagram } from \"@/actions/lead-instagram.actions\";\n","depois":"import { registrarLeadInstagram, type ResultadoLeadInstagram } from \"@/actions/lead-instagram.actions\";\nimport { campanhaEhInstagram } from \"@/lib/campanha-instagram\";\n"},{"nome":"ajuste 2","antes":"        <LeadInstagramModal\n          onClose={() => setLeadInstagramAberto(false)}","depois":"        <LeadInstagramModal\n          campanhas={campanhas}\n          onClose={() => setLeadInstagramAberto(false)}"},{"nome":"ajuste 3","antes":"function LeadInstagramModal({ onClose, onSalvo }: { onClose: () => void; onSalvo: () => void }) {\n  const [telefone, setTelefone] = useState(\"\");","depois":"function LeadInstagramModal({ campanhas, onClose, onSalvo }: { campanhas: MarketingCampanha[]; onClose: () => void; onSalvo: () => void }) {\n  // Campanhas de Instagram ativas. Com mais de uma, precisa escolher (nada\n  // marcado de inicio, para o lead nao cair na campanha errada).\n  const opcoesCampanha = useMemo(\n    () =>\n      campanhas\n        .filter((item) => item.status === \"Ativa\" && campanhaEhInstagram(item))\n        .sort((a, b) => a.nome.localeCompare(b.nome, \"pt-BR\")),\n    [campanhas],\n  );\n  const [campanhaId, setCampanhaId] = useState(() =>\n    opcoesCampanha.length === 1 ? String(opcoesCampanha[0].id) : \"\",\n  );\n  const [telefone, setTelefone] = useState(\"\");"},{"nome":"ajuste 4","antes":"        const feito = await registrarLeadInstagram({ telefone, nome, interesse });","depois":"        const feito = await registrarLeadInstagram({ telefone, nome, interesse, campanhaId: Number(campanhaId) });"},{"nome":"ajuste 5","antes":"          <Input label=\"Nome (se souber)\" value={nome} onChange={setNome} placeholder=\"Pode deixar em branco\" />\n          <Input label=\"Interesse (opcional)\" value={interesse} onChange={setInteresse} placeholder=\"Ex.: Limpeza de pele\" />\n          <p className=\"rounded-2xl border border-violet-300/15 bg-violet-400/8 p-3 text-xs leading-5 text-slate-600 dark:text-violet-100\">\n            Entra com origem Instagram Ads (clique pago), na campanha do Instagram. Se o número já estiver no CRM, não cria outro lead: só registra o contato.\n          </p>","depois":"          <label className=\"grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300\">\n            Campanha\n            <select\n              value={campanhaId}\n              onChange={(event) => setCampanhaId(event.target.value)}\n              className=\"premium-input w-full\"\n              required\n            >\n              {opcoesCampanha.length !== 1 ? <option value=\"\">Escolha o anúncio de onde ela veio</option> : null}\n              {opcoesCampanha.map((item) => (\n                <option key={item.id} value={String(item.id)}>{item.nome}</option>\n              ))}\n            </select>\n            {opcoesCampanha.length === 0 ? (\n              <span className=\"text-xs font-normal text-amber-700 dark:text-amber-200\">\n                Nenhuma campanha de Instagram ativa. Cadastre em Campanhas (canal Instagram).\n              </span>\n            ) : null}\n          </label>\n          <Input label=\"Nome (se souber)\" value={nome} onChange={setNome} placeholder=\"Pode deixar em branco\" />\n          <Input label=\"Interesse (opcional)\" value={interesse} onChange={setInteresse} placeholder=\"Se deixar em branco, usa o da campanha\" />\n          <p className=\"rounded-2xl border border-violet-300/15 bg-violet-400/8 p-3 text-xs leading-5 text-slate-600 dark:text-violet-100\">\n            Entra com origem Instagram Ads (clique pago), na campanha escolhida. Se o número já estiver no CRM, não cria outro lead: só registra o contato.\n          </p>"},{"nome":"ajuste 6","antes":"<Button type=\"submit\" disabled={salvando || !telefone.trim()}>{salvando ? \"Lançando...\" : \"Lançar lead\"}</Button>","depois":"<Button type=\"submit\" disabled={salvando || !telefone.trim() || !campanhaId}>{salvando ? \"Lançando...\" : \"Lançar lead\"}</Button>"}]}]};
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
