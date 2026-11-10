#!/usr/bin/env node
/*
 * QUEM VEIO DO ANUNCIO (SEM O ORGANICO) - Studio Realcar
 *
 *  - Cartao da campanha: linha "Do anuncio ate hoje: X fecharam, Y agendados,
 *    Z em conversa" (so clique pago). Clicando, abre a lista de cada pessoa,
 *    separada em Fecharam / Agendados / Em conversa / Perdidos.
 *  - Pipeline: filtro por campanha ("... so anuncio"), que mostra so quem
 *    veio de clique pago daquela campanha, separado por etapa.
 * Usa os dados que a tela ja carrega (nenhuma consulta nova ao banco).
 *
 * Nao muda o banco. Pode rodar mais de uma vez; se algum trecho nao for
 * encontrado, NADA e gravado.
 *
 * Uso: node anuncio-pessoas-e-filtro.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/marketing/components/MarketingClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  const [origemFiltro, setOrigemFiltro] = useState(\"todas\");\n  const [erro, setErro] = useState<string | null>(null);","depois":"  const [origemFiltro, setOrigemFiltro] = useState(\"todas\");\n  // Filtro por campanha: so quem veio de clique pago daquela campanha.\n  const [campanhaFiltro, setCampanhaFiltro] = useState(\"todas\");\n  const [erro, setErro] = useState<string | null>(null);"},{"nome":"ajuste 2","antes":"      const matchesOrigem =\n        origemFiltro === \"todas\" ||\n        lead.origem === origemFiltro;\n","depois":"      const matchesOrigem =\n        origemFiltro === \"todas\" ||\n        lead.origem === origemFiltro;\n      const matchesCampanha =\n        campanhaFiltro === \"todas\" ||\n        (lead.cliquePago && String(lead.campanhaId ?? \"\") === campanhaFiltro);\n"},{"nome":"ajuste 3","antes":"        matchesEtapa &&\n        matchesOrigem &&\n        matchesModo\n      );\n    });\n  }, [\n    busca,\n    etapaFiltro,\n    leads,\n    origemFiltro,\n    pipelineModo,\n  ]);","depois":"        matchesEtapa &&\n        matchesOrigem &&\n        matchesCampanha &&\n        matchesModo\n      );\n    });\n  }, [\n    busca,\n    campanhaFiltro,\n    etapaFiltro,\n    leads,\n    origemFiltro,\n    pipelineModo,\n  ]);"},{"nome":"ajuste 4","antes":"            <div className=\"grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.9fr] xl:min-w-0 xl:flex-1\">","depois":"            <div className=\"grid gap-3 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1fr] xl:min-w-0 xl:flex-1\">"},{"nome":"ajuste 5","antes":"              <select value={origemFiltro} onChange={(event) => setOrigemFiltro(event.target.value)} className=\"premium-input h-11 w-full bg-[#1d2437]\">\n                <option value=\"todas\">Todas as origens</option>\n                {origens.map((origem) => <option key={origem} value={origem}>{origem}</option>)}\n              </select>","depois":"              <select value={origemFiltro} onChange={(event) => setOrigemFiltro(event.target.value)} className=\"premium-input h-11 w-full bg-[#1d2437]\">\n                <option value=\"todas\">Todas as origens</option>\n                {origens.map((origem) => <option key={origem} value={origem}>{origem}</option>)}\n              </select>\n\n              <select\n                value={campanhaFiltro}\n                onChange={(event) => setCampanhaFiltro(event.target.value)}\n                title=\"Mostra só quem veio de clique pago desta campanha (sem o orgânico)\"\n                className=\"premium-input h-11 w-full bg-[#1d2437]\"\n              >\n                <option value=\"todas\">Todas as campanhas</option>\n                {campanhas.map((campanha) => (\n                  <option key={campanha.id} value={String(campanha.id)}>\n                    {campanha.nome} · só anúncio\n                  </option>\n                ))}\n              </select>"},{"nome":"ajuste 6","antes":"<CampanhasView campanhas={campanhas} leads={leads} clientes={clientes}","depois":"<CampanhasView onAbrirLead={setDetalhesModal} campanhas={campanhas} leads={leads} clientes={clientes}"},{"nome":"ajuste 7","antes":"  movimentos,\n  onDelete,\n  onEditar,\n  isPending,\n  podeGerenciar,\n}: {\n  campanhas: MarketingCampanha[];\n  leads: MarketingLead[];","depois":"  movimentos,\n  onDelete,\n  onEditar,\n  isPending,\n  podeGerenciar,\n  onAbrirLead,\n}: {\n  onAbrirLead: (lead: MarketingLead) => void;\n  campanhas: MarketingCampanha[];\n  leads: MarketingLead[];"},{"nome":"ajuste 8","antes":"  // Lista do que compoe o \"Entrou\" (abre ao clicar no valor).\n  const [detalheReceita, setDetalheReceita] = useState<MarketingCampanha | null>(null);","depois":"  // Lista do que compoe o \"Entrou\" (abre ao clicar no valor).\n  const [detalheReceita, setDetalheReceita] = useState<MarketingCampanha | null>(null);\n  // Pessoas que vieram do anuncio (so clique pago), por situacao.\n  const [pessoasCampanha, setPessoasCampanha] = useState<MarketingCampanha | null>(null);\n  const funilPorCampanha = useMemo(() => {\n    const mapa = new Map<number, { fecharam: number; agendados: number; conversa: number; perdidos: number }>();\n    for (const lead of leads) {\n      if (!lead.cliquePago || !lead.campanhaId) continue;\n      const atual = mapa.get(lead.campanhaId) ?? { fecharam: 0, agendados: 0, conversa: 0, perdidos: 0 };\n      if (lead.etapa === \"Convertido\") atual.fecharam += 1;\n      else if (lead.etapa === \"Agendado\") atual.agendados += 1;\n      else if (lead.etapa === \"Perdido\") atual.perdidos += 1;\n      else atual.conversa += 1;\n      mapa.set(lead.campanhaId, atual);\n    }\n    return mapa;\n  }, [leads]);"},{"nome":"ajuste 9","antes":"                onVerReceita={() => setDetalheReceita(campanha)}\n                onExcluir={() => onDelete(campanha.id)}\n              />","depois":"                onVerReceita={() => setDetalheReceita(campanha)}\n                funil={funilPorCampanha.get(campanha.id)}\n                onVerPessoas={() => setPessoasCampanha(campanha)}\n                onExcluir={() => onDelete(campanha.id)}\n              />"},{"nome":"ajuste 10","antes":"      <ReceitaDetalheModal\n        key={detalheReceita?.id ?? \"fechado\"}","depois":"      {pessoasCampanha ? (\n        <PessoasCampanhaModal\n          campanha={pessoasCampanha}\n          leads={leads.filter((lead) => lead.cliquePago && lead.campanhaId === pessoasCampanha.id)}\n          onClose={() => setPessoasCampanha(null)}\n          onAbrirLead={(lead) => {\n            setPessoasCampanha(null);\n            onAbrirLead(lead);\n          }}\n        />\n      ) : null}\n      <ReceitaDetalheModal\n        key={detalheReceita?.id ?? \"fechado\"}"},{"nome":"ajuste 11","antes":"function CartaoCampanha({ campanha, m, podeGerenciar, disabled, onEditar, onVincularCliente, onLancarCusto, onVincularReceita, onVerReceita, onExcluir }: {","depois":"function CartaoCampanha({ campanha, m, podeGerenciar, disabled, onEditar, onVincularCliente, onLancarCusto, onVincularReceita, onVerReceita, funil, onVerPessoas, onExcluir }: {\n  funil?: { fecharam: number; agendados: number; conversa: number; perdidos: number };\n  onVerPessoas: () => void;"},{"nome":"ajuste 12","antes":"      {m.clientesSoPagina > 0 || m.leadsSoPagina > 0 || m.receitaSoPagina > 0 ? (\n        <p className=\"rounded-xl bg-slate-100 px-3 py-2 text-[11px] leading-4 text-slate-600 dark:bg-white/[0.06] dark:text-slate-400\" title=\"Caíram na página","depois":"      {funil ? (\n        <button\n          type=\"button\"\n          onClick={onVerPessoas}\n          title=\"Ver cada pessoa que veio do anúncio e a situação dela\"\n          className=\"flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-violet-300/20 bg-violet-400/8 px-3 py-2 text-left text-xs text-slate-300 transition hover:bg-violet-400/15\"\n        >\n          <span className=\"font-semibold text-violet-200\">Do anúncio até hoje:</span>\n          <span><strong className=\"text-emerald-300\">{funil.fecharam}</strong> fecharam</span>\n          <span><strong className=\"text-sky-300\">{funil.agendados}</strong> agendados</span>\n          <span><strong className=\"text-white\">{funil.conversa}</strong> em conversa</span>\n          {funil.perdidos > 0 ? <span><strong className=\"text-slate-400\">{funil.perdidos}</strong> perdidos</span> : null}\n          <span className=\"ml-auto font-semibold text-violet-200 underline decoration-dotted underline-offset-4\">Ver pessoas</span>\n        </button>\n      ) : null}\n\n      {m.clientesSoPagina > 0 || m.leadsSoPagina > 0 || m.receitaSoPagina > 0 ? (\n        <p className=\"rounded-xl bg-slate-100 px-3 py-2 text-[11px] leading-4 text-slate-600 dark:bg-white/[0.06] dark:text-slate-400\" title=\"Caíram na página"},{"nome":"ajuste 13","antes":"function ReceitaDetalheModal({","depois":"const GRUPOS_PESSOAS: Array<{ chave: \"fecharam\" | \"agendados\" | \"conversa\" | \"perdidos\"; titulo: string; descricao: string; cor: string }> = [\n  { chave: \"fecharam\", titulo: \"Fecharam\", descricao: \"Foram atendidas e pagaram\", cor: \"text-emerald-600 dark:text-emerald-300\" },\n  { chave: \"agendados\", titulo: \"Agendados\", descricao: \"Marcaram e ainda não foram atendidas\", cor: \"text-sky-600 dark:text-sky-300\" },\n  { chave: \"conversa\", titulo: \"Em conversa\", descricao: \"Chamaram, ainda sem horário\", cor: \"text-slate-800 dark:text-white\" },\n  { chave: \"perdidos\", titulo: \"Perdidos\", descricao: \"Desistiram\", cor: \"text-slate-500\" },\n];\n\nfunction grupoDoLead(lead: MarketingLead) {\n  if (lead.etapa === \"Convertido\") return \"fecharam\";\n  if (lead.etapa === \"Agendado\") return \"agendados\";\n  if (lead.etapa === \"Perdido\") return \"perdidos\";\n  return \"conversa\";\n}\n\nfunction PessoasCampanhaModal({ campanha, leads, onClose, onAbrirLead }: {\n  campanha: MarketingCampanha;\n  leads: MarketingLead[];\n  onClose: () => void;\n  onAbrirLead: (lead: MarketingLead) => void;\n}) {\n  const ordenados = [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());\n  const porGrupo = new Map(GRUPOS_PESSOAS.map((grupo) => [grupo.chave, ordenados.filter((lead) => grupoDoLead(lead) === grupo.chave)]));\n  const fecharam = porGrupo.get(\"fecharam\")?.length ?? 0;\n  const agendados = porGrupo.get(\"agendados\")?.length ?? 0;\n\n  return (\n    <Modal\n      title=\"Quem veio do anúncio\"\n      description={`${campanha.nome} · só clique pago (sem o orgânico)`}\n      onClose={onClose}\n      wide\n    >\n      <div className=\"grid gap-4\">\n        <div className=\"rounded-2xl border border-emerald-300/15 bg-emerald-400/8 p-3 text-sm leading-5 text-emerald-100\">\n          O anúncio já trouxe <strong>{fecharam + agendados}</strong> {fecharam + agendados === 1 ? \"cliente\" : \"clientes\"}: {fecharam} {fecharam === 1 ? \"fechou\" : \"fecharam\"} e {agendados} {agendados === 1 ? \"está agendada\" : \"estão agendadas\"}. Ao todo, {leads.length} {leads.length === 1 ? \"pessoa chamou\" : \"pessoas chamaram\"} pelo anúncio.\n        </div>\n\n        {leads.length === 0 ? (\n          <p className=\"rounded-2xl border border-white/[0.10] bg-white/[0.04] p-6 text-center text-sm text-slate-500\">\n            Ninguém com clique pago nesta campanha ainda.\n          </p>\n        ) : (\n          GRUPOS_PESSOAS.map((grupo) => {\n            const lista = porGrupo.get(grupo.chave) ?? [];\n            if (lista.length === 0) return null;\n            return (\n              <section key={grupo.chave}>\n                <h3 className={`text-sm font-bold ${grupo.cor}`}>\n                  {grupo.titulo} ({lista.length})\n                  <span className=\"ml-2 text-xs font-normal text-slate-500\">{grupo.descricao}</span>\n                </h3>\n                <ul className=\"mt-2 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.10]\">\n                  {lista.map((lead) => (\n                    <li key={lead.id}>\n                      <button\n                        type=\"button\"\n                        onClick={() => onAbrirLead(lead)}\n                        className=\"flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-left hover:bg-white/[0.05]\"\n                      >\n                        <span className=\"min-w-0\">\n                          <span className=\"text-sm font-semibold text-slate-900 dark:text-white\">{lead.cliente?.nome || lead.nome}</span>\n                          <span className=\"ml-2 text-xs text-slate-500\">chamou em {formatarData(lead.createdAt)}</span>\n                        </span>\n                        <span className=\"text-xs text-slate-500\">\n                          {lead.etapa === \"Agendado\" && lead.agendamento\n                            ? `${formatarData(lead.agendamento.data)} · ${lead.agendamento.procedimento}`\n                            : lead.etapa}\n                          {lead.receitaRastreada > 0 ? ` · ${formatarMoeda(lead.receitaRastreada)}` : \"\"}\n                        </span>\n                      </button>\n                    </li>\n                  ))}\n                </ul>\n              </section>\n            );\n          })\n        )}\n        <p className=\"text-[11px] leading-4 text-slate-500\">\n          Clique numa pessoa para abrir os detalhes. No Pipeline, o filtro &quot;Todas as campanhas&quot; também mostra só quem veio do anúncio, separado por etapa.\n        </p>\n      </div>\n    </Modal>\n  );\n}\n\nfunction ReceitaDetalheModal({"}]}]};
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
