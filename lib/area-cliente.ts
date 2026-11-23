export type AreaPadraoAgendamento = "estetica" | "cilios" | null;

function normalizarTexto(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Area de quem vai atender: pelo campo "area" da profissional (Estetica /
 * Cilios) ou, sem ele, pelo nome (Vivian = estetica, Gabriely = cilios).
 */
export function areaDaProfissional(
  profissional?: { nome?: string | null; area?: string | null } | null,
): AreaPadraoAgendamento {
  if (!profissional) return null;
  const area = normalizarTexto(profissional.area);
  if (area.includes("estet")) return "estetica";
  if (area.includes("cili")) return "cilios";
  return obterAreaPadraoAgendamento(profissional.nome, false);
}

export function obterAreaPadraoAgendamento(
  nomeUsuario?: string | null,
  usuarioAdmin = false,
): AreaPadraoAgendamento {
  if (usuarioAdmin) return null;

  const nome = normalizarTexto(nomeUsuario);

  if (nome.includes("vivian")) return "estetica";
  if (nome.includes("gabriely") || nome.includes("gabrieli")) return "cilios";

  return null;
}
