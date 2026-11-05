#!/usr/bin/env node
/*
 * CONFIGURACOES: ADICIONAR NOME QUE JA EXISTE - Studio Realcar
 *
 * Adicionar em Origens, Procedimentos de interesse ou Motivos de perda um
 * nome que ja existe (mesmo inativo) derrubava a tela ("This page couldn't
 * load"). Agora: se esta inativo, o botao vira "Ativar" e reativa; se ja
 * esta ativo, avisa. Itens inativos ganham o botao "Ativar" na lista.
 *
 * Precisa ter rodado antes o procedimentos-ocultar.mjs. Nao muda o banco.
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node configuracoes-reativar.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"actions/cadastro-auxiliar.actions.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"export async function criarOrigemCliente(dados: CadastroAuxiliarInput) {\n  await requirePermission(\"configuracoes.gerenciar\");\n  const nome = normalizarNome(dados.nome);\n  if (!nome) return;\n","depois":"export async function criarOrigemCliente(dados: CadastroAuxiliarInput) {\n  await requirePermission(\"configuracoes.gerenciar\");\n  const nome = normalizarNome(dados.nome);\n  if (!nome) return;\n\n  // Ja existe com esse nome (talvez inativa): reativa em vez de dar erro.\n  const existente = (await prisma.origemCliente.findMany({ select: { id: true, nome: true, status: true } }))\n    .find((item) => chaveNome(item.nome) === chaveNome(nome));\n  if (existente) {\n    if (existente.status !== \"Ativa\") {\n      await prisma.origemCliente.update({ where: { id: existente.id }, data: { status: \"Ativa\" } });\n      await registrarAuditoria(\"Reativou origem de cliente\", \"OrigemCliente\", existente.nome);\n    }\n    revalidatePath(\"/configuracoes\");\n    revalidatePath(\"/clientes\");\n    return;\n  }\n"},{"nome":"ajuste 2","antes":"export async function criarMotivoPerda(dados: MotivoPerdaInput) {\n  await requirePermission(\"configuracoes.gerenciar\");\n  const nome = normalizarNome(dados.nome);\n  if (!nome) return;\n","depois":"export async function criarMotivoPerda(dados: MotivoPerdaInput) {\n  await requirePermission(\"configuracoes.gerenciar\");\n  const nome = normalizarNome(dados.nome);\n  if (!nome) return;\n\n  const existente = (await prisma.motivoPerdaLead.findMany({ select: { id: true, nome: true, status: true } }))\n    .find((item) => chaveNome(item.nome) === chaveNome(nome));\n  if (existente) {\n    if (existente.status !== \"Ativo\") {\n      await prisma.motivoPerdaLead.update({ where: { id: existente.id }, data: { status: \"Ativo\" } });\n      await registrarAuditoria(\"Reativou motivo de perda\", \"MotivoPerdaLead\", existente.nome);\n    }\n    revalidatePath(\"/configuracoes\");\n    revalidatePath(\"/marketing\");\n    return;\n  }\n"},{"nome":"ajuste 3","antes":"export async function criarProcedimentoInteresse(dados: CadastroAuxiliarInput) {\n  await requirePermission(\"configuracoes.gerenciar\");\n  const nome = normalizarNome(dados.nome);\n  if (!nome) return;\n","depois":"export async function criarProcedimentoInteresse(dados: CadastroAuxiliarInput) {\n  await requirePermission(\"configuracoes.gerenciar\");\n  const nome = normalizarNome(dados.nome);\n  if (!nome) return;\n\n  // Ja existe com esse nome (ex.: ficou inativo): reativa em vez de dar erro.\n  const existente = (await prisma.procedimentoInteresse.findMany({ select: { id: true, nome: true, status: true } }))\n    .find((item) => chaveNome(item.nome) === chaveNome(nome));\n  if (existente) {\n    if (existente.status !== \"Ativo\") {\n      await prisma.procedimentoInteresse.update({ where: { id: existente.id }, data: { status: \"Ativo\" } });\n      await registrarAuditoria(\"Reativou procedimento de interesse\", \"ProcedimentoInteresse\", existente.nome);\n    }\n    revalidatePath(\"/configuracoes\");\n    revalidatePath(\"/clientes\");\n    return;\n  }\n"},{"nome":"ajuste 4","antes":"export async function criarCadastrosAuxiliaresPadrao() {","depois":"/** Botao \"Ativar\" das listas de origens, procedimentos de interesse e motivos de perda. */\nexport async function reativarCadastroAuxiliar(tipo: \"origem\" | \"interesse\" | \"motivo\", id: number) {\n  await requirePermission(\"configuracoes.gerenciar\");\n  if (tipo === \"origem\") {\n    const item = await prisma.origemCliente.update({ where: { id }, data: { status: \"Ativa\" } });\n    await registrarAuditoria(\"Reativou origem de cliente\", \"OrigemCliente\", item.nome);\n    revalidatePath(\"/clientes\");\n  } else if (tipo === \"interesse\") {\n    const item = await prisma.procedimentoInteresse.update({ where: { id }, data: { status: \"Ativo\" } });\n    await registrarAuditoria(\"Reativou procedimento de interesse\", \"ProcedimentoInteresse\", item.nome);\n    revalidatePath(\"/clientes\");\n  } else {\n    const item = await prisma.motivoPerdaLead.update({ where: { id }, data: { status: \"Ativo\" } });\n    await registrarAuditoria(\"Reativou motivo de perda\", \"MotivoPerdaLead\", item.nome);\n    revalidatePath(\"/marketing\");\n  }\n  revalidatePath(\"/configuracoes\");\n}\n\nexport async function criarCadastrosAuxiliaresPadrao() {"}]},{"arquivo":"app/(app)/configuracoes/components/ConfiguracoesClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  alterarVisibilidadeProcedimentoServico,\n  renomearProcedimentoServico,\n} from \"@/actions/cadastro-auxiliar.actions\";","depois":"  alterarVisibilidadeProcedimentoServico,\n  renomearProcedimentoServico,\n  reativarCadastroAuxiliar,\n} from \"@/actions/cadastro-auxiliar.actions\";"},{"nome":"ajuste 2","antes":"  onCreate: (nome: string) => Promise<void>;\n  onDelete: (id: number) => Promise<void>;\n};\n\nfunction AuxiliarList({\n  title,\n  description,\n  items,\n  placeholder,\n  statusLabel,\n  ordenacaoAutomatica = false,\n  onCreate,\n  onDelete,\n}: AuxiliarListProps) {\n  const [nome, setNome] = useState(\"\");\n  const [pendingId, setPendingId] = useState<number | null>(null);\n  const [listaAberta, setListaAberta] = useState(false);\n  const [isPending, startTransition] = useTransition();\n\n  function adicionar() {\n    const valor = nome.trim();\n    if (!valor) return;\n\n    startTransition(async () => {\n      await onCreate(valor);\n      setNome(\"\");\n    });\n  }\n","depois":"  onCreate: (nome: string) => Promise<void>;\n  onDelete: (id: number) => Promise<void>;\n  // Botao \"Ativar\" para itens inativos.\n  onReativar?: (id: number) => Promise<void>;\n};\n\nfunction AuxiliarList({\n  title,\n  description,\n  items,\n  placeholder,\n  statusLabel,\n  ordenacaoAutomatica = false,\n  onCreate,\n  onDelete,\n  onReativar,\n}: AuxiliarListProps) {\n  const [nome, setNome] = useState(\"\");\n  const [pendingId, setPendingId] = useState<number | null>(null);\n  const [listaAberta, setListaAberta] = useState(false);\n  const [erroLista, setErroLista] = useState<string | null>(null);\n  const [isPending, startTransition] = useTransition();\n\n  const chaveTexto = (texto: string) =>\n    texto.normalize(\"NFD\").replace(/[\\u0300-\\u036f]/g, \"\").trim().replace(/\\s+/g, \" \").toLowerCase();\n  const jaExiste = nome.trim()\n    ? items.find((item) => chaveTexto(item.nome) === chaveTexto(nome))\n    : undefined;\n  const inativo = (status: string) => !/^ativ/i.test(status.trim());\n\n  function adicionar() {\n    const valor = nome.trim();\n    if (!valor) return;\n    setErroLista(null);\n\n    startTransition(async () => {\n      try {\n        await onCreate(valor);\n        setNome(\"\");\n      } catch {\n        setErroLista(\"Não foi possível salvar. Atualize a página e tente de novo.\");\n      }\n    });\n  }\n\n  function reativar(id: number) {\n    if (!onReativar) return;\n    setErroLista(null);\n    setPendingId(id);\n    startTransition(async () => {\n      try {\n        await onReativar(id);\n      } catch {\n        setErroLista(\"Não foi possível ativar. Atualize a página e tente de novo.\");\n      }\n      setPendingId(null);\n    });\n  }\n"},{"nome":"ajuste 3","antes":"    setPendingId(id);\n    startTransition(async () => {\n      await onDelete(id);\n      setPendingId(null);\n    });\n  }\n\n  return (","depois":"    setErroLista(null);\n    setPendingId(id);\n    startTransition(async () => {\n      try {\n        await onDelete(id);\n      } catch {\n        setErroLista(\"Não foi possível excluir. Atualize a página e tente de novo.\");\n      }\n      setPendingId(null);\n    });\n  }\n\n  return ("},{"nome":"ajuste 4","antes":"        <Button\n          type=\"button\"\n          onClick={adicionar}\n          disabled={isPending || !nome.trim()}\n          className=\"sm:w-auto\"\n        >\n          <Plus className=\"h-4 w-4\" />\n          Adicionar\n        </Button>\n      </div>\n","depois":"        <Button\n          type=\"button\"\n          onClick={adicionar}\n          disabled={isPending || !nome.trim() || Boolean(jaExiste && !inativo(jaExiste.status))}\n          className=\"sm:w-auto\"\n        >\n          <Plus className=\"h-4 w-4\" />\n          {jaExiste && inativo(jaExiste.status) ? \"Ativar\" : \"Adicionar\"}\n        </Button>\n      </div>\n\n      {jaExiste ? (\n        <p className=\"mt-2 text-xs text-amber-200\">\n          {inativo(jaExiste.status)\n            ? `\"${jaExiste.nome}\" já existe, mas está inativo. Clique em Ativar para usar de novo.`\n            : `\"${jaExiste.nome}\" já está na lista.`}\n        </p>\n      ) : null}\n      {erroLista ? (\n        <div className=\"mt-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100\">{erroLista}</div>\n      ) : null}\n"},{"nome":"ajuste 5","antes":"              <button\n                type=\"button\"\n                onClick={() => excluir(item.id)}\n                disabled={isPending && pendingId === item.id}\n                className=\"inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/15 disabled:opacity-60\"\n              >\n                <Trash2 className=\"h-4 w-4\" />\n                Excluir\n              </button>\n            </div>","depois":"              <div className=\"flex shrink-0 flex-wrap gap-2\">\n                {onReativar && inativo(item.status) ? (\n                  <button\n                    type=\"button\"\n                    onClick={() => reativar(item.id)}\n                    disabled={isPending && pendingId === item.id}\n                    className=\"inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/15 disabled:opacity-60\"\n                  >\n                    <Eye className=\"h-4 w-4\" />\n                    Ativar\n                  </button>\n                ) : null}\n                <button\n                  type=\"button\"\n                  onClick={() => excluir(item.id)}\n                  disabled={isPending && pendingId === item.id}\n                  className=\"inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/15 disabled:opacity-60\"\n                >\n                  <Trash2 className=\"h-4 w-4\" />\n                  Excluir\n                </button>\n              </div>\n            </div>"},{"nome":"ajuste 6","antes":"                  onCreate={(nome) =>\n                    criarOrigemCliente({ nome, status: \"Ativa\" })\n                  }\n                  onDelete={excluirOrigemCliente}","depois":"                  onCreate={(nome) =>\n                    criarOrigemCliente({ nome, status: \"Ativa\" })\n                  }\n                  onDelete={excluirOrigemCliente}\n                  onReativar={(id) => reativarCadastroAuxiliar(\"origem\", id)}"},{"nome":"ajuste 7","antes":"                  onCreate={(nome) =>\n                    criarProcedimentoInteresse({ nome, status: \"Ativo\" })\n                  }","depois":"                  onCreate={(nome) =>\n                    criarProcedimentoInteresse({ nome, status: \"Ativo\" })\n                  }\n                  onReativar={(id) => reativarCadastroAuxiliar(\"interesse\", id)}"},{"nome":"ajuste 8","antes":"                  onCreate={(nome) => criarMotivoPerda({ nome, status: \"Ativo\" })}\n                  onDelete={excluirMotivoPerda}","depois":"                  onCreate={(nome) => criarMotivoPerda({ nome, status: \"Ativo\" })}\n                  onDelete={excluirMotivoPerda}\n                  onReativar={(id) => reativarCadastroAuxiliar(\"motivo\", id)}"},{"nome":"ajuste 9","antes":"    startTransition(async () => {\n      await criarProcedimentoServico({\n        nome,\n        duracaoPadrao: interpretarDuracao(duracao),\n        valorPadrao: parseCurrency(valor),\n        custoPadrao: parseCurrency(custo),\n        status: \"Ativo\",\n      });\n      setProcedimentoSelecionado(\"\");","depois":"    setAviso(null);\n    startTransition(async () => {\n      try {\n        await criarProcedimentoServico({\n          nome,\n          duracaoPadrao: interpretarDuracao(duracao),\n          valorPadrao: parseCurrency(valor),\n          custoPadrao: parseCurrency(custo),\n          status: \"Ativo\",\n        });\n      } catch {\n        setAviso(\"Não foi possível adicionar. Se ele estiver em Procedimentos ocultos, use Mostrar de novo.\");\n        return;\n      }\n      setProcedimentoSelecionado(\"\");"},{"nome":"ajuste 10","antes":"          Este procedimento já está configurado como serviço da agenda. Atualize\n          preço e custo no cartão existente abaixo.","depois":"          {items.some(\n            (item) =>\n              item.status !== \"Ativo\" &&\n              item.nome.toLowerCase() === procedimentoSelecionado.toLowerCase(),\n          )\n            ? \"Este procedimento já existe, mas está oculto. Abra \\\"Procedimentos ocultos\\\" abaixo e clique em Mostrar de novo.\"\n            : \"Este procedimento já está configurado como serviço da agenda. Atualize preço e custo no cartão existente abaixo.\"}"}]}]};
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
