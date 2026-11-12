#!/usr/bin/env node
/*
 * CADASTRO DE CLIENTE: SALVAR SEM CEP E AVISO VISIVEL - Studio Realcar
 *
 * O CEP nunca bloqueou o salvar, mas o aviso de erro (ex.: falta escolher o
 * procedimento de interesse) aparecia la em cima do formulario: quem estava
 * no endereco, embaixo, nao via e achava que o CEP impedia de salvar.
 *  - O aviso agora aparece tambem ao lado do botao Salvar (cadastro de
 *    cliente e edicao rapida pela agenda).
 *  - Se der erro ao salvar no servidor, aparece uma mensagem (antes nada).
 *  - Mensagens do CEP deixam claro: nao achou? Escreva o endereco a mao e
 *    salve normalmente.
 *
 * Nao muda o banco. Pode rodar mais de uma vez; se algum trecho nao for
 * encontrado, NADA e gravado.
 *
 * Uso: node cliente-salvar-sem-cep.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"components/clientes/NovoClienteModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"      <footer className=\"grid shrink-0 gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/[0.025] sm:grid-cols-2 sm:px-6\">\n        <Button type=\"button\" variant=\"outline\" onClick={onClose}>\n          Cancelar\n        </Button>\n        <Button type=\"submit\">\n          <Save size={16} />\n          {cliente ? \"Salvar alterações\" : \"Salvar cliente\"}\n        </Button>\n      </footer>","depois":"      <footer className=\"grid shrink-0 gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/[0.025] sm:grid-cols-2 sm:px-6\">\n        {erro ? (\n          // O aviso aparece tambem aqui, ao lado do botao: quem esta no fim\n          // do formulario (endereco) nao via o aviso la em cima e achava que\n          // o sistema \"nao deixava salvar\".\n          <p\n            role=\"alert\"\n            className=\"flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200 sm:col-span-2\"\n          >\n            <AlertCircle size={15} className=\"mt-0.5 shrink-0\" />\n            <span>{erro}</span>\n          </p>\n        ) : null}\n        <Button type=\"button\" variant=\"outline\" onClick={onClose}>\n          Cancelar\n        </Button>\n        <Button type=\"submit\">\n          <Save size={16} />\n          {cliente ? \"Salvar alterações\" : \"Salvar cliente\"}\n        </Button>\n      </footer>"}]},{"arquivo":"app/(app)/agenda/components/ClienteQuickEditModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"        <footer className=\"shrink-0 border-t border-slate-200 bg-white p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:px-5\">\n          <button","depois":"        <footer className=\"shrink-0 border-t border-slate-200 bg-white p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:px-5\">\n          {erro ? (\n            <p role=\"alert\" className=\"mb-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700\">\n              <AlertCircle size={15} className=\"mt-0.5 shrink-0\" />\n              <span>{erro}</span>\n            </p>\n          ) : null}\n          <button"}]},{"arquivo":"app/(app)/clientes/components/ClientesClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  function salvarCliente(dados: ClienteFormData) {\n    startTransition(async () => {\n      if (clienteSelecionado) {\n        await atualizarCliente({\n          id: clienteSelecionado.id,\n          ...dados,\n        });\n      } else {\n        await criarCliente(dados);\n      }\n\n      setModalAberto(false);","depois":"  function salvarCliente(dados: ClienteFormData) {\n    startTransition(async () => {\n      try {\n        if (clienteSelecionado) {\n          await atualizarCliente({\n            id: clienteSelecionado.id,\n            ...dados,\n          });\n        } else {\n          await criarCliente(dados);\n        }\n      } catch {\n        // Antes, um erro aqui nao mostrava nada e parecia que \"nao salvava\".\n        window.alert(\"Não foi possível salvar a cliente. Confira os dados e tente de novo; o que você digitou continua na tela.\");\n        return;\n      }\n\n      setModalAberto(false);"}]},{"arquivo":"app/api/cep/[cep]/route.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"        \"CEP não encontrado. Confira o número ou preencha o endereço manualmente.\",","depois":"        \"CEP não encontrado na base dos Correios. Sem problema: preencha rua, bairro e cidade à mão e salve normalmente.\","},{"nome":"ajuste 2","antes":"      \"A consulta de CEP está indisponível. Preencha o endereço manualmente.\",","depois":"      \"A busca de CEP está fora do ar agora. Preencha o endereço à mão e salve normalmente.\","}]},{"arquivo":"components/clientes/EnderecoClienteFields.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"    if (cep.length !== 8) {\n      setMensagem(\"Informe um CEP com 8 dígitos.\");","depois":"    if (cep.length !== 8) {\n      setMensagem(\"O CEP tem 8 números. Se não souber, pode deixar em branco e preencher o endereço à mão.\");"},{"nome":"ajuste 2","antes":"          Digite o CEP para preencher rua, bairro, cidade e estado. Número e complemento são informados manualmente. Se a consulta estiver indisponível, todos os campos continuam editáveis.","depois":"          Digite o CEP para preencher rua, bairro, cidade e estado. Se o CEP não for encontrado, escreva o endereço à mão: o endereço não é obrigatório e nunca impede de salvar."}]}]};
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
