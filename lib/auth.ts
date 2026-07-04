export function canAccess(usuario: any, permissaoChave: string) {
  if (usuario?.tipo?.toLowerCase() === "admin") return true;

  return Boolean(
    usuario?.perfil?.permissoes?.some(
      (p: any) => p?.permissao?.chave === permissaoChave
    )
  );
}

export function getUserPermissionKeys(usuario: any) {
  if (usuario?.tipo?.toLowerCase() === "admin") {
    return [];
  }

  return (
    usuario?.perfil?.permissoes?.map(
      (p: any) => p?.permissao?.chave
    ) ?? []
  );
}