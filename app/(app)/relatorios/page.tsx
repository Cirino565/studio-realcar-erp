import { requirePagePermission } from "@/lib/auth";
import RelatoriosClient from "./components/RelatoriosClient";
import { prisma } from "@/lib/prisma";
import type { RelatoriosData } from "./types";

export default async function RelatoriosPage() {
  await requirePagePermission("relatorios.visualizar");
  const [clientes, agendamentos, lancamentos, produtos, leads, campanhas] =
    await Promise.all([
      prisma.cliente.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.agendamento.findMany({
        include: {
          cliente: {
            select: {
              nome: true,
              telefone: true,
              whatsapp: true,
            },
          },
        },
        orderBy: { data: "desc" },
      }),
      prisma.lancamento.findMany({ orderBy: { data: "desc" } }),
      prisma.produto.findMany({
        include: {
          fornecedor: {
            select: {
              nome: true,
            },
          },
        },
        orderBy: { nome: "asc" },
      }),
      prisma.lead.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.campanhaMarketing.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

  const data: RelatoriosData = {
    clientes: clientes.map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      whatsapp: cliente.whatsapp,
      status: cliente.status,
      procedimento: cliente.procedimento,
      valorGasto: cliente.valorGasto,
      ultimaVisita: cliente.ultimaVisita?.toISOString() ?? null,
      createdAt: cliente.createdAt.toISOString(),
    })),
    agendamentos: agendamentos.map((agendamento) => ({
      id: agendamento.id,
      clienteId: agendamento.clienteId,
      clienteNome: agendamento.cliente.nome,
      clienteTelefone: agendamento.cliente.telefone,
      clienteWhatsapp: agendamento.cliente.whatsapp,
      procedimento: agendamento.procedimento,
      data: agendamento.data.toISOString(),
      status: agendamento.status,
    })),
    lancamentos: lancamentos.map((lancamento) => ({
      id: lancamento.id,
      descricao: lancamento.descricao,
      valor: lancamento.valor,
      tipo: lancamento.tipo,
      categoria: lancamento.categoria,
      data: lancamento.data.toISOString(),
    })),
    produtos: produtos.map((produto) => ({
      id: produto.id,
      nome: produto.nome,
      categoria: produto.categoria,
      unidade: produto.unidade,
      quantidade: produto.quantidade,
      estoqueMinimo: produto.estoqueMinimo,
      valorCompra: produto.valorCompra,
      valorVenda: produto.valorVenda,
      status: produto.status,
      fornecedorNome: produto.fornecedor?.nome ?? null,
    })),
    leads: leads.map((lead) => ({
      id: lead.id,
      nome: lead.nome,
      origem: lead.origem,
      interesse: lead.interesse,
      etapa: lead.etapa,
      valorPrevisto: lead.valorPrevisto,
      createdAt: lead.createdAt.toISOString(),
    })),
    campanhas: campanhas.map((campanha) => ({
      id: campanha.id,
      nome: campanha.nome,
      canal: campanha.canal,
      investimento: campanha.investimento,
      leads: campanha.leads,
      status: campanha.status,
      inicio: campanha.inicio?.toISOString() ?? null,
      fim: campanha.fim?.toISOString() ?? null,
    })),
  };

  return <RelatoriosClient data={data} />;
}
