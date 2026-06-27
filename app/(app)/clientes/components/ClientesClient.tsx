"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, UsersRound } from "lucide-react";

import ClienteSearch from "@/components/clientes/ClienteSearch";
import ClienteResumo from "@/components/clientes/ClientesResumo";
import ClienteTable from "@/components/clientes/ClienteTable";
import NovoClienteModal from "@/components/clientes/NovoClienteModal";
import { Button } from "@/components/ui/button";

import type { Cliente } from "@/lib/types";
import type { OrigemCliente, ProcedimentoInteresse } from "@prisma/client";

import {
  atualizarCliente,
  criarCliente,
  excluirCliente,
} from "@/actions/cliente.actions";
import ClienteQuickMessageModal from "./ClienteQuickMessageModal";

type ClienteAgendamentoResumo = {
  id: number;
  procedimento: string;
  data: Date | string;
  status: string;
};

type ClienteComHistorico = Cliente & {
  agendamentos?: ClienteAgendamentoResumo[];
};

type Props = {
  clientes: ClienteComHistorico[];
  origens: OrigemCliente[];
  procedimentosInteresse: ProcedimentoInteresse[];
};

type ClienteFormData = {
  nome: string;
  telefone: string;
  whatsapp: string;
  cpf: string;
  instagram: string;
  origem: string;
  procedimentoInteresse: string;
  nascimento: string;
  observacoes: string;
};

export default function ClientesClient({ clientes, origens, procedimentosInteresse }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("nome-asc");
  const [procedimentoFiltro, setProcedimentoFiltro] = useState("todos");
  const [retornoFiltro, setRetornoFiltro] = useState("todos");
  const [modalAberto, setModalAberto] = useState(false);
  const [mensagemAberta, setMensagemAberta] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] =
    useState<Cliente | null>(null);
  const [clienteMensagem, setClienteMensagem] = useState<Cliente | null>(null);

  const procedimentosRealizados = useMemo(() => {
    const nomes = new Set<string>();

    clientes.forEach((cliente) => {
      cliente.agendamentos?.forEach((agendamento) => {
        if (agendamento.status !== "Cancelado" && agendamento.procedimento) {
          nomes.add(agendamento.procedimento);
        }
      });

      if (cliente.procedimentoInteresse) nomes.add(cliente.procedimentoInteresse);
      if (cliente.procedimento) nomes.add(cliente.procedimento);
    });

    return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [clientes]);

  const clientesFiltrados = useMemo(() => {
    const texto = busca.trim().toLowerCase();

    const filtrados = clientes.filter((cliente) => {
      const atendeTexto =
        !texto ||
        cliente.nome.toLowerCase().includes(texto) ||
        cliente.telefone.toLowerCase().includes(texto) ||
        (cliente.cpf ?? "").toLowerCase().includes(texto) ||
        (cliente.whatsapp ?? "").toLowerCase().includes(texto) ||
        (cliente.instagram ?? "").toLowerCase().includes(texto) ||
        (cliente.origem ?? "").toLowerCase().includes(texto) ||
        (cliente.procedimentoInteresse ?? "").toLowerCase().includes(texto);

      const atendeStatus = status === "todos" || cliente.status === status;
      const agendamentosValidos = (cliente.agendamentos ?? []).filter(
        (agendamento) => agendamento.status !== "Cancelado"
      );
      const agendamentosDoProcedimento = procedimentoFiltro === "todos"
        ? agendamentosValidos
        : agendamentosValidos.filter((agendamento) =>
            agendamento.procedimento.toLowerCase() === procedimentoFiltro.toLowerCase()
          );
      const atendeProcedimento =
        procedimentoFiltro === "todos" ||
        agendamentosDoProcedimento.length > 0 ||
        (cliente.procedimentoInteresse ?? "").toLowerCase() === procedimentoFiltro.toLowerCase() ||
        (cliente.procedimento ?? "").toLowerCase() === procedimentoFiltro.toLowerCase();

      let atendeRetorno = true;

      if (retornoFiltro !== "todos") {
        const dias = Number(retornoFiltro);
        const hoje = new Date();
        const limite = new Date(hoje);
        limite.setDate(hoje.getDate() - dias);

        const historicoBase = agendamentosDoProcedimento.length > 0 ? agendamentosDoProcedimento : agendamentosValidos;
        const ultimoAtendimento = historicoBase
          .filter((agendamento) => new Date(agendamento.data) <= hoje)
          .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];
        const possuiRetornoFuturo = historicoBase.some((agendamento) => new Date(agendamento.data) > hoje);

        atendeRetorno = Boolean(ultimoAtendimento && new Date(ultimoAtendimento.data) <= limite && !possuiRetornoFuturo);
      }

      return atendeTexto && atendeStatus && atendeProcedimento && atendeRetorno;
    });

    return [...filtrados].sort((a, b) => {
      if (ordenacao === "recentes") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (ordenacao === "maior-valor") {
        return b.valorGasto - a.valorGasto;
      }

      if (ordenacao === "ultima-visita") {
        return (
          new Date(b.ultimaVisita ?? 0).getTime() -
          new Date(a.ultimaVisita ?? 0).getTime()
        );
      }

      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [clientes, busca, status, ordenacao, procedimentoFiltro, retornoFiltro]);

  function novoCliente() {
    setClienteSelecionado(null);
    setModalAberto(true);
  }

  function editarCliente(cliente: Cliente) {
    setClienteSelecionado(cliente);
    setModalAberto(true);
  }

  function abrirMensagem(cliente: Cliente) {
    setClienteMensagem(cliente);
    setMensagemAberta(true);
  }

  async function salvarCliente(dados: ClienteFormData) {
    startTransition(async () => {
      if (clienteSelecionado) {
        await atualizarCliente({
          id: clienteSelecionado.id,
          ...dados,
        });
      } else {
        await criarCliente(dados);
      }

      router.refresh();
      setModalAberto(false);
      setClienteSelecionado(null);
    });
  }

  function removerCliente(id: number) {
    if (!confirm("Deseja realmente excluir este cliente?")) {
      return;
    }

    startTransition(async () => {
      await excluirCliente(id);
      router.refresh();
    });
  }

  return (
    <>
      <div className="app-mobile-safe space-y-5 sm:space-y-6">
        <section className="premium-card relative overflow-hidden p-5 sm:p-8">
          <div className="absolute right-0 top-0 size-64 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 size-48 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.05] px-3 py-1 text-xs font-medium text-slate-300">
                <UsersRound size={14} />
                CRM de relacionamento
              </div>

              <h1 className="premium-title">Clientes</h1>
              <p className="premium-subtitle">
                Centralize cadastro, contato, histórico básico e ações rápidas de WhatsApp para manter a base ativa.
              </p>
            </div>

            <Button
              size="lg"
              asChild
              data-mobile-action="true"
              className="mobile-full-button sm:w-auto"
            >
              <Link href="/clientes/novo">
                <Plus size={18} />
                Novo cliente
              </Link>
            </Button>
          </div>
        </section>

        <ClienteResumo
          clientes={clientesFiltrados}
          totalGeral={clientes.length}
        />

        <ClienteSearch
          value={busca}
          onChange={setBusca}
          status={status}
          onStatusChange={setStatus}
          ordenacao={ordenacao}
          onOrdenacaoChange={setOrdenacao}
          procedimento={procedimentoFiltro}
          onProcedimentoChange={setProcedimentoFiltro}
          procedimentos={procedimentosRealizados}
          retorno={retornoFiltro}
          onRetornoChange={setRetornoFiltro}
        />

        {procedimentoFiltro !== "todos" || retornoFiltro !== "todos" ? (
          <div className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
            Segmentação ativa: {clientesFiltrados.length} cliente(s) encontrados. Use essa base para campanha manual de retorno por procedimento.
          </div>
        ) : null}

        <ClienteTable
          clientes={clientesFiltrados}
          onEditar={editarCliente}
          onExcluir={removerCliente}
          onMensagem={abrirMensagem}
        />
      </div>

      <NovoClienteModal
        open={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setClienteSelecionado(null);
        }}
        cliente={clienteSelecionado}
        onSalvar={salvarCliente}
        origens={origens}
        procedimentosInteresse={procedimentosInteresse}
      />

      <ClienteQuickMessageModal
        open={mensagemAberta}
        cliente={clienteMensagem}
        onClose={() => {
          setMensagemAberta(false);
          setClienteMensagem(null);
        }}
      />

      {isPending && (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl border border-violet-400/20 bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-2xl shadow-violet-950/40">
          Salvando alterações...
        </div>
      )}
    </>
  );
}
