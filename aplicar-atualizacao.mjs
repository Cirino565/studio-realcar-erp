/**
 * ATUALIZACAO VISUAL - Studio Realcar
 *
 * Aplica sozinho, nos arquivos do projeto:
 *   1. Logo real do Studio Realcar no menu lateral (no lugar do icone generico)
 *   2. Logo real na tela de login (versao computador e versao celular)
 *   3. Melhor contraste e cores por status na busca de cliente da Agenda
 *
 * Nao precisa de nenhum arquivo de imagem novo: usa a logo que ja esta
 * em public/studio-realcar-logo.png, recortada por CSS.
 *
 * Como usar: coloque este arquivo na RAIZ do projeto e rode
 *     node aplicar-atualizacao.mjs
 *
 * E seguro rodar duas vezes: se uma alteracao ja estiver aplicada, ele avisa
 * e pula, sem duplicar nada.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

// Recorte do simbolo (rosto + folha) de dentro da logo completa.
// A logo tem 900x815; o simbolo ocupa a faixa de cima. Estes numeros
// ampliam e reposicionam a imagem dentro de uma caixa quadrada de forma
// que apenas o simbolo apareca.
const RECORTE = 'style={{ width: "207.9%", left: "-50.3%", top: "-1.2%" }}';

const arquivos = {
  sidebar: "components/layout/Sidebar.tsx",
  login: "app/(auth)/login/page.tsx",
  busca: "app/(app)/agenda/components/AgendaSearch.tsx",
};

/** Cada item: [arquivo, descricao, textoAntigo, textoNovo] */
const alteracoes = [
  // ---------- 1. MENU LATERAL ----------
  [
    "sidebar",
    "menu lateral: logo real no lugar do icone generico",
    `            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 text-white shadow-lg shadow-violet-600/20">
              <Sparkles className="size-5" />
            </div>`,
    `            <div className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <span className="relative block size-8 overflow-hidden">
                <img
                  src="/studio-realcar-logo.png"
                  alt=""
                  className="absolute max-w-none"
                  ${RECORTE}
                />
              </span>
            </div>`,
  ],
  [
    "sidebar",
    "menu lateral: remove icone que deixou de ser usado",
    `  ShoppingCart,
  Sparkles,
  Users,`,
    `  ShoppingCart,
  Users,`,
  ],

  // ---------- 2. TELA DE LOGIN ----------
  [
    "login",
    "login (computador): logo real no painel roxo",
    `            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              <Sparkles size={14} />
              Studio Realçar
            </div>`,
    `            <div className="inline-flex items-center rounded-2xl bg-white px-5 py-4 shadow-lg shadow-slate-950/20">
              <img
                src="/studio-realcar-logo.png"
                alt="Studio Realçar"
                className="h-14 w-auto object-contain"
              />
            </div>`,
  ],
  [
    "login",
    "login (celular): logo real no topo do formulario",
    `              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/20">
                <Sparkles size={21} />
              </div>`,
    `              <div className="relative flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <span className="relative block size-10 overflow-hidden">
                  <img
                    src="/studio-realcar-logo.png"
                    alt=""
                    className="absolute max-w-none"
                    ${RECORTE}
                  />
                </span>
              </div>`,
  ],
  [
    "login",
    "login: remove icone que deixou de ser usado",
    `  UserRound,
  ShieldCheck,
  Sparkles,
} from "lucide-react";`,
    `  UserRound,
  ShieldCheck,
} from "lucide-react";`,
  ],

  // ---------- 3. BUSCA DE CLIENTE NA AGENDA ----------
  [
    "busca",
    "busca: cria as cores de status (mesmas do resto da Agenda)",
    `function somenteDigitos(valor?: string | null) {
  return (valor ?? "").replace(/\\D/g, "");
}`,
    `function somenteDigitos(valor?: string | null) {
  return (valor ?? "").replace(/\\D/g, "");
}

// Mesmas cores de status usadas no resto da Agenda, para dar identidade
// visual imediata a cada agendamento listado na busca.
function statusBadgeClass(status: string) {
  switch (status) {
    case "Confirmado":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "Em atendimento":
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300";
    case "Atendido":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
    case "Faltou":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case "Cancelado":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}`,
  ],
  [
    "busca",
    "busca: borda verde em quem tem horario marcado",
    `                  <div
                    key={cliente.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >`,
    `                  <div
                    key={cliente.id}
                    className={\`overflow-hidden rounded-xl border-y border-r border-l-4 border-slate-200 bg-white shadow-sm dark:border-y-slate-800 dark:border-r-slate-800 dark:bg-slate-900 \${
                      proximos.length > 0
                        ? "border-l-emerald-400 dark:border-l-emerald-500"
                        : "border-l-slate-200 dark:border-l-slate-700"
                    }\`}
                  >`,
  ],
  [
    "busca",
    "busca: deixa 'sem agendamentos' mais discreto",
    `                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Cliente cadastrado, mas sem agendamentos.
                        </p>`,
    `                        <p className="text-sm text-slate-400 dark:text-slate-500">
                          Cliente cadastrado, mas sem agendamentos.
                        </p>`,
  ],
  [
    "busca",
    "busca: status colorido nos proximos agendamentos",
    `                                      <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                                        {resultado.profissionalNome ||
                                          "Profissional não definida"}{" "}
                                        • {resultado.status}
                                      </p>`,
    `                                      <div className="mt-1 flex items-center gap-1.5">
                                        <p className="min-w-0 truncate text-[11px] text-slate-500 dark:text-slate-400">
                                          {resultado.profissionalNome ||
                                            "Profissional não definida"}
                                        </p>

                                        <span
                                          className={\`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide \${statusBadgeClass(
                                            resultado.status,
                                          )}\`}
                                        >
                                          {resultado.status}
                                        </span>
                                      </div>`,
  ],
  [
    "busca",
    "busca: status colorido no historico recente",
    `                                        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                                          {
                                            resultado.procedimento
                                          }{" "}
                                          • {resultado.status}
                                        </p>`,
    `                                        <div className="mt-0.5 flex items-center gap-1.5">
                                          <p className="min-w-0 truncate text-[11px] text-slate-500 dark:text-slate-400">
                                            {resultado.procedimento}
                                          </p>

                                          <span
                                            className={\`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide \${statusBadgeClass(
                                              resultado.status,
                                            )}\`}
                                          >
                                            {resultado.status}
                                          </span>
                                        </div>`,
  ],
];

// ---------------------------------------------------------------------------

console.log("\nAtualizacao visual - Studio Realcar\n");

// Confere se estamos na pasta certa antes de mexer em qualquer coisa.
const faltando = Object.values(arquivos).filter((caminho) => !existsSync(caminho));

if (faltando.length > 0) {
  console.error("ERRO: nao encontrei estes arquivos do projeto:\n");
  faltando.forEach((caminho) => console.error("   - " + caminho));
  console.error(
    "\nColoque este script na pasta raiz do projeto (a mesma que tem o package.json) e rode de novo.\n",
  );
  process.exit(1);
}

if (!existsSync("public/studio-realcar-logo.png")) {
  console.error(
    "ERRO: nao encontrei public/studio-realcar-logo.png - a logo precisa estar la.\n",
  );
  process.exit(1);
}

// Carrega os arquivos uma vez so. Guarda se o arquivo usa quebra de linha do
// Windows para devolver do mesmo jeito depois e nao sujar o historico do git.
const conteudos = {};
const usaCRLF = {};

for (const [chave, caminho] of Object.entries(arquivos)) {
  const bruto = readFileSync(caminho, "utf8");
  usaCRLF[chave] = bruto.includes("\r\n");
  conteudos[chave] = bruto.replace(/\r\n/g, "\n");
}

let aplicadas = 0;
let jaEstavam = 0;
const erros = [];

for (const [chave, descricao, antigo, novo] of alteracoes) {
  const atual = conteudos[chave];

  // Checa PRIMEIRO se a alteracao ja esta no arquivo. Em alguns casos o
  // trecho antigo continua existindo depois de aplicada (quando a alteracao
  // acrescenta algo logo depois dele), entao contar ocorrencias do antigo
  // nao serve como criterio - o que vale e a presenca do texto novo.
  if (atual.includes(novo)) {
    jaEstavam += 1;
    console.log("  [pulou] " + descricao + " (ja estava aplicada)");
    continue;
  }

  const ocorrencias = atual.split(antigo).length - 1;

  if (ocorrencias === 1) {
    conteudos[chave] = atual.replace(antigo, novo);
    aplicadas += 1;
    console.log("  [ok]    " + descricao);
    continue;
  }

  erros.push({ descricao, arquivo: arquivos[chave], ocorrencias });
  console.log("  [FALHOU] " + descricao);
}

if (erros.length > 0) {
  console.error("\nNENHUMA alteracao foi salva - o projeto continua como estava.\n");
  console.error("Estas partes nao bateram com o esperado:\n");

  erros.forEach((erro) => {
    console.error("   - " + erro.descricao);
    console.error("     arquivo: " + erro.arquivo);
    console.error(
      "     trechos encontrados: " +
        erro.ocorrencias +
        (erro.ocorrencias === 0
          ? " (o arquivo provavelmente ja foi alterado a mao)"
          : " (esperado 1)"),
    );
  });

  console.error("\nManda esta mensagem inteira no chat que eu ajusto.\n");
  process.exit(1);
}

// So grava depois que TUDO deu certo, para nunca deixar o projeto pela metade.
for (const [chave, caminho] of Object.entries(arquivos)) {
  const saida = usaCRLF[chave]
    ? conteudos[chave].replace(/\n/g, "\r\n")
    : conteudos[chave];

  writeFileSync(caminho, saida, "utf8");
}

console.log(
  "\nPronto! " +
    aplicadas +
    " alteracao(oes) aplicada(s)" +
    (jaEstavam > 0 ? ", " + jaEstavam + " ja estava(m) no lugar" : "") +
    ".\n",
);
console.log("Agora rode:  npm run build\n");
