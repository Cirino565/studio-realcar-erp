/**
 * "Horarios livres": regras puras (sem banco), usadas na tela.
 *
 * A lista completa (com quem ja esta marcado) e so para a equipe ver. Para a
 * cliente vao poucas opcoes (3 sugeridas, pode marcar mais), dando preferencia
 * aos horarios "colados" em outro atendimento, para a agenda nao ficar com
 * buracos.
 */

export type PeriodoHorario = "manha" | "tarde" | "qualquer";

/** O que ja ocupa o dia: atendimento marcado ou bloqueio (almoco...). */
export type OcupadoDoDia = {
  inicio: string;
  fim: string;
  tipo: "agendamento" | "bloqueio";
  titulo: string;
  detalhe?: string;
};

export type DiaHorariosLivres = {
  /** "AAAA-MM-DD" */
  data: string;
  /** Horarios livres ("14:00"), ja filtrados pelo periodo. */
  horarios: string[];
  /** Livres que encostam em outro atendimento/bloqueio (agenda sem buraco). */
  colados?: string[];
  /** Atendimentos e bloqueios do dia, em ordem. */
  ocupados?: OcupadoDoDia[];
  /** O dia ja ficou sem espaco para o almoco (aviso na tela). */
  semAlmoco?: boolean;
};

/** Almoco configurado na agenda (Configuracoes): "ALMOCO=12:00-13:00". */
export type AlmocoConfig = { ativo: boolean; inicio: number; fim: number; dias: number[] };

export function lerAlmoco(texto?: string | null): AlmocoConfig {
  const valor = texto || "";
  const horario = valor.match(/ALMOCO=(\d{2}:\d{2})-(\d{2}:\d{2})/i);
  const ativo = valor.match(/ALMOCO_ATIVO=(0|1)/i);
  const dias = valor.match(/ALMOCO_DIAS=([0-6](?:,[0-6])*)/i);
  return {
    ativo: ativo ? ativo[1] === "1" : true,
    inicio: minutosDaHora(horario?.[1] || "12:00"),
    fim: minutosDaHora(horario?.[2] || "13:00"),
    dias: dias ? dias[1].split(",").map(Number) : [1, 2, 3, 4, 5, 6],
  };
}

/**
 * O almoco cabe? Precisa sobrar um tempo livre seguido do tamanho do almoco
 * (ex.: 1h) entre o inicio do almoco e 1h depois do fim dele (12h-14h).
 * Flexivel: se a cliente das 11h vai ate 12h30, o almoco pode ser 12h30-13h30.
 */
export function almocoCabe(ocupados: { ini: number; fim: number }[], almoco: AlmocoConfig) {
  const precisa = almoco.fim - almoco.inicio;
  if (precisa <= 0) return true;
  const comeco = almoco.inicio;
  const final = almoco.fim + 60;
  const dentro = ocupados
    .filter((item) => item.fim > comeco && item.ini < final)
    .sort((a, b) => a.ini - b.ini);
  let livreDesde = comeco;
  for (const item of dentro) {
    if (item.ini - livreDesde >= precisa) return true;
    livreDesde = Math.max(livreDesde, item.fim);
  }
  return final - livreDesde >= precisa;
}

const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e"]);

/** "Fernanda de Souza Lima" -> "Fernanda Souza" (curto para a lista). */
export function nomeCurto(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const sobrenome = partes.slice(1).find((parte) => !PARTICULAS.has(parte.toLowerCase()));
  return sobrenome ? `${partes[0]} ${sobrenome}` : partes[0] || nome;
}

export type HorarioEscolhido = { data: string; hora: string };

/** Quantos a sugestao automatica marca (a equipe pode marcar mais). */
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
 * primeiros dias com vaga. Em cada dia prefere o horario colado em outro
 * atendimento; sem isso, horas cheias e diferentes entre si ("14h", "16h").
 * So repete um dia se faltarem dias, com 2h de distancia.
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
    // Primeiro o horario colado em outro atendimento (agenda sem buraco).
    const colados = (dia.colados ?? []).filter((hora) => dia.horarios.includes(hora));
    // (o primeiro deles: um cliente logo depois do outro).
    const hora = colados.length > 0
      ? colados[0]
      : maisPerto(dia.horarios, alvo, escolhidos.map((item) => item.hora));
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

const DIAS_SEMANA_COMPLETO = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

/** "Hoje, 16/11", "Amanhã, 17/11" ou "Quarta-feira, 18/11". */
function diaParaCliente(dataISO: string, hojeISO: string) {
  const dm = `${dataISO.slice(8, 10)}/${dataISO.slice(5, 7)}`;
  if (dataISO === hojeISO) return `Hoje, ${dm}`;
  if (dataISO === somarDiasISO(hojeISO, 1)) return `Amanhã, ${dm}`;
  return `${DIAS_SEMANA_COMPLETO[diaDaSemanaISO(dataISO)]}, ${dm}`;
}

/**
 * Mensagem para colar no WhatsApp da cliente (sem saudacao: a conversa ja
 * esta acontecendo), uma linha por dia:
 *
 *   Para *Limpeza de pele* à tarde, tenho estes horários disponíveis:
 *
 *   📅 *Hoje, 16/11* – 15h
 *   📅 *Amanhã, 17/11* – 12h30 ou 16h
 *
 *   Qual fica melhor para você? Assim já deixo reservado. ✨
 *
 * (*texto* fica em negrito no WhatsApp.)
 */
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

  // Agrupa por dia: "📅 *Terça-feira, 17/11* – 10h ou 14h".
  const porDia = new Map<string, string[]>();
  for (const item of ordenarEscolhidos(escolhidos)) {
    porDia.set(item.data, [...(porDia.get(item.data) ?? []), horaFalada(item.hora)]);
  }
  const linhas = [...porDia.entries()].map(
    ([data, horas]) => `📅 *${diaParaCliente(data, hojeISO)}* – ${juntarComOu(horas)}`,
  );

  const um = escolhidos.length === 1;
  const nome = (procedimento || "").trim();
  const quando = periodo === "manha" ? " pela manhã" : periodo === "tarde" ? " à tarde" : "";
  const oferta = um ? "tenho este horário disponível" : "tenho estes horários disponíveis";
  const abertura = nome
    ? `Para *${nome}*${quando}, ${oferta}:`
    : `${oferta.charAt(0).toUpperCase()}${oferta.slice(1)}${quando}:`;
  const pergunta = um
    ? "Fica bom para você? Assim já deixo reservado. ✨"
    : "Qual fica melhor para você? Assim já deixo reservado. ✨";

  return [abertura, "", ...linhas, "", pergunta].join("\n");
}
