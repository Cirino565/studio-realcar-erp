import { prisma } from "@/lib/prisma";

// Comparar meses: os numeros de cada um dos ultimos 12 meses, com as mesmas
// regras da tela de Gestao (dinheiro recebido de verdade, custo do material
// gravado na venda, despesas sem as compras de estoque). Poucas consultas
// para o ano inteiro; o resto e conta feita aqui.

const FUSO_MS = 3 * 60 * 60 * 1000; // Sao Paulo (sem horario de verao)
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export type NumerosMes = {
  // Dinheiro
  entrou: number;
  /** Entrou ja sem as taxas (o que caiu de verdade na conta). */
  entrouLiquido: number;
  taxas: number;
  material: number;
  despesas: number;
  lucro: number;
  comprasEstoque: number;
  sobrouNoCaixa: number;
  vendeuProdutos: number;
  lucroProdutos: number;
  aReceber: number;
  // Agenda e clientes
  atendimentos: number;
  retornos: number;
  clientesAtendidas: number;
  clientesNovas: number;
  faltas: number;
  cancelados: number;
  // Marketing
  investimentoAnuncios: number;
  leads: number;
  leadsViraramClientes: number;
};

export type MesComparado = {
  chave: string; // "2026-11"
  nome: string; // "Novembro"
  ano: number;
  emAndamento: boolean;
  diasContados: number; // no mes em andamento: ate hoje
  numeros: NumerosMes;
  /** Mes anterior inteiro (ou, no mes em andamento, so os mesmos dias). */
  anterior: NumerosMes | null;
};

export type DadosCompararMeses = {
  meses: MesComparado[]; // do mais recente para o mais antigo
  hojeDia: number;
};

function vazio(): NumerosMes {
  return {
    entrou: 0, entrouLiquido: 0, taxas: 0, material: 0, despesas: 0, lucro: 0, comprasEstoque: 0,
    sobrouNoCaixa: 0, vendeuProdutos: 0, lucroProdutos: 0, aReceber: 0,
    atendimentos: 0, retornos: 0, clientesAtendidas: 0, clientesNovas: 0,
    faltas: 0, cancelados: 0, investimentoAnuncios: 0, leads: 0, leadsViraramClientes: 0,
  };
}

function normalizar(valor?: string | null) {
  return (valor || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

/** Mes (chave "AAAA-MM") e dia, no horario de Sao Paulo. */
function mesDia(data: Date) {
  const local = new Date(data.getTime() - FUSO_MS);
  const ano = local.getUTCFullYear();
  const mes = local.getUTCMonth() + 1;
  return { chave: `${ano}-${String(mes).padStart(2, "0")}`, dia: local.getUTCDate() };
}

function inicioMes(ano: number, mesZeroBase: number) {
  return new Date(Date.UTC(ano, mesZeroBase, 1) + FUSO_MS);
}

export async function obterComparacaoMeses(quantidade = 12): Promise<DadosCompararMeses> {
  const agora = new Date();
  const hoje = new Date(agora.getTime() - FUSO_MS);
  const anoAtual = hoje.getUTCFullYear();
  const mesAtual = hoje.getUTCMonth();
  const hojeDia = hoje.getUTCDate();

  // Um mes a mais no comeco, para comparar o mais antigo tambem.
  const inicio = inicioMes(anoAtual, mesAtual - quantidade);
  const fim = inicioMes(anoAtual, mesAtual + 1);

  const [lancamentos, vendas, agendamentos, primeirasVisitas, leadsCriados, leadsConvertidos] =
    await Promise.all([
      prisma.lancamento.findMany({
        where: { data: { gte: inicio, lt: fim } },
        select: {
          valor: true,
          valorLiquido: true,
          taxaPagamento: true,
          tipo: true,
          statusPagamento: true,
          categoria: true,
          campanhaId: true,
          data: true,
        },
      }),
      prisma.venda.findMany({
        where: {
          statusPagamento: "Pago",
          situacao: { not: "CANCELADA" },
          lancamento: { is: { statusPagamento: "Pago", data: { gte: inicio, lt: fim } } },
        },
        select: {
          totalProdutos: true,
          custoServicos: true,
          custoProdutos: true,
          lancamento: { select: { data: true } },
        },
      }),
      prisma.agendamento.findMany({
        where: { data: { gte: inicio, lt: fim } },
        select: { clienteId: true, status: true, data: true, naturezaAtendimento: true },
      }),
      // Primeira vez que cada cliente foi atendida (para saber quem e nova).
      prisma.agendamento.groupBy({
        by: ["clienteId"],
        where: { status: "Atendido" },
        _min: { data: true },
        having: { data: { _min: { gte: inicio } } },
      }),
      prisma.lead.findMany({
        where: { createdAt: { gte: inicio, lt: fim } },
        select: { createdAt: true },
      }),
      prisma.lead.findMany({
        where: { convertidoEm: { gte: inicio, lt: fim } },
        select: { convertidoEm: true },
      }),
    ]);

  // Numeros por mes; o "parcial" guarda so ate o dia de hoje (para comparar
  // o mes em andamento com os mesmos dias do mes anterior).
  const porMes = new Map<string, NumerosMes>();
  const parcial = new Map<string, NumerosMes>();
  const atendidasPorMes = new Map<string, Set<number>>();
  const atendidasParcial = new Map<string, Set<number>>();

  function pegar(mapa: Map<string, NumerosMes>, chave: string) {
    let item = mapa.get(chave);
    if (!item) {
      item = vazio();
      mapa.set(chave, item);
    }
    return item;
  }

  function somar(data: Date, aplicar: (numeros: NumerosMes) => void) {
    const { chave, dia } = mesDia(data);
    aplicar(pegar(porMes, chave));
    if (dia <= hojeDia) aplicar(pegar(parcial, chave));
  }

  for (const item of lancamentos) {
    const pago = normalizar(item.statusPagamento) === "pago";
    const cancelado = normalizar(item.statusPagamento) === "cancelado";
    somar(item.data, (n) => {
      if (item.tipo === "ENTRADA") {
        if (pago) {
          n.entrou += item.valor;
          n.taxas += item.taxaPagamento;
          const liquido = item.valorLiquido ?? item.valor - item.taxaPagamento;
          n.entrouLiquido += liquido;
          n.sobrouNoCaixa += liquido;
        } else if (!cancelado) {
          n.aReceber += item.valor;
        }
      } else if (item.tipo === "SAIDA" && pago) {
        n.sobrouNoCaixa -= item.valor;
        if (normalizar(item.categoria) === "produtos e insumos") n.comprasEstoque += item.valor;
        else n.despesas += item.valor;
        if (typeof item.campanhaId === "number") n.investimentoAnuncios += item.valor;
      }
    });
  }

  for (const venda of vendas) {
    if (!venda.lancamento) continue;
    somar(venda.lancamento.data, (n) => {
      n.material += venda.custoServicos + venda.custoProdutos;
      n.vendeuProdutos += venda.totalProdutos;
      n.lucroProdutos += venda.totalProdutos - venda.custoProdutos;
    });
  }

  for (const ag of agendamentos) {
    const { chave, dia } = mesDia(ag.data);
    somar(ag.data, (n) => {
      if (ag.status === "Atendido") {
        n.atendimentos += 1;
        if (ag.naturezaAtendimento === "RETORNO") n.retornos += 1;
      } else if (ag.status === "Faltou") n.faltas += 1;
      else if (ag.status === "Cancelado") n.cancelados += 1;
    });
    if (ag.status === "Atendido") {
      if (!atendidasPorMes.has(chave)) atendidasPorMes.set(chave, new Set());
      atendidasPorMes.get(chave)!.add(ag.clienteId);
      if (dia <= hojeDia) {
        if (!atendidasParcial.has(chave)) atendidasParcial.set(chave, new Set());
        atendidasParcial.get(chave)!.add(ag.clienteId);
      }
    }
  }
  for (const [chave, clientes] of atendidasPorMes) pegar(porMes, chave).clientesAtendidas = clientes.size;
  for (const [chave, clientes] of atendidasParcial) pegar(parcial, chave).clientesAtendidas = clientes.size;

  for (const item of primeirasVisitas) {
    if (item._min.data) somar(item._min.data, (n) => (n.clientesNovas += 1));
  }
  for (const lead of leadsCriados) somar(lead.createdAt, (n) => (n.leads += 1));
  for (const lead of leadsConvertidos) {
    if (lead.convertidoEm) somar(lead.convertidoEm, (n) => (n.leadsViraramClientes += 1));
  }

  for (const mapa of [porMes, parcial]) {
    for (const n of mapa.values()) {
      // Mesma conta da Gestao: entrou (sem taxas) - material - despesas.
      n.lucro = n.entrouLiquido - n.material - n.despesas;
    }
  }

  const meses: MesComparado[] = [];
  for (let i = 0; i < quantidade; i += 1) {
    const data = new Date(Date.UTC(anoAtual, mesAtual - i, 1));
    const ano = data.getUTCFullYear();
    const mes = data.getUTCMonth();
    const chave = `${ano}-${String(mes + 1).padStart(2, "0")}`;
    const anteriorData = new Date(Date.UTC(ano, mes - 1, 1));
    const chaveAnterior = `${anteriorData.getUTCFullYear()}-${String(anteriorData.getUTCMonth() + 1).padStart(2, "0")}`;
    const emAndamento = i === 0;
    meses.push({
      chave,
      nome: MESES[mes],
      ano,
      emAndamento,
      diasContados: emAndamento ? hojeDia : new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate(),
      numeros: porMes.get(chave) ?? vazio(),
      anterior: emAndamento ? parcial.get(chaveAnterior) ?? vazio() : porMes.get(chaveAnterior) ?? vazio(),
    });
  }

  return { meses, hojeDia };
}
