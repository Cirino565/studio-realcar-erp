#!/usr/bin/env node
/*
 * EDITAR E EXCLUIR PACOTE (aba Pacotes da ficha) - Studio Realcar
 *
 * Em cada pacote aparece o botao "Editar ou excluir pacote":
 *  - Editar: corrige o nome e o valor total (nao deixa ficar menor que o
 *    ja pago; Aberto/Quitado e recalculado sozinho).
 *  - Excluir pacote: apaga o pacote e CANCELA no Financeiro os pagamentos
 *    que ele recebeu (adiantamento etc.), para nao contar no caixa.
 *    Antes de excluir, o sistema pergunta e mostra o valor.
 *
 * Nao mexe no banco de dados (sem colunas novas).
 * Pode rodar mais de uma vez. Se algum trecho nao for encontrado, NADA e gravado.
 *
 * Uso: node editar-e-excluir-pacote.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"actions/pacote.actions.ts","obrigatorio":true,"patches":[{"nome":"editar e excluir pacote (servidor)","antes":"  revalidatePath(`/clientes/${pacote.clienteId}`);\n}","depois":"  revalidatePath(`/clientes/${pacote.clienteId}`);\n}\n\n/**\n * Corrige o nome e o valor total de um pacote (ex.: digitou errado).\n * O valor total nao pode ficar menor do que ja foi pago. Quitado/Aberto\n * e recalculado sozinho.\n */\nexport async function editarPacoteCliente(formData: FormData) {\n  await requirePermission(\"financeiro.gerenciar\");\n\n  const pacoteId = Number(formData.get(\"pacoteId\"));\n  if (!Number.isInteger(pacoteId) || pacoteId <= 0) {\n    throw new Error(\"Pacote inválido.\");\n  }\n\n  const descricao = getString(formData, \"descricao\");\n  const valorTotal = getNumber(formData, \"valorTotal\");\n\n  if (!descricao) {\n    throw new Error(\"Informe o nome do pacote.\");\n  }\n\n  if (valorTotal <= 0) {\n    throw new Error(\"Informe o valor total do pacote.\");\n  }\n\n  const pacote = await prisma.pacoteCliente.findUnique({\n    where: { id: pacoteId },\n    select: { id: true, clienteId: true, valorPago: true, status: true },\n  });\n\n  if (!pacote) {\n    throw new Error(\"Pacote não encontrado.\");\n  }\n\n  if (valorTotal < pacote.valorPago - 0.01) {\n    throw new Error(\n      `O valor total não pode ser menor do que já foi pago (R$ ${pacote.valorPago.toFixed(2).replace(\".\", \",\")}).`,\n    );\n  }\n\n  await prisma.pacoteCliente.update({\n    where: { id: pacote.id },\n    data: {\n      descricao,\n      valorTotal,\n      status:\n        pacote.status === \"Cancelado\"\n          ? \"Cancelado\"\n          : pacote.valorPago >= valorTotal - 0.01\n            ? \"Quitado\"\n            : \"Aberto\",\n    },\n  });\n\n  revalidatePath(`/clientes/${pacote.clienteId}`);\n  revalidatePath(\"/agenda\");\n  revalidatePath(\"/financeiro\");\n  revalidatePath(\"/gestao\");\n}\n\n/**\n * Exclui o pacote de vez. Os pagamentos que ele recebeu (adiantamento etc.)\n * sao CANCELADOS no Financeiro - ficam no historico, mas deixam de contar\n * no caixa e nos relatorios.\n */\nexport async function excluirPacoteCliente(formData: FormData) {\n  await requirePermission(\"financeiro.gerenciar\");\n\n  const pacoteId = Number(formData.get(\"pacoteId\"));\n  if (!Number.isInteger(pacoteId) || pacoteId <= 0) {\n    throw new Error(\"Pacote inválido.\");\n  }\n\n  const clienteId = await prisma.$transaction(async (tx) => {\n    const pacote = await tx.pacoteCliente.findUnique({\n      where: { id: pacoteId },\n      select: { id: true, clienteId: true, descricao: true },\n    });\n\n    if (!pacote) {\n      throw new Error(\"Pacote não encontrado.\");\n    }\n\n    await tx.lancamento.updateMany({\n      where: { pacoteClienteId: pacote.id, statusPagamento: { not: \"Cancelado\" } },\n      data: {\n        statusPagamento: \"Cancelado\",\n        observacoes: `Pacote \"${pacote.descricao}\" excluído.`,\n      },\n    });\n\n    await tx.pacoteCliente.delete({ where: { id: pacote.id } });\n\n    return pacote.clienteId;\n  });\n\n  revalidatePath(`/clientes/${clienteId}`);\n  revalidatePath(\"/agenda\");\n  revalidatePath(\"/financeiro\");\n  revalidatePath(\"/gestao\");\n}"}]},{"arquivo":"app/(app)/clientes/components/ClienteClinicoTabs.tsx","obrigatorio":true,"patches":[{"nome":"importar editar/excluir","antes":"  cancelarPacoteCliente,\n  criarPacoteCliente,\n  registrarPagamentoPacote,\n} from \"@/actions/pacote.actions\";","depois":"  cancelarPacoteCliente,\n  criarPacoteCliente,\n  editarPacoteCliente,\n  excluirPacoteCliente,\n  registrarPagamentoPacote,\n} from \"@/actions/pacote.actions\";"},{"nome":"botao excluir pacote","antes":"// Baixa a foto de verdade num clique só.","depois":"function ExcluirPacoteButton({\n  pacoteId,\n  valorPago,\n}: {\n  pacoteId: number;\n  valorPago: number;\n}) {\n  const [isPending, startTransition] = useTransition();\n\n  return (\n    <Button\n      type=\"button\"\n      variant=\"outline\"\n      disabled={isPending}\n      className=\"flex-1 text-rose-600\"\n      onClick={() => {\n        const aviso =\n          valorPago > 0\n            ? `Excluir este pacote? Os ${formatarMoeda(valorPago)} já lançados no Financeiro também serão cancelados.`\n            : \"Excluir este pacote?\";\n\n        if (!window.confirm(aviso)) return;\n\n        startTransition(() => {\n          const formData = new FormData();\n          formData.set(\"pacoteId\", String(pacoteId));\n\n          void excluirPacoteCliente(formData).catch((error) => {\n            window.alert(\n              error instanceof Error ? error.message : \"Não foi possível excluir o pacote.\",\n            );\n          });\n        });\n      }}\n    >\n      {isPending ? <Loader2 className=\"size-4 animate-spin\" /> : \"Excluir pacote\"}\n    </Button>\n  );\n}\n\n// Baixa a foto de verdade num clique só."},{"nome":"cartao editar ou excluir pacote","antes":"                          </details>\n                        ) : null}\n                      </article>","depois":"                          </details>\n                        ) : null}\n\n                        <details className=\"mt-2\">\n                          <summary className=\"cursor-pointer list-none rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5\">\n                            Editar ou excluir pacote\n                          </summary>\n\n                          <form\n                            action={editarPacoteCliente}\n                            className=\"mt-3 space-y-3 rounded-xl border border-slate-200 p-3 dark:border-white/10\"\n                          >\n                            <input type=\"hidden\" name=\"pacoteId\" value={pacote.id} />\n\n                            <Field\n                              label=\"Nome do pacote\"\n                              name=\"descricao\"\n                              type=\"text\"\n                              required\n                              defaultValue={pacote.descricao}\n                            />\n                            <Field\n                              label=\"Valor total (R$)\"\n                              name=\"valorTotal\"\n                              type=\"text\"\n                              required\n                              defaultValue={pacote.valorTotal.toLocaleString(\"pt-BR\", {\n                                minimumFractionDigits: 2,\n                                maximumFractionDigits: 2,\n                              })}\n                            />\n\n                            <div className=\"flex gap-2\">\n                              <BotaoSalvar className=\"flex-1\" salvandoLabel=\"Salvando...\">\n                                Salvar alterações\n                              </BotaoSalvar>\n                              <ExcluirPacoteButton\n                                pacoteId={pacote.id}\n                                valorPago={pacote.valorPago}\n                              />\n                            </div>\n                          </form>\n                        </details>\n                      </article>"}]}]};
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
