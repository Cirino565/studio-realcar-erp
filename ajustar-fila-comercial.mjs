/**
 * AJUSTE - "Agendamento sem confirmação" aparecendo cedo demais na Fila
 * comercial inteligente do Dashboard
 *
 * O PROBLEMA
 *
 * Esse aviso aparecia a partir de 8 dias ANTES do horário marcado - ou
 * seja, já no dia em que você agenda o lead, muito antes de fazer sentido
 * clicar em "Confirmou". Como o processo real é mandar o lembrete de
 * confirmação só na véspera, o aviso ficava incomodando a semana inteira
 * sem necessidade.
 *
 * A CORRECAO
 *
 * A janela passa de 8 dias para 2: o aviso só entra na fila a partir de
 * amanhã (que é quando você manda o lembrete da véspera) e continua
 * aparecendo no dia do atendimento, caso ainda não tenha confirmado. O
 * botão "Confirmou" continua fazendo a mesma coisa de sempre - só passa a
 * aparecer na hora certa.
 *
 * Como usar: coloque este arquivo na RAIZ do projeto e rode
 *     node ajustar-fila-comercial.mjs
 *
 * E seguro rodar duas vezes: se ja estiver aplicado, ele avisa e pula.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const ARQUIVO = "app/(app)/page.tsx";

const antigo = `  const limiteNegociacaoParada = new Date(inicioHoje.getTime() - 3 * UM_DIA_MS);
  const limiteAvaliacoesProximas = new Date(inicioHoje.getTime() + 8 * UM_DIA_MS);`;

const novo = `  const limiteNegociacaoParada = new Date(inicioHoje.getTime() - 3 * UM_DIA_MS);
  // Antes eram 8 dias, e o aviso de "sem confirmação" aparecia assim que o
  // agendamento era criado - bem antes de fazer sentido, já que o lembrete
  // de confirmação só é enviado na véspera. Agora só entra na fila a partir
  // de amanhã (a partir de quando o lembrete da véspera já foi mandado) e
  // continua aparecendo no dia do atendimento, caso ainda não tenha
  // confirmado.
  const limiteAvaliacoesProximas = new Date(inicioHoje.getTime() + 1 * UM_DIA_MS);`;

console.log("\nAjuste - Fila comercial inteligente (janela de confirmação)\n");

if (!existsSync(ARQUIVO) || !existsSync("package.json")) {
  console.error("ERRO: rode este script na pasta raiz do projeto (a mesma do package.json).\n");
  process.exit(1);
}

const bruto = readFileSync(ARQUIVO, "utf8");
const usaCRLF = bruto.includes("\r\n");
const atual = bruto.replace(/\r\n/g, "\n");

if (atual.includes(novo)) {
  console.log("  [pulou] ajuste da janela de confirmação (já estava aplicada)\n");
  console.log("Nada a fazer.\n");
  process.exit(0);
}

const ocorrencias = atual.split(antigo).length - 1;

if (ocorrencias !== 1) {
  console.error("NADA foi salvo - não encontrei o trecho esperado (" + ocorrencias + " ocorrência(s), esperado 1).\n");
  console.error("Manda esta mensagem inteira no chat que eu ajusto.\n");
  process.exit(1);
}

const resultado = atual.replace(antigo, novo);
writeFileSync(ARQUIVO, usaCRLF ? resultado.replace(/\n/g, "\r\n") : resultado, "utf8");

console.log("  [ok]    janela ajustada de 8 dias para 2 dias\n");
console.log("Pronto!\n");
console.log("Agora rode:  npm run build\n");
