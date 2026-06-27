import Link from "next/link";
import {
  ArrowLeft,
  AtSign,
  BadgeDollarSign,
  CalendarDays,
  Clock3,
  FileText,
  HeartPulse,
  MessageCircle,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";

import { ClienteClinicoTabs } from "../components/ClienteClinicoTabs";
import type { ClienteClinicoData } from "../types";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";
import { formatarData, formatarDataHora, formatarMoeda } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { buildClientWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { canAccess, requirePagePermission } from "@/lib/auth";

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    aba?: string;
  }>;
};

function getInitials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function toIso(date: Date) {
  return date.toISOString();
}

export default async function ClientePerfilPage({ params, searchParams }: Props) {
  const usuarioAtual = await requirePagePermission("clientes.visualizar");
  const podeVerClinico = canAccess(usuarioAtual, "clientes.clinico");
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const abaParam = resolvedSearchParams.aba;
  const initialTab = ["anamnese", "fotos", "evolucao", "procedimentos", "documentos"].includes(abaParam ?? "")
    ? (abaParam as "anamnese" | "fotos" | "evolucao" | "procedimentos" | "documentos")
    : "anamnese";

  const cliente = await prisma.cliente.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      agendamentos: {
        orderBy: {
          data: "desc",
        },
        take: 8,
      },
      ...(podeVerClinico
        ? {
            anamneses: { orderBy: { updatedAt: "desc" as const } },
            fotos: { orderBy: { dataRegistro: "desc" as const } },
            documentos: { orderBy: { dataRegistro: "desc" as const } },
            procedimentos: { orderBy: { dataProcedimento: "desc" as const } },
            evolucoes: { orderBy: { dataRegistro: "desc" as const } },
            anamneseRespostas: { orderBy: { dataResposta: "desc" as const } },
          }
        : {}),
    },
  }) as any;

  const anamneseModelos = podeVerClinico ? await prisma.anamneseModelo.findMany({
    where: { status: "Ativo" },
    include: {
      perguntas: {
        where: { ativa: true },
        orderBy: [{ ordem: "asc" }, { id: "asc" }],
      },
    },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
  }) : [];

  if (!cliente) {
    return (
      <div className="premium-card p-10 text-center text-white">
        <h1 className="text-xl font-semibold">Cliente não encontrado</h1>
        <p className="mt-2 text-sm text-slate-400">
          O cadastro solicitado não existe ou foi removido.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/clientes">Voltar para clientes</Link>
        </Button>
      </div>
    );
  }

  const anamneses = podeVerClinico ? cliente.anamneses ?? [] : [];
  const fotos = podeVerClinico ? cliente.fotos ?? [] : [];
  const documentos = podeVerClinico ? cliente.documentos ?? [] : [];
  const procedimentosClinicos = podeVerClinico ? cliente.procedimentos ?? [] : [];
  const evolucoes = podeVerClinico ? cliente.evolucoes ?? [] : [];
  const anamneseRespostas = podeVerClinico ? cliente.anamneseRespostas ?? [] : [];
  const anamnese = anamneses[0] ?? null;
  const proximoAgendamento = cliente.agendamentos.find(
    (agendamento) => new Date(agendamento.data) >= new Date()
  );
  const ultimoAgendamento = cliente.agendamentos[0] ?? null;
  const telefonePreferencial = cliente.whatsapp || cliente.telefone;
  const mensagemRelacionamento = buildClientWhatsAppMessage({
    template: "returnInvite",
    clientName: cliente.nome,
  });
  const whatsappUrl = buildWhatsAppUrl(telefonePreferencial, mensagemRelacionamento);

  const valorClinicoRegistrado = procedimentosClinicos.reduce(
    (total: number, procedimento: { valor: number }) => total + procedimento.valor,
    0
  );
  const valorTotalCliente = Math.max(cliente.valorGasto, valorClinicoRegistrado);

  const clinicoData: ClienteClinicoData = {
    id: cliente.id,
    nome: cliente.nome,
    anamnese: anamnese
      ? {
          id: anamnese.id,
          procedimento: anamnese.procedimento,
          queixaPrincipal: anamnese.queixaPrincipal,
          alergias: anamnese.alergias,
          medicamentos: anamnese.medicamentos,
          doencasPreExistentes: anamnese.doencasPreExistentes,
          procedimentosAnteriores: anamnese.procedimentosAnteriores,
          gestante: anamnese.gestante,
          lactante: anamnese.lactante,
          usaAcidos: anamnese.usaAcidos,
          possuiMarcapasso: anamnese.possuiMarcapasso,
          restricoes: anamnese.restricoes,
          objetivoTratamento: anamnese.objetivoTratamento,
          observacoesClinicas: anamnese.observacoesClinicas,
          respostasRapidas: anamnese.respostasRapidas,
          assinaturaCliente: anamnese.assinaturaCliente,
          termoConsentimento: anamnese.termoConsentimento,
          profissional: anamnese.profissional,
          dataFicha: toIso(anamnese.dataFicha),
          updatedAt: toIso(anamnese.updatedAt),
        }
      : null,
    anamneses: anamneses.map((ficha) => ({
      id: ficha.id,
      procedimento: ficha.procedimento,
      queixaPrincipal: ficha.queixaPrincipal,
      alergias: ficha.alergias,
      medicamentos: ficha.medicamentos,
      doencasPreExistentes: ficha.doencasPreExistentes,
      procedimentosAnteriores: ficha.procedimentosAnteriores,
      gestante: ficha.gestante,
      lactante: ficha.lactante,
      usaAcidos: ficha.usaAcidos,
      possuiMarcapasso: ficha.possuiMarcapasso,
      restricoes: ficha.restricoes,
      objetivoTratamento: ficha.objetivoTratamento,
      observacoesClinicas: ficha.observacoesClinicas,
      respostasRapidas: ficha.respostasRapidas,
      assinaturaCliente: ficha.assinaturaCliente,
      termoConsentimento: ficha.termoConsentimento,
      profissional: ficha.profissional,
      dataFicha: toIso(ficha.dataFicha),
      updatedAt: toIso(ficha.updatedAt),
    })),
    fotos: fotos.map((foto) => ({
      id: foto.id,
      titulo: foto.titulo,
      tipo: foto.tipo,
      url: foto.url,
      descricao: foto.descricao,
      dataRegistro: toIso(foto.dataRegistro),
    })),
    documentos: documentos.map((documento) => ({
      id: documento.id,
      titulo: documento.titulo,
      tipo: documento.tipo,
      url: documento.url,
      observacoes: documento.observacoes,
      dataRegistro: toIso(documento.dataRegistro),
    })),
    procedimentos: procedimentosClinicos.map((procedimento) => ({
      id: procedimento.id,
      nome: procedimento.nome,
      profissional: procedimento.profissional,
      valor: procedimento.valor,
      status: procedimento.status,
      dataProcedimento: toIso(procedimento.dataProcedimento),
      observacoes: procedimento.observacoes,
    })),
    evolucoes: evolucoes.map((evolucao) => ({
      id: evolucao.id,
      titulo: evolucao.titulo,
      descricao: evolucao.descricao,
      profissional: evolucao.profissional,
      dataRegistro: toIso(evolucao.dataRegistro),
    })),
    anamneseModelos: anamneseModelos.map((modelo) => ({
      id: modelo.id,
      nome: modelo.nome,
      procedimentoNome: modelo.procedimentoNome,
      status: modelo.status,
      perguntas: modelo.perguntas.map((pergunta) => ({
        id: pergunta.id,
        modeloId: pergunta.modeloId,
        pergunta: pergunta.pergunta,
        tipo: pergunta.tipo,
        opcoes: pergunta.opcoes,
        obrigatoria: pergunta.obrigatoria,
        ativa: pergunta.ativa,
        ordem: pergunta.ordem,
      })),
    })),
    anamneseRespostas: anamneseRespostas.map((resposta) => ({
      id: resposta.id,
      procedimento: resposta.procedimento,
      perguntaTexto: resposta.perguntaTexto,
      tipo: resposta.tipo,
      resposta: resposta.resposta,
      observacao: resposta.observacao,
      profissional: resposta.profissional,
      dataResposta: toIso(resposta.dataResposta),
    })),
  };

  const metricas = [
    {
      titulo: "Valor gasto",
      valor: formatarMoeda(valorTotalCliente),
      detalhe: "Histórico financeiro e clínico",
      icon: BadgeDollarSign,
    },
    {
      titulo: "Agendamentos",
      valor: cliente.agendamentos.length.toString(),
      detalhe: "Últimos registros listados",
      icon: CalendarDays,
    },
    ...(podeVerClinico
      ? [
          {
            titulo: "Ficha clínica",
            valor: anamnese ? "Completa" : "Pendente",
            detalhe: anamnese ? `Atualizada em ${formatarData(anamnese.updatedAt)}` : "Anamnese ainda não preenchida",
            icon: HeartPulse,
          },
        ]
      : []),
    {
      titulo: "Última visita",
      valor: formatarData(cliente.ultimaVisita),
      detalhe: ultimoAgendamento?.procedimento || "Sem procedimento recente",
      icon: Clock3,
    },
  ];

  return (
    <div className="app-mobile-safe space-y-5 sm:space-y-6">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:flex sm:items-center sm:justify-between">
        <Button variant="ghost" asChild className="w-full justify-center sm:w-auto">
          <Link href="/clientes">
            <ArrowLeft size={17} />
            Voltar para clientes
          </Link>
        </Button>

        <Button asChild className="w-full justify-center sm:w-auto">
          <WhatsAppLink href={whatsappUrl}>
            <MessageCircle size={17} />
            Abrir WhatsApp
          </WhatsAppLink>
        </Button>
      </div>

      <section className="premium-card relative overflow-hidden p-5 sm:p-8">
        <div className="absolute right-0 top-0 size-72 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 size-56 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex size-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-3xl font-bold text-white shadow-2xl shadow-violet-950/30 sm:size-28">
              {getInitials(cliente.nome)}
            </div>

            <div className="min-w-0">
              <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.05] px-3 py-1 text-xs font-medium text-slate-300">
                <UserRound size={14} />
                Perfil completo do cliente
              </div>
              <h1 className="break-words text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                {cliente.nome}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                {cliente.procedimentoInteresse || cliente.procedimento || "Procedimento de interesse ainda não informado"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                    cliente.status === "Ativa"
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                      : "border-rose-400/20 bg-rose-400/10 text-rose-300"
                  }`}
                >
                  {cliente.status}
                </span>
                {podeVerClinico && (
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      anamnese?.termoConsentimento
                        ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                        : "border-amber-400/20 bg-amber-400/10 text-amber-200"
                    }`}
                  >
                    {anamnese?.termoConsentimento ? "Consentimento registrado" : "Consentimento pendente"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:w-[420px]">
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4">
              <p className="text-xs text-slate-500">Telefone</p>
              <p className="mt-2 flex items-center gap-2 truncate text-sm font-semibold text-white">
                <Phone size={15} className="text-slate-500" />
                {cliente.telefone || "-"}
              </p>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4">
              <p className="text-xs text-slate-500">Origem</p>
              <p className="mt-2 flex items-center gap-2 truncate text-sm font-semibold text-white">
                <AtSign size={15} className="text-slate-500" />
                {cliente.origem || "Não informada"}
              </p>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4 sm:col-span-2">
              <p className="text-xs text-slate-500">Procedimento de interesse</p>
              <p className="mt-2 flex items-center gap-2 truncate text-sm font-semibold text-white">
                <Sparkles size={15} className="text-slate-500" />
                {cliente.procedimentoInteresse || cliente.procedimento || "Não informado"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricas.map((metrica) => {
          const Icon = metrica.icon;

          return (
            <div key={metrica.titulo} className="premium-card-soft p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">{metrica.titulo}</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    {metrica.valor}
                  </h2>
                  <p className="mt-2 line-clamp-1 text-xs text-slate-500">
                    {metrica.detalhe}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.06] p-3 text-white">
                  <Icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {podeVerClinico ? (
        <ClienteClinicoTabs data={clinicoData} initialTab={initialTab} />
      ) : (
        <section className="premium-card-soft p-5">
          <h2 className="text-lg font-semibold text-white">Ficha clínica restrita</h2>
          <p className="mt-2 text-sm text-slate-400">
            Este perfil pode acessar cadastro, contato e histórico de agenda do cliente. Anamnese, fotos,
            documentos e evoluções clínicas ficam disponíveis apenas para perfis com permissão clínica.
          </p>
        </section>
      )}

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="premium-card overflow-hidden">
          <div className="border-b border-white/[0.08] p-6">
            <h2 className="text-xl font-semibold text-white">
              Histórico de agendamentos
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Últimos atendimentos e próximos horários vinculados ao cliente.
            </p>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {cliente.agendamentos.length > 0 ? (
              cliente.agendamentos.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="grid gap-3 p-5 transition hover:bg-white/[0.025] sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {agendamento.procedimento}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatarDataHora(agendamento.data)}
                    </p>
                    {agendamento.observacoes && (
                      <p className="mt-2 text-sm text-slate-500">
                        {agendamento.observacoes}
                      </p>
                    )}
                  </div>

                  <span className="w-fit rounded-full border border-white/[0.10] bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-300">
                    {agendamento.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <CalendarDays className="mx-auto text-slate-500" />
                <h3 className="mt-4 font-semibold text-white">
                  Sem agendamentos ainda
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Assim que houver atendimentos, o histórico aparecerá aqui.
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="premium-card-soft p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-3 text-violet-200">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-white">Próxima ação</h2>
                <p className="text-sm text-slate-400">Relacionamento ativo</p>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4">
              <p className="text-xs text-slate-500">Próximo agendamento</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {proximoAgendamento
                  ? proximoAgendamento.procedimento
                  : "Nenhum horário futuro"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {proximoAgendamento
                  ? formatarDataHora(proximoAgendamento.data)
                  : "Use o WhatsApp para convidar o cliente a retornar."}
              </p>
            </div>

            <Button className="mt-5 w-full" asChild>
              <WhatsAppLink href={whatsappUrl}>
                <MessageCircle size={17} />
                Enviar mensagem
              </WhatsAppLink>
            </Button>
          </div>

          <div className="premium-card-soft p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-3 text-slate-300">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-white">Observações</h2>
                <p className="text-sm text-slate-400">Notas do cadastro</p>
              </div>
            </div>

            <p className="mt-5 whitespace-pre-wrap rounded-3xl border border-white/[0.08] bg-white/[0.035] p-4 text-sm leading-6 text-slate-300">
              {cliente.observacoes || "Nenhuma observação cadastrada."}
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
