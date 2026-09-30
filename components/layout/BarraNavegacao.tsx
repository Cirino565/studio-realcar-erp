"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Barra fininha no topo da tela que aparece NA HORA em que alguém clica em
 * um link do sistema (nome da cliente, "Ver prontuário", itens do menu,
 * etc.) e some quando a nova tela termina de abrir.
 *
 * Serve para a pessoa saber que o clique funcionou e não ficar clicando
 * várias vezes enquanto o servidor responde.
 *
 * É leve: não faz nenhuma busca no servidor, só escuta os cliques em links
 * e desenha uma barra com CSS. Vale para o sistema inteiro de uma vez.
 */
export default function BarraNavegacao() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ativa, setAtiva] = useState(false);
  const limiteRef = useRef<number | null>(null);

  // A tela nova abriu: esconde a barra.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAtiva(false);
    if (limiteRef.current) {
      window.clearTimeout(limiteRef.current);
      limiteRef.current = null;
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    function aoClicar(event: MouseEvent) {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const alvo = event.target as Element | null;
      const link = alvo?.closest?.("a");
      if (!link) return;

      const destinoAba = link.getAttribute("target");
      if (destinoAba && destinoAba !== "_self") return;
      if (link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      let url: URL;
      try {
        url = new URL(link.href, window.location.href);
      } catch {
        return;
      }

      // Links para fora do sistema (WhatsApp, Google etc.) e downloads
      // de arquivo (/api/...) não trocam de tela aqui dentro.
      if (url.origin !== window.location.origin) return;
      if (url.pathname.startsWith("/api/")) return;

      // Clique no link da própria tela em que já está: nada a esperar.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      setAtiva(true);

      // Segurança: se por algum motivo a tela não trocar, some sozinha.
      if (limiteRef.current) window.clearTimeout(limiteRef.current);
      limiteRef.current = window.setTimeout(() => {
        setAtiva(false);
        limiteRef.current = null;
      }, 15000);
    }

    document.addEventListener("click", aoClicar, true);
    return () => {
      document.removeEventListener("click", aoClicar, true);
      if (limiteRef.current) window.clearTimeout(limiteRef.current);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("navegando", ativa);
  }, [ativa]);

  if (!ativa) return null;

  return (
    <div
      role="progressbar"
      aria-label="Carregando"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden bg-violet-200/60 dark:bg-violet-500/20"
    >
      <div className="barra-navegacao-faixa h-full w-1/3 rounded-full bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.7)] dark:bg-violet-400" />

      <style>{`
        @keyframes barra-navegacao-andar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .barra-navegacao-faixa {
          animation: barra-navegacao-andar 1.1s ease-in-out infinite;
        }
        html.navegando, html.navegando * {
          cursor: progress !important;
        }
      `}</style>
    </div>
  );
}
