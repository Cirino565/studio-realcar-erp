"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { buscarClientesParaIndicacao, definirIndicacaoCliente } from "@/actions/indicacao.actions";

type Pessoa = { id: number; nome: string };

export default function IndicacaoCliente({
  clienteId,
  indicadaPor,
  indicadoraDeAnuncio,
  indicou,
  podeEditar,
  mostrarEditor,
}: {
  clienteId: number;
  indicadaPor: Pessoa | null;
  indicadoraDeAnuncio: boolean;
  indicou: Pessoa[];
  podeEditar: boolean;
  mostrarEditor: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [termo, setTermo] = useState("");
  const [opcoes, setOpcoes] = useState<Array<Pessoa & { telefone: string }>>([]);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [salvando, startSalvar] = useTransition();
  const [, startBusca] = useTransition();

  // Busca com uma pequena espera para nao consultar a cada letra.
  useEffect(() => {
    if (!editando || termo.trim().length < 2) return;
    const espera = window.setTimeout(() => {
      startBusca(async () => {
        try {
          setOpcoes(await buscarClientesParaIndicacao(termo, clienteId));
        } catch {
          setOpcoes([]);
        }
      });
    }, 300);
    return () => window.clearTimeout(espera);
  }, [termo, editando, clienteId]);

  function salvar(id: number | null) {
    setMensagem(null);
    startSalvar(async () => {
      try {
        const resultado = await definirIndicacaoCliente(clienteId, id);
        setMensagem(resultado.ok ? resultado.mensagem : resultado.erro);
        if (resultado.ok) {
          setEditando(false);
          setTermo("");
          setOpcoes([]);
          router.refresh();
        }
      } catch {
        setMensagem("Não foi possível salvar. Atualize a página e tente de novo.");
      }
    });
  }

  if (!indicadaPor && indicou.length === 0 && !mostrarEditor && !mensagem) return null;

  return (
    <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300">
      {indicadaPor ? (
        <p>
          Indicada por{" "}
          <Link href={`/clientes/${indicadaPor.id}`} className="font-semibold text-violet-700 hover:underline dark:text-violet-300">
            {indicadaPor.nome}
          </Link>
          {indicadoraDeAnuncio ? " · veio de anúncio, então conta na mesma campanha" : ""}
          {podeEditar && !editando ? (
            <>
              {" · "}
              <button type="button" onClick={() => setEditando(true)} className="font-semibold text-slate-500 underline-offset-2 hover:underline">
                Trocar
              </button>
              {" · "}
              <button
                type="button"
                disabled={salvando}
                onClick={() => {
                  if (window.confirm(`Tirar a indicação de ${indicadaPor.nome}?`)) salvar(null);
                }}
                className="font-semibold text-slate-500 underline-offset-2 hover:underline"
              >
                Remover
              </button>
            </>
          ) : null}
        </p>
      ) : podeEditar && mostrarEditor && !editando ? (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="font-semibold text-violet-700 hover:underline dark:text-violet-300"
        >
          + Informar quem indicou
        </button>
      ) : null}

      {editando ? (
        <div className="space-y-1.5">
          <input
            value={termo}
            onChange={(event) => {
              setTermo(event.target.value);
              if (event.target.value.trim().length < 2) setOpcoes([]);
            }}
            autoFocus
            placeholder="Digite o nome ou telefone de quem indicou"
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100"
          />
          {opcoes.length > 0 ? (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-slate-900">
              {opcoes.map((opcao) => (
                <li key={opcao.id}>
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() => salvar(opcao.id)}
                    className="flex w-full justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-violet-50 dark:hover:bg-white/[0.06]"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{opcao.nome}</span>
                    <span className="text-xs text-slate-500">{opcao.telefone}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setEditando(false);
              setTermo("");
              setOpcoes([]);
            }}
            className="text-xs font-semibold text-slate-500 hover:underline"
          >
            Cancelar
          </button>
        </div>
      ) : null}

      {indicou.length > 0 ? (
        <p>
          Indicou:{" "}
          {indicou.map((pessoa, indice) => (
            <span key={pessoa.id}>
              {indice > 0 ? ", " : ""}
              <Link href={`/clientes/${pessoa.id}`} className="font-semibold text-violet-700 hover:underline dark:text-violet-300">
                {pessoa.nome}
              </Link>
            </span>
          ))}
        </p>
      ) : null}

      {mensagem ? <p className="font-semibold text-slate-700 dark:text-slate-200">{mensagem}</p> : null}
    </div>
  );
}
