#!/usr/bin/env node
/*
 * VISUAL CLARO ELEGANTE - Studio Realçar
 *
 * O que este script faz (so mexe no modo claro; o escuro fica igual):
 *  - Agenda: os cartoes de atendimento deixam de ser blocos verdes/roxos
 *    fortes e viram cartoes brancos com cor suave de fundo e uma faixa de
 *    cor do status no lado (verde = confirmado, azul = em atendimento...).
 *    O texto fica escuro e facil de ler.
 *  - Intervalo de almoco: de amarelo forte para uma faixa listrada discreta.
 *  - Roxo dos botoes e do dia selecionado um pouco mais calmo.
 *
 * Arquivos alterados:
 *  - app/globals.css (bloco novo no final)
 *  - app/(app)/agenda/components/AgendaCalendar.tsx (2 trechos pequenos;
 *    se voce ja rodou o visual escuro, eles sao pulados)
 *
 * Pode rodar mais de uma vez: o que ja foi feito e pulado.
 * Se algum trecho nao for encontrado, NADA e gravado.
 *
 * Uso: node aplicar-visual-claro-elegante.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"css": "\n/* ======================================================================\n   LIGHT ELEGANT V1\n   Tema claro mais fino: cartoes da Agenda em tom suave (em vez de blocos\n   verdes/roxos chapados), almoco discreto e roxo um pouco mais calmo.\n   O tema escuro nao e alterado por nada daqui.\n   ====================================================================== */\n\n.theme-light {\n  --color-violet-600: #7357d6;\n  --color-violet-700: #6340c2;\n}\n\n.theme-light .agenda-card {\n  background:\n    linear-gradient(135deg,\n      color-mix(in srgb, var(--ag-solid) 15%, #ffffff),\n      color-mix(in srgb, var(--ag-end) 8%, #ffffff)) !important;\n  border-color: color-mix(in srgb, var(--ag-solid) 28%, #ffffff) !important;\n  box-shadow:\n    inset 4px 0 0 var(--ag-solid),\n    0 1px 2px rgba(15, 23, 42, 0.06),\n    0 6px 14px rgba(15, 23, 42, 0.06) !important;\n  color: #1b2030 !important;\n}\n\n.theme-light .agenda-card [style*=\"color\"] {\n  color: #1d2231 !important;\n}\n\n.theme-light .agenda-card :is(span, button)[style*=\"background-color\"] {\n  background-color: rgba(15, 23, 42, 0.05) !important;\n  border-color: rgba(15, 23, 42, 0.12) !important;\n}\n\n.theme-light .agenda-card :is(.bg-white, [class*=\"bg-white/\"]) {\n  background-color: #ffffff !important;\n  border-color: rgba(15, 23, 42, 0.12) !important;\n}\n\n.theme-light [aria-label^=\"Intervalo de\"] {\n  background: repeating-linear-gradient(135deg,\n    rgba(176, 142, 78, 0.10) 0 6px, rgba(176, 142, 78, 0.04) 6px 12px) !important;\n  border-color: rgba(176, 142, 78, 0.30) !important;\n}\n", "a": ["className=\"absolute left-0.5 right-0.5 z-10 cursor-pointer overflow-hidden rounded-sm border text-left shadow-sm transition-all duration-300 hover:brightness-105 hover:shadow-md sm:left-0.5 sm:right-0.5\"", "className=\"agenda-card absolute left-0.5 right-0.5 z-10 cursor-pointer overflow-hidden rounded-sm border text-left shadow-sm transition-all duration-300 hover:brightness-105 hover:shadow-md sm:left-0.5 sm:right-0.5\""], "b": ["                            background: `linear-gradient(135deg, ${statusPalette.solid}, ${statusPalette.gradientEnd})`,", "                            background: `linear-gradient(135deg, ${statusPalette.solid}, ${statusPalette.gradientEnd})`,\n                            ...({ \"--ag-solid\": statusPalette.solid, \"--ag-end\": statusPalette.gradientEnd } as Record<string, string>),"]};
const raiz = process.cwd();
const MARCA = "LIGHT ELEGANT V1";

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
  console.log("[pulou] visual claro elegante (globals.css) - ja aplicada");
} else {
  agendarGravacao(arquivos.css, css, css.texto.replace(/\s*$/, "\n") + DATA.css);
  console.log("[ok] visual claro elegante (globals.css)");
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
console.log("\nConcluido. Abra o sistema no modo claro para ver o novo visual.");
