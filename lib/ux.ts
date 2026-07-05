type PermissaoDoPerfil = {
  permissao: {
    chave: string;
  };
};

type UsuarioUx = {
  perfil?: {
    permissoes?: PermissaoDoPerfil[];
  } | null;
};

function temPermissao(user: UsuarioUx, chave: string) {
  return (
    user.perfil?.permissoes?.some(
      (p: PermissaoDoPerfil) => p.permissao.chave === chave,
    ) ?? false
  );
}

export function getAssistencialModules(user: UsuarioUx) {
  const modules: string[] = [];

  if (temPermissao(user, "clientes.visualizar")) {
    modules.push("clientes");
  }

  if (temPermissao(user, "agenda.visualizar")) {
    modules.push("agenda");
  }

  return modules;
}