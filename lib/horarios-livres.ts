/**
 * "Horarios livres": regras puras (sem banco), usadas na tela.
 *
 * A lista completa de horarios livres e so para a equipe ver. Para a cliente
 * vao no maximo 3 opcoes, em dias diferentes, para a agenda nao parecer vazia.
 */

export type PeriodoHorario = "manha" | "tarde" | "qualquer";

export type DiaHorariosLivres = {
  /** "AAAA-MM-DD" */
  data: string;
  /** Horarios livres ("14:00"), ja filtrados pelo periodo. */
  horarios: string[];
};

export type HorarioEscolhido = { data: string; hora: string };

export const MAX_HORARIOS_CLIENTE = 3;

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function somarDiasISO(dataISO: string, dias: number) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

export function diaDaSemanaISO(dataISO: string) {
  return new Date(`${dataISO}T12:00:00Z`).getUTCDay();
}

export function minutosDaHora(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function horaNoPeriodo(hora: string, periodo: PeriodoHorario) {
  if (periodo === "qualquer") return true;
  const manha = minutosDaHora(hora) < 12 * 60;
  return periodo === "manha" ? manha : !manha;
}

/** "14h" ou "15h30". */
export function horaFalada(hora: string) {
  const [h, m] = hora.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

/** "hoje (16/11)", "amanhã (17/11)" ou "quarta (18/11)". */
export function diaFalado(dataISO: string, hojeISO: string) {
  const dm = `${dataISO.slice(8, 10)}/${dataISO.slice(5, 7)}`;
  if (dataISO === hojeISO) return `hoje (${dm})`;
  if (dataISO === somarDiasISO(hojeISO, 1)) return `amanhã (${dm})`;
  return `${DIAS_SEMANA[diaDaSemanaISO(dataISO)]} (${dm})`;
}

// Horas "alvo" de cada sugestao: variam de um dia para o outro, para a
// cliente nao receber sempre o mesmo horario (parece agenda vazia).
const ALVOS: Record<PeriodoHorario, string[]> = {
  manha: ["10:00", "09:00", "11:00"],
  tarde: ["14:00", "16:00", "15:00"],
  qualquer: ["10:00", "15:00", "14:00"],
};

function maisPerto(horarios: string[], alvo: string, evitar: string[]) {
  const cheias = horarios.filter((hora) => hora.endsWith(":00"));
  const base = cheias.length > 0 ? cheias : horarios;
  const semRepetir = base.filter((hora) => !evitar.includes(hora));
  const opcoes = semRepetir.length > 0 ? semRepetir : base;
  return [...opcoes].sort(
    (a, b) =>
      Math.abs(minutosDaHora(a) - minutosDaHora(alvo)) -
        Math.abs(minutosDaHora(b) - minutosDaHora(alvo)) || a.localeCompare(b),
  )[0];
}

/**
 * Sugestao automatica para a cliente: ate 3 horarios, um por dia, nos
 * primeiros dias com vaga, em horas cheias e diferentes entre si ("14h",
 * "16h"...). So repete um dia se faltarem dias, com 2h de distancia.
 */
export function sugerirHorarios(
  dias: DiaHorariosLivres[],
  periodo: PeriodoHorario = "qualquer",
  maximo = MAX_HORARIOS_CLIENTE,
): HorarioEscolhido[] {
  const escolhidos: HorarioEscolhido[] = [];
  const comVaga = dias.filter((dia) => dia.horarios.length > 0);
  const alvos = ALVOS[periodo];

  for (const dia of comVaga) {
    if (escolhidos.length >= maximo) break;
    const alvo = alvos[escolhidos.length % alvos.length];
    const hora = maisPerto(dia.horarios, alvo, escolhidos.map((item) => item.hora));
    escolhidos.push({ data: dia.data, hora });
  }

  // Poucos dias com vaga: mais um horario no mesmo dia, longe do outro.
  let mudou = true;
  while (escolhidos.length < maximo && mudou) {
    mudou = false;
    for (const dia of comVaga) {
      if (escolhidos.length >= maximo) break;
      const doDia = escolhidos.filter((item) => item.data === dia.data);
      const longe = dia.horarios.filter(
        (hora) =>
          hora.endsWith(":00") &&
          doDia.every((item) => Math.abs(minutosDaHora(item.hora) - minutosDaHora(hora)) >= 120),
      );
      if (longe.length === 0) continue;
      const alvo = alvos[escolhidos.length % alvos.length];
      escolhidos.push({ data: dia.data, hora: maisPerto(longe, alvo, []) });
      mudou = true;
    }
  }

  return ordenarEscolhidos(escolhidos);
}

export function ordenarEscolhidos(lista: HorarioEscolhido[]) {
  return [...lista].sort((a, b) =>
    a.data === b.data ? a.hora.localeCompare(b.hora) : a.data.localeCompare(b.data),
  );
}

function juntarComOu(partes: string[]) {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} ou ${partes[partes.length - 1]}`;
}

/** Mensagem curta para colar no WhatsApp da cliente. */
export function mensagemHorariosCliente({
  procedimento,
  periodo,
  escolhidos,
  hojeISO,
}: {
  procedimento?: string | null;
  periodo: PeriodoHorario;
  escolhidos: HorarioEscolhido[];
  hojeISO: string;
}) {
  if (escolhidos.length === 0) return "";

  const lista = ordenarEscolhidos(escolhidos).map(
    (item) => `${diaFalado(item.data, hojeISO)} às ${horaFalada(item.hora)}`,
  );
  const nome = (procedimento || "").trim();
  const quando = periodo === "manha" ? "de manhã" : periodo === "tarde" ? "à tarde" : "";
  const pergunta = escolhidos.length === 1 ? "Fica bom para você?" : "Qual fica melhor para você?";
  // "Para limpeza de pele à tarde, tenho..." / "À tarde, tenho..." / "Tenho..."
  const abertura = nome
    ? `Para ${nome}${quando ? ` ${quando}` : ""}, tenho`
    : quando
      ? `${quando.charAt(0).toUpperCase()}${quando.slice(1)}, tenho`
      : "Tenho";

  return `Oi! ${abertura} ${juntarComOu(lista)}. ${pergunta} 😊`;
}
