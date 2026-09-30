#!/usr/bin/env node
/**
 * avisar-carregando-em-todo-sistema.mjs
 * ------------------------------------------------------------------
 * O QUE ESTE SCRIPT FAZ
 *
 * Resolve o "cliquei e nada aconteceu, cliquei de novo" em TODO o sistema:
 *
 * 1) Barra roxa fininha no topo da tela: aparece no mesmo instante em que
 *    você clica em qualquer link (nome da cliente, "Ver prontuário",
 *    itens do menu, etc.) e some quando a tela nova abre. O cursor também
 *    vira "carregando". Não faz nenhuma busca no servidor - é só visual,
 *    então não pesa nada.
 *
 * 2) Ao abrir o prontuário, a tela já troca na hora para um esboço da
 *    ficha com "Abrindo prontuário...", enquanto os dados chegam.
 *
 * Arquivos: cria components/layout/BarraNavegacao.tsx e
 * app/(app)/clientes/[id]/loading.tsx, e acrescenta 2 trechos pequenos
 * em app/(app)/layout.tsx.
 * Arquivos que já existirem NÃO são sobrescritos.
 *
 * É IDEMPOTENTE: rodando de novo, tudo aparece como "[pulou]".
 * Se algum trecho não for encontrado, NADA é salvo - me mande a mensagem.
 * ------------------------------------------------------------------
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const RAIZ = process.cwd();
const LAYOUT = "app/(app)/layout.tsx";
const NOVOS = [
  {
    "caminho": "components/layout/BarraNavegacao.tsx",
    "conteudo": "\"use client\";\n\nimport { usePathname, useSearchParams } from \"next/navigation\";\nimport { useEffect, useRef, useState } from \"react\";\n\n/**\n * Barra fininha no topo da tela que aparece NA HORA em que alguém clica em\n * um link do sistema (nome da cliente, \"Ver prontuário\", itens do menu,\n * etc.) e some quando a nova tela termina de abrir.\n *\n * Serve para a pessoa saber que o clique funcionou e não ficar clicando\n * várias vezes enquanto o servidor responde.\n *\n * É leve: não faz nenhuma busca no servidor, só escuta os cliques em links\n * e desenha uma barra com CSS. Vale para o sistema inteiro de uma vez.\n */\nexport default function BarraNavegacao() {\n  const pathname = usePathname();\n  const searchParams = useSearchParams();\n  const [ativa, setAtiva] = useState(false);\n  const limiteRef = useRef<number | null>(null);\n\n  // A tela nova abriu: esconde a barra.\n  useEffect(() => {\n    // eslint-disable-next-line react-hooks/set-state-in-effect\n    setAtiva(false);\n    if (limiteRef.current) {\n      window.clearTimeout(limiteRef.current);\n      limiteRef.current = null;\n    }\n  }, [pathname, searchParams]);\n\n  useEffect(() => {\n    function aoClicar(event: MouseEvent) {\n      if (\n        event.button !== 0 ||\n        event.metaKey ||\n        event.ctrlKey ||\n        event.shiftKey ||\n        event.altKey\n      ) {\n        return;\n      }\n\n      const alvo = event.target as Element | null;\n      const link = alvo?.closest?.(\"a\");\n      if (!link) return;\n\n      const destinoAba = link.getAttribute(\"target\");\n      if (destinoAba && destinoAba !== \"_self\") return;\n      if (link.hasAttribute(\"download\")) return;\n\n      const href = link.getAttribute(\"href\");\n      if (\n        !href ||\n        href.startsWith(\"#\") ||\n        href.startsWith(\"mailto:\") ||\n        href.startsWith(\"tel:\")\n      ) {\n        return;\n      }\n\n      let url: URL;\n      try {\n        url = new URL(link.href, window.location.href);\n      } catch {\n        return;\n      }\n\n      // Links para fora do sistema (WhatsApp, Google etc.) e downloads\n      // de arquivo (/api/...) não trocam de tela aqui dentro.\n      if (url.origin !== window.location.origin) return;\n      if (url.pathname.startsWith(\"/api/\")) return;\n\n      // Clique no link da própria tela em que já está: nada a esperar.\n      if (\n        url.pathname === window.location.pathname &&\n        url.search === window.location.search\n      ) {\n        return;\n      }\n\n      setAtiva(true);\n\n      // Segurança: se por algum motivo a tela não trocar, some sozinha.\n      if (limiteRef.current) window.clearTimeout(limiteRef.current);\n      limiteRef.current = window.setTimeout(() => {\n        setAtiva(false);\n        limiteRef.current = null;\n      }, 15000);\n    }\n\n    document.addEventListener(\"click\", aoClicar, true);\n    return () => {\n      document.removeEventListener(\"click\", aoClicar, true);\n      if (limiteRef.current) window.clearTimeout(limiteRef.current);\n    };\n  }, []);\n\n  useEffect(() => {\n    document.documentElement.classList.toggle(\"navegando\", ativa);\n  }, [ativa]);\n\n  if (!ativa) return null;\n\n  return (\n    <div\n      role=\"progressbar\"\n      aria-label=\"Carregando\"\n      className=\"pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden bg-violet-200/60 dark:bg-violet-500/20\"\n    >\n      <div className=\"barra-navegacao-faixa h-full w-1/3 rounded-full bg-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.7)] dark:bg-violet-400\" />\n\n      <style>{`\n        @keyframes barra-navegacao-andar {\n          0% { transform: translateX(-100%); }\n          100% { transform: translateX(300%); }\n        }\n        .barra-navegacao-faixa {\n          animation: barra-navegacao-andar 1.1s ease-in-out infinite;\n        }\n        html.navegando, html.navegando * {\n          cursor: progress !important;\n        }\n      `}</style>\n    </div>\n  );\n}\n",
    "rotulo": "barra de carregamento no topo (novo arquivo)"
  },
  {
    "caminho": "app/(app)/clientes/[id]/loading.tsx",
    "conteudo": "// Aparece na hora em que alguém clica no nome da cliente ou em\n// \"Ver prontuário\", enquanto a ficha completa carrega.\nfunction Bloco({ className }: { className: string }) {\n  return (\n    <div\n      className={`animate-pulse rounded-xl bg-slate-200/80 dark:bg-white/10 ${className}`}\n    />\n  );\n}\n\nexport default function CarregandoProntuario() {\n  return (\n    <div className=\"app-mobile-safe space-y-5 sm:space-y-6\" aria-busy=\"true\">\n      <div className=\"rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.055] sm:p-6\">\n        <div className=\"flex items-center gap-4\">\n          <Bloco className=\"size-14 shrink-0 rounded-2xl\" />\n          <div className=\"min-w-0 flex-1 space-y-2\">\n            <Bloco className=\"h-5 w-48 max-w-full\" />\n            <Bloco className=\"h-3.5 w-32 max-w-full\" />\n          </div>\n        </div>\n      </div>\n\n      <div className=\"rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.055]\">\n        <div className=\"flex gap-2 overflow-hidden border-b border-slate-200 p-3 dark:border-white/10\">\n          <Bloco className=\"h-9 w-28 shrink-0\" />\n          <Bloco className=\"h-9 w-24 shrink-0\" />\n          <Bloco className=\"h-9 w-24 shrink-0\" />\n          <Bloco className=\"h-9 w-32 shrink-0\" />\n        </div>\n\n        <div className=\"space-y-3 p-4 sm:p-6\">\n          <p className=\"text-sm font-medium text-slate-500 dark:text-slate-400\">\n            Abrindo prontuário...\n          </p>\n          <Bloco className=\"h-24 w-full\" />\n          <Bloco className=\"h-24 w-full\" />\n        </div>\n      </div>\n    </div>\n  );\n}\n",
    "rotulo": "tela 'Abrindo prontuário...' (novo arquivo)"
  }
];
const PATCHES = [
  {
    "rotulo": "ligar a barra no layout (imports)",
    "buscar": "import Sidebar from \"@/components/layout/Sidebar\";",
    "substituir": "import Sidebar from \"@/components/layout/Sidebar\";\nimport BarraNavegacao from \"@/components/layout/BarraNavegacao\";\nimport { Suspense } from \"react\";",
    "pularSePresente": "import BarraNavegacao from \"@/components/layout/BarraNavegacao\";"
  },
  {
    "rotulo": "ligar a barra no layout (tela)",
    "buscar": "        <Sidebar permissoes={permissoes} isAdmin={isAdminUser(usuario)} />",
    "substituir": "        <Suspense fallback={null}>\n          <BarraNavegacao />\n        </Suspense>\n\n        <Sidebar permissoes={permissoes} isAdmin={isAdminUser(usuario)} />",
    "pularSePresente": "<BarraNavegacao />"
  }
];

const caminho = (relativo) => join(RAIZ, ...relativo.split("/"));

console.log("Aplicando: aviso de carregamento em todo o sistema...\n");

if (!existsSync(caminho(LAYOUT))) {
  console.log(`[erro] Não encontrei ${LAYOUT}. Rode o script na pasta principal do projeto.`);
  process.exit(1);
}

const bruto = readFileSync(caminho(LAYOUT), "utf-8");
const usaCRLF = bruto.includes("\r\n");
let layout = bruto.replace(/\r\n/g, "\n");
let erro = false;

for (const p of PATCHES) {
  if (layout.includes(p.pularSePresente)) {
    console.log(`[pulou] ${p.rotulo}`);
    continue;
  }
  const vezes = layout.split(p.buscar).length - 1;
  if (vezes !== 1) {
    console.log(`[erro] ${p.rotulo} - não encontrei o trecho esperado (${vezes} ocorrência(s), esperado 1).`);
    erro = true;
    continue;
  }
  layout = layout.replace(p.buscar, () => p.substituir);
  console.log(`[ok] ${p.rotulo}`);
}

if (erro) {
  console.log("\nNADA foi salvo. Manda esta mensagem inteira no chat que eu ajusto.");
  process.exit(1);
}

const pastasFaltando = NOVOS.filter(
  (n) => !existsSync(dirname(caminho(n.caminho))),
);
for (const n of pastasFaltando) {
  // Só as pastas de telas que existem recebem o arquivo; se uma tela não
  // existir no seu projeto, ela é simplesmente ignorada.
  if (!n.caminho.startsWith("components/")) {
    console.log(`[pulou] ${n.rotulo} - essa tela não existe no seu projeto`);
  }
}

for (const n of NOVOS) {
  const destino = caminho(n.caminho);
  const pasta = dirname(destino);
  if (!existsSync(pasta)) {
    if (!n.caminho.startsWith("components/")) continue;
    mkdirSync(pasta, { recursive: true });
  }
  if (existsSync(destino)) {
    console.log(`[pulou] ${n.rotulo} - já existe`);
    continue;
  }
  writeFileSync(destino, n.conteudo, "utf-8");
  console.log(`[ok] ${n.rotulo}`);
}

const finalLayout = usaCRLF ? layout.replace(/\n/g, "\r\n") : layout;
if (finalLayout !== bruto) writeFileSync(caminho(LAYOUT), finalLayout, "utf-8");

console.log("\nConcluído.");
