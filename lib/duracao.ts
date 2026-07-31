export const DURACAO_MINIMA_MINUTOS = 5;
export const DURACAO_MAXIMA_MINUTOS = 12 * 60;

function limitarDuracao(minutos: number) {
  if (!Number.isFinite(minutos)) return 60;

  return Math.min(
    DURACAO_MAXIMA_MINUTOS,
    Math.max(DURACAO_MINIMA_MINUTOS, Math.round(minutos)),
  );
}

export function formatarDuracao(minutos?: number | null) {
  const total = limitarDuracao(Number(minutos) || 60);
  const horas = Math.floor(total / 60);
  const minutosRestantes = total % 60;

  if (horas === 0) {
    return `${minutosRestantes} min`;
  }

  if (minutosRestantes === 0) {
    return horas === 1 ? "1 hora" : `${horas} horas`;
  }

  return `${horas}h${String(minutosRestantes).padStart(2, "0")}`;
}

export function interpretarDuracao(
  valor: string | number | null | undefined,
  fallbackMinutos = 60,
) {
  if (typeof valor === "number") {
    return limitarDuracao(valor);
  }

  const original = String(valor ?? "").trim().toLowerCase();
  if (!original) return limitarDuracao(fallbackMinutos);

  const normalizado = original
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

  const horario = normalizado.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);
  if (horario) {
    return limitarDuracao(Number(horario[1]) * 60 + Number(horario[2]));
  }

  const horasComMinutos = normalizado.match(
    /^(\d+(?:[.,]\d+)?)\s*(?:h|hora|horas)(?:\s*(\d{1,2})\s*(?:m|min|minuto|minutos)?)?$/,
  );
  if (horasComMinutos) {
    const horas = Number(horasComMinutos[1].replace(",", "."));
    const minutos = Number(horasComMinutos[2] || 0);
    return limitarDuracao(horas * 60 + minutos);
  }

  const somenteMinutos = normalizado.match(
    /^(\d+(?:[.,]\d+)?)\s*(?:m|min|minuto|minutos)$/,
  );
  if (somenteMinutos) {
    return limitarDuracao(Number(somenteMinutos[1].replace(",", ".")));
  }

  const numeroPuro = Number(normalizado.replace(",", "."));
  if (Number.isFinite(numeroPuro)) {
    return limitarDuracao(numeroPuro <= 12 ? numeroPuro * 60 : numeroPuro);
  }

  const compacto = normalizado.match(/^(\d{1,2})h(\d{1,2})$/);
  if (compacto) {
    return limitarDuracao(Number(compacto[1]) * 60 + Number(compacto[2]));
  }

  return limitarDuracao(fallbackMinutos);
}
