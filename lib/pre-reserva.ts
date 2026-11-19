/**
 * Pre-reserva: horario que a cliente deixou combinado no fim do atendimento,
 * mas que ainda nao e certeza. Ocupa o horario na agenda, aparece para
 * confirmar 7 dias antes e, sem resposta ate 2 dias antes, fica em vermelho
 * para a equipe decidir (o sistema nunca libera sozinho).
 *
 * Regras puras (sem banco), usadas no servidor e na tela.
 */

export const PRE_RESERVA_PENDENTE = "PENDENTE";
export const PRE_RESERVA_CONFIRMADA = "CONFIRMADA";
export const PRE_RESERVA_LIBERADA = "LIBERADA";

/** Aparece para confirmar a partir de 7 dias antes. */
export const DIAS_PARA_CONFIRMAR = 7;
/** Sem resposta ate 2 dias antes: alerta. */
export const DIAS_ALERTA = 2;

export function preReservaPendente(valor?: string | null) {
  return valor === PRE_RESERVA_PENDENTE;
}

export type PreReservaParaConfirmar = {
  id: number;
  clienteId: number;
  clienteNome: string;
  telefone: string | null;
  procedimento: string;
  retorno: boolean;
  /** ISO */
  data: string;
  /** Faltam 2 dias ou menos e ainda nao confirmou. */
  urgente: boolean;
};

const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function partesSaoPaulo(data: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(data);
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  const semana = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(valor("weekday"));
  return {
    dia: valor("day"),
    mes: valor("month"),
    hora: valor("hour"),
    minuto: valor("minute"),
    semana: semana < 0 ? 0 : semana,
  };
}

/** "Quinta-feira", "18/12", "14h" / "14h30". */
export function dataParaMensagem(dataISO: string) {
  const partes = partesSaoPaulo(new Date(dataISO));
  return {
    diaSemana: DIAS_SEMANA[partes.semana],
    data: `${partes.dia}/${partes.mes}`,
    horario: partes.minuto === "00" ? `${Number(partes.hora)}h` : `${Number(partes.hora)}h${partes.minuto}`,
  };
}

export const MODELO_PADRAO_PRE_RESERVA =
  "Olá, {primeiro_nome}, tudo bem?\n\nNo seu último atendimento deixamos um horário pré-reservado para você:\n\n*{dia_semana}, {data}, às {horario}*\n{procedimento}\n\nPodemos confirmar? Se precisar mudar, é só nos avisar que ajustamos.\n\n{clinica}";

/** Mensagem de confirmacao com os dados da cliente. */
export function mensagemPreReserva(
  modelo: string | null | undefined,
  item: Pick<PreReservaParaConfirmar, "clienteNome" | "procedimento" | "data">,
  clinica: string,
) {
  const nome = item.clienteNome.trim();
  const quando = dataParaMensagem(item.data);
  const variaveis: Record<string, string> = {
    primeiro_nome: nome.split(/\s+/)[0] || nome,
    nome,
    procedimento: item.procedimento,
    dia_semana: quando.diaSemana,
    data: quando.data,
    horario: quando.horario,
    clinica,
  };
  return (modelo || MODELO_PADRAO_PRE_RESERVA)
    .replace(/\\n/g, "\n")
    .replace(/\{([a-zA-Z0-9_]+)\}/g, (_, chave: string) => variaveis[chave] ?? "");
}
