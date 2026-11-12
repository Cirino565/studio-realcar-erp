#!/usr/bin/env node
/*
 * AVISO "O SISTEMA FOI ATUALIZADO" - Studio Realcar
 *
 * Erro "An unexpected response was received from the server": acontece
 * quando a tela ficou aberta (celular, aba antiga) desde antes de uma
 * atualizacao do sistema e o botao de salvar chama a versao antiga.
 *  - Ao voltar para a aba (e a cada 10 min) o sistema confere, com uma
 *    consulta minuscula, se foi atualizado e mostra "O sistema foi
 *    atualizado" com o botao Recarregar.
 *  - Se um salvar falhar por isso, o aviso aparece na hora e a mensagem de
 *    erro vem em portugues explicando o que fazer.
 *
 * Precisa ter rodado antes o cliente-salvar-sem-cep.mjs. Nao muda o banco.
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node aviso-sistema-atualizado.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{"lib/versao.ts":"/**\n * Identifica a versao no ar (muda a cada deploy na Railway). Usada para\n * avisar quem esta com a tela aberta de antes de uma atualizacao.\n */\nexport function versaoAtual() {\n  return (\n    process.env.RAILWAY_DEPLOYMENT_ID ||\n    process.env.RAILWAY_GIT_COMMIT_SHA ||\n    \"local\"\n  );\n}\n","lib/erro-acao.ts":"/**\n * Traduz erros de \"acao do servidor\" que o Next mostra em ingles.\n * O mais comum: a tela ficou aberta desde antes de uma atualizacao do\n * sistema e o botao chama uma versao que nao existe mais.\n */\nexport function mensagemErroAcao(erro: unknown, padrao: string) {\n  const texto = erro instanceof Error ? erro.message : \"\";\n  if (\n    /unexpected response was received from the server/i.test(texto) ||\n    /server action .*not found/i.test(texto) ||\n    /failed to find server action/i.test(texto)\n  ) {\n    return \"O sistema foi atualizado enquanto esta tela estava aberta. Atualize a página (puxe a tela para baixo ou toque em recarregar) e salve de novo.\";\n  }\n  if (/failed to fetch|network|load failed/i.test(texto)) {\n    return \"Sem conexão com o sistema agora. Confira a internet e tente de novo; nada do que você digitou foi perdido.\";\n  }\n  return texto || padrao;\n}\n","app/api/versao/route.ts":"import { NextResponse } from \"next/server\";\n\nimport { versaoAtual } from \"@/lib/versao\";\n\nexport const dynamic = \"force-dynamic\";\n\n// Resposta minuscula: so diz qual versao esta no ar.\nexport function GET() {\n  return NextResponse.json(\n    { versao: versaoAtual() },\n    { headers: { \"Cache-Control\": \"no-store\" } },\n  );\n}\n","components/layout/AvisoNovaVersao.tsx":"\"use client\";\n\nimport { useEffect, useState } from \"react\";\nimport { RefreshCw } from \"lucide-react\";\n\n/**\n * Aviso \"O sistema foi atualizado\". Quem deixa a tela aberta (celular,\n * aba antiga) e o sistema recebe uma atualizacao, ao salvar levava o erro\n * \"An unexpected response was received from the server\". Agora:\n *  - ao voltar para a aba (e a cada 10 min) confere, com uma consulta\n *    minuscula, se a versao mudou;\n *  - se um salvar falhar por esse motivo, o aviso aparece na hora.\n * O botao recarrega a pagina; nada e recarregado sozinho para nao perder\n * o que estiver sendo digitado.\n */\nexport default function AvisoNovaVersao({ versao }: { versao: string }) {\n  const [desatualizado, setDesatualizado] = useState(false);\n\n  useEffect(() => {\n    if (versao === \"local\") return;\n    let ativo = true;\n\n    async function conferir() {\n      try {\n        const resposta = await fetch(\"/api/versao\", { cache: \"no-store\" });\n        if (!resposta.ok) return;\n        const dados = (await resposta.json()) as { versao?: string };\n        if (ativo && dados.versao && dados.versao !== \"local\" && dados.versao !== versao) {\n          setDesatualizado(true);\n        }\n      } catch {\n        // Sem internet: confere de novo depois.\n      }\n    }\n\n    const aoVoltar = () => {\n      if (document.visibilityState === \"visible\") void conferir();\n    };\n    document.addEventListener(\"visibilitychange\", aoVoltar);\n    const intervalo = window.setInterval(conferir, 10 * 60 * 1000);\n\n    // Se um botao de salvar bater numa versao que nao existe mais, avisa na hora.\n    const fetchOriginal = window.fetch;\n    window.fetch = async (...args: Parameters<typeof fetch>) => {\n      const resposta = await fetchOriginal(...args);\n      try {\n        const cabecalhos = new Headers(args[1]?.headers ?? (args[0] instanceof Request ? args[0].headers : undefined));\n        if (cabecalhos.has(\"next-action\")) {\n          const tipo = resposta.headers.get(\"content-type\") || \"\";\n          if (resposta.status === 404 || (!tipo.includes(\"text/x-component\") && resposta.status !== 303)) {\n            void conferir();\n          }\n        }\n      } catch {\n        // Nunca atrapalha a requisicao original.\n      }\n      return resposta;\n    };\n\n    return () => {\n      ativo = false;\n      document.removeEventListener(\"visibilitychange\", aoVoltar);\n      window.clearInterval(intervalo);\n      window.fetch = fetchOriginal;\n    };\n  }, [versao]);\n\n  if (!desatualizado) return null;\n\n  return (\n    <div className=\"fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-[90] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-violet-200 bg-white p-3 text-sm shadow-2xl shadow-slate-900/20 dark:border-violet-400/30 dark:bg-slate-900 lg:bottom-6\">\n      <RefreshCw size={18} className=\"shrink-0 text-violet-600\" />\n      <p className=\"min-w-0 flex-1 text-slate-700 dark:text-slate-200\">\n        O sistema foi atualizado. Recarregue a página para continuar usando sem erro ao salvar.\n      </p>\n      <button\n        type=\"button\"\n        onClick={() => window.location.reload()}\n        className=\"shrink-0 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700\"\n      >\n        Recarregar\n      </button>\n    </div>\n  );\n}\n"},"arquivos":[{"arquivo":"app/(app)/layout.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import BarraNavegacao from \"@/components/layout/BarraNavegacao\";","depois":"import BarraNavegacao from \"@/components/layout/BarraNavegacao\";\nimport AvisoNovaVersao from \"@/components/layout/AvisoNovaVersao\";\nimport { versaoAtual } from \"@/lib/versao\";"},{"nome":"ajuste 2","antes":"        </div>\n      </div>\n    </div>\n  );\n}","depois":"        </div>\n      </div>\n      <AvisoNovaVersao versao={versaoAtual()} />\n    </div>\n  );\n}"}]},{"arquivo":"app/(app)/agenda/components/ClienteQuickEditModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import { atualizarClienteNoAtendimento } from \"@/actions/cliente.actions\";","depois":"import { atualizarClienteNoAtendimento } from \"@/actions/cliente.actions\";\nimport { mensagemErroAcao } from \"@/lib/erro-acao\";"},{"nome":"ajuste 2","antes":"        setErro(\n          error instanceof Error\n            ? error.message\n            : \"Não foi possível atualizar o cadastro da cliente.\",\n        );","depois":"        setErro(mensagemErroAcao(error, \"Não foi possível atualizar o cadastro da cliente.\"));"}]},{"arquivo":"app/(app)/agenda/components/NovoAgendamentoModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  return mensagem;\n}\n\nexport default function NovoAgendamentoModal({","depois":"  // Tela aberta desde antes de uma atualizacao do sistema: mensagem clara.\n  return mensagemErroAcao(error, mensagem);\n}\n\nexport default function NovoAgendamentoModal({"},{"nome":"ajuste 2","antes":"import IndicadaPorPicker from \"@/components/clientes/IndicadaPorPicker\";","depois":"import IndicadaPorPicker from \"@/components/clientes/IndicadaPorPicker\";\nimport { mensagemErroAcao } from \"@/lib/erro-acao\";"}]},{"arquivo":"app/(app)/agenda/components/FinalizarAtendimentoModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  return mensagem;\n}\n\nexport default function FinalizarAtendimentoModal({","depois":"  // Tela aberta desde antes de uma atualizacao do sistema: mensagem clara.\n  return mensagemErroAcao(error, mensagem);\n}\n\nexport default function FinalizarAtendimentoModal({"},{"nome":"ajuste 2","antes":"import { lerProcedimentosExtras, somaValorExtras } from \"@/lib/procedimentos-extras\";","depois":"import { lerProcedimentosExtras, somaValorExtras } from \"@/lib/procedimentos-extras\";\nimport { mensagemErroAcao } from \"@/lib/erro-acao\";"}]},{"arquivo":"app/(app)/clientes/components/ClientesClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"      } catch {\n        // Antes, um erro aqui nao mostrava nada e parecia que \"nao salvava\".\n        window.alert(\"Não foi possível salvar a cliente. Confira os dados e tente de novo; o que você digitou continua na tela.\");\n        return;\n      }","depois":"      } catch (error) {\n        // Antes, um erro aqui nao mostrava nada e parecia que \"nao salvava\".\n        window.alert(\n          mensagemErroAcao(\n            error,\n            \"Não foi possível salvar a cliente. Confira os dados e tente de novo; o que você digitou continua na tela.\",\n          ),\n        );\n        return;\n      }"},{"nome":"ajuste 2","antes":"import type { Cliente } from \"@/lib/types\";","depois":"import type { Cliente } from \"@/lib/types\";\nimport { mensagemErroAcao } from \"@/lib/erro-acao\";"}]}]};
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
