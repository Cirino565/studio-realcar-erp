#!/usr/bin/env node
/*
 * FOTO QUEBRADA NA FICHA DA CLIENTE - Studio Realcar
 *
 * Quando o arquivo de uma foto nao existe mais no Google Drive:
 *  - em vez do quadrado cinza vazio, aparece "Foto nao encontrada no Drive";
 *  - o botao da lixeira passa a funcionar nessa foto (antes dava erro): ele so
 *    oculta o registro quebrado da ficha. Fica registrado na Auditoria.
 * Fotos normais continuam funcionando exatamente como antes.
 *
 * Nao muda o banco de dados (nao tem migracao).
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e gravado.
 *
 * Uso: node foto-quebrada.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"actions/cliente-clinico.actions.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"    if (foto.driveFileId) {\n      await moveDriveFileToTrash(foto.driveFileId);\n    }\n\n    try {","depois":"    // Se o arquivo ja nao existe mais no Drive (foi apagado la), nao ha o que\n    // mandar para a lixeira: segue e so oculta o registro quebrado da ficha.\n    let arquivoJaNaoExiste = false;\n\n    if (foto.driveFileId) {\n      try {\n        await moveDriveFileToTrash(foto.driveFileId);\n      } catch (error) {\n        const texto = error instanceof Error ? error.message : \"\";\n        if (/not found|404/i.test(texto)) {\n          arquivoJaNaoExiste = true;\n        } else {\n          throw error;\n        }\n      }\n    }\n\n    try {"},{"nome":"ajuste 2","antes":"            detalhes: foto.driveFileId\n              ? `Cliente ${clienteId}, título ${foto.titulo}. O arquivo do Drive foi movido para a lixeira.`","depois":"            detalhes: arquivoJaNaoExiste\n              ? `Cliente ${clienteId}, título ${foto.titulo}. O arquivo já não existia no Drive; só o registro foi ocultado.`\n              : foto.driveFileId\n              ? `Cliente ${clienteId}, título ${foto.titulo}. O arquivo do Drive foi movido para a lixeira.`"},{"nome":"ajuste 3","antes":"      if (foto.driveFileId) {\n        await restoreDriveFile(foto.driveFileId).catch(() => undefined);\n      }\n      throw error;","depois":"      if (foto.driveFileId && !arquivoJaNaoExiste) {\n        await restoreDriveFile(foto.driveFileId).catch(() => undefined);\n      }\n      throw error;"}]},{"arquivo":"app/(app)/clientes/components/ClienteClinicoTabs.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"function agruparFotosPorData(fotos: ClienteFotoData[]) {","depois":"// Mostra a foto; se o arquivo nao abrir (por exemplo, nao existe mais no Drive),\n// mostra um aviso claro no lugar do quadrado vazio.\nfunction ImagemDaFoto({\n  src,\n  alt,\n  className,\n}: {\n  src: string;\n  alt: string;\n  className: string;\n}) {\n  const [falhou, setFalhou] = useState(false);\n\n  if (falhou) {\n    return (\n      <div className=\"flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 p-4 text-center text-slate-500 dark:text-slate-300\">\n        <AlertTriangle className=\"size-6 text-amber-500\" />\n        <p className=\"text-sm font-semibold\">Foto não encontrada no Drive</p>\n        <p className=\"text-xs\">\n          O arquivo não existe mais. Você pode excluir este registro e enviar a foto de novo.\n        </p>\n      </div>\n    );\n  }\n\n  return (\n    // eslint-disable-next-line @next/next/no-img-element\n    <img\n      src={src}\n      alt={alt}\n      loading=\"lazy\"\n      decoding=\"async\"\n      className={className}\n      onError={() => setFalhou(true)}\n    />\n  );\n}\n\nfunction agruparFotosPorData(fotos: ClienteFotoData[]) {"},{"nome":"ajuste 2","antes":"                        {/* eslint-disable-next-line @next/next/no-img-element */}\n                        <img\n                          src={foto.url}\n                          alt={foto.titulo}\n                          loading=\"lazy\"\n                          decoding=\"async\"\n                          className=\"h-full w-full object-contain\"\n                        />","depois":"                        <ImagemDaFoto\n                          src={foto.url}\n                          alt={foto.titulo}\n                          className=\"h-full w-full object-contain\"\n                        />"},{"nome":"ajuste 3","antes":"              {/* eslint-disable-next-line @next/next/no-img-element */}\n              <img\n                src={fotoAberta.url}\n                alt={fotoAberta.titulo}\n                className=\"max-h-[78vh] max-w-full object-contain\"\n              />","depois":"              <ImagemDaFoto\n                key={fotoAberta.id}\n                src={fotoAberta.url}\n                alt={fotoAberta.titulo}\n                className=\"max-h-[78vh] max-w-full object-contain\"\n              />"}]}]};
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
