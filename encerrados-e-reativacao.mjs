#!/usr/bin/env node
/*
 * ENCERRADOS MAIS CURTOS + "POR QUE NAO APARECE" NA REATIVACAO - Studio Realcar
 *
 * 1) Marketing > Encerrados: cada coluna (Convertido / Perdido) mostra so os
 *    10 mais recentes, com "Mostrar mais" e "Recolher". A busca acha todos.
 * 2) Reativar perdidos: mostra quantos perdidos existem e por que parte deles
 *    nao aparece (sem telefone, ja receberam, ja tem horario).
 *
 * Nao mexe no banco. Precisa ter rodado antes o reativacao-perdidos.mjs.
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e gravado.
 *
 * Uso: node encerrados-e-reativacao.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/marketing/components/MarketingClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"function PipelineColumn({\n  etapa,","depois":"// Encerrados (convertidos e perdidos) mostram so os mais recentes; o resto\n// aparece no \"Mostrar mais\". A busca continua achando todos.\nconst LEADS_ENCERRADOS_POR_VEZ = 10;\n\nfunction PipelineColumn({\n  etapa,"},{"nome":"ajuste 2","antes":"  const total = leads.reduce((acc, lead) => acc + lead.valorPrevisto, 0);\n\n  return (\n    <div className=\"min-h-[20rem]","depois":"  const total = leads.reduce((acc, lead) => acc + lead.valorPrevisto, 0);\n  const encerrada = etapa === \"Convertido\" || etapa === \"Perdido\";\n  const [quantosVer, setQuantosVer] = useState(LEADS_ENCERRADOS_POR_VEZ);\n  const visiveis = encerrada ? leads.slice(0, quantosVer) : leads;\n  const faltam = leads.length - visiveis.length;\n\n  return (\n    <div className=\"min-h-[20rem]"},{"nome":"ajuste 3","antes":"        ) : leads.map((lead) => (\n          <LeadCard\n            key={lead.id}\n            lead={lead}\n            currentEtapa={etapa}\n            onEtapaChange={onEtapaChange}\n            onChamouWhatsappChange={onChamouWhatsappChange}\n            onMessage={onMessage}\n            onDetails={onDetails}\n            onSchedule={onSchedule}\n            onConvert={onConvert}\n            isPending={isPending}\n            podeGerenciarMarketing={podeGerenciarMarketing}\n            podeGerenciarAgenda={podeGerenciarAgenda}\n          />\n        ))}\n      </div>\n    </div>\n  );\n}","depois":"        ) : visiveis.map((lead) => (\n          <LeadCard\n            key={lead.id}\n            lead={lead}\n            currentEtapa={etapa}\n            onEtapaChange={onEtapaChange}\n            onChamouWhatsappChange={onChamouWhatsappChange}\n            onMessage={onMessage}\n            onDetails={onDetails}\n            onSchedule={onSchedule}\n            onConvert={onConvert}\n            isPending={isPending}\n            podeGerenciarMarketing={podeGerenciarMarketing}\n            podeGerenciarAgenda={podeGerenciarAgenda}\n          />\n        ))}\n      </div>\n\n      {encerrada && (faltam > 0 || quantosVer > LEADS_ENCERRADOS_POR_VEZ) ? (\n        <div className=\"mt-3 flex flex-col gap-2 sm:flex-row\">\n          {faltam > 0 ? (\n            <button\n              type=\"button\"\n              onClick={() => setQuantosVer((atual) => atual + LEADS_ENCERRADOS_POR_VEZ)}\n              className=\"flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800\"\n            >\n              Mostrar mais {Math.min(LEADS_ENCERRADOS_POR_VEZ, faltam)} (faltam {faltam})\n            </button>\n          ) : null}\n          {quantosVer > LEADS_ENCERRADOS_POR_VEZ ? (\n            <button\n              type=\"button\"\n              onClick={() => setQuantosVer(LEADS_ENCERRADOS_POR_VEZ)}\n              className=\"rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800\"\n            >\n              Recolher\n            </button>\n          ) : null}\n        </div>\n      ) : null}\n    </div>\n  );\n}"}]},{"arquivo":"lib/reativacao-perdidos-dados.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  resumo: { enviadas: number; responderam: number; voltaram: number; enviadasHoje: number };","depois":"  resumo: { enviadas: number; responderam: number; voltaram: number; enviadasHoje: number };\n  // Por que nem todo Perdido aparece na lista.\n  foraDaLista: { perdidos: number; semTelefone: number; comHorario: number; jaEnviados: number };"},{"nome":"ajuste 2","antes":"  const [servicosCadastrados, porInteresse, porOrigem, config, enviadasHoje, ultimoEnvio, modelosSalvos] =\n    await Promise.all([","depois":"  const semTelefone: Prisma.LeadWhereInput = { OR: [{ telefone: null }, { telefone: \"\" }] };\n  const comHorarioFuturo: Prisma.LeadWhereInput = {\n    cliente: { is: { agendamentos: { some: { data: { gt: agora }, status: { notIn: [\"Cancelado\", \"Faltou\"] } } } } },\n  };\n\n  const [foraPerdidos, foraSemTelefone, foraComHorario, foraJaEnviados] = await Promise.all([\n    prisma.lead.count({ where: { etapa: \"Perdido\" } }),\n    prisma.lead.count({ where: { etapa: \"Perdido\", ...semTelefone } }),\n    prisma.lead.count({ where: { AND: [{ etapa: \"Perdido\", reativacaoEnviadaEm: null }, { NOT: semTelefone }, comHorarioFuturo] } }),\n    prisma.lead.count({ where: { etapa: \"Perdido\", reativacaoEnviadaEm: { not: null }, NOT: semTelefone } }),\n  ]);\n\n  const [servicosCadastrados, porInteresse, porOrigem, config, enviadasHoje, ultimoEnvio, modelosSalvos] =\n    await Promise.all(["},{"nome":"ajuste 3","antes":"    resumo: { enviadas: enviadasTodas.length, responderam, voltaram, enviadasHoje },","depois":"    resumo: { enviadas: enviadasTodas.length, responderam, voltaram, enviadasHoje },\n    foraDaLista: {\n      perdidos: foraPerdidos,\n      semTelefone: foraSemTelefone,\n      comHorario: foraComHorario,\n      jaEnviados: foraJaEnviados,\n    },"}]},{"arquivo":"app/(app)/marketing/reativacao/components/ReativacaoClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"          Mande aos poucos, dentro do limite do dia, para o WhatsApp não entender como spam.\n        </p>","depois":"          Mande aos poucos, dentro do limite do dia, para o WhatsApp não entender como spam.\n        </p>\n        {dados.foraDaLista.perdidos > 0 ? (\n          <p className=\"mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 dark:bg-white/[0.04] dark:text-slate-300\">\n            Você tem <strong>{dados.foraDaLista.perdidos}</strong> perdidos no total.{\" \"}\n            {dados.foraDaLista.semTelefone > 0 ? (\n              <>\n                <strong>{dados.foraDaLista.semTelefone}</strong> não têm telefone (clicaram no anúncio mas não mandaram\n                mensagem), então não dá para enviar.{\" \"}\n              </>\n            ) : null}\n            {dados.foraDaLista.jaEnviados > 0 ? (\n              <>\n                <strong>{dados.foraDaLista.jaEnviados}</strong> já receberam.{\" \"}\n              </>\n            ) : null}\n            {dados.foraDaLista.comHorario > 0 ? (\n              <>\n                <strong>{dados.foraDaLista.comHorario}</strong> já têm horário marcado.{\" \"}\n              </>\n            ) : null}\n            Convertidos não entram, porque já são clientes.\n          </p>\n        ) : null}"}]}]};
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
