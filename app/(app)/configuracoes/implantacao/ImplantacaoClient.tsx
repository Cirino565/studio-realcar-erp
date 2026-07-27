"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  prepararInicioOficial,
  sincronizarProcedimentosIniciais,
  type ResumoImplantacao,
  type ResultadoImplantacao,
  type ResultadoProcedimentos,
} from "@/actions/implantacao.actions";

const CONFIRMACAO = "INICIAR STUDIO REALCAR";

type Props = {
  resumoInicial: ResumoImplantacao;
};

function CartaoNumero({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{valor}</p>
    </div>
  );
}

function ResumoProcedimentos({ resultado }: { resultado: ResultadoProcedimentos }) {
  return (
    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
      <span className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
        Criados: {resultado.criados}
      </span>
      <span className="rounded-xl bg-blue-50 px-3 py-2 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">
        Atualizados: {resultado.atualizados}
      </span>
      <span className="rounded-xl bg-slate-100 px-3 py-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        Antigos desativados: {resultado.desativados}
      </span>
    </div>
  );
}

export default function ImplantacaoClient({ resumoInicial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmacao, setConfirmacao] = useState("");
  const [backupConfirmado, setBackupConfirmado] = useState(false);
  const [apagarProdutosFornecedores, setApagarProdutosFornecedores] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<ResultadoImplantacao | null>(null);
  const [resultadoProcedimentos, setResultadoProcedimentos] = useState<ResultadoProcedimentos | null>(null);

  const bloqueado = resumoInicial.jaPreparado || Boolean(resultado);

  function executarPreparacao() {
    setErro("");
    setResultado(null);

    if (!window.confirm("Esta ação apagará permanentemente os dados operacionais de teste. Continuar?")) {
      return;
    }

    startTransition(async () => {
      try {
        const resposta = await prepararInicioOficial({
          confirmacao,
          backupConfirmado,
          apagarProdutosFornecedores,
        });
        setResultado(resposta);
        setResultadoProcedimentos(resposta.procedimentos);
        router.refresh();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível concluir a preparação.");
      }
    });
  }

  function atualizarProcedimentos() {
    setErro("");
    setResultadoProcedimentos(null);

    startTransition(async () => {
      try {
        const resposta = await sincronizarProcedimentosIniciais();
        setResultadoProcedimentos(resposta);
        router.refresh();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível atualizar os procedimentos.");
      }
    });
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Implantação</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Preparar início oficial</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Remove os registros operacionais de teste, reinicia a numeração das tabelas limpas e importa os 43 procedimentos oficiais com duração, preço e custo direto.
          </p>
        </div>
        <Link href="/configuracoes" className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
          Voltar
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <CartaoNumero titulo="Clientes" valor={resumoInicial.clientes} />
        <CartaoNumero titulo="Agendamentos" valor={resumoInicial.agendamentos} />
        <CartaoNumero titulo="Vendas" valor={resumoInicial.vendas} />
        <CartaoNumero titulo="Financeiro" valor={resumoInicial.lancamentos} />
        <CartaoNumero titulo="Registros operacionais" valor={resumoInicial.totalOperacional} />
      </div>

      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/30 dark:bg-amber-500/10">
        <h2 className="font-bold text-amber-950 dark:text-amber-100">O que será preservado</h2>
        <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-100/90">
          Usuários, perfis, permissões, profissionais, configurações da clínica, modelos de mensagem, modelos e perguntas de anamnese, origens de clientes e a estrutura do banco.
        </p>
        <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-100/90">
          Se o catálogo de produtos for preservado, todas as quantidades serão zeradas para que o estoque físico real seja informado depois.
        </p>
      </div>

      {resumoInicial.jaPreparado ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <h2 className="font-bold text-emerald-900 dark:text-emerald-100">Preparação inicial já executada</h2>
          <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">
            A limpeza destrutiva foi bloqueada para impedir que dados reais sejam apagados posteriormente. A atualização dos procedimentos continua disponível.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900/50 dark:bg-slate-950">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">Limpeza única dos testes</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Esta etapa apaga vendas, itens, lançamentos, movimentações, compras, clientes, agendamentos, bloqueios, leads, comunicações, anamneses e demais registros operacionais de teste.
          </p>

          <a href="/api/backup" className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
            1. Baixar backup JSON completo
          </a>

          <label className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <input
              type="checkbox"
              checked={backupConfirmado}
              onChange={(event) => setBackupConfirmado(event.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              Confirmei que o arquivo de backup JSON foi realmente baixado e está salvo no computador.
            </span>
          </label>

          <label className="mt-3 flex items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <input
              type="checkbox"
              checked={apagarProdutosFornecedores}
              onChange={(event) => setApagarProdutosFornecedores(event.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              Apagar também o catálogo de produtos e fornecedores de teste. Deixe desmarcado caso esses cadastros já sejam reais.
            </span>
          </label>

          <label className="mt-5 block text-sm font-bold text-slate-800 dark:text-slate-100">
            Digite exatamente: <span className="text-rose-600">{CONFIRMACAO}</span>
            <input
              value={confirmacao}
              onChange={(event) => setConfirmacao(event.target.value)}
              disabled={bloqueado || isPending}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-sm outline-none ring-violet-500 focus:ring-2 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <button
            type="button"
            onClick={executarPreparacao}
            disabled={bloqueado || isPending || !backupConfirmado || confirmacao.trim().toUpperCase() !== CONFIRMACAO}
            className="mt-5 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "Processando..." : "Limpar testes e importar procedimentos"}
          </button>
        </div>

        <div className="rounded-3xl border border-violet-200 bg-white p-6 shadow-sm dark:border-violet-900/50 dark:bg-slate-950">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">Somente procedimentos</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Atualiza ou inclui os 43 procedimentos da planilha sem apagar clientes, vendas ou qualquer outro dado operacional. Procedimentos antigos fora da lista ficam inativos, com Avaliação preservada.
          </p>
          <button
            type="button"
            onClick={atualizarProcedimentos}
            disabled={isPending}
            className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:opacity-40"
          >
            {isPending ? "Processando..." : "Atualizar os 43 procedimentos"}
          </button>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <p>Procedimentos ativos atualmente: {resumoInicial.procedimentosServicoAtivos}</p>
            <p className="mt-1">Produtos cadastrados: {resumoInicial.produtos}</p>
            <p className="mt-1">Fornecedores cadastrados: {resumoInicial.fornecedores}</p>
          </div>
        </div>
      </div>

      {erro ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {erro}
        </div>
      ) : null}

      {resultado ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <h2 className="font-black text-emerald-950 dark:text-emerald-100">Preparação concluída</h2>
          <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-200">{resultado.mensagem}</p>
          <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-200">
            Registros operacionais identificados antes da limpeza: {resultado.removidos}.
          </p>
          <ResumoProcedimentos resultado={resultado.procedimentos} />
        </div>
      ) : resultadoProcedimentos ? (
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-500/30 dark:bg-blue-500/10">
          <h2 className="font-black text-blue-950 dark:text-blue-100">Procedimentos sincronizados</h2>
          <ResumoProcedimentos resultado={resultadoProcedimentos} />
        </div>
      ) : null}
    </section>
  );
}
