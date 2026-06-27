import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const permissoesPadrao = [
  { modulo: "Dashboard", nome: "Visualizar dashboard", chave: "dashboard.visualizar" },
  { modulo: "Clientes", nome: "Visualizar clientes", chave: "clientes.visualizar" },
  { modulo: "Clientes", nome: "Gerenciar clientes", chave: "clientes.gerenciar" },
  { modulo: "Clientes", nome: "Gerenciar ficha clínica", chave: "clientes.clinico" },
  { modulo: "Agenda", nome: "Visualizar agenda", chave: "agenda.visualizar" },
  { modulo: "Agenda", nome: "Gerenciar agendamentos", chave: "agenda.gerenciar" },
  { modulo: "Financeiro", nome: "Visualizar financeiro", chave: "financeiro.visualizar" },
  { modulo: "Financeiro", nome: "Gerenciar financeiro", chave: "financeiro.gerenciar" },
  { modulo: "Estoque", nome: "Visualizar estoque", chave: "estoque.visualizar" },
  { modulo: "Estoque", nome: "Gerenciar estoque", chave: "estoque.gerenciar" },
  { modulo: "Relatórios", nome: "Visualizar relatórios", chave: "relatorios.visualizar" },
  { modulo: "Marketing", nome: "Visualizar marketing", chave: "marketing.visualizar" },
  { modulo: "Marketing", nome: "Gerenciar marketing", chave: "marketing.gerenciar" },
  { modulo: "Configurações", nome: "Gerenciar configurações", chave: "configuracoes.gerenciar" },
  { modulo: "Usuários", nome: "Gerenciar usuários", chave: "usuarios.gerenciar" },
  { modulo: "Permissões", nome: "Gerenciar permissões", chave: "permissoes.gerenciar" },
  { modulo: "Auditoria", nome: "Visualizar auditoria", chave: "auditoria.visualizar" },
  { modulo: "Backup", nome: "Gerenciar backup", chave: "backup.gerenciar" },
  { modulo: "Automações", nome: "Gerenciar automações", chave: "automacoes.gerenciar" },
];

function getSeedPassword(envName: string, fallback: string) {
  const password = process.env[envName]?.trim() || fallback;

  if (process.env.NODE_ENV === "production" && password.length < 8) {
    throw new Error(`${envName} precisa ter pelo menos 8 caracteres em produção.`);
  }

  if (password.length < 6) {
    throw new Error(`${envName} precisa ter pelo menos 6 caracteres.`);
  }

  return password;
}

function getAdminPassword() {
  return getSeedPassword("ADMIN_PASSWORD", "123456");
}

function getOperationalPassword() {
  return getSeedPassword("OPERATIONAL_PASSWORD", "123456");
}

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@studiorealcar.com").trim().toLowerCase();
  const adminName = (process.env.ADMIN_NAME || "Administrador").trim();
  const adminPassword = getAdminPassword();
  const operationalEmail = (process.env.OPERATIONAL_EMAIL || "operacional@studiorealcar.com").trim().toLowerCase();
  const operationalName = (process.env.OPERATIONAL_NAME || "Operacional").trim();
  const operationalPassword = getOperationalPassword();
  const senhaHash = await bcrypt.hash(adminPassword, 10);
  const senhaOperacionalHash = await bcrypt.hash(operationalPassword, 10);

  // SQLite não aceita skipDuplicates em createMany em algumas versões do Prisma.
  // Por isso usamos upsert item a item, mantendo o seed idempotente em SQLite e PostgreSQL.
  for (const permissao of permissoesPadrao) {
    await prisma.permissao.upsert({
      where: { chave: permissao.chave },
      update: { nome: permissao.nome, modulo: permissao.modulo },
      create: permissao,
    });
  }

  const perfilAdmin = await prisma.perfil.upsert({
    where: { nome: "Administrador" },
    update: {
      descricao: "Acesso total ao ERP.",
      nivel: 5,
      status: "Ativo",
    },
    create: {
      nome: "Administrador",
      descricao: "Acesso total ao ERP.",
      nivel: 5,
      status: "Ativo",
    },
  });

  const permissoes = await prisma.permissao.findMany({
    where: { chave: { in: permissoesPadrao.map((permissao) => permissao.chave) } },
    select: { id: true, chave: true },
  });

  for (const permissao of permissoes) {
    const existente = await prisma.perfilPermissao.findFirst({
      where: { perfilId: perfilAdmin.id, permissaoId: permissao.id },
      select: { id: true },
    });

    if (!existente) {
      await prisma.perfilPermissao.create({
        data: { perfilId: perfilAdmin.id, permissaoId: permissao.id },
      });
    }
  }

  const perfilOperacional = await prisma.perfil.upsert({
    where: { nome: "Operacional" },
    update: {
      descricao: "Acesso restrito para atendimento: agenda, clientes e ficha clínica.",
      nivel: 1,
      status: "Ativo",
    },
    create: {
      nome: "Operacional",
      descricao: "Acesso restrito para atendimento: agenda, clientes e ficha clínica.",
      nivel: 1,
      status: "Ativo",
    },
  });

  const permissoesOperacionais = permissoes.filter((permissao) =>
    ["agenda.visualizar", "agenda.gerenciar", "clientes.visualizar", "clientes.gerenciar", "clientes.clinico"].includes(permissao.chave),
  );

  for (const permissao of permissoesOperacionais) {
    const existente = await prisma.perfilPermissao.findFirst({
      where: { perfilId: perfilOperacional.id, permissaoId: permissao.id },
      select: { id: true },
    });

    if (!existente) {
      await prisma.perfilPermissao.create({
        data: { perfilId: perfilOperacional.id, permissaoId: permissao.id },
      });
    }
  }

  const resetPassword = process.env.ADMIN_RESET_PASSWORD === "true";
  const resetOperationalPassword = process.env.OPERATIONAL_RESET_PASSWORD === "true";

  const admin = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {
      nome: adminName,
      tipo: "Admin",
      status: "Ativo",
      cargo: "Administrador do Sistema",
      perfilId: perfilAdmin.id,
      ...(resetPassword ? { senha: senhaHash } : {}),
    },
    create: {
      nome: adminName,
      email: adminEmail,
      senha: senhaHash,
      tipo: "Admin",
      status: "Ativo",
      cargo: "Administrador do Sistema",
      perfilId: perfilAdmin.id,
    },
  });

  const operacional = await prisma.usuario.upsert({
    where: { email: operationalEmail },
    update: {
      nome: operationalName,
      tipo: "Equipe",
      status: "Ativo",
      cargo: "Operacional",
      perfilId: perfilOperacional.id,
      ...(resetOperationalPassword ? { senha: senhaOperacionalHash } : {}),
    },
    create: {
      nome: operationalName,
      email: operationalEmail,
      senha: senhaOperacionalHash,
      tipo: "Equipe",
      status: "Ativo",
      cargo: "Operacional",
      perfilId: perfilOperacional.id,
    },
  });

  await prisma.configuracaoClinica.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nome: "Studio Realçar",
      timezone: "America/Sao_Paulo",
      moeda: "BRL",
      corPrincipal: "violet",
    },
  });

  console.log(
    `Seed concluído. Admin: ${admin.email}. Operacional: ${operacional.email}. Perfis: ${perfilAdmin.nome}/${perfilOperacional.nome}. Permissões: ${permissoes.length}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
