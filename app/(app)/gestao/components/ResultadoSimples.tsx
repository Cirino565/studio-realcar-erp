import { formatarMoeda } from "@/lib/format";
import type { GestaoData } from "@/lib/gestao";

/**
 * O resultado do periodo em palavras e cores, para quem nao e da area:
 * quanto entrou, para onde foi (material e despesas) e quanto sobrou de
 * lucro, com "de cada R$ 100". Os numeros detalhados continuam abaixo.
 */
export default function ResultadoSimples({ financeiro }: { financeiro: GestaoData["financeiro"] }) {
  const entrou = financeiro.receitaLiquidaRecebida;
  const material = financeiro.custoDiretoTotal;
  const despesas = financeiro.despesasOperacionaisPagas;
  const lucro = financeiro.resultadoGerencial;
  const caixa = financeiro.saldoRealizado;
  const lucroProdutos = financeiro.receitaProdutos - financeiro.custoProdutosVendidos;

  if (entrou <= 0 && material <= 0 && despesas <= 0) return null;

  const base = Math.max(entrou, material + despesas, 1);
  const deCada100 = (valor: number) => (entrou > 0 ? Math.round((valor / entrou) * 100) : 0);
  const largura = (valor: number) => `${Math.max(0, (valor / base) * 100)}%`;
  const diferencaCaixa = caixa - lucro;

  const partes = [
    {
      cor: "bg-amber-400",
      ponto: "bg-amber-400",
      titulo: "Material usado",
      texto: "produtos e insumos gastos nos atendimentos e nos produtos vendidos",
      valor: material,
    },
    {
      cor: "bg-rose-400",
      ponto: "bg-rose-400",
      titulo: "Despesas do studio",
      texto: "aluguel, marketing, contas, salários e outras saídas",
      valor: despesas,
    },
  ];

  return (
    <section className="premium-card p-4 sm:p-5">
      <h2 className="text-lg font-bold text-slate-950">O resultado em palavras</h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Entrou <strong className="text-slate-800">{formatarMoeda(entrou)}</strong>
        {financeiro.taxasRecebimento > 0 ? ` (já sem ${formatarMoeda(financeiro.taxasRecebimento)} de taxas da maquininha)` : ""}.
        Veja para onde foi:
      </p>

      {/* Barra: cada cor e uma parte do dinheiro que entrou. */}
      <div className="mt-4 flex h-5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className="h-full bg-amber-400" style={{ width: largura(material) }} />
        <div className="h-full bg-rose-400" style={{ width: largura(despesas) }} />
        {lucro > 0 ? <div className="h-full bg-emerald-500" style={{ width: largura(lucro) }} /> : null}
      </div>

      <ul className="mt-4 space-y-2.5">
        {partes.map((parte) => (
          <li key={parte.titulo} className="flex items-start gap-3">
            <span className={`mt-1.5 size-3 shrink-0 rounded-full ${parte.ponto}`} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span className="font-semibold text-slate-800">{parte.titulo}</span>
                <span className="font-bold text-slate-900">{formatarMoeda(parte.valor)}</span>
              </p>
              <p className="text-xs text-slate-500">
                {parte.texto}
                {entrou > 0 ? ` · R$ ${deCada100(parte.valor)} de cada R$ 100 que entraram` : ""}
              </p>
            </div>
          </li>
        ))}
        <li className={`flex items-start gap-3 rounded-2xl border p-3 ${lucro >= 0 ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
          <span className={`mt-1.5 size-3 shrink-0 rounded-full ${lucro >= 0 ? "bg-emerald-500" : "bg-rose-600"}`} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-bold text-slate-900">{lucro >= 0 ? "Lucro: o que o studio ganhou" : "Prejuízo no período"}</span>
              <span className={`text-2xl font-black ${lucro >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatarMoeda(lucro)}</span>
            </p>
            <p className="text-xs text-slate-600">
              {lucro >= 0
                ? `Sobraram R$ ${deCada100(lucro)} de cada R$ 100 que entraram, depois de pagar material e despesas.`
                : "O material e as despesas passaram do que entrou."}{" "}
              Se o seu salário (pró-labore) não está lançado no Financeiro, ele ainda sai daqui.
            </p>
          </div>
        </li>
      </ul>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Só os produtos</p>
          <p className="mt-1 text-sm text-slate-700">
            Vendeu <strong>{formatarMoeda(financeiro.receitaProdutos)}</strong> · custaram{" "}
            <strong>{formatarMoeda(financeiro.custoProdutosVendidos)}</strong>
          </p>
          <p className={`mt-1 text-lg font-black ${lucroProdutos >= 0 ? "text-violet-800" : "text-rose-700"}`}>
            Lucro com produtos: {formatarMoeda(lucroProdutos)}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-sky-700">Dinheiro que sobrou no caixa</p>
          <p className="mt-1 text-lg font-black text-sky-900">{formatarMoeda(caixa)}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {Math.abs(diferencaCaixa) < 1
              ? "Igual ao lucro."
              : diferencaCaixa > 0
                ? `É ${formatarMoeda(diferencaCaixa)} a mais que o lucro porque o material usado custou mais do que as compras pagas no período (material comprado antes ou compra não lançada). Quando o estoque acabar, esse dinheiro sai.`
                : `É ${formatarMoeda(-diferencaCaixa)} a menos que o lucro porque vocês compraram mais estoque do que usaram: esse dinheiro está nas prateleiras.`}
          </p>
        </div>
      </div>
    </section>
  );
}
