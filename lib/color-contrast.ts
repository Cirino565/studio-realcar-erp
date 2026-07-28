const NAMED_COLORS: Record<string, string> = {
  amber: "#f59e0b",
  amarelo: "#facc15",
  azul: "#2563eb",
  black: "#0f172a",
  branco: "#ffffff",
  blue: "#2563eb",
  cinza: "#64748b",
  gray: "#64748b",
  green: "#0f766e",
  laranja: "#ea580c",
  orange: "#ea580c",
  pink: "#db2777",
  preto: "#0f172a",
  purple: "#7c3aed",
  red: "#be123c",
  rose: "#be123c",
  roxo: "#7c3aed",
  teal: "#0f766e",
  verde: "#0f766e",
  vermelho: "#be123c",
  violet: "#7c3aed",
  white: "#ffffff",
  yellow: "#facc15",
};

type RgbColor = {
  red: number;
  green: number;
  blue: number;
};

function expandHex(value: string) {
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }

  return value;
}

export function normalizeAgendaColor(value?: string | null, fallback = "#7c3aed") {
  const normalized = (value || "").trim().toLowerCase();

  if (/^#[0-9a-f]{3}$/i.test(normalized) || /^#[0-9a-f]{6}$/i.test(normalized)) {
    return expandHex(normalized);
  }

  const namedColor = Object.entries(NAMED_COLORS).find(([name]) =>
    normalized.includes(name),
  )?.[1];

  return namedColor || fallback;
}

function hexToRgb(value: string): RgbColor {
  const normalized = normalizeAgendaColor(value).slice(1);

  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function toLinearChannel(value: number) {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(value: string) {
  const color = hexToRgb(value);

  return (
    0.2126 * toLinearChannel(color.red) +
    0.7152 * toLinearChannel(color.green) +
    0.0722 * toLinearChannel(color.blue)
  );
}

export function getReadableTextColor(value: string) {
  const backgroundLuminance = getRelativeLuminance(value);
  const darkTextLuminance = getRelativeLuminance("#0f172a");
  const lightContrast = 1.05 / (backgroundLuminance + 0.05);
  const darkContrast =
    (backgroundLuminance + 0.05) / (darkTextLuminance + 0.05);

  return darkContrast >= lightContrast ? "#0f172a" : "#ffffff";
}

export function withAlpha(value: string, alpha: number) {
  const color = hexToRgb(value);
  const safeAlpha = Math.min(1, Math.max(0, alpha));

  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${safeAlpha})`;
}

export function mixHexColors(first: string, second: string, secondWeight = 0.5) {
  const firstColor = hexToRgb(first);
  const secondColor = hexToRgb(second);
  const safeWeight = Math.min(1, Math.max(0, secondWeight));
  const firstWeight = 1 - safeWeight;

  const toHex = (channel: number) =>
    Math.round(channel).toString(16).padStart(2, "0");

  return `#${toHex(firstColor.red * firstWeight + secondColor.red * safeWeight)}${toHex(
    firstColor.green * firstWeight + secondColor.green * safeWeight,
  )}${toHex(firstColor.blue * firstWeight + secondColor.blue * safeWeight)}`;
}

export function getMutedTextColor(textColor: string) {
  return textColor === "#0f172a" ? "rgba(15, 23, 42, 0.82)" : "rgba(255, 255, 255, 0.90)";
}

export function getOverlayBackground(textColor: string) {
  return textColor === "#0f172a" ? "rgba(15, 23, 42, 0.08)" : "rgba(255, 255, 255, 0.16)";
}

export function getOverlayBorder(textColor: string) {
  return textColor === "#0f172a" ? "rgba(15, 23, 42, 0.22)" : "rgba(255, 255, 255, 0.34)";
}
