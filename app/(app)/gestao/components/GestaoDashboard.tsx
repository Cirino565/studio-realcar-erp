import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Gauge,
  Megaphone,
  MessageSquareText,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  UserRoundCheck,
  Users,
  WalletCards,
} from "lucide-react";

import { formatarMoeda } from "@/lib/format";
import type {
  GestaoData,
  GestaoInsight,
  GestaoRankingItem,
} from "@/lib/gestao";

type Props = {
  data: GestaoData;
};

type IconType = typeof Gauge;
type Tone = GestaoInsight["tone"];

const toneClasses: Record<
  Tone,
  { icon: string; soft: string; bar: string }
> = {
  violet: {
    icon: "bg-violet-50 text-violet-700 border-violet-100",
    soft: "border-violet-100 bg-violet-50/70",
    bar: "bg-violet-500",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-700 border-emerald-100",
    soft: "border-emerald-100 bg-emerald-50/70",
    bar: "bg-emerald-500",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700 border-amber-100",
    soft: "border-amber-100 bg-amber-50/70",
    bar: "bg-amber-500",
  },
  rose: {
    icon: "bg-rose-50 text-rose-700 border-rose-100",
    soft: "border-rose-100 bg-rose-50/70",
    bar: "bg-rose-500",
  },
  cyan: {
    icon: "bg-cyan-50 text-cyan-700 border-cyan-100",
    soft: "border-cyan-100 bg-cyan-50/70",
    bar: "bg-cyan-500",
  },
  blue: {
    icon: "bg-blue-50 text-blue-700 border-blue-100",
    soft: "border-blue-100 bg-blue-50/70",
    bar: "bg-blue-500",
  },
};

function formatarPercentual(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function formatarHoras(value: number | null) {
  if (value === null) return "Sem base";
  return `${value.toFixed(1).replace(".", ",")} h`;
}

function Variacao({
  value,
  label = "vs. período anterior equivalente",
}: {
  value: number | null;
  label?: string;
}) {
  if (value === null) {
    return (
      <span className="text-[11px] font-semibold text-slate-400">
        Sem base anterior para comparação
      </span>
    );
  }

  const positiva = value >= 0;
  const Icon = positiva ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold ${
        positiva ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      <Icon className="size-3.5" />
      {value > 0 ? "+" : ""}
      {formatarPercentual(value)} {label}
    </span>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
  variation,
}: {
  title: string;
  value: string;
  detail: string;
  icon: IconType;
  tone: Tone;
  variation?: number | null;
}) {
  return (
    <article className="premium-card min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${toneClasses[tone].icon}`}
        >
          <Icon className="size-4.5" />
        </div>
        {variation !== undefined ? <Variacao value={variation} /> : null}
      </div>

      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-800">{title}</p>
      <p className="mt-1.5 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

function SectionTitle({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: IconType;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-700">
        <Icon className="size-4.5" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function ProgressMetric({
  label,
  value,
  detail,
  tone = "violet",
}: {
  label: string;
  value: number;
  detail: string;
  tone?: Tone;
}) {
  const bounded = Math.max(0, Math.min(100, value));

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-950">
            {formatarPercentual(value)}
          </p>
        </div>
        <span className="text-right text-xs text-slate-500">{detail}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${toneClasses[tone].bar}`}
          style={{ width: `${bounded}%` }}
        />
      </div>
    </div>
  );
}

function RankingList({
  title,
  description,
  items,
  format = "currency",
}: {
  title: string;
  description: string;
  items: GestaoRankingItem[];
  format?: "currency" | "number";
}) {
  const max = Math.max(...items.map((item) => item.valor), 1);

  return (
    <section className="premium-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h3 className="font-bold text-slate-950">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <BarChart3 className="size-5 shrink-0 text-violet-500" />
      </div>

      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item, index) => {
            const width = Math.max(6, (item.valor / max) * 100);

            return (
              <div key={`${item.label}-${index}`} className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-700">
                    {index + 1}. {item.label}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-slate-950">
                    {format === "currency"
                      ? formatarMoeda(item.valor)
                      : item.valor}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
            Ainda não há dados suficientes neste período.
          </div>
        )}
      </div>
    </section>
  );
}

function LeituraFinanceiraCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: Tone;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${toneClasses[tone].soft}`}>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-slate-950">
        {formatarMoeda(value)}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p>
    </div>
  );
}

function InsightCard({ insight }: { insight: GestaoInsight }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${toneClasses[insight.tone].soft}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-900">{insight.titulo}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            {insight.descricao}
          </p>
        </div>
        {insight.href ? (
          <Link
            href={insight.href}
            aria-label={`Abrir ${insight.titulo}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-violet-700"
          >
            <ArrowUpRight className="size-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function GestaoDashboard({ data }: Props) {
  const saldoPositivo = data.financeiro.saldoRealizado >= 0;
  const resultadoPositivo = data.financeiro.resultadoGerencial >= 0;

  return (
    <div className="min-w-0 space-y-5 pb-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Receita recebida"
          value={formatarMoeda(data.financeiro.receitaRecebida)}
          detail="Somente entradas com pagamento marcado como Pago."
          icon={CircleDollarSign}
          tone="emerald"
          variation={data.financeiro.variacaoReceita}
        />
        <MetricCard
          title="Resultado gerencial"
          value={formatarMoeda(data.financeiro.resultadoGerencial)}
          detail={`Receita menos custos diretos e ${formatarMoeda(data.financeiro.despesasOperacionaisPagas)} em despesas operacionais pagas.`}
          icon={TrendingUp}
          tone={resultadoPositivo ? "violet" : "rose"}
        />
        <MetricCard
          title="Margem após custos diretos"
          value={formatarPercentual(data.financeiro.margemDiretaPercentual)}
          detail={`${formatarMoeda(data.financeiro.custoDiretoTotal)} de custos históricos reconhecidos nas vendas pagas.`}
          icon={Gauge}
          tone="cyan"
        />
        <MetricCard
          title="Saldo de caixa realizado"
          value={formatarMoeda(data.financeiro.saldoRealizado)}
          detail={`${formatarMoeda(data.financeiro.despesasPagas)} em todas as saídas pagas, inclusive compras de estoque e insumos.`}
          icon={WalletCards}
          tone={saldoPositivo ? "blue" : "rose"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="premium-card p-4 sm:p-5">
          <SectionTitle
            title="Rentabilidade e resultado"
            description="Receita, custos diretos históricos e despesas são separados para não confundir faturamento com resultado."
            icon={WalletCards}
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <LeituraFinanceiraCard
              label="Receita de serviços"
              value={data.financeiro.receitaServicos}
              detail="Serviços de vendas pagas com composição registrada."
              tone="emerald"
            />
            <LeituraFinanceiraCard
              label="Receita de produtos"
              value={data.financeiro.receitaProdutos}
              detail="Produtos vendidos em atendimentos ou vendas avulsas."
              tone="violet"
            />
            <LeituraFinanceiraCard
              label="Receita sem composição 3A+"
              value={data.financeiro.receitaSemClassificacao}
              detail="Entradas pagas antigas ou manuais ainda sem separação serviço/produto."
              tone="blue"
            />
            <LeituraFinanceiraCard
              label="Custos diretos de serviços"
              value={data.financeiro.custoDiretoServicos}
              detail="Custo histórico congelado no momento de cada venda paga."
              tone="amber"
            />
            <LeituraFinanceiraCard
              label="Custo dos produtos vendidos"
              value={data.financeiro.custoProdutosVendidos}
              detail="Preço de compra congelado quando cada produto foi vendido."
              tone="amber"
            />
            <LeituraFinanceiraCard
              label="Despesas operacionais pagas"
              value={data.financeiro.despesasOperacionaisPagas}
              detail="Aluguel, marketing, salários, impostos e demais saídas, exceto compras de estoque/insumos."
              tone="rose"
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-violet-700">
                Resultado gerencial
              </p>
              <p className={`mt-2 text-2xl font-bold ${data.financeiro.resultadoGerencial >= 0 ? "text-violet-950" : "text-rose-700"}`}>
                {formatarMoeda(data.financeiro.resultadoGerencial)}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {formatarPercentual(data.financeiro.resultadoGerencialPercentual)} da receita recebida, após custos diretos e despesas operacionais.
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-700">
                Compras de estoque e insumos pagas
              </p>
              <p className="mt-2 text-2xl font-bold text-cyan-950">
                {formatarMoeda(data.financeiro.comprasEstoqueInsumosPagas)}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Afetam o caixa, mas não são descontadas novamente do resultado gerencial quando o custo já foi reconhecido na venda.
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">Receita vinculada a atendimentos</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{formatarMoeda(data.financeiro.receitaAgenda)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Pode incluir produtos vendidos junto ao atendimento.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">Ticket médio por atendimento pago</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{formatarMoeda(data.financeiro.ticketMedioAtendimento)}</p>
              <p className="mt-1 text-[11px] text-slate-500">Total recebido vinculado ao atendimento dividido por atendimentos pagos únicos.</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
              <p className="text-xs font-bold text-amber-700">A receber registrado</p>
              <p className="mt-1 text-xl font-bold text-amber-950">{formatarMoeda(data.financeiro.aReceber)}</p>
              <p className="mt-1 text-[11px] text-slate-600">{data.financeiro.quantidadeAReceber} lançamento(s) ainda não marcado(s) como pago.</p>
            </div>
          </div>
        </div>

        <div className="premium-card p-4 sm:p-5">
          <SectionTitle
            title="Agenda e capacidade"
            description="Ocupação estimada com base no expediente configurado, profissionais ativos e bloqueios reais."
            icon={CalendarDays}
          />

          <div className="mt-4 space-y-3">
            <ProgressMetric
              label="Comparecimento"
              value={data.agenda.taxaComparecimento}
              detail="Atendidos ÷ atendidos + faltas"
              tone="emerald"
            />
            {data.agenda.taxaAgendaOcupada !== null ? (
              <ProgressMetric
                label="Agenda ocupada"
                value={data.agenda.taxaAgendaOcupada}
                detail={`${formatarHoras(data.agenda.horasReservadas)} reservadas`}
                tone="violet"
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Não foi possível calcular capacidade porque não há base de
                profissionais e expediente suficiente.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">Agendamentos</p>
                <p className="mt-1 text-xl font-bold text-slate-950">
                  {data.agenda.total}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">
                  Horas não reservadas
                </p>
                <p className="mt-1 text-xl font-bold text-slate-950">
                  {formatarHoras(data.agenda.horasOciosasEstimadas)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="premium-card p-4 sm:p-5">
          <SectionTitle
            title="Clientes"
            description="Aquisição, retorno e oportunidades de reativação com base no histórico real."
            icon={Users}
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricCard
              title="Clientes novos"
              value={String(data.clientes.novos)}
              detail="Cadastros criados dentro do período selecionado."
              icon={Users}
              tone="violet"
              variation={data.clientes.variacaoNovos}
            />
            <MetricCard
              title="Clientes atendidos únicos"
              value={String(data.clientes.atendidosUnicos)}
              detail={`${data.clientes.retornaram} já possuíam atendimento anterior ao período.`}
              icon={UserRoundCheck}
              tone="emerald"
            />
          </div>

          <div className="mt-3">
            <ProgressMetric
              label="Taxa de retorno"
              value={data.clientes.taxaRetorno}
              detail={`${data.clientes.retornaram} cliente(s) com histórico anterior`}
              tone="cyan"
            />
          </div>

          <Link
            href="/clientes"
            className="mt-3 flex items-center justify-between rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4 transition hover:border-cyan-200"
          >
            <div>
              <p className="font-bold text-slate-900">
                {data.clientes.elegiveisReativacao} cliente(s) para reativação
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Mais de 60 dias sem visita e sem agendamento futuro ativo.
              </p>
            </div>
            <RefreshCw className="size-5 shrink-0 text-cyan-600" />
          </Link>
        </div>

        <div className="premium-card p-4 sm:p-5">
          <SectionTitle
            title="CRM comercial"
            description="Funil medido sem converter comparecimento automaticamente em venda."
            icon={Target}
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ProgressMetric
              label="Taxa de contato"
              value={data.crm.taxaContato}
              detail={`${data.crm.leadsContatados}/${data.crm.leadsRecebidos} leads captados`}
              tone="blue"
            />
            <ProgressMetric
              label="Conversão dos leads captados"
              value={data.crm.taxaConversaoCoorte}
              detail={`${data.crm.convertidosDaCoorte}/${data.crm.leadsRecebidos} no estado atual`}
              tone="emerald"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Leads
              </p>
              <p className="mt-1 text-xl font-bold text-slate-950">
                {data.crm.leadsRecebidos}
              </p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
                Avaliações
              </p>
              <p className="mt-1 text-xl font-bold text-violet-950">
                {data.crm.avaliacoesVinculadas}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                Convertidos
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-950">
                {data.crm.convertidosDaCoorte}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-rose-600">
                Perdidos
              </p>
              <p className="mt-1 text-xl font-bold text-rose-950">
                {data.crm.perdidosDaCoorte}
              </p>
            </div>
          </div>

          <Link
            href="/marketing"
            className="mt-3 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/70 p-4 transition hover:border-blue-200"
          >
            <div>
              <p className="font-bold text-slate-900">
                {data.crm.followUpsVencidos} follow-up(s) vencido(s)
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Próximo contato programado para uma data anterior a hoje.
              </p>
            </div>
            <Clock3 className="size-5 shrink-0 text-blue-600" />
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Onde o resultado está sendo gerado
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Rankings calculados apenas com vínculos que existem no banco.
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <RankingList
            title="Receita por profissional"
            description="Entradas pagas ligadas a agendamentos. Quando houver produto vendido junto, o total também permanece atribuído ao atendimento."
            items={data.rankings.receitaPorProfissional}
          />
          <RankingList
            title="Receita de serviços por procedimento"
            description="No 3A+, apenas a parcela do serviço é atribuída ao procedimento. Dados legados permanecem pela receita antiga vinculada ao agendamento."
            items={data.rankings.receitaPorProcedimento}
          />
          <RankingList
            title="Margem direta por procedimento"
            description="Receita do serviço menos o custo direto histórico congelado em cada venda paga."
            items={data.rankings.margemPorProcedimento}
          />
          <RankingList
            title="Receita por produto"
            description="Produtos efetivamente vendidos em vendas pagas, incluindo itens adicionados durante o atendimento."
            items={data.rankings.receitaPorProduto}
          />
          <RankingList
            title="Margem direta por produto"
            description="Preço vendido menos o custo de compra histórico de cada produto no momento da venda."
            items={data.rankings.margemPorProduto}
          />
          <RankingList
            title="Receita rastreada por campanha"
            description="Pagamentos de vendas vinculadas a agendamentos originados por leads com campanha."
            items={data.rankings.receitaPorCampanha}
          />
          <RankingList
            title="Leads por origem"
            description="Origem informada nos leads criados no período."
            items={data.rankings.leadsPorOrigem}
            format="number"
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="premium-card p-4 sm:p-5">
          <SectionTitle
            title="Leitura gerencial"
            description="Sinais objetivos extraídos dos dados atuais, sem inventar causalidade ou receita futura."
            icon={Activity}
          />

          <div className="mt-4 grid gap-3">
            {data.insights.map((insight, index) => (
              <InsightCard key={`${insight.titulo}-${index}`} insight={insight} />
            ))}
          </div>
        </div>

        <div className="premium-card p-4 sm:p-5">
          <SectionTitle
            title="Comunicação"
            description="Abrir o WhatsApp continua diferente de marcar uma mensagem como enviada."
            icon={MessageSquareText}
          />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500">
                WhatsApp aberto
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-950">
                {data.comunicacao.abertasNoPeriodo}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="text-xs font-bold text-emerald-700">
                Marcadas como enviadas
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-950">
                {data.comunicacao.marcadasEnviadas}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {data.comunicacao.categorias.length > 0 ? (
              data.comunicacao.categorias.slice(0, 5).map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <span className="truncate text-sm font-semibold text-slate-700">
                    {item.label}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-slate-950">
                    {item.valor}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Nenhuma comunicação marcada como enviada neste período.
              </div>
            )}
          </div>

          <Link
            href="/comunicacoes"
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700"
          >
            Abrir Comunicação
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex gap-3">
          <Gauge className="mt-0.5 size-5 shrink-0 text-violet-600" />
          <div>
            <p className="font-bold text-slate-900">
              Como interpretar este painel
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Receita significa entrada marcada como paga. Saldo de caixa
              considera todas as saídas pagas. Resultado gerencial desconta
              custos diretos históricos das vendas e despesas operacionais,
              sem descontar novamente compras classificadas como Produtos e
              insumos. Isso evita dupla contagem de custo. Dados anteriores ao
              Nível 3A+ podem aparecer como receita sem composição até que haja
              histórico novo suficiente. Nenhum agendamento futuro é tratado
              como faturamento realizado.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
