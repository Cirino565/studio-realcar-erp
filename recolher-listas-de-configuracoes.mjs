#!/usr/bin/env node
/*
 * LISTAS DE CONFIGURACOES COMECAM RECOLHIDAS - Studio Realçar
 *
 * Na tela Configuracoes > Cadastros auxiliares, as listas compridas
 * (Origens de cliente, Procedimentos de interesse, Motivos de perda e
 * Servicos da agenda) agora abrem FECHADAS. Em cada uma aparece um botao
 * "Ver lista (N)" para abrir quando voce quiser, e "Ocultar lista" para
 * fechar de novo. O campo de adicionar novo item continua sempre visivel.
 *
 * Arquivo alterado: app/(app)/configuracoes/components/ConfiguracoesClient.tsx
 *
 * Pode rodar mais de uma vez: o que ja foi feito e pulado.
 * Se algum trecho nao for encontrado, NADA e gravado.
 *
 * Uso: node recolher-listas-de-configuracoes.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"arquivo": "app/(app)/configuracoes/components/ConfiguracoesClient.tsx", "patches": [{"nome": "icone de seta (importacao)", "antes": "import {\n  Building2,\n  CalendarClock,", "depois": "import {\n  Building2,\n  CalendarClock,\n  ChevronDown,"}, {"nome": "listas de opcoes: guardar se esta aberta", "antes": "  const [pendingId, setPendingId] = useState<number | null>(null);\n  const [isPending, startTransition] = useTransition();\n\n  function adicionar() {", "depois": "  const [pendingId, setPendingId] = useState<number | null>(null);\n  const [listaAberta, setListaAberta] = useState(false);\n  const [isPending, startTransition] = useTransition();\n\n  function adicionar() {"}, {"nome": "listas de opcoes: botao e lista recolhida", "antes": "      <div className=\"mt-5 grid gap-3\">\n        {items.length > 0 ? (\n          (ordenacaoAutomatica ? ordenarPorNome(items) : items).map((item) => (", "depois": "      <button\n        type=\"button\"\n        onClick={() => setListaAberta((aberta) => !aberta)}\n        aria-expanded={listaAberta}\n        className=\"mt-5 flex w-full items-center justify-between rounded-2xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]\"\n      >\n        <span>{listaAberta ? \"Ocultar lista\" : `Ver lista (${items.length})`}</span>\n        <ChevronDown\n          className={`h-4 w-4 transition-transform ${listaAberta ? \"rotate-180\" : \"\"}`}\n        />\n      </button>\n\n      <div className={`mt-3 grid gap-3 ${listaAberta ? \"\" : \"hidden\"}`}>\n        {items.length > 0 ? (\n          (ordenacaoAutomatica ? ordenarPorNome(items) : items).map((item) => ("}, {"nome": "servicos da agenda: guardar se esta aberta", "antes": "  const [custo, setCusto] = useState(\"\");\n  const [pendingId, setPendingId] = useState<number | null>(null);", "depois": "  const [custo, setCusto] = useState(\"\");\n  const [pendingId, setPendingId] = useState<number | null>(null);\n  const [listaAberta, setListaAberta] = useState(false);"}, {"nome": "servicos da agenda: botao e lista recolhida", "antes": "      <div className=\"mt-5 grid gap-3 xl:grid-cols-2\">\n        {items.length > 0 ? (\n          ordenarPorNome(items).map((item) => (\n            <ServicoCardEditor", "depois": "      <button\n        type=\"button\"\n        onClick={() => setListaAberta((aberta) => !aberta)}\n        aria-expanded={listaAberta}\n        className=\"mt-5 flex w-full items-center justify-between rounded-2xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]\"\n      >\n        <span>{listaAberta ? \"Ocultar lista\" : `Ver serviços (${items.length})`}</span>\n        <ChevronDown\n          className={`h-4 w-4 transition-transform ${listaAberta ? \"rotate-180\" : \"\"}`}\n        />\n      </button>\n\n      <div\n        className={`mt-3 grid gap-3 xl:grid-cols-2 ${listaAberta ? \"\" : \"hidden\"}`}\n      >\n        {items.length > 0 ? (\n          ordenarPorNome(items).map((item) => (\n            <ServicoCardEditor"}]};
const caminho = path.join(process.cwd(), ...DATA.arquivo.split("/"));

if (!fs.existsSync(caminho)) {
  console.log("[erro] arquivo nao encontrado: " + DATA.arquivo + ". Rode na pasta do projeto.");
  process.exit(1);
}

const bruto = fs.readFileSync(caminho, "utf8");
const crlf = bruto.includes("\r\n");
let texto = bruto.replace(/\r\n/g, "\n");
let erros = 0;
let mudou = false;

for (const p of DATA.patches) {
  if (texto.includes(p.depois)) {
    console.log("[pulou] " + p.nome + " - ja aplicado");
  } else if (texto.split(p.antes).length === 2) {
    texto = texto.replace(p.antes, () => p.depois);
    mudou = true;
    console.log("[ok] " + p.nome);
  } else {
    console.log("[erro] " + p.nome + " - trecho nao encontrado");
    erros++;
  }
}

if (erros > 0) {
  console.log("\nNada foi gravado: " + erros + " trecho(s) nao encontrado(s). Me avise.");
  process.exit(1);
}
if (mudou) fs.writeFileSync(caminho, crlf ? texto.replace(/\n/g, "\r\n") : texto, "utf8");
console.log("\nConcluido. Abra Configuracoes > Cadastros auxiliares.");
