/**
 * Chave para comparar telefones escritos de jeitos diferentes:
 * "+55 11 91234-5678", "(11) 91234-5678" e "11 1234-5678" (sem o 9) viram a
 * mesma chave: DDD + os 8 ultimos digitos.
 */
export function chaveTelefone(valor?: string | null): string {
  let digitos = (valor || "").replace(/\D/g, "");
  // Codigo do pais (55) na frente.
  if (digitos.length >= 12 && digitos.startsWith("55")) digitos = digitos.slice(2);
  // Zero de operadora/interurbano na frente (011...).
  if (digitos.length >= 11 && digitos.startsWith("0")) digitos = digitos.slice(1);
  if (digitos.length === 11) return `${digitos.slice(0, 2)}${digitos.slice(3)}`;
  if (digitos.length === 10) return digitos;
  return digitos;
}

/** Telefone brasileiro valido (DDD + 8 ou 9 digitos). */
export function telefoneValido(valor?: string | null): boolean {
  return chaveTelefone(valor).length === 10;
}

/** "(11) 91234-5678" a partir de qualquer formato. */
export function formatarTelefoneNacional(valor?: string | null): string {
  let digitos = (valor || "").replace(/\D/g, "");
  if (digitos.length >= 12 && digitos.startsWith("55")) digitos = digitos.slice(2);
  if (digitos.length >= 11 && digitos.startsWith("0")) digitos = digitos.slice(1);
  if (digitos.length === 11) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  if (digitos.length === 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return (valor || "").trim();
}
