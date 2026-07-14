"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type { OrigemCliente, ProcedimentoInteresse } from "@prisma/client";

import {
  atualizarCliente,
  criarCliente,
  excluirCliente,
} from "@/actions/cliente.actions";
import ClienteSearch from "@/components/clientes/ClienteSearch";
import ClienteResumo from "@/components/clientes/ClientesResumo";
import ClienteTable from "@/components/clientes/ClienteTable";
import NovoClienteModal from "@/components/clientes/NovoClienteModal";
import { Button } from "@/components/ui/button";
import type { Cliente } from "@/lib/types";

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

export default function ClientesClient({
  clientes,
  origens,
  procedimentosInteresse,
}: Props) {
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
        (agendamento) => agendamento.status !== "Cancelado",
      );

      const agendamentosDoProcedimento =
        procedimentoFiltro === "todos"
          ? agendamentosValidos
          : agendamentosValidos.filter(
              (agendamento) =>
                agendamento.procedimento.toLowerCase() ===
                procedimentoFiltro.toLowerCase(),
            );

      const atendeProcedimento =
        procedimentoFiltro === "todos" ||
        agendamentosDoProcedimento.length > 0 ||
        (cliente.procedimentoInteresse ?? "").toLowerCase() ===
          procedimentoFiltro.toLowerCase() ||
        (cliente.procedimento ?? "").toLowerCase() ===
          procedimentoFiltro.toLowerCase();

      let atendeRetorno = true;

      if (retornoFiltro !== "todos") {
        const dias = Number(retornoFiltro);
        const hoje = new Date();
        const limite = new Date(hoje);
        limite.setDate(hoje.getDate() - dias);

        const historicoBase =
          agendamentosDoProcedimento.length > 0
            ? agendamentosDoProcedimento
            : agendamentosValidos;

        const ultimoAtendimento = historicoBase
          .filter((agendamento) => new Date(agendamento.data) <= hoje)
          .sort(
            (a, b) =>
              new Date(b.data).getTime() - new Date(a.data).getTime(),
          )[0];

        const possuiRetornoFuturo = historicoBase.some(
          (agendamento) => new Date(agendamento.data) > hoje,
        );

        atendeRetorno = Boolean(
          ultimoAtendimento &&
            new Date(ultimoAtendimento.data) <= limite &&
            !possuiRetornoFuturo,
        );
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

  function salvarCliente(dados: ClienteFormData) {
    startTransition(async () => {
      if (clienteSelecionado) {
        await atualizarCliente({
          id: clienteSelecionado.id,
          ...dados,
        });
      } else {
        await criarCliente(dados);
      }

      setModalAberto(false);
      setClienteSelecionado(null);
      router.refresh();
    });
  }

  function removerCliente(id: number) {
    if (!window.confirm("Deseja realmente excluir esta cliente?")) return;

    startTransition(async () => {
      await excluirCliente(id);
      router.refresh();
    });
  }

  return (
    <>
      <div className="app-mobile-safe space-y-5 sm:space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(13,148,136,0.09),transparent_34%)]" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/15 dark:text-violet-200">
                <UsersRound size={14} />
                CRM de relacionamento
              </div>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Clientes
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Cadastros, histórico, oportunidades de retorno e mensagens de
                WhatsApp organizados em uma única central.
              </p>
            </div>

            <Button size="lg" type="button" onClick={novoCliente}>
              <Plus size={18} />
              Nova cliente
            </Button>
          </div>
        </section>

        <ClienteResumo clientes={clientesFiltrados} totalGeral={clientes.length} />

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

      {isPending ? (
        <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-[110] inline-flex items-center rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-violet-600/25 lg:bottom-5 lg:right-5">
          Salvando alterações...
        </div>
      ) : null}
    </>
  );
}
