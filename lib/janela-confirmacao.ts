import { feriadoDoDia, type Feriado } from "@/lib/feriados";

/**
 * Quais atendimentos aparecem para confirmar hoje.
 *
 * Normalmente sao os de amanha. Mas se amanha for domingo ou feriado (dia sem
 * atendimento), ja entram tambem os do proximo dia de atendimento - assim, no
 * sabado aparecem os de segunda, e na vespera de um feriado aparecem os do dia
 * util seguinte. Ninguem precisa mandar mensagem no domingo nem no feriado.
 *
 * Feriado nacional, estadual e municipal fecham; ponto facultativo (Carnaval)
 * conta como dia normal.
 */

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function somarDias(dataISO: string, dias: number) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

function diaDaSemana(dataISO: string) {
  return new Date(`${dataISO}T12:00:00Z`).getUTCDay();
}

function diaMes(dataISO: string) {
  return `${dataISO.slice(8, 10)}/${dataISO.slice(5, 7)}`;
}

/** Domingo ou feriado (que nao seja ponto facultativo). */
export function diaSemAtendimento(dataISO: string): { fechado: boolean; motivo: string | null } {
  if (diaDaSemana(dataISO) === 0) return { fechado: true, motivo: "domingo" };
  const feriado: Feriado | null = feriadoDoDia(dataISO);
  if (feriado && feriado.tipo !== "facultativo") return { fechado: true, motivo: feriado.nome };
  return { fechado: false, motivo: null };
}

export type JanelaConfirmacao = {
  /** Primeiro dia (amanha), "AAAA-MM-DD". */
  inicioISO: string;
  /** Dia de atendimento que sera confirmado, "AAAA-MM-DD". */
  diaAtendimentoISO: string;
  /** Dia seguinte ao ultimo (limite, sem incluir). */
  fimExclusivoISO: string;
  /** Mais de um dia no meio (domingo/feriado pulados). */
  pulouDias: boolean;
  /** "amanhã" ou "segunda (26/10)". */
  rotulo: string;
  /** Explicacao curta quando pulou dias, ex.: "Domingo sem atendimento: já aparecem os de segunda (26/10)." */
  aviso: string | null;
};

export function janelaConfirmacao(hojeISO: string): JanelaConfirmacao {
  const inicioISO = somarDias(hojeISO, 1);
  let diaAtendimentoISO = inicioISO;
  const pulados: string[] = [];

  // No maximo uma semana para frente (nunca trava).
  for (let i = 0; i < 7; i += 1) {
    const situacao = diaSemAtendimento(diaAtendimentoISO);
    if (!situacao.fechado) break;
    if (situacao.motivo && !pulados.includes(situacao.motivo)) pulados.push(situacao.motivo);
    diaAtendimentoISO = somarDias(diaAtendimentoISO, 1);
  }

  const pulouDias = diaAtendimentoISO !== inicioISO;
  const nomeDia = `${DIAS_SEMANA[diaDaSemana(diaAtendimentoISO)]} (${diaMes(diaAtendimentoISO)})`;
  const motivos = pulados.map((motivo) => (motivo === "domingo" ? "Domingo" : `feriado (${motivo})`));
  const textoMotivos = motivos.join(" e ");

  return {
    inicioISO,
    diaAtendimentoISO,
    fimExclusivoISO: somarDias(diaAtendimentoISO, 1),
    pulouDias,
    rotulo: pulouDias ? nomeDia : "amanhã",
    aviso: pulouDias
      ? `${textoMotivos.charAt(0).toUpperCase()}${textoMotivos.slice(1)} sem atendimento: já aparecem os de ${nomeDia}.`
      : null,
  };
}
