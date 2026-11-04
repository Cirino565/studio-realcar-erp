/**
 * Regra do "Entrou" (receita) das campanhas - calculo puro, usado no servidor
 * e na tela.
 *
 * Conta como receita da campanha:
 *  - venda FECHADA (atendimento finalizado ou venda lancada) e paga;
 *  - receita lancada a mao ligada a campanha (ex.: pagamento de pacote).
 *
 * NAO conta:
 *  - SINAL de agendamento: e reserva, a venda ainda nao aconteceu. Quando o
 *    atendimento e finalizado, a venda ja entra com o valor cheio (sinal
 *    incluido), entao contar o sinal seria contar duas vezes;
 *  - venda ou receita ainda nao paga (a receber);
 *  - cliente sem clique pago (organico, Instagram, direto...): regra de
 *    atribuicao que ja existia.
 */

function semAcento(texto: string | null | undefined) {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/** Lancamento de sinal de agendamento (criado pela agenda ou lancado a mao como "Sinal"). */
export function entradaEhSinal(lancamento: {
  categoria?: string | null;
  origem?: string | null;
}): boolean {
  return (
    semAcento(lancamento.categoria) === "sinal" ||
    semAcento(lancamento.origem).startsWith("agenda - sinal")
  );
}

export function pagamentoEhPago(status: string | null | undefined): boolean {
  return semAcento(status) === "pago";
}

export type ItemReceitaCampanha = {
  /** "venda-12" ou "lancamento-40". */
  chave: string;
  tipo: "venda" | "lancamento";
  id: number;
  campanhaId: number;
  data: string;
  valor: number;
  descricao: string;
  clienteId: number | null;
  clienteNome: string | null;
  /** Origem gravada na ficha da cliente (Google Ads, Instagram, Orgânico...). */
  origemCliente: string | null;
  /** Teve clique pago (ou nao ha cliente para julgar). */
  cliquePago: boolean;
  /** Situacao em palavras: "Venda fechada", "Sinal · atendimento ainda não aconteceu"... */
  situacao: string;
  /** Fechado (venda/pagamento feito) ou em aberto (negociacao, a receber). */
  fechado: boolean;
  /** Entra no "Entrou" da campanha. */
  conta: boolean;
  /** Por que nao conta (quando conta = false). */
  motivo: string | null;
};

export type VendaParaLista = {
  id: number;
  campanhaId: number;
  data: Date | string;
  valorTotal: number;
  statusPagamento: string;
  clienteId: number | null;
  descricao: string;
};

export type EntradaParaLista = {
  id: number;
  campanhaId: number;
  data: Date | string;
  valor: number;
  descricao: string;
  categoria: string | null;
  origem: string | null;
  statusPagamento: string;
  clienteId: number | null;
  pacoteClienteId: number | null;
  /** Situacao do agendamento do sinal ("Atendido", "Agendado"...), quando houver. */
  statusAgendamento: string | null;
};

function iso(data: Date | string) {
  return new Date(data).toISOString();
}

const MOTIVO_ORGANICO =
  "A cliente não veio de clique pago (orgânico ou outra origem). Não entra na campanha paga.";

export function itemDaVenda(
  venda: VendaParaLista,
  cliente: { nome: string | null; origem: string | null } | null,
  cliquePago: boolean,
): ItemReceitaCampanha {
  const paga = pagamentoEhPago(venda.statusPagamento);
  const conta = paga && cliquePago;
  return {
    chave: `venda-${venda.id}`,
    tipo: "venda",
    id: venda.id,
    campanhaId: venda.campanhaId,
    data: iso(venda.data),
    valor: venda.valorTotal,
    descricao: venda.descricao,
    clienteId: venda.clienteId,
    clienteNome: cliente?.nome ?? null,
    origemCliente: cliente?.origem ?? null,
    cliquePago,
    situacao: paga ? "Venda fechada" : "Venda fechada · pagamento pendente",
    fechado: true,
    conta,
    motivo: conta
      ? null
      : !paga
        ? "Ainda não foi paga. Entra quando o pagamento for marcado como pago."
        : MOTIVO_ORGANICO,
  };
}

export function itemDaEntrada(
  entrada: EntradaParaLista,
  cliente: { nome: string | null; origem: string | null } | null,
  cliquePago: boolean,
): ItemReceitaCampanha {
  const paga = pagamentoEhPago(entrada.statusPagamento);
  const sinal = entradaEhSinal(entrada);
  const atendido = semAcento(entrada.statusAgendamento) === "atendido";

  let situacao = "Receita lançada à mão";
  let fechado = paga;
  let motivo: string | null = null;

  if (sinal) {
    situacao = atendido
      ? "Sinal · já está dentro da venda do atendimento"
      : "Sinal · atendimento ainda não aconteceu";
    fechado = atendido;
    motivo = atendido
      ? "O sinal já faz parte da venda do atendimento, que entra com o valor cheio. Contar de novo seria contar duas vezes."
      : "É só a reserva do horário: a venda ainda não foi fechada. Quando o atendimento for finalizado, a venda entra com o valor cheio.";
  } else if (entrada.pacoteClienteId) {
    situacao = "Pagamento de pacote";
  }

  if (!motivo && !paga) {
    situacao = `${situacao} · a receber`;
    motivo = "Ainda não foi paga. Entra quando o pagamento for marcado como pago.";
  }
  if (!motivo && !cliquePago) motivo = MOTIVO_ORGANICO;

  return {
    chave: `lancamento-${entrada.id}`,
    tipo: "lancamento",
    id: entrada.id,
    campanhaId: entrada.campanhaId,
    data: iso(entrada.data),
    valor: entrada.valor,
    descricao: entrada.descricao,
    clienteId: entrada.clienteId,
    clienteNome: cliente?.nome ?? null,
    origemCliente: cliente?.origem ?? null,
    cliquePago,
    situacao,
    fechado,
    conta: motivo === null,
    motivo,
  };
}
