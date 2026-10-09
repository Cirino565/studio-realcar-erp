#!/usr/bin/env node
/*
 * AVISO DE PACOTE COM VALOR A COBRAR - Studio Realcar
 *
 * Quando a cliente tem um pacote com saldo (ex.: Criolipolise R$ 600,00,
 * pagou R$ 100,00 de sinal), aparece um aviso amarelo bem visivel:
 *
 *    Pacote com valor a cobrar
 *    Criolipolise
 *    Pago R$ 100,00 de R$ 600,00. Falta cobrar R$ 500,00
 *    [Registrar pagamento]
 *
 * Onde aparece:
 *  - No topo da ficha da cliente (logo ao abrir).
 *  - Nos detalhes do agendamento na Agenda (ao clicar no horario da cliente).
 *
 * O botao "Registrar pagamento" leva direto para a aba Pacotes da cliente.
 * Quando o pacote e quitado, o aviso some sozinho.
 *
 * O que este script faz:
 *  - Cria components/pacotes/AvisoPacoteAberto.tsx.
 *  - Ajusta a ficha da cliente, a aba Pacotes (abrir pelo botao) e a Agenda.
 *
 * Pode rodar mais de uma vez. Se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node aviso-pacote-em-aberto.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{"components/pacotes/AvisoPacoteAberto.tsx":"\"use client\";\n\nimport Link from \"next/link\";\nimport { Wallet } from \"lucide-react\";\n\nimport { formatarMoeda } from \"@/lib/format\";\n\nexport type PacoteParaAviso = {\n  id: number;\n  descricao: string;\n  valorTotal: number;\n  valorPago: number;\n};\n\ntype Props = {\n  pacotes: PacoteParaAviso[];\n  /** Para onde o botao leva. Use \"#pacotes\" quando ja estiver na ficha. */\n  href: string;\n  /** Chamado ao tocar no botao (ex.: fechar a janela da agenda). */\n  onAbrir?: () => void;\n};\n\n// Aviso \"pacote com saldo a cobrar\". Aparece na ficha da cliente e nos\n// detalhes do agendamento, para quem atende ver na hora quanto ja foi pago e\n// quanto falta cobrar - sem precisar procurar na aba Pacotes.\nexport default function AvisoPacoteAberto({ pacotes, href, onAbrir }: Props) {\n  const abertos = pacotes.filter(\n    (pacote) => pacote.valorTotal - pacote.valorPago > 0.004,\n  );\n\n  if (abertos.length === 0) return null;\n\n  return (\n    <div className=\"space-y-2\">\n      {abertos.map((pacote) => {\n        const falta = Math.max(pacote.valorTotal - pacote.valorPago, 0);\n\n        return (\n          <div\n            key={pacote.id}\n            className=\"rounded-2xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-400/30 dark:bg-amber-500/10\"\n          >\n            <div className=\"flex items-start gap-3\">\n              <div className=\"flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200\">\n                <Wallet className=\"size-[18px]\" />\n              </div>\n\n              <div className=\"min-w-0 flex-1\">\n                <p className=\"text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200\">\n                  Pacote com valor a cobrar\n                </p>\n                <p className=\"mt-0.5 break-words text-sm font-bold text-amber-950 dark:text-amber-50\">\n                  {pacote.descricao}\n                </p>\n                <p className=\"mt-1 text-sm text-amber-900 dark:text-amber-100\">\n                  Pago {formatarMoeda(pacote.valorPago)} de{\" \"}\n                  {formatarMoeda(pacote.valorTotal)}.{\" \"}\n                  <strong className=\"font-extrabold\">\n                    Falta cobrar {formatarMoeda(falta)}\n                  </strong>\n                </p>\n\n                <Link\n                  href={href}\n                  onClick={onAbrir}\n                  className=\"mt-2 inline-flex min-h-9 items-center rounded-xl bg-amber-300 px-3 text-xs font-bold text-amber-950 shadow-sm ring-1 ring-amber-500/40 transition hover:bg-amber-400 dark:bg-amber-500/25 dark:text-amber-100 dark:ring-amber-300/40 dark:hover:bg-amber-500/40\"\n                >\n                  Registrar pagamento\n                </Link>\n              </div>\n            </div>\n          </div>\n        );\n      })}\n    </div>\n  );\n}\n"},"arquivos":[{"arquivo":"app/(app)/clientes/components/ClienteProfileHeader.tsx","obrigatorio":true,"patches":[{"nome":"ficha: importar o aviso","modo":"normal","antes":"import ClienteProfileActions from \"./ClienteProfileActions\";\n","depois":"import ClienteProfileActions from \"./ClienteProfileActions\";\nimport AvisoPacoteAberto from \"@/components/pacotes/AvisoPacoteAberto\";\n"},{"nome":"ficha: mostrar o aviso do pacote no topo","modo":"normal","antes":"        {enderecoEstruturado || enderecoOriginal ? (\n","depois":"        <AvisoPacoteAberto\n          pacotes={data.pacotes.filter((pacote) => pacote.status === \"Aberto\")}\n          href=\"#pacotes\"\n        />\n\n        {enderecoEstruturado || enderecoOriginal ? (\n"}]},{"arquivo":"app/(app)/clientes/components/ClienteClinicoTabs.tsx","obrigatorio":true,"patches":[{"nome":"ficha: abrir a aba Pacotes ao tocar em Registrar pagamento","modo":"normal","antes":"    if (abas.some((aba) => aba.id === hash)) {\n      setActiveTab(hash);\n    }\n  }, []);\n","depois":"    if (abas.some((aba) => aba.id === hash)) {\n      setActiveTab(hash);\n    }\n\n    // Quando um botao da ficha (ex.: aviso de pacote) muda o endereco para\n    // \"#pacotes\", abre a aba certa e rola ate ela.\n    function aoMudarEndereco() {\n      const novo = window.location.hash.replace(\"#\", \"\") as AbaClinica;\n      if (!abas.some((aba) => aba.id === novo)) return;\n      setActiveTab(novo);\n      window.setTimeout(() => {\n        document\n          .getElementById(novo)\n          ?.scrollIntoView({ behavior: \"smooth\", block: \"start\" });\n      }, 80);\n    }\n\n    window.addEventListener(\"hashchange\", aoMudarEndereco);\n    return () => window.removeEventListener(\"hashchange\", aoMudarEndereco);\n  }, []);\n"}]},{"arquivo":"app/(app)/clientes/[id]/page.tsx","obrigatorio":true,"patches":[{"nome":"ficha: aceitar ?aba=pacotes no endereco","modo":"normal","antes":"  \"evolucao\",\n] as const;","depois":"  \"evolucao\",\n  \"pacotes\",\n] as const;"}]},{"arquivo":"app/(app)/agenda/components/AppointmentDetailsModal.tsx","obrigatorio":true,"patches":[{"nome":"agenda: importar o aviso","modo":"normal","antes":"import AnamneseAtendimentoModal from \"./AnamneseAtendimentoModal\";\n","depois":"import AvisoPacoteAberto, {\n  type PacoteParaAviso,\n} from \"@/components/pacotes/AvisoPacoteAberto\";\n\nimport AnamneseAtendimentoModal from \"./AnamneseAtendimentoModal\";\n"},{"nome":"agenda: receber os pacotes em aberto (tipo)","modo":"normal","antes":"  procedimentosAdicionais?: AppointmentDetails[];\n};\n\nfunction useLockBodyScroll","depois":"  procedimentosAdicionais?: AppointmentDetails[];\n  pacotesAbertos?: (PacoteParaAviso & { clienteId: number })[];\n};\n\nfunction useLockBodyScroll"},{"nome":"agenda: receber os pacotes em aberto (valor)","modo":"normal","antes":"  procedimentosAdicionais = [],\n}: Props) {\n  const [error, setError]","depois":"  procedimentosAdicionais = [],\n  pacotesAbertos = [],\n}: Props) {\n  const [error, setError]"},{"nome":"agenda: mostrar o aviso do pacote nos detalhes","modo":"normal","antes":"            ) : null}\n\n            <button\n              type=\"button\"\n              onClick={() => podeEditarCliente && setEditandoCliente(true)}","depois":"            ) : null}\n\n            <AvisoPacoteAberto\n              pacotes={pacotesAbertos.filter(\n                (pacote) => pacote.clienteId === currentAppointment.clienteId,\n              )}\n              href={`/clientes/${currentAppointment.clienteId}?aba=pacotes`}\n            />\n\n            <button\n              type=\"button\"\n              onClick={() => podeEditarCliente && setEditandoCliente(true)}"}]},{"arquivo":"app/(app)/agenda/components/AgendaClient.tsx","obrigatorio":true,"patches":[{"nome":"agenda: passar os pacotes para os detalhes","modo":"normal","antes":"        onEvolucaoRegistrada={marcarEvolucaoConcluida}\n        procedimentosAdicionais={","depois":"        onEvolucaoRegistrada={marcarEvolucaoConcluida}\n        pacotesAbertos={pacotesAbertos}\n        procedimentosAdicionais={"}]}]};
const raiz = process.cwd();
const aGravar = [];
let erros = 0;
let avisos = 0;

for (const [relativo, conteudo] of Object.entries(DATA.novosArquivos)) {
  const caminho = path.join(raiz, ...relativo.split("/"));
  const existente = fs.existsSync(caminho) ? fs.readFileSync(caminho, "utf8").replace(/\r\n/g, "\n") : null;
  if (existente === conteudo) {
    console.log("[pulou] " + relativo + " - ja existe igual");
  } else {
    aGravar.push({ caminho, conteudo, pasta: true });
    console.log((existente === null ? "[ok] criar " : "[ok] atualizar ") + relativo);
  }
}

for (const arq of DATA.arquivos) {
  const caminho = path.join(raiz, ...arq.arquivo.split("/"));
  if (!fs.existsSync(caminho)) {
    if (arq.obrigatorio) { console.log("[erro] arquivo nao encontrado: " + arq.arquivo + ". Rode na pasta do projeto."); erros++; }
    else { console.log("[aviso] arquivo nao encontrado, mantido: " + arq.arquivo); avisos++; }
    continue;
  }
  const bruto = fs.readFileSync(caminho, "utf8");
  const crlf = bruto.includes("\r\n");
  let texto = bruto.replace(/\r\n/g, "\n");
  let mudou = false;

  for (const p of arq.patches) {
    const ocorrencias = texto.split(p.antes).length - 1;
    if (p.modo === "remover") {
      // trecho a ser tirado: se ainda existe, tira; se nao existe, ja foi feito
      if (ocorrencias === 1) {
        texto = texto.replace(p.antes, () => p.depois);
        mudou = true;
        console.log("[ok] " + p.nome + " (" + arq.arquivo + ")");
      } else if (ocorrencias === 0) {
        console.log("[pulou] " + p.nome + " (" + arq.arquivo + ") - ja feito ou trecho diferente");
      } else {
        console.log("[aviso] " + p.nome + " (" + arq.arquivo + ") - aparece mais de uma vez, mantido");
        avisos++;
      }
      continue;
    }
    if (texto.includes(p.depois)) {
      console.log("[pulou] " + p.nome + " (" + arq.arquivo + ") - ja aplicado");
    } else if (ocorrencias === 1) {
      texto = texto.replace(p.antes, () => p.depois);
      mudou = true;
      console.log("[ok] " + p.nome + " (" + arq.arquivo + ")");
    } else {
      console.log("[erro] " + p.nome + " (" + arq.arquivo + ") - trecho nao encontrado");
      erros++;
    }
  }
  if (mudou) aGravar.push({ caminho, conteudo: crlf ? texto.replace(/\n/g, "\r\n") : texto });
}

if (erros > 0) {
  console.log("\nNada foi gravado: " + erros + " problema(s). Me mande esta tela.");
  process.exit(1);
}
for (const g of aGravar) {
  if (g.pasta) fs.mkdirSync(path.dirname(g.caminho), { recursive: true });
  fs.writeFileSync(g.caminho, g.conteudo, "utf8");
}
if (avisos > 0) console.log("\n" + avisos + " aviso(s): trechos opcionais que ficaram como estavam (nada quebra).");
console.log("\nConcluido.");
