"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Aviso "O sistema foi atualizado". Quem deixa a tela aberta (celular,
 * aba antiga) e o sistema recebe uma atualizacao, ao salvar levava o erro
 * "An unexpected response was received from the server". Agora:
 *  - ao voltar para a aba (e a cada 10 min) confere, com uma consulta
 *    minuscula, se a versao mudou;
 *  - se um salvar falhar por esse motivo, o aviso aparece na hora.
 * O botao recarrega a pagina; nada e recarregado sozinho para nao perder
 * o que estiver sendo digitado.
 */
export default function AvisoNovaVersao({ versao }: { versao: string }) {
  const [desatualizado, setDesatualizado] = useState(false);

  useEffect(() => {
    if (versao === "local") return;
    let ativo = true;

    async function conferir() {
      try {
        const resposta = await fetch("/api/versao", { cache: "no-store" });
        if (!resposta.ok) return;
        const dados = (await resposta.json()) as { versao?: string };
        if (ativo && dados.versao && dados.versao !== "local" && dados.versao !== versao) {
          setDesatualizado(true);
        }
      } catch {
        // Sem internet: confere de novo depois.
      }
    }

    const aoVoltar = () => {
      if (document.visibilityState === "visible") void conferir();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    const intervalo = window.setInterval(conferir, 10 * 60 * 1000);

    // Se um botao de salvar bater numa versao que nao existe mais, avisa na hora.
    const fetchOriginal = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const resposta = await fetchOriginal(...args);
      try {
        const cabecalhos = new Headers(args[1]?.headers ?? (args[0] instanceof Request ? args[0].headers : undefined));
        if (cabecalhos.has("next-action")) {
          const tipo = resposta.headers.get("content-type") || "";
          if (resposta.status === 404 || (!tipo.includes("text/x-component") && resposta.status !== 303)) {
            void conferir();
          }
        }
      } catch {
        // Nunca atrapalha a requisicao original.
      }
      return resposta;
    };

    return () => {
      ativo = false;
      document.removeEventListener("visibilitychange", aoVoltar);
      window.clearInterval(intervalo);
      window.fetch = fetchOriginal;
    };
  }, [versao]);

  if (!desatualizado) return null;

  return (
    <div className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-[90] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-violet-200 bg-white p-3 text-sm shadow-2xl shadow-slate-900/20 dark:border-violet-400/30 dark:bg-slate-900 lg:bottom-6">
      <RefreshCw size={18} className="shrink-0 text-violet-600" />
      <p className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">
        O sistema foi atualizado. Recarregue a página para continuar usando sem erro ao salvar.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700"
      >
        Recarregar
      </button>
    </div>
  );
}
