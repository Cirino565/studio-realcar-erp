#!/usr/bin/env node
/*
 * CAMPANHAS EM CARTOES (MARKETING) - Studio Realçar
 *
 * A aba Campanhas passa a mostrar UM CARTAO POR CAMPANHA, mais facil de ler
 * que a tabela com muitas colunas:
 *  - nome grande, situacao (bolinha verde/amarela/cinza) e a etiqueta
 *    "Dando lucro / No prejuizo / ...";
 *  - o RESULTADO do periodo em destaque, e quanto voltou para cada R$ 1 gasto;
 *  - duas barras comparando o que ENTROU com o que foi GASTO;
 *  - Clientes, Leads, Custo por cliente e Custo por lead;
 *  - orcamento, aviso de gasto acima do orcamento, e os botoes Editar / Mais.
 * Os botoes "Cartoes | Tabela" deixam voltar para a tabela quando quiser.
 * O filtro de situacao e o de periodo continuam valendo nas duas formas.
 *
 * Precisa dos scripts "filtro-de-periodo-campanhas.mjs" e
 * "campanhas-mais-claras.mjs" ja aplicados.
 * Altera so app/(app)/marketing/components/MarketingClient.tsx.
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node campanhas-em-cartoes.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/marketing/components/MarketingClient.tsx","patches":[{"nome":"importar tipo das metricas","antes":"  type MovimentosCampanha,\n  type PeriodoAtalho,\n} from \"../periodo\";","depois":"  type MetricasPeriodo,\n  type MovimentosCampanha,\n  type PeriodoAtalho,\n} from \"../periodo\";"},{"nome":"estado da visualizacao","antes":"  const [situacao, setSituacao] = useState<SituacaoFiltro>(\"Ativa\");\n","depois":"  const [situacao, setSituacao] = useState<SituacaoFiltro>(\"Ativa\");\n  // Visualizacao: abre em cartoes (um por campanha); a tabela continua disponivel.\n  const [visao, setVisao] = useState<\"cartoes\" | \"tabela\">(\"cartoes\");\n"},{"nome":"botoes de visualizacao","antes":"        <p className=\"text-xs text-slate-400 lg:ml-auto\">","depois":"        <div className=\"grid gap-1.5\">\n          <span className=\"text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500\">Visualização</span>\n          <div className=\"flex gap-2\" role=\"group\" aria-label=\"Visualização\">\n            {([\n              [\"cartoes\", \"Cartões\"],\n              [\"tabela\", \"Tabela\"],\n            ] as const).map(([chave, rotulo]) => (\n              <button\n                key={chave}\n                type=\"button\"\n                aria-pressed={visao === chave}\n                onClick={() => setVisao(chave)}\n                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${visao === chave ? \"border-violet-300/15 bg-violet-400/10 text-violet-100\" : \"border-white/[0.10] bg-white/[0.06] text-slate-300 hover:bg-white/[0.10]\"}`}\n              >\n                {rotulo}\n              </button>\n            ))}\n          </div>\n        </div>\n        <p className=\"text-xs text-slate-400 lg:ml-auto\">"},{"nome":"cartoes no lugar da tabela (abre)","antes":"      <div className=\"premium-table overflow-x-auto\">\n        <table className=\"w-full min-w-[1100px] text-left text-sm\">","depois":"      {visao === \"cartoes\" ? (\n        visiveis.length === 0 ? (\n          <div className=\"premium-card-soft p-10 text-center text-slate-500\">\n            {campanhas.length === 0\n              ? \"Nenhuma campanha cadastrada.\"\n              : `Nenhuma campanha ${situacaoAtual.rotulo.slice(0, -1).toLowerCase()}. Escolha outra situação acima para ver as demais.`}\n          </div>\n        ) : (\n          <div className=\"grid gap-4 lg:grid-cols-2 2xl:grid-cols-3\">\n            {visiveis.map((campanha) => (\n              <CartaoCampanha\n                key={campanha.id}\n                campanha={campanha}\n                m={metricasPeriodo.get(campanha.id) ?? METRICAS_PERIODO_VAZIAS}\n                podeGerenciar={podeGerenciar}\n                disabled={isPending || pendingLocal}\n                onEditar={() => onEditar(campanha)}\n                onVincularCliente={() => setVincular(campanha)}\n                onLancarCusto={() => setCusto(campanha)}\n                onVincularReceita={() => setReceita(campanha)}\n                onExcluir={() => onDelete(campanha.id)}\n              />\n            ))}\n          </div>\n        )\n      ) : null}\n\n      {visao === \"tabela\" ? (\n      <div className=\"premium-table overflow-x-auto\">\n        <table className=\"w-full min-w-[1100px] text-left text-sm\">"},{"nome":"cartoes no lugar da tabela (fecha)","antes":"        </table>\n      </div>\n\n      <VincularClienteCampanhaModal","depois":"        </table>\n      </div>\n      ) : null}\n\n      <VincularClienteCampanhaModal"},{"nome":"cartao da campanha","antes":"function MenuAcoesCampanha(","depois":"function CartaoCampanha({ campanha, m, podeGerenciar, disabled, onEditar, onVincularCliente, onLancarCusto, onVincularReceita, onExcluir }: {\n  campanha: MarketingCampanha;\n  m: MetricasPeriodo;\n  podeGerenciar: boolean;\n  disabled: boolean;\n  onEditar: () => void;\n  onVincularCliente: () => void;\n  onLancarCusto: () => void;\n  onVincularReceita: () => void;\n  onExcluir: () => void;\n}) {\n  const etiqueta = etiquetaDaCampanha(m);\n  const custoCliente = custoPor(m.custoReal, m.clientes);\n  const custoLead = custoPor(m.custoReal, m.leads);\n  const passouOrcamento = campanha.investimento > 0 && campanha.metricas.custoReal > campanha.investimento;\n  const escala = Math.max(m.receitaBruta, m.custoReal);\n  const largura = (valor: number) => (escala > 0 && valor > 0 ? Math.max(3, Math.round((valor / escala) * 100)) : 0);\n  // Cores direto no estilo para o tema nao alterar o verde/amarelo.\n  const corDaSituacao =\n    campanha.status === \"Ativa\" ? \"#10b981\" : campanha.status === \"Pausada\" ? \"#f59e0b\" : \"#94a3b8\";\n\n  return (\n    <article className=\"premium-card-soft flex flex-col gap-5 p-5\">\n      <div className=\"flex items-start justify-between gap-3\">\n        <div className=\"min-w-0\">\n          <p className=\"line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug text-white\" title={campanha.nome}>{campanha.nome}</p>\n          <p className=\"mt-1.5 flex items-center gap-2 text-xs text-slate-500\">\n            <span className=\"size-2 rounded-full\" style={{ backgroundColor: corDaSituacao }} />\n            {campanha.canal} · {campanha.status}\n          </p>\n        </div>\n        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${CLASSE_DA_ETIQUETA[etiqueta.tom]}`}>{etiqueta.texto}</span>\n      </div>\n\n      <div className=\"flex items-end justify-between gap-3\">\n        <div>\n          <p className=\"text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500\">Resultado no período</p>\n          <p className={`mt-1 text-3xl font-bold tracking-tight ${m.resultado >= 0 ? \"text-emerald-600\" : \"text-rose-600\"}`}>{formatarMoeda(m.resultado)}</p>\n        </div>\n        <div className=\"text-right\">\n          {m.roas === null ? (\n            <p className=\"text-xs text-slate-500\">Sem custo</p>\n          ) : (\n            <>\n              <p className={`text-lg font-semibold ${m.roas >= 1 ? \"text-emerald-600\" : \"text-rose-600\"}`}>{formatarMoeda(m.roas)}</p>\n              <p className=\"text-[11px] text-slate-500\">para cada R$ 1 gasto</p>\n            </>\n          )}\n        </div>\n      </div>\n\n      <div className=\"grid gap-2.5\">\n        <div className=\"flex items-center gap-3\">\n          <span className=\"w-12 shrink-0 text-xs text-slate-500\">Entrou</span>\n          <div className=\"h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10\">\n            <div className=\"h-full rounded-full\" style={{ width: `${largura(m.receitaBruta)}%`, backgroundColor: \"#10b981\" }} />\n          </div>\n          <span className=\"w-28 shrink-0 text-right text-sm font-semibold text-emerald-200\">{formatarMoeda(m.receitaBruta)}</span>\n        </div>\n        <div className=\"flex items-center gap-3\">\n          <span className=\"w-12 shrink-0 text-xs text-slate-500\">Gastou</span>\n          <div className=\"h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10\">\n            <div className=\"h-full rounded-full\" style={{ width: `${largura(m.custoReal)}%`, backgroundColor: \"#fb7185\" }} />\n          </div>\n          <span className=\"w-28 shrink-0 text-right text-sm font-semibold text-rose-200\">{formatarMoeda(m.custoReal)}</span>\n        </div>\n      </div>\n\n      <div className=\"grid grid-cols-2 gap-x-3 gap-y-4 border-t border-white/[0.08] pt-4 sm:grid-cols-4\">\n        <div>\n          <p className=\"text-base font-semibold text-white\">{m.clientes}</p>\n          <p className=\"text-[11px] text-slate-500\">Clientes</p>\n        </div>\n        <div>\n          <p className=\"text-base font-semibold text-white\">{m.leads}</p>\n          <p className=\"text-[11px] text-slate-500\">Leads</p>\n        </div>\n        <div>\n          <p className=\"text-base font-semibold text-white\">{custoCliente === null ? \"—\" : formatarMoeda(custoCliente)}</p>\n          <p className=\"text-[11px] text-slate-500\">Custo por cliente</p>\n        </div>\n        <div>\n          <p className=\"text-base font-semibold text-white\">{custoLead === null ? \"—\" : formatarMoeda(custoLead)}</p>\n          <p className=\"text-[11px] text-slate-500\">Custo por lead</p>\n        </div>\n      </div>\n\n      <div className=\"mt-auto flex items-end justify-between gap-3\">\n        <div className=\"min-w-0 text-xs text-slate-500\">\n          <p>\n            Orçamento {formatarMoeda(campanha.investimento)}\n            {m.taxasPagamento > 0 ? ` · Taxas ${formatarMoeda(m.taxasPagamento)}` : \"\"}\n          </p>\n          {passouOrcamento ? <p className=\"mt-0.5 font-semibold text-amber-600 dark:text-amber-300\">Gasto total passou do orçamento</p> : null}\n        </div>\n        {podeGerenciar ? (\n          <div className=\"flex shrink-0 items-center gap-2\">\n            <button type=\"button\" onClick={onEditar} disabled={disabled} className=\"rounded-xl border border-violet-300/15 bg-violet-400/10 px-3 py-2 text-xs font-semibold text-violet-100\">Editar</button>\n            <MenuAcoesCampanha\n              disabled={disabled}\n              onVincularCliente={onVincularCliente}\n              onLancarCusto={onLancarCusto}\n              onVincularReceita={onVincularReceita}\n              onExcluir={onExcluir}\n            />\n          </div>\n        ) : null}\n      </div>\n    </article>\n  );\n}\n\nfunction MenuAcoesCampanha("},{"nome":"tabela: cor do resultado nos dois temas","antes":"<td className={`px-5 py-4 font-semibold ${m.resultado >= 0 ? \"text-emerald-300\" : \"text-rose-300\"}`}>","depois":"<td className={`px-5 py-4 font-semibold ${m.resultado >= 0 ? \"text-emerald-600\" : \"text-rose-600\"}`}>"},{"nome":"tabela: cor do retorno nos dois temas","antes":"<p className={`font-semibold ${m.roas >= 1 ? \"text-emerald-300\" : \"text-rose-300\"}`}>{formatarMoeda(m.roas)}</p>","depois":"<p className={`font-semibold ${m.roas >= 1 ? \"text-emerald-600\" : \"text-rose-600\"}`}>{formatarMoeda(m.roas)}</p>"}]}]};
const raiz = process.cwd();
const aGravar = [];
let erros = 0;

// 1) Arquivos novos
for (const [relativo, conteudo] of Object.entries(DATA.novosArquivos)) {
  const caminho = path.join(raiz, ...relativo.split("/"));
  const existente = fs.existsSync(caminho)
    ? fs.readFileSync(caminho, "utf8").replace(/\r\n/g, "\n")
    : null;
  if (existente === conteudo) {
    console.log("[pulou] " + relativo + " - ja existe igual");
  } else {
    aGravar.push({ caminho, conteudo, pasta: true });
    console.log((existente === null ? "[ok] criar " : "[ok] atualizar ") + relativo);
  }
}

// 2) Arquivos existentes (trechos)
for (const arq of DATA.arquivos) {
  const caminho = path.join(raiz, ...arq.arquivo.split("/"));
  if (!fs.existsSync(caminho)) {
    console.log("[erro] arquivo nao encontrado: " + arq.arquivo + ". Rode na pasta do projeto.");
    erros++;
    continue;
  }
  const bruto = fs.readFileSync(caminho, "utf8");
  const crlf = bruto.includes("\r\n");
  let texto = bruto.replace(/\r\n/g, "\n");
  let mudou = false;

  for (const p of arq.patches) {
    if (texto.includes(p.depois)) {
      console.log("[pulou] " + p.nome + " (" + arq.arquivo + ") - ja aplicado");
    } else if (texto.split(p.antes).length === 2) {
      texto = texto.replace(p.antes, () => p.depois);
      mudou = true;
      console.log("[ok] " + p.nome + " (" + arq.arquivo + ")");
    } else {
      console.log("[erro] " + p.nome + " (" + arq.arquivo + ") - trecho nao encontrado");
      erros++;
    }
  }
  if (mudou) {
    aGravar.push({ caminho, conteudo: crlf ? texto.replace(/\n/g, "\r\n") : texto });
  }
}

if (erros > 0) {
  console.log("\nNada foi gravado: " + erros + " problema(s). Me avise.");
  process.exit(1);
}

for (const g of aGravar) {
  if (g.pasta) fs.mkdirSync(path.dirname(g.caminho), { recursive: true });
  fs.writeFileSync(g.caminho, g.conteudo, "utf8");
}
console.log("\nConcluido.");
