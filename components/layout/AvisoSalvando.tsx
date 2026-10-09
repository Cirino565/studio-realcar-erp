"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Aviso "Salvando..." para o sistema inteiro.
 *
 * Problema que resolve: a pessoa clica em Salvar, o servidor demora um pouco,
 * nada muda na tela e ela clica de novo (varias vezes).
 *
 * Como funciona: sempre que QUALQUER botao do sistema manda algo para o
 * servidor (salvar, finalizar, excluir, lancar, confirmar...), aparece no topo
 * da tela um aviso "Salvando... aguarde" com uma barrinha animada. Enquanto o
 * servidor nao responde, novos cliques em botoes sao ignorados (e o aviso
 * balanca), entao nada e enviado duas vezes. Quando termina, o aviso some.
 *
 * Vale para todas as telas de uma vez, inclusive as que forem criadas depois,
 * sem precisar mexer botao por botao. Nao faz nenhuma busca no servidor: so
 * observa os envios que o proprio sistema ja faz.
 */

// Se por algum motivo o servidor nunca responder, libera os botoes depois disso.
const LIMITE_MS = 45_000;
// Tempo minimo antes de mostrar o aviso (evita piscar em salvamentos instantaneos).
const ATRASO_AVISO_MS = 120;

type Tipo = "acao" | "envio";

function ler(cabecalhos: unknown, nome: string): string | null {
  if (!cabecalhos) return null;
  try {
    if (typeof Headers !== "undefined" && cabecalhos instanceof Headers) {
      return cabecalhos.get(nome);
    }
    if (Array.isArray(cabecalhos)) {
      const achou = cabecalhos.find(
        (par) => String(par?.[0]).toLowerCase() === nome,
      );
      return achou ? String(achou[1]) : null;
    }
    const objeto = cabecalhos as Record<string, unknown>;
    for (const chave of Object.keys(objeto)) {
      if (chave.toLowerCase() === nome) return String(objeto[chave]);
    }
  } catch {
    // ignora: cabecalho em formato inesperado
  }
  return null;
}

function classificar(
  entrada: RequestInfo | URL,
  opcoes?: RequestInit,
): Tipo | null {
  try {
    const requisicao = typeof Request !== "undefined" && entrada instanceof Request ? entrada : null;
    const metodo = String(opcoes?.method ?? requisicao?.method ?? "GET").toUpperCase();

    const cabecalho = (nome: string) =>
      ler(opcoes?.headers, nome) ?? (requisicao ? requisicao.headers.get(nome) : null);

    // Botoes de salvar do sistema (acoes do servidor do Next).
    if (cabecalho("next-action")) return "acao";

    if (metodo === "GET" || metodo === "HEAD") return null;

    // Envios para as rotas internas do sistema (ex.: fotos). Mostra o aviso,
    // mas nao trava os botoes, porque esses envios ja tem a propria barra.
    const texto =
      typeof entrada === "string"
        ? entrada
        : entrada instanceof URL
          ? entrada.href
          : requisicao?.url ?? "";
    const url = new URL(texto, window.location.href);
    if (url.origin === window.location.origin && url.pathname.startsWith("/api/")) {
      return "envio";
    }
  } catch {
    // qualquer coisa estranha: nao interfere
  }
  return null;
}

export default function AvisoSalvando() {
  const [visivel, setVisivel] = useState(false);
  const [tipo, setTipo] = useState<Tipo>("acao");
  const [balancando, setBalancando] = useState(false);

  const pendentes = useRef(new Map<number, Tipo>());
  const contador = useRef(0);
  const timerAviso = useRef<number | null>(null);
  const timerBalanco = useRef<number | null>(null);

  useEffect(() => {
    const original = window.fetch;
    const pendentesAtuais = pendentes.current;

    function atualizar() {
      const valores = [...pendentesAtuais.values()];
      const temAcao = valores.includes("acao");
      document.documentElement.classList.toggle("salvando", temAcao);

      if (valores.length === 0) {
        if (timerAviso.current) {
          window.clearTimeout(timerAviso.current);
          timerAviso.current = null;
        }
        setVisivel(false);
        return;
      }

      setTipo(temAcao ? "acao" : "envio");

      // Mostra o aviso so se passar de uma fracao de segundo (evita piscar
      // em salvamentos instantaneos).
      if (!timerAviso.current) {
        timerAviso.current = window.setTimeout(() => {
          timerAviso.current = null;
          if (pendentesAtuais.size > 0) setVisivel(true);
        }, ATRASO_AVISO_MS);
      }
    }

    const patched: typeof window.fetch = function (this: unknown, entrada, opcoes) {
      const tipoDoEnvio = classificar(entrada, opcoes);
      const resposta = original.call(window, entrada, opcoes);

      if (!tipoDoEnvio) return resposta;

      const id = ++contador.current;
      pendentesAtuais.set(id, tipoDoEnvio);
      atualizar();

      let terminou = false;
      const concluir = () => {
        if (terminou) return;
        terminou = true;
        window.clearTimeout(limite);
        pendentesAtuais.delete(id);
        atualizar();
      };
      const limite = window.setTimeout(concluir, LIMITE_MS);

      resposta.then(
        (res) => {
          // Espera a resposta chegar por inteiro (a tela nova vem junto),
          // para o aviso nao sumir antes da hora.
          try {
            res.clone().arrayBuffer().then(concluir, concluir);
          } catch {
            concluir();
          }
        },
        concluir,
      );

      return resposta;
    };

    window.fetch = patched;

    function piscar() {
      setBalancando(true);
      setVisivel(true);
      if (timerBalanco.current) window.clearTimeout(timerBalanco.current);
      timerBalanco.current = window.setTimeout(() => setBalancando(false), 600);
    }

    function ocupadoComAcao() {
      for (const valor of pendentesAtuais.values()) {
        if (valor === "acao") return true;
      }
      return false;
    }

    function aoClicar(event: MouseEvent) {
      if (!ocupadoComAcao()) return;
      const alvo = event.target as Element | null;
      const botao = alvo?.closest?.(
        'button, [role="button"], input[type="submit"], input[type="button"]',
      );
      if (!botao) return;
      if (botao.closest("[data-aviso-salvando]")) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      piscar();
    }

    function aoEnviar(event: Event) {
      if (!ocupadoComAcao()) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      piscar();
    }

    // ------------------------------------------------------------------
    // Celular: "primeiro toque perdido".
    // Com o teclado aberto (depois de digitar em algum campo), o primeiro
    // toque num botao fecha o teclado, a tela "pula" e o clique cai fora do
    // botao (ou nem acontece). A pessoa precisava tocar duas vezes.
    // Aqui o sistema lembra qual botao foi tocado e, se o clique nao chegar
    // nele, faz o clique por ela. Toque que vira rolagem e ignorado.
    // ------------------------------------------------------------------
    type Toque = { alvo: HTMLElement; id: number; x: number; y: number };
    let toque: Toque | null = null;
    let pendente: HTMLElement | null = null;
    let timerToque: number | null = null;

    function campoDeTextoComFoco() {
      const ativo = document.activeElement as HTMLElement | null;
      if (!ativo || ativo === document.body) return false;
      if (ativo.isContentEditable) return true;
      if (ativo.tagName === "TEXTAREA") return true;
      if (ativo.tagName !== "INPUT") return false;
      const tipo = (ativo as HTMLInputElement).type;
      return ![
        "checkbox",
        "radio",
        "button",
        "submit",
        "reset",
        "file",
        "range",
        "color",
        "hidden",
      ].includes(tipo);
    }

    function limparPendente() {
      pendente = null;
      if (timerToque) {
        window.clearTimeout(timerToque);
        timerToque = null;
      }
    }

    function aoTocar(event: PointerEvent) {
      toque = null;
      if (event.pointerType !== "touch") return;
      if (!campoDeTextoComFoco()) return;
      const alvo = (event.target as Element | null)?.closest?.(
        'button, [role="button"], input[type="submit"]',
      ) as HTMLElement | null;
      if (!alvo || alvo.closest("[data-aviso-salvando]")) return;
      toque = { alvo, id: event.pointerId, x: event.clientX, y: event.clientY };
    }

    function aoCancelarToque(event: PointerEvent) {
      if (toque && event.pointerId === toque.id) toque = null;
    }

    function aoSoltar(event: PointerEvent) {
      if (!toque || event.pointerId !== toque.id) return;
      const { alvo, x, y } = toque;
      toque = null;
      // Arrastou o dedo: era rolagem, nao toque.
      if (Math.hypot(event.clientX - x, event.clientY - y) > 12) return;

      limparPendente();
      pendente = alvo;
      timerToque = window.setTimeout(() => {
        timerToque = null;
        const botao = pendente;
        pendente = null;
        if (!botao || !botao.isConnected) return;
        if ((botao as HTMLButtonElement).disabled) return;
        botao.click();
      }, 450);
    }

    // Roda antes de tudo: confere se o clique chegou no botao tocado.
    function conferirClique(event: MouseEvent) {
      if (!pendente) return;
      const alvo = event.target as Node | null;
      if (alvo && pendente.contains(alvo)) {
        // Chegou certinho: nada a fazer.
        limparPendente();
        return;
      }
      if (event.isTrusted) {
        // O clique caiu em outro lugar porque a tela pulou: ignora esse e
        // deixa o botao certo ser clicado em seguida.
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    }

    window.addEventListener("pointerdown", aoTocar, true);
    window.addEventListener("pointerup", aoSoltar, true);
    window.addEventListener("pointercancel", aoCancelarToque, true);
    window.addEventListener("click", conferirClique, true);
    window.addEventListener("click", aoClicar, true);
    window.addEventListener("submit", aoEnviar, true);

    return () => {
      window.removeEventListener("pointerdown", aoTocar, true);
      window.removeEventListener("pointerup", aoSoltar, true);
      window.removeEventListener("pointercancel", aoCancelarToque, true);
      window.removeEventListener("click", conferirClique, true);
      window.removeEventListener("click", aoClicar, true);
      window.removeEventListener("submit", aoEnviar, true);
      limparPendente();
      if (window.fetch === patched) window.fetch = original;
      if (timerAviso.current) window.clearTimeout(timerAviso.current);
      if (timerBalanco.current) window.clearTimeout(timerBalanco.current);
      document.documentElement.classList.remove("salvando");
    };
  }, []);

  if (!visivel) return null;

  const titulo = tipo === "acao" ? "Salvando" : "Enviando";
  const detalhe = balancando
    ? "Ainda processando, só um instante…"
    : tipo === "acao"
      ? "Aguarde, não precisa clicar de novo"
      : "Aguarde o envio terminar";

  return (
    <>
      <div className="aviso-salvando-linha" aria-hidden="true">
        <span />
      </div>

      <div
        data-aviso-salvando
        role="status"
        aria-live="polite"
        className="aviso-salvando"
      >
        <div className={`aviso-salvando-cartao${balancando ? " aviso-salvando-pulso" : ""}`}>
          <span className="aviso-salvando-giro" aria-hidden="true" />
          <span className="aviso-salvando-textos">
            <span className="aviso-salvando-titulo">
              {titulo}
              <span className="aviso-salvando-pontos" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </span>
            <span className="aviso-salvando-detalhe">{detalhe}</span>
          </span>
        </div>
      </div>

      <style>{`
        .aviso-salvando {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 14px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 2147483000;
          max-width: calc(100vw - 32px);
          pointer-events: none;
          animation: aviso-salvando-entrar 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .aviso-salvando-cartao {
          --av-fundo: rgba(255, 255, 255, 0.97);
          --av-borda: rgba(15, 23, 42, 0.08);
          --av-titulo: #0f172a;
          --av-detalhe: #64748b;
          --av-sombra: 0 1px 2px rgba(15, 23, 42, 0.06), 0 14px 36px -10px rgba(76, 29, 149, 0.28);
          --av-trilho: rgba(124, 58, 237, 0.14);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 18px 10px 12px;
          border-radius: 16px;
          background: var(--av-fundo);
          border: 1px solid var(--av-borda);
          box-shadow: var(--av-sombra);
          backdrop-filter: blur(16px) saturate(160%);
          -webkit-backdrop-filter: blur(16px) saturate(160%);
          font-family: inherit;
        }
        html.dark .aviso-salvando-cartao,
        html.theme-dark .aviso-salvando-cartao {
          --av-fundo: rgba(22, 22, 30, 0.985);
          --av-borda: rgba(255, 255, 255, 0.09);
          --av-titulo: #f8fafc;
          --av-detalhe: #a1a1aa;
          --av-sombra: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 18px 40px -12px rgba(0, 0, 0, 0.7);
          --av-trilho: rgba(167, 139, 250, 0.18);
        }
        .aviso-salvando-giro {
          position: relative;
          width: 30px;
          height: 30px;
          flex-shrink: 0;
          border-radius: 9999px;
          background: var(--av-trilho);
        }
        .aviso-salvando-giro::before {
          content: "";
          position: absolute;
          inset: 7px;
          border-radius: 9999px;
          background: conic-gradient(from 0deg, rgba(139, 92, 246, 0) 0deg, #8b5cf6 220deg, #d946ef 360deg);
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
          animation: aviso-salvando-rodar 0.75s linear infinite;
        }
        .aviso-salvando-textos {
          display: flex;
          flex-direction: column;
          min-width: 0;
          line-height: 1.2;
        }
        .aviso-salvando-titulo {
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
          font-size: 14px;
          font-weight: 650;
          letter-spacing: -0.01em;
          color: var(--av-titulo);
        }
        .aviso-salvando-detalhe {
          margin-top: 2px;
          font-size: 12px;
          font-weight: 500;
          color: var(--av-detalhe);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .aviso-salvando-pontos { display: inline-flex; gap: 2px; margin-left: 1px; align-self: flex-end; margin-bottom: 3px; }
        .aviso-salvando-pontos i {
          width: 3px;
          height: 3px;
          border-radius: 9999px;
          background: var(--av-titulo);
          opacity: 0.25;
          animation: aviso-salvando-ponto 1.2s ease-in-out infinite;
        }
        .aviso-salvando-pontos i:nth-child(2) { animation-delay: 0.15s; }
        .aviso-salvando-pontos i:nth-child(3) { animation-delay: 0.3s; }
        .aviso-salvando-pulso { animation: aviso-salvando-pulso 0.55s ease; }

        .aviso-salvando-linha {
          position: fixed;
          inset: 0 0 auto 0;
          height: 2px;
          z-index: 2147483000;
          overflow: hidden;
          pointer-events: none;
          background: rgba(139, 92, 246, 0.12);
        }
        .aviso-salvando-linha span {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 40%;
          border-radius: 9999px;
          background: linear-gradient(90deg, rgba(139, 92, 246, 0), #8b5cf6 40%, #d946ef 70%, rgba(217, 70, 239, 0));
          animation: aviso-salvando-correr 1.15s ease-in-out infinite;
        }

        @keyframes aviso-salvando-rodar { to { transform: rotate(360deg); } }
        @keyframes aviso-salvando-entrar {
          from { opacity: 0; transform: translate(-50%, -8px) scale(0.98); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes aviso-salvando-ponto {
          0%, 80%, 100% { opacity: 0.25; }
          40% { opacity: 1; }
        }
        @keyframes aviso-salvando-pulso {
          0% { box-shadow: var(--av-sombra), 0 0 0 0 rgba(139, 92, 246, 0.45); }
          100% { box-shadow: var(--av-sombra), 0 0 0 12px rgba(139, 92, 246, 0); }
        }
        @keyframes aviso-salvando-correr {
          from { left: -40%; }
          to { left: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .aviso-salvando, .aviso-salvando-pulso { animation: none; }
          .aviso-salvando-linha span { animation-duration: 2.5s; }
        }
        html.salvando button,
        html.salvando [role="button"] {
          cursor: progress !important;
        }
      `}</style>
    </>
  );
}
