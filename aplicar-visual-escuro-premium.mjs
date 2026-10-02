#!/usr/bin/env node
/*
 * VISUAL ESCURO PREMIUM - Studio Realçar
 *
 * O que este script faz (so mexe no modo escuro; o claro fica igual):
 *  - Troca o fundo azul-arroxeado por um grafite neutro e elegante.
 *  - Cartoes, menus, campos e janelas ficam em tons de grafite com bordas finas.
 *  - Um unico destaque lavanda, mais suave, no lugar do roxo forte.
 *  - Agenda: os cartoes de atendimento deixam de ser blocos coloridos
 *    chapados e viram "vidro escuro" com uma faixa de cor do status
 *    (verde = confirmado, azul-petroleo = em atendimento, etc.).
 *  - Intervalo de almoco e bloqueios ficam discretos.
 *
 * Arquivos alterados:
 *  - app/globals.css (bloco novo no final)
 *  - app/(app)/agenda/components/AgendaCalendar.tsx (2 trechos pequenos)
 *
 * Pode rodar mais de uma vez: o que ja foi feito e pulado.
 * Se algum trecho nao for encontrado, NADA e gravado.
 *
 * Uso: node aplicar-visual-escuro-premium.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"css": "\n/* ======================================================================\n   DARK PREMIUM V3 (grafite elegante)\n   Camada final do tema escuro: fundos grafite neutros, superficies em\n   degraus de luminosidade, cores suaves e um unico destaque lavanda.\n   O tema claro nao e alterado por nada daqui.\n   ====================================================================== */\n\n.theme-dark {\n  --color-slate-50: #f3f4f6;\n  --color-slate-100: #e7e8ec;\n  --color-slate-200: #d6d8df;\n  --color-slate-300: #b6bac4;\n  --color-slate-400: #9298a5;\n  --color-slate-500: #707584;\n  --color-slate-600: #4b505c;\n  --color-slate-700: #2c2f38;\n  --color-slate-800: #1f2128;\n  --color-slate-900: #17191f;\n  --color-slate-950: #0f1014;\n\n  --color-violet-100: #ebe7fd;\n  --color-violet-200: #d8d0fb;\n  --color-violet-300: #bdb2f7;\n  --color-violet-400: #a090ee;\n  --color-violet-500: #8573e0;\n  --color-violet-600: #6e5cc9;\n  --color-violet-700: #5a4aa8;\n  --color-fuchsia-500: #9b6fd3;\n  --color-fuchsia-600: #8758c0;\n  --color-fuchsia-700: #6f46a1;\n\n  --background: oklch(0.165 0.004 270);\n  --foreground: oklch(0.955 0.004 270);\n  --card: oklch(0.205 0.005 270);\n  --card-foreground: oklch(0.955 0.004 270);\n  --popover: oklch(0.225 0.005 270);\n  --popover-foreground: oklch(0.955 0.004 270);\n  --primary: oklch(0.66 0.13 295);\n  --secondary: oklch(0.27 0.006 270);\n  --muted: oklch(0.255 0.006 270);\n  --muted-foreground: oklch(0.72 0.01 270);\n  --accent: oklch(0.29 0.03 295);\n  --border: oklch(1 0 0 / 0.08);\n  --input: oklch(1 0 0 / 0.1);\n  --ring: oklch(0.66 0.13 295);\n  --sidebar: oklch(0.15 0.004 270);\n  --sidebar-primary: oklch(0.66 0.13 295);\n  --sidebar-accent: oklch(0.25 0.012 290);\n  --sidebar-border: oklch(1 0 0 / 0.07);\n}\n\n.theme-dark,\n.theme-dark body {\n  background-color: #0d0e12;\n}\n\n.theme-dark body {\n  background:\n    radial-gradient(60rem 28rem at 12% -8%, rgba(150, 130, 235, 0.07), transparent 70%),\n    #0d0e12;\n  color: #eceef2;\n}\n\n.theme-dark .app-shell {\n  background:\n    radial-gradient(60rem 28rem at 12% -8%, rgba(150, 130, 235, 0.06), transparent 70%),\n    #0e0f13;\n  color: #eceef2;\n}\n\n.theme-dark .app-header {\n  border-color: rgba(255, 255, 255, 0.06);\n  background-color: rgba(14, 15, 19, 0.82);\n  box-shadow: none;\n}\n\n.theme-dark .app-sidebar {\n  border-color: rgba(255, 255, 255, 0.06);\n  background-color: #0b0c10;\n  box-shadow: none;\n}\n\n.theme-dark .app-bottom-nav {\n  border-color: rgba(255, 255, 255, 0.08);\n  background-color: rgba(18, 19, 24, 0.94);\n  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);\n}\n\n.theme-dark .app-bottom-dock {\n  border-color: rgba(255, 255, 255, 0.07);\n  background-color: rgba(18, 19, 24, 0.78);\n  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.38);\n}\n\n.theme-dark .app-header-date-icon {\n  background-color: rgba(157, 141, 241, 0.12);\n  color: #bdb2f7;\n}\n\n.theme-dark .app-header-search,\n.theme-dark .theme-toggle-button,\n.theme-dark .app-header-action {\n  border-color: rgba(255, 255, 255, 0.08) !important;\n  background-color: rgba(255, 255, 255, 0.04) !important;\n}\n\n.theme-dark .theme-toggle-button:hover,\n.theme-dark .app-header-action:hover {\n  border-color: rgba(189, 178, 247, 0.28) !important;\n  background-color: rgba(157, 141, 241, 0.10) !important;\n}\n\n.theme-dark .app-logout-button {\n  border-color: rgba(251, 113, 133, 0.16);\n  background-color: rgba(244, 63, 94, 0.07);\n  color: #f3a3b0;\n}\n\n.theme-dark .app-shell .premium-card,\n.theme-dark .app-shell .premium-card-soft,\n.theme-dark .app-shell .premium-table {\n  border-color: rgba(255, 255, 255, 0.07) !important;\n  background: #15171c !important;\n  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03) inset, 0 14px 34px rgba(0, 0, 0, 0.32) !important;\n}\n\n.theme-dark .app-shell .premium-subtitle { color: #9298a5 !important; }\n\n.theme-dark .app-shell .bg-white,\n.theme-dark .app-shell .bg-white\\/95,\n.theme-dark .app-shell .bg-white\\/90,\n.theme-dark .app-shell .bg-white\\/80,\n.theme-dark .app-shell .bg-white\\/70,\n.theme-dark .app-shell .bg-slate-50,\n.theme-dark .app-shell .bg-slate-100,\n.theme-dark .app-shell .bg-\\[\\#eef0f6\\],\n.theme-dark .app-shell [class*=\"bg-[#111827]\"],\n.theme-dark .app-shell [class*=\"bg-[#11131d]\"],\n.theme-dark .app-shell [class*=\"bg-[#151a2a]\"],\n.theme-dark .app-shell [class*=\"bg-[#171d2d]\"],\n.theme-dark .app-shell [class*=\"bg-[#171d2a]\"],\n.theme-dark .app-shell [class*=\"bg-[#1d2437]\"],\n.theme-dark .app-shell [class*=\"bg-[#20283b]\"],\n.theme-dark .app-shell [class*=\"bg-[#0b1220]\"] {\n  background-color: #15171c !important;\n}\n\n.theme-dark .app-shell .bg-slate-200 {\n  background-color: #1d1f26 !important;\n}\n\n.theme-dark .app-shell .bg-white\\/5,\n.theme-dark .app-shell .bg-white\\/10,\n.theme-dark .app-shell [class*=\"bg-white/[\"] {\n  background-color: rgba(255, 255, 255, 0.04) !important;\n}\n\n.theme-dark .app-shell .bg-slate-950\\/20,\n.theme-dark .app-shell .bg-slate-950\\/25,\n.theme-dark .app-shell .bg-slate-950\\/30,\n.theme-dark .app-shell .bg-slate-950\\/35,\n.theme-dark .app-shell .bg-slate-950\\/40,\n.theme-dark .app-shell .bg-slate-950\\/55,\n.theme-dark .app-shell .bg-slate-950\\/60,\n.theme-dark .app-shell .bg-slate-950\\/70,\n.theme-dark .app-shell .bg-slate-950\\/80,\n.theme-dark .app-shell .bg-slate-900\\/55,\n.theme-dark .app-shell .bg-slate-900\\/60 {\n  background-color: rgba(8, 9, 12, 0.55) !important;\n}\n\n.theme-dark .app-shell .border-slate-100,\n.theme-dark .app-shell .border-slate-200,\n.theme-dark .app-shell .border-slate-300,\n.theme-dark .app-shell .border-white\\/10,\n.theme-dark .app-shell .border-white\\/15,\n.theme-dark .app-shell .border-white\\/20,\n.theme-dark .app-shell [class*=\"border-white/[\"] {\n  border-color: rgba(255, 255, 255, 0.08) !important;\n}\n\n.theme-dark .app-shell .divide-slate-100 > :not([hidden]) ~ :not([hidden]),\n.theme-dark .app-shell .divide-slate-200 > :not([hidden]) ~ :not([hidden]),\n.theme-dark .app-shell [class*=\"divide-white/[\"] > :not([hidden]) ~ :not([hidden]) {\n  border-color: rgba(255, 255, 255, 0.07) !important;\n}\n\n.theme-dark .app-shell .text-black,\n.theme-dark .app-shell .text-slate-950,\n.theme-dark .app-shell .text-slate-900,\n.theme-dark .app-shell .text-slate-800,\n.theme-dark .app-shell .text-slate-700,\n.theme-dark .app-shell .text-slate-100,\n.theme-dark .app-shell .text-slate-200,\n.theme-dark .app-shell .text-white {\n  color: #eceef2 !important;\n}\n\n.theme-dark .app-shell .text-slate-600,\n.theme-dark .app-shell .text-slate-500 {\n  color: #a3a9b5 !important;\n}\n\n.theme-dark .app-shell .text-slate-400,\n.theme-dark .app-shell .text-slate-300 {\n  color: #b9bec9 !important;\n}\n\n.theme-dark .app-shell .app-modal-backdrop {\n  background-color: rgba(5, 6, 8, 0.74) !important;\n}\n\n/* Campos de formulario */\n.theme-dark .app-shell .premium-input,\n.theme-dark .app-shell input,\n.theme-dark .app-shell select,\n.theme-dark .app-shell textarea {\n  border-color: rgba(255, 255, 255, 0.09) !important;\n  background-color: rgba(255, 255, 255, 0.04) !important;\n  color: #eceef2 !important;\n}\n\n.theme-dark .app-shell input::placeholder,\n.theme-dark .app-shell textarea::placeholder {\n  color: #6f7482 !important;\n}\n\n.theme-dark .app-shell input:focus,\n.theme-dark .app-shell select:focus,\n.theme-dark .app-shell textarea:focus {\n  border-color: rgba(189, 178, 247, 0.5) !important;\n  background-color: rgba(255, 255, 255, 0.06) !important;\n  box-shadow: 0 0 0 3px rgba(157, 141, 241, 0.13) !important;\n}\n\n.theme-dark .app-shell select option,\n.theme-dark .app-shell select optgroup {\n  background-color: #15171c !important;\n  color: #eceef2 !important;\n}\n\n.theme-dark .app-shell select option:checked {\n  background-color: #4b3fa3 !important;\n}\n\n/* Superficies com tom (verde, vermelho, ambar...) ficam mais discretas */\n.theme-dark .app-shell [class*=\"bg-violet-50\"],\n.theme-dark .app-shell [class*=\"bg-violet-100\"] {\n  background-color: rgba(157, 141, 241, 0.10) !important;\n}\n.theme-dark .app-shell [class*=\"bg-emerald-50\"],\n.theme-dark .app-shell [class*=\"bg-emerald-100\"],\n.theme-dark .app-shell [class*=\"bg-green-50\"],\n.theme-dark .app-shell [class*=\"bg-green-100\"] {\n  background-color: rgba(52, 211, 153, 0.08) !important;\n}\n.theme-dark .app-shell [class*=\"bg-rose-50\"],\n.theme-dark .app-shell [class*=\"bg-rose-100\"],\n.theme-dark .app-shell [class*=\"bg-red-50\"],\n.theme-dark .app-shell [class*=\"bg-red-100\"] {\n  background-color: rgba(251, 113, 133, 0.08) !important;\n}\n.theme-dark .app-shell [class*=\"bg-amber-50\"],\n.theme-dark .app-shell [class*=\"bg-amber-100\"],\n.theme-dark .app-shell [class*=\"bg-yellow-50\"],\n.theme-dark .app-shell [class*=\"bg-yellow-100\"],\n.theme-dark .app-shell [class*=\"bg-orange-50\"],\n.theme-dark .app-shell [class*=\"bg-orange-100\"] {\n  background-color: rgba(226, 183, 110, 0.09) !important;\n}\n\n/* Agenda: cartoes de atendimento em vidro escuro, com faixa de cor */\n.theme-dark .agenda-card {\n  background:\n    linear-gradient(135deg,\n      color-mix(in srgb, var(--ag-solid) 24%, #15171c),\n      color-mix(in srgb, var(--ag-end) 12%, #15171c)) !important;\n  border-color: color-mix(in srgb, var(--ag-end) 26%, transparent) !important;\n  box-shadow:\n    inset 3px 0 0 color-mix(in srgb, var(--ag-solid) 35%, var(--ag-end)),\n    0 6px 16px rgba(0, 0, 0, 0.30) !important;\n  color: #eef0f4 !important;\n}\n\n.theme-dark .agenda-card [style*=\"color\"] {\n  color: rgba(240, 242, 246, 0.94) !important;\n}\n\n.theme-dark .agenda-card :is(span, button)[style*=\"background-color\"] {\n  background-color: rgba(255, 255, 255, 0.07) !important;\n  border-color: rgba(255, 255, 255, 0.13) !important;\n}\n\n.theme-dark .agenda-card :is(.bg-white, [class*=\"bg-white/\"]) {\n  background-color: rgba(10, 11, 15, 0.55) !important;\n  border-color: rgba(255, 255, 255, 0.14) !important;\n}\n\n/* Intervalo de almoco e bloqueios: discretos, sem marrom/laranja forte */\n.theme-dark [aria-label^=\"Intervalo de\"] {\n  background: repeating-linear-gradient(135deg,\n    rgba(214, 182, 120, 0.075) 0 6px, rgba(214, 182, 120, 0.03) 6px 12px) !important;\n  border-color: rgba(214, 182, 120, 0.22) !important;\n}\n\n.theme-dark article[class*=\"border-slate-400/80\"] {\n  background-color: #191b21 !important;\n  background-image: repeating-linear-gradient(135deg,\n    rgba(255, 255, 255, 0.04) 0 6px, transparent 6px 12px) !important;\n  border-color: rgba(255, 255, 255, 0.10) !important;\n}\n\n/* Botoes que so ganham cor ao passar o mouse nao podem ficar tingidos o\n   tempo todo (ex.: horarios vazios da Agenda). */\n.theme-dark .app-shell :is([class*=\"hover:bg-violet-\"], [class*=\"active:bg-violet-\"]):not([class^=\"bg-\"]):not([class*=\" bg-\"]):not([class*=\"dark:bg-\"]),\n.theme-dark .app-shell :is([class*=\"hover:bg-fuchsia-\"], [class*=\"active:bg-fuchsia-\"]):not([class^=\"bg-\"]):not([class*=\" bg-\"]):not([class*=\"dark:bg-\"]),\n.theme-dark .app-shell :is([class*=\"hover:bg-pink-\"], [class*=\"active:bg-pink-\"]):not([class^=\"bg-\"]):not([class*=\" bg-\"]):not([class*=\"dark:bg-\"]),\n.theme-dark .app-shell :is([class*=\"hover:bg-emerald-\"], [class*=\"active:bg-emerald-\"]):not([class^=\"bg-\"]):not([class*=\" bg-\"]):not([class*=\"dark:bg-\"]),\n.theme-dark .app-shell :is([class*=\"hover:bg-green-\"], [class*=\"active:bg-green-\"]):not([class^=\"bg-\"]):not([class*=\" bg-\"]):not([class*=\"dark:bg-\"]),\n.theme-dark .app-shell :is([class*=\"hover:bg-rose-\"], [class*=\"active:bg-rose-\"]):not([class^=\"bg-\"]):not([class*=\" bg-\"]):not([class*=\"dark:bg-\"]),\n.theme-dark .app-shell :is([class*=\"hover:bg-red-\"], [class*=\"active:bg-red-\"]):not([class^=\"bg-\"]):not([class*=\" bg-\"]):not([class*=\"dark:bg-\"]),\n.theme-dark .app-shell :is([class*=\"hover:bg-amber-\"], [class*=\"active:bg-amber-\"]):not([class^=\"bg-\"]):not([class*=\" bg-\"]):not([class*=\"dark:bg-\"]),\n.theme-dark .app-shell :is([class*=\"hover:bg-yellow-\"], [class*=\"active:bg-yellow-\"]):not([class^=\"bg-\"]):not([class*=\" bg-\"]):not([class*=\"dark:bg-\"]),\n.theme-dark .app-shell :is([class*=\"hover:bg-orange-\"], [class*=\"active:bg-orange-\"]):not([class^=\"bg-\"]):not([class*=\" bg-\"]):not([class*=\"dark:bg-\"]),\n.theme-dark .app-shell :is([class*=\"hover:bg-blue-\"], [class*=\"active:bg-blue-\"]):not([class^=\"bg-\"]):not([class*=\" bg-\"]):not([class*=\"dark:bg-\"]),\n.theme-dark .app-shell :is([class*=\"hover:bg-cyan-\"], [class*=\"active:bg-cyan-\"]):not([class^=\"bg-\"]):not([class*=\" bg-\"]):not([class*=\"dark:bg-\"]),\n.theme-dark .app-shell :is([class*=\"hover:bg-sky-\"], [class*=\"active:bg-sky-\"]):not([class^=\"bg-\"]):not([class*=\" bg-\"]):not([class*=\"dark:bg-\"]),\n.theme-dark .app-shell :is([class*=\"hover:bg-teal-\"], [class*=\"active:bg-teal-\"]):not([class^=\"bg-\"]):not([class*=\" bg-\"]):not([class*=\"dark:bg-\"]) {\n  background-color: transparent !important;\n}\n\n.theme-dark .app-shell :is([class*=\"hover:bg-violet-\"], [class*=\"hover:bg-fuchsia-\"]):not([class^=\"bg-\"]):not([class*=\" bg-\"]):not([class*=\"dark:bg-\"]):hover {\n  background-color: rgba(157, 141, 241, 0.08) !important;\n}\n", "a": ["className=\"absolute left-0.5 right-0.5 z-10 cursor-pointer overflow-hidden rounded-sm border text-left shadow-sm transition-all duration-300 hover:brightness-105 hover:shadow-md sm:left-0.5 sm:right-0.5\"", "className=\"agenda-card absolute left-0.5 right-0.5 z-10 cursor-pointer overflow-hidden rounded-sm border text-left shadow-sm transition-all duration-300 hover:brightness-105 hover:shadow-md sm:left-0.5 sm:right-0.5\""], "b": ["                            background: `linear-gradient(135deg, ${statusPalette.solid}, ${statusPalette.gradientEnd})`,", "                            background: `linear-gradient(135deg, ${statusPalette.solid}, ${statusPalette.gradientEnd})`,\n                            ...({ \"--ag-solid\": statusPalette.solid, \"--ag-end\": statusPalette.gradientEnd } as Record<string, string>),"]};
const raiz = process.cwd();
const MARCA = "DARK PREMIUM V3";

const arquivos = {
  css: path.join(raiz, "app", "globals.css"),
  agenda: path.join(raiz, "app", "(app)", "agenda", "components", "AgendaCalendar.tsx"),
};

let erros = 0;
const gravar = [];

function ler(caminho) {
  if (!fs.existsSync(caminho)) return null;
  const bruto = fs.readFileSync(caminho, "utf8");
  const crlf = bruto.includes("\r\n");
  return { texto: bruto.replace(/\r\n/g, "\n"), crlf };
}

function agendarGravacao(caminho, arq, texto) {
  gravar.push({ caminho, conteudo: arq.crlf ? texto.replace(/\n/g, "\r\n") : texto });
}

// 1) globals.css
const css = ler(arquivos.css);
if (!css) {
  console.log("[erro] app/globals.css nao encontrado. Rode na pasta do projeto.");
  erros++;
} else if (css.texto.includes(MARCA)) {
  console.log("[pulou] paleta escura premium (globals.css) - ja aplicada");
} else {
  agendarGravacao(arquivos.css, css, css.texto.replace(/\s*$/, "\n") + DATA.css);
  console.log("[ok] paleta escura premium (globals.css)");
}

// 2) AgendaCalendar.tsx
const ag = ler(arquivos.agenda);
if (!ag) {
  console.log("[erro] AgendaCalendar.tsx nao encontrado.");
  erros++;
} else {
  let t = ag.texto;
  let mudou = false;
  const passos = [
    ["marcar o cartao de atendimento", DATA.a],
    ["entregar as cores do status ao cartao", DATA.b],
  ];
  for (const [nome, [antes, depois]] of passos) {
    if (t.includes(depois)) {
      console.log(`[pulou] ${nome} (AgendaCalendar.tsx) - ja aplicado`);
    } else if (t.split(antes).length === 2) {
      t = t.replace(antes, () => depois);
      mudou = true;
      console.log(`[ok] ${nome} (AgendaCalendar.tsx)`);
    } else {
      console.log(`[erro] ${nome} (AgendaCalendar.tsx) - trecho nao encontrado`);
      erros++;
    }
  }
  if (mudou) agendarGravacao(arquivos.agenda, ag, t);
}

if (erros > 0) {
  console.log(`\nNada foi gravado: ${erros} trecho(s) nao encontrado(s). Me avise.`);
  process.exit(1);
}
for (const g of gravar) fs.writeFileSync(g.caminho, g.conteudo, "utf8");
console.log("\nConcluido. Abra o sistema no modo escuro para ver o novo visual.");
