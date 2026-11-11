#!/usr/bin/env node
/*
 * "INDICADA POR" TAMBEM NO CADASTRO NOVO - Studio Realcar
 *
 * Ao cadastrar cliente nova direto na agenda (ou em Clientes > Nova
 * cliente) com origem "Indicacao", aparece o campo "Indicada por" para
 * buscar quem indicou. Ao salvar, a indicacao fica gravada e, se quem
 * indicou veio de anuncio, a cliente nova entra na mesma campanha.
 *
 * Precisa ter rodado antes o indicada-por.mjs. Nao muda o banco. Pode rodar
 * mais de uma vez; se algum trecho nao for encontrado, NADA e gravado.
 *
 * Uso: node indicada-por-cadastro.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{"lib/indicacao.ts":"import type { Prisma } from \"@prisma/client\";\n\nimport { CLIENTE_COM_CLIQUE_PAGO_DIRETO } from \"@/lib/atribuicao-campanha\";\n\n/**\n * Grava \"indicada por\" numa cliente recem-criada (agenda ou cadastro).\n * Se quem indicou veio de anuncio e a cliente ainda nao tem campanha, ela\n * entra na mesma campanha (um nivel so). Nunca troca a origem informada.\n */\nexport async function aplicarIndicacaoNoTx(\n  tx: Prisma.TransactionClient,\n  clienteId: number,\n  indicadaPorId: number | null | undefined,\n) {\n  const id = Math.trunc(Number(indicadaPorId));\n  if (!id || id === clienteId) return;\n\n  const [cliente, quemIndicou, indicadoraPaga] = await Promise.all([\n    tx.cliente.findUnique({ where: { id: clienteId }, select: { campanhaAquisicaoId: true } }),\n    tx.cliente.findUnique({\n      where: { id },\n      select: {\n        id: true,\n        campanhaAquisicaoId: true,\n        leads: {\n          where: { campanhaId: { not: null } },\n          select: { campanhaId: true },\n          orderBy: { createdAt: \"desc\" },\n          take: 1,\n        },\n      },\n    }),\n    tx.cliente.count({ where: { id, ...CLIENTE_COM_CLIQUE_PAGO_DIRETO } }),\n  ]);\n  if (!cliente || !quemIndicou) return;\n\n  const campanha = quemIndicou.campanhaAquisicaoId ?? quemIndicou.leads[0]?.campanhaId ?? null;\n  await tx.cliente.update({\n    where: { id: clienteId },\n    data: {\n      indicadaPorId: quemIndicou.id,\n      ...(indicadoraPaga > 0 && campanha && !cliente.campanhaAquisicaoId\n        ? { campanhaAquisicaoId: campanha }\n        : {}),\n    },\n  });\n}\n","components/clientes/IndicadaPorPicker.tsx":"\"use client\";\n\nimport { useEffect, useState, useTransition } from \"react\";\n\nimport { buscarClientesParaIndicacao } from \"@/actions/indicacao.actions\";\n\ntype Pessoa = { id: number; nome: string };\n\n/** Campo \"Indicada por\" (busca a cliente que indicou pelo nome ou telefone). */\nexport default function IndicadaPorPicker({\n  value,\n  onChange,\n  className = \"\",\n}: {\n  value: Pessoa | null;\n  onChange: (pessoa: Pessoa | null) => void;\n  className?: string;\n}) {\n  const [termo, setTermo] = useState(\"\");\n  const [opcoes, setOpcoes] = useState<Array<Pessoa & { telefone: string }>>([]);\n  const [, startBusca] = useTransition();\n\n  // Espera a pessoa parar de digitar para nao consultar a cada letra.\n  useEffect(() => {\n    if (value || termo.trim().length < 2) return;\n    const espera = window.setTimeout(() => {\n      startBusca(async () => {\n        try {\n          setOpcoes(await buscarClientesParaIndicacao(termo, 0));\n        } catch {\n          setOpcoes([]);\n        }\n      });\n    }, 300);\n    return () => window.clearTimeout(espera);\n  }, [termo, value]);\n\n  if (value) {\n    return (\n      <div className={`flex flex-wrap items-center gap-2 text-sm ${className}`}>\n        <span className=\"text-slate-600 dark:text-slate-300\">\n          Indicada por <strong className=\"text-slate-900 dark:text-white\">{value.nome}</strong>\n        </span>\n        <button\n          type=\"button\"\n          onClick={() => {\n            onChange(null);\n            setTermo(\"\");\n            setOpcoes([]);\n          }}\n          className=\"text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300\"\n        >\n          Trocar\n        </button>\n      </div>\n    );\n  }\n\n  return (\n    <div className={`space-y-1.5 ${className}`}>\n      <input\n        value={termo}\n        onChange={(event) => {\n          setTermo(event.target.value);\n          if (event.target.value.trim().length < 2) setOpcoes([]);\n        }}\n        placeholder=\"Quem indicou? Digite o nome ou telefone (opcional)\"\n        className=\"h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100\"\n      />\n      {opcoes.length > 0 ? (\n        <ul className=\"max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-slate-900\">\n          {opcoes.map((opcao) => (\n            <li key={opcao.id}>\n              <button\n                type=\"button\"\n                onClick={() => {\n                  onChange({ id: opcao.id, nome: opcao.nome });\n                  setOpcoes([]);\n                }}\n                className=\"flex w-full justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-violet-50 dark:hover:bg-white/[0.06]\"\n              >\n                <span className=\"font-semibold text-slate-800 dark:text-slate-100\">{opcao.nome}</span>\n                <span className=\"text-xs text-slate-500\">{opcao.telefone}</span>\n              </button>\n            </li>\n          ))}\n        </ul>\n      ) : null}\n    </div>\n  );\n}\n"},"arquivos":[{"arquivo":"actions/agendamento.actions.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"type ClienteNovoAgendamento = {\n  nome: string;\n  whatsapp?: string;\n  telefone?: string;\n  origem?: string;","depois":"type ClienteNovoAgendamento = {\n  nome: string;\n  whatsapp?: string;\n  telefone?: string;\n  origem?: string;\n  // Quem indicou (quando a origem e Indicacao).\n  indicadaPorId?: number | null;"},{"nome":"ajuste 2","antes":"import { concluirRemarcacaoNoTx } from \"@/lib/remarcacao\";","depois":"import { concluirRemarcacaoNoTx } from \"@/lib/remarcacao\";\nimport { aplicarIndicacaoNoTx } from \"@/lib/indicacao\";"},{"nome":"ajuste 3","antes":"      observacoes: dados.novoCliente.observacoes || null,\n    },\n  });\n\n  return cliente.id;\n}","depois":"      observacoes: dados.novoCliente.observacoes || null,\n    },\n  });\n  await aplicarIndicacaoNoTx(prisma, cliente.id, dados.novoCliente.indicadaPorId);\n\n  return cliente.id;\n}"},{"nome":"ajuste 4","antes":"      clienteId = cliente.id;\n    } else if (areaEstetica || areaCilios) {","depois":"      clienteId = cliente.id;\n      await aplicarIndicacaoNoTx(tx, cliente.id, dados.novoCliente.indicadaPorId);\n    } else if (areaEstetica || areaCilios) {"}]},{"arquivo":"app/(app)/agenda/components/NovoAgendamentoModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import type { RemarcacaoPendente } from \"@/lib/remarcacao\";","depois":"import type { RemarcacaoPendente } from \"@/lib/remarcacao\";\nimport IndicadaPorPicker from \"@/components/clientes/IndicadaPorPicker\";"},{"nome":"ajuste 2","antes":"  const [novoClienteOrigem, setNovoClienteOrigem] = useState(\"\");\n","depois":"  const [novoClienteOrigem, setNovoClienteOrigem] = useState(\"\");\n  // Quem indicou a cliente nova (aparece quando a origem e Indicacao).\n  const [novoClienteIndicadaPor, setNovoClienteIndicadaPor] = useState<{ id: number; nome: string } | null>(null);\n"},{"nome":"ajuste 3","antes":"    setNovoClienteWhatsapp(\"\");\n    setNovoClienteOrigem(\"\");\n\n    const clienteInicial = initialPayload?.clienteId","depois":"    setNovoClienteWhatsapp(\"\");\n    setNovoClienteOrigem(\"\");\n    setNovoClienteIndicadaPor(null);\n\n    const clienteInicial = initialPayload?.clienteId"},{"nome":"ajuste 4","antes":"    setNovoClienteWhatsapp(\"\");\n    setNovoClienteOrigem(\"\");\n    aplicarAreasPadrao();","depois":"    setNovoClienteWhatsapp(\"\");\n    setNovoClienteOrigem(\"\");\n    setNovoClienteIndicadaPor(null);\n    aplicarAreasPadrao();"},{"nome":"ajuste 5","antes":"                origem: novoClienteOrigem,\n                procedimentoInteresse: procedimento,\n              }\n            : undefined,","depois":"                origem: novoClienteOrigem,\n                indicadaPorId: /indica/i.test(novoClienteOrigem)\n                  ? novoClienteIndicadaPor?.id ?? null\n                  : null,\n                procedimentoInteresse: procedimento,\n              }\n            : undefined,"},{"nome":"ajuste 6","antes":"                <p className=\"mt-3 text-[11px] leading-4 text-slate-500\">\n                  O cliente será criado automaticamente ao salvar este atendimento.\n                </p>","depois":"                {/indica/i.test(novoClienteOrigem) ? (\n                  <div className=\"mt-3\">\n                    <span className={labelClassName()}>Indicada por</span>\n                    <IndicadaPorPicker\n                      value={novoClienteIndicadaPor}\n                      onChange={setNovoClienteIndicadaPor}\n                      className=\"mt-1\"\n                    />\n                  </div>\n                ) : null}\n\n                <p className=\"mt-3 text-[11px] leading-4 text-slate-500\">\n                  O cliente será criado automaticamente ao salvar este atendimento.\n                </p>"}]},{"arquivo":"actions/cliente.actions.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import { revalidatePath } from \"next/cache\";","depois":"import { revalidatePath } from \"next/cache\";\nimport { aplicarIndicacaoNoTx } from \"@/lib/indicacao\";"},{"nome":"ajuste 2","antes":"  areaCilios?: boolean;\n  campanhaAquisicaoId?: number | null;\n};","depois":"  areaCilios?: boolean;\n  campanhaAquisicaoId?: number | null;\n  // Quem indicou (so no cadastro novo; depois se ajusta na ficha).\n  indicadaPorId?: number | null;\n};"},{"nome":"ajuste 3","antes":"export async function criarCliente(dados: ClienteForm) {\n  await requirePermission(\"clientes.gerenciar\");\n  await prisma.cliente.create({","depois":"export async function criarCliente(dados: ClienteForm) {\n  await requirePermission(\"clientes.gerenciar\");\n  const criado = await prisma.cliente.create({"},{"nome":"ajuste 4","antes":"  revalidatePath(\"/clientes\");\n  revalidatePath(\"/marketing\");\n}\n\nexport async function atualizarCliente(dados: ClienteForm) {","depois":"  if (dados.indicadaPorId) {\n    await aplicarIndicacaoNoTx(prisma, criado.id, dados.indicadaPorId);\n  }\n\n  revalidatePath(\"/clientes\");\n  revalidatePath(\"/marketing\");\n}\n\nexport async function atualizarCliente(dados: ClienteForm) {"}]},{"arquivo":"components/clientes/NovoClienteModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"import ProcedimentoSearchSelect from \"@/components/clientes/ProcedimentoSearchSelect\";","depois":"import ProcedimentoSearchSelect from \"@/components/clientes/ProcedimentoSearchSelect\";\nimport IndicadaPorPicker from \"@/components/clientes/IndicadaPorPicker\";"},{"nome":"ajuste 2","antes":"  areaCilios: boolean;\n  campanhaAquisicaoId: number | null;\n};\n\ntype Props = {","depois":"  areaCilios: boolean;\n  campanhaAquisicaoId: number | null;\n  indicadaPorId?: number | null;\n};\n\ntype Props = {"},{"nome":"ajuste 3","antes":"  const [erro, setErro] = useState(\"\");\n\n  function alterarCampo<K extends keyof FormData>","depois":"  const [erro, setErro] = useState(\"\");\n  // Quem indicou (so no cadastro novo; na ficha da para trocar depois).\n  const [indicadaPor, setIndicadaPor] = useState<{ id: number; nome: string } | null>(null);\n\n  function alterarCampo<K extends keyof FormData>"},{"nome":"ajuste 4","antes":"      contatoConfiancaAutorizado: form.contatoConfiancaAutorizado,\n      observacoes: form.observacoes.trim(),\n    });\n  }","depois":"      contatoConfiancaAutorizado: form.contatoConfiancaAutorizado,\n      observacoes: form.observacoes.trim(),\n      indicadaPorId:\n        !cliente && /indica/i.test(form.origem || origemPadrao) ? indicadaPor?.id ?? null : null,\n    });\n  }"},{"nome":"ajuste 5","antes":"              {origensDisponiveis.map((origem) => (\n                <option key={origem} value={origem}>\n                  {origem}\n                </option>\n              ))}\n            </select>\n          </label>\n","depois":"              {origensDisponiveis.map((origem) => (\n                <option key={origem} value={origem}>\n                  {origem}\n                </option>\n              ))}\n            </select>\n            {!cliente && /indica/i.test(form.origem || origemPadrao) ? (\n              <IndicadaPorPicker value={indicadaPor} onChange={setIndicadaPor} className=\"mt-2\" />\n            ) : null}\n          </label>\n"}]}]};
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
