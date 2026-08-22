"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type {
  CampanhaMarketing,
  OrigemCliente,
  ProcedimentoInteresse,
} from "@prisma/client";

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

type Filtros = {
  busca: string;
  status: string;
  procedimento: string;
  retorno: string;
  area: string;
  ordenacao: string;
};

type Resumo = {
  totalGeral: number;
  totalFiltrado: number;
  ativos: number;
  faturamento: number;
  oportunidadesRetorno: number;
};

type Props = {
  clientes: ClienteComHistorico[];
  origens: OrigemCliente[];
  procedimentosInteresse: ProcedimentoInteresse[];
  campanhas: CampanhaMarketing[];
  procedimentosRealizados: string[];
  filtros: Filtros;
  paginaAtual: number;
  totalPaginas: number;
  resumo: Resumo;
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

function montarQueryString(filtros: Filtros, pagina?: number) {
  const params = new URLSearchParams();

  if (filtros.busca.trim()) params.set("busca", filtros.busca.trim());
  if (filtros.status !== "todos") params.set("status", filtros.status);
  if (filtros.procedimento !== "todos")
    params.set("procedimento", filtros.procedimento);
  if (filtros.retorno !== "todos") params.set("retorno", filtros.retorno);
  if (filtros.area !== "todas") params.set("area", filtros.area);
  if (filtros.ordenacao !== "nome-asc")
    params.set("ordenacao", filtros.ordenacao);
  if (pagina && pagina > 1) params.set("pagina", String(pagina));

  return params.toString();
}

export default function ClientesClient({
  clientes,
  origens,
  procedimentosInteresse,
  campanhas,
  procedimentosRealizados,
  filtros,
  paginaAtual,
  totalPaginas,
  resumo,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Estado local dos filtros: começa igual ao que veio do servidor, e o
  // usuário pode digitar/mudar livremente aqui antes de a busca de fato
  // ser enviada (com um pequeno atraso, pra não recarregar a cada letra).
  const [filtrosState, setFiltrosState] = useState<Filtros>(filtros);

  const [modalAberto, setModalAberto] = useState(false);
  const [mensagemAberta, setMensagemAberta] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] =
    useState<Cliente | null>(null);
  const [clienteMensagem, setClienteMensagem] = useState<Cliente | null>(null);

  // Sempre que o servidor confirma novos filtros (após navegar), realinha
  // o estado local com o que realmente está valendo na URL.
  useEffect(() => {
    setFiltrosState(filtros);
  }, [filtros]);

  const filtrosRef = useRef(filtrosState);
  filtrosRef.current = filtrosState;

  useEffect(() => {
    const atual = filtrosRef.current;

    if (JSON.stringify(atual) === JSON.stringify(filtros)) return;

    const timer = setTimeout(() => {
      const query = montarQueryString(atual);
      router.push(query ? `/clientes?${query}` : "/clientes");
    }, 350);

    return () => clearTimeout(timer);
  }, [filtrosState, filtros, router]);

  function mudarFiltro<K extends keyof Filtros>(campo: K, valor: Filtros[K]) {
    setFiltrosState((atualState) => ({ ...atualState, [campo]: valor }));
  }

  function irParaPagina(pagina: number) {
    const query = montarQueryString(filtros, pagina);
    router.push(query ? `/clientes?${query}` : "/clientes");
  }

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
            totalGeral={resumo.totalGeral}
            totalFiltrado={resumo.totalFiltrado}
            ativos={resumo.ativos}
            faturamento={resumo.faturamento}
            oportunidadesRetorno={resumo.oportunidadesRetorno}
          />
        </div>

        <ClienteSearch
          value={filtrosState.busca}
          onChange={(valor) => mudarFiltro("busca", valor)}
          status={filtrosState.status}
          onStatusChange={(valor) => mudarFiltro("status", valor)}
          ordenacao={filtrosState.ordenacao}
          onOrdenacaoChange={(valor) => mudarFiltro("ordenacao", valor)}
          procedimento={filtrosState.procedimento}
          onProcedimentoChange={(valor) => mudarFiltro("procedimento", valor)}
          procedimentos={procedimentosRealizados}
          retorno={filtrosState.retorno}
          onRetornoChange={(valor) => mudarFiltro("retorno", valor)}
          area={filtrosState.area}
          onAreaChange={(valor) => mudarFiltro("area", valor)}
        />

        <ClienteTable
          clientes={clientes}
          onEditar={editarCliente}
          onExcluir={removerCliente}
          onMensagem={abrirMensagem}
        />

        <div className="flex flex-col items-center gap-2 py-4 sm:flex-row sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Página {paginaAtual} de {totalPaginas} — {resumo.totalFiltrado}{" "}
            cliente(s) encontrado(s)
          </p>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={paginaAtual <= 1}
              onClick={() => irParaPagina(paginaAtual - 1)}
            >
              Anterior
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={paginaAtual >= totalPaginas}
              onClick={() => irParaPagina(paginaAtual + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
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
