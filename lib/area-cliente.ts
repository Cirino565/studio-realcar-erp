export type AreaPadraoAgendamento = "estetica" | "cilios" | null;

function normalizarTexto(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
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
