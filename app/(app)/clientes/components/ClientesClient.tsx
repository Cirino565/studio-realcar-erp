"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CampanhaMarketing, OrigemCliente, ProcedimentoInteresse } from "@prisma/client";

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


// Busca tolerante: ignora acento e maiuscula/minuscula, para que "joao"
// encontre "Joao" e vice-versa.
//
// A busca por texto olha SO nome e procedimento de interesse. Endereco ficou
// de fora de proposito: como muita rua se chama "Joao", "Maria" etc., buscar
// no endereco trazia cliente sem nenhuma relacao com o nome digitado.
// Telefone e CPF sao comparados so pelos digitos, a partir de 3 numeros.
function normalizarBusca(valor?: string | null) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function somenteDigitos(valor?: string | null) {
  return (valor ?? "").replace(/\D/g, "");
}

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
  campanhas: CampanhaMarketing[];
};

type ClienteFormData = {
  nome: string;
  telefone: string;
  whatsapp: string;
  cpf: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  enderecoOriginal: string;
  origem: string;
  procedimentoInteresse: string;
  nascimento: string;
  observacoes: string;
  areaEstetica: boolean;
  areaCilios: boolean;
  campanhaAquisicaoId: number | null;
};

export default function ClientesClient({
  clientes,
  origens,
  procedimentosInteresse,
  campanhas,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("nome-asc");
  const [procedimentoFiltro, setProcedimentoFiltro] = useState("todos");
  const [retornoFiltro, setRetornoFiltro] = useState("todos");
  const [areaFiltro, setAreaFiltro] = useState("todas");
  const [quantidadeVisivel, setQuantidadeVisivel] = useState(10);
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
    const texto = normalizarBusca(busca);
    const textoDigitos = somenteDigitos(busca);
    const temDigitos = textoDigitos.length >= 3;

    const filtrados = clientes.filter((cliente) => {
      const atendeTexto =
        !texto ||
        normalizarBusca(cliente.nome).includes(texto) ||
        normalizarBusca(cliente.procedimentoInteresse).includes(texto) ||
        (temDigitos &&
          (somenteDigitos(cliente.telefone).includes(textoDigitos) ||
            somenteDigitos(cliente.whatsapp).includes(textoDigitos) ||
            somenteDigitos(cliente.cpf).includes(textoDigitos)));

      const atendeStatus = status === "todos" || cliente.status === status;

      const atendeArea =
        areaFiltro === "todas" ||
        (areaFiltro === "estetica" && cliente.areaEstetica && !cliente.areaCilios) ||
        (areaFiltro === "cilios" && cliente.areaCilios && !cliente.areaEstetica) ||
        (areaFiltro === "ambas" && cliente.areaEstetica && cliente.areaCilios) ||
        (areaFiltro === "sem-area" && !cliente.areaEstetica && !cliente.areaCilios);

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

      return atendeTexto && atendeStatus && atendeArea && atendeProcedimento && atendeRetorno;
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
  }, [clientes, busca, status, areaFiltro, ordenacao, procedimentoFiltro, retornoFiltro]);

  const clientesExibidos = clientesFiltrados.slice(0, quantidadeVisivel);

  useEffect(() => {
    setQuantidadeVisivel(10);
  }, [
    busca,
    status,
    areaFiltro,
    ordenacao,
    procedimentoFiltro,
    retornoFiltro,
  ]);

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
      <div className="app-mobile-safe space-y-3 pb-6 sm:space-y-6 sm:pb-0">
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:rounded-3xl sm:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(13,148,136,0.09),transparent_34%)]" />

          <div className="relative flex items-center justify-between gap-3 sm:gap-5 lg:items-end">
            <div className="min-w-0">
              <div className="hidden items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/15 dark:text-violet-200 sm:inline-flex">
                <UsersRound size={14} />
                CRM de relacionamento
              </div>

              <h1 className="mt-0 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:mt-3 sm:text-3xl">
                Clientes
              </h1>

              <p className="mt-2 hidden max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:block">
                Cadastros, histórico, oportunidades de retorno e mensagens de
                WhatsApp organizados em uma única central.
              </p>
            </div>

            <Button
              size="lg"
              type="button"
              onClick={novoCliente}
              className="h-10 shrink-0 px-4 sm:h-11"
            >
              <Plus size={18} />
              Nova cliente
            </Button>
          </div>
        </section>

        <div className="hidden sm:block">
          <ClienteResumo
            clientes={clientesFiltrados}
            totalGeral={clientes.length}
          />
        </div>

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
          area={areaFiltro}
          onAreaChange={setAreaFiltro}
        />

        <ClienteTable
          clientes={clientesExibidos}
          onEditar={editarCliente}
          onExcluir={removerCliente}
          onMensagem={abrirMensagem}
        />

        {clientesFiltrados.length > quantidadeVisivel ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mostrando {clientesExibidos.length} de {clientesFiltrados.length} clientes
            </p>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setQuantidadeVisivel((atual) => atual + 10)
              }
            >
              Carregar mais 10
            </Button>
          </div>
        ) : null}
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
        campanhas={campanhas}
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