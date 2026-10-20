/**
 * Feriados que aparecem na Agenda (Studio Realcar, Taboao da Serra - SP).
 *
 * Calculados sozinhos para qualquer ano: os fixos (Natal, Finados...) e os que
 * mudam todo ano conforme a Pascoa (Carnaval, Sexta-feira Santa, Corpus
 * Christi). So servem de aviso visual: nao bloqueiam horario nenhum.
 *
 * Para incluir ou tirar um feriado, mexa nas listas abaixo.
 */

export type TipoFeriado = "nacional" | "estadual" | "municipal" | "facultativo";

export type Feriado = {
  data: string; // "2026-11-02"
  nome: string;
  tipo: TipoFeriado;
};

// Dia e mes fixos.
const FIXOS: Array<{ mes: number; dia: number; nome: string; tipo: TipoFeriado }> = [
  { mes: 1, dia: 1, nome: "Confraternização Universal", tipo: "nacional" },
  { mes: 2, dia: 19, nome: "Aniversário de Taboão da Serra", tipo: "municipal" },
  { mes: 4, dia: 21, nome: "Tiradentes", tipo: "nacional" },
  { mes: 5, dia: 1, nome: "Dia do Trabalho", tipo: "nacional" },
  { mes: 7, dia: 9, nome: "Revolução Constitucionalista", tipo: "estadual" },
  { mes: 9, dia: 7, nome: "Independência do Brasil", tipo: "nacional" },
  { mes: 10, dia: 1, nome: "Amor Misericordioso de Deus (Taboão)", tipo: "municipal" },
  { mes: 10, dia: 12, nome: "Nossa Senhora Aparecida", tipo: "nacional" },
  { mes: 11, dia: 2, nome: "Finados", tipo: "nacional" },
  { mes: 11, dia: 15, nome: "Proclamação da República", tipo: "nacional" },
  { mes: 11, dia: 20, nome: "Consciência Negra", tipo: "nacional" },
  { mes: 12, dia: 25, nome: "Natal", tipo: "nacional" },
];

// Dias contados a partir do domingo de Pascoa.
const MOVEIS: Array<{ deslocamento: number; nome: string; tipo: TipoFeriado }> = [
  { deslocamento: -48, nome: "Carnaval", tipo: "facultativo" },
  { deslocamento: -47, nome: "Carnaval", tipo: "facultativo" },
  { deslocamento: -2, nome: "Sexta-feira Santa", tipo: "nacional" },
  { deslocamento: 60, nome: "Corpus Christi", tipo: "municipal" },
];

const ROTULO_TIPO: Record<TipoFeriado, string> = {
  nacional: "feriado nacional",
  estadual: "feriado estadual",
  municipal: "feriado municipal",
  facultativo: "ponto facultativo",
};

export function rotuloTipoFeriado(tipo: TipoFeriado) {
  return ROTULO_TIPO[tipo];
}

function chave(ano: number, mes: number, dia: number) {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Domingo de Pascoa (calendario gregoriano, metodo de Meeus/Butcher). */
export function domingoDePascoa(ano: number): { mes: number; dia: number } {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return { mes, dia };
}

const cache = new Map<number, Map<string, Feriado>>();

export function feriadosDoAno(ano: number): Map<string, Feriado> {
  const pronto = cache.get(ano);
  if (pronto) return pronto;

  const mapa = new Map<string, Feriado>();
  for (const item of FIXOS) {
    const data = chave(ano, item.mes, item.dia);
    mapa.set(data, { data, nome: item.nome, tipo: item.tipo });
  }

  const pascoa = domingoDePascoa(ano);
  const base = Date.UTC(ano, pascoa.mes - 1, pascoa.dia);
  for (const item of MOVEIS) {
    const dia = new Date(base + item.deslocamento * 86_400_000);
    const data = chave(dia.getUTCFullYear(), dia.getUTCMonth() + 1, dia.getUTCDate());
    if (!mapa.has(data)) mapa.set(data, { data, nome: item.nome, tipo: item.tipo });
  }

  cache.set(ano, mapa);
  return mapa;
}

/** Feriado do dia ("2026-11-02"), ou null. */
export function feriadoDoDia(dia: string): Feriado | null {
  const ano = Number(dia.slice(0, 4));
  if (!Number.isInteger(ano) || ano < 1900 || ano > 2200) return null;
  return feriadosDoAno(ano).get(dia.slice(0, 10)) ?? null;
}
