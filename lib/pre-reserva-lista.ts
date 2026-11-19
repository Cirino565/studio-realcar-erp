import { decodificarMensagemModelo } from "@/lib/mensagem-modelo.server";
import { prisma } from "@/lib/prisma";
import {
  DIAS_ALERTA,
  DIAS_PARA_CONFIRMAR,
  PRE_RESERVA_PENDENTE,
  type PreReservaParaConfirmar,
} from "@/lib/pre-reserva";

export type PreReservasDaAgenda = {
  itens: PreReservaParaConfirmar[];
  modelo: string | null;
  clinica: string;
};

/**
 * Pre-reservas que ja precisam de confirmacao (de agora ate 7 dias pra
 * frente). Consulta pequena, pelo indice (preReserva, data).
 */
export async function listarPreReservasParaConfirmar(): Promise<PreReservasDaAgenda> {
  const agora = new Date();
  const limite = new Date(agora.getTime() + (DIAS_PARA_CONFIRMAR + 1) * 86_400_000);
  const alerta = agora.getTime() + DIAS_ALERTA * 86_400_000;

  const [itens, modelo, configuracao] = await Promise.all([
    prisma.agendamento.findMany({
      where: {
        preReserva: PRE_RESERVA_PENDENTE,
        data: { gte: agora, lt: limite },
        status: { notIn: ["Cancelado", "Faltou", "Atendido", "Finalizado"] },
      },
      orderBy: { data: "asc" },
      take: 100,
      select: {
        id: true,
        clienteId: true,
        procedimento: true,
        naturezaAtendimento: true,
        data: true,
        cliente: { select: { nome: true, telefone: true, whatsapp: true } },
      },
    }),
    prisma.mensagemModelo.findUnique({
      where: { chave: "confirmar_pre_reserva" },
      select: { corpo: true, ativo: true },
    }),
    prisma.configuracaoClinica.findFirst({ select: { nome: true } }),
  ]);

  return {
    itens: itens.map((item) => ({
      id: item.id,
      clienteId: item.clienteId,
      clienteNome: item.cliente.nome,
      telefone: item.cliente.whatsapp || item.cliente.telefone || null,
      procedimento: item.procedimento,
      retorno: item.naturezaAtendimento === "RETORNO",
      data: item.data.toISOString(),
      urgente: item.data.getTime() <= alerta,
    })),
    modelo: modelo?.ativo ? decodificarMensagemModelo(modelo.corpo) : null,
    clinica: configuracao?.nome || "Studio Realçar",
  };
}
