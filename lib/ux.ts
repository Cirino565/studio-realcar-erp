export function getAssistencialModules(user: any) {
  const modules = [];

  if (user.perfil?.permissoes?.some(p => p.permissao.chave === "clientes.visualizar")) {
    modules.push("clientes");
  }

  if (user.perfil?.permissoes?.some(p => p.permissao.chave === "agenda.visualizar")) {
    modules.push("agenda");
  }

  return modules;
}