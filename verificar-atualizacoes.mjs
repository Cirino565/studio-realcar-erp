/**
 * VERIFICACAO - o que ja foi aplicado no projeto (nao muda nada)
 *
 * Este script SO LE arquivos, nunca escreve nada. Roda em segundos e
 * mostra uma lista do que ja esta no projeto e do que ainda falta,
 * com o nome exato do script que resolve cada pendencia.
 *
 * Como usar: coloque este arquivo na RAIZ do projeto e rode
 *     node verificar-atualizacoes.mjs
 *
 * Depois, me manda o que aparecer na tela.
 */

import { readFileSync, existsSync } from "node:fs";

console.log("\nVerificando o que ja foi aplicado...\n");

if (!existsSync("package.json")) {
  console.error("ERRO: rode este script na pasta raiz do projeto (a mesma do package.json).\n");
  process.exit(1);
}

function lerArquivo(caminho) {
  try {
    return readFileSync(caminho, "utf8");
  } catch {
    return null;
  }
}

function contem(caminho, texto) {
  const conteudo = lerArquivo(caminho);
  if (conteudo === null) return null; // arquivo nao existe
  return conteudo.includes(texto);
}

function naoContem(caminho, texto) {
  const conteudo = lerArquivo(caminho);
  if (conteudo === null) return null;
  return !conteudo.includes(texto);
}

const grupos = [
  {
    titulo: "Logo, agenda e finalizacao (lote antigo)",
    itens: [
      ["Logo real no menu e no login", "aplicar-atualizacao.mjs", contem("components/layout/Sidebar.tsx", "studio-realcar-logo")],
      ["Busca da agenda nao fica por cima da janela", "corrigir-busca-agenda.mjs", contem("app/(app)/agenda/components/AgendaSearch.tsx", "z-[60]")],
      ["Tempo limite maior ao finalizar com produto", "corrigir-finalizar-atendimento.mjs", contem("actions/agendamento.actions.ts", "maxWait: 15000")],
      ["Campo conversaoAdsEnviadaEm no lugar", "corrigir-schema-conversao-ads.mjs", contem("prisma/schema.prisma", "conversaoAdsEnviadaEm")],
    ],
  },
  {
    titulo: "Fotos, evolucoes pendentes e observacao",
    itens: [
      ["Fotos agrupadas por data na ficha", "aplicar-fotos-e-busca.mjs", contem("app/(app)/clientes/components/ClienteClinicoTabs.tsx", "agruparFotosPorData")],
      ["Cursor nao pula mais na busca de clientes", "corrigir-cursor-clientes.mjs / aplicar-fotos-e-busca.mjs", contem("app/(app)/clientes/components/ClientesClient.tsx", "iniciarNavegacao")],
      ["Tela 'Evolucoes pendentes' no menu", "aplicar-evolucoes-e-observacao.mjs", existsSync("app/(app)/evolucoes-pendentes/page.tsx")],
      ["Observacao visivel na agenda mesmo em horarios curtos", "aplicar-evolucoes-e-observacao.mjs", contem("app/(app)/agenda/components/AgendaCalendar.tsx", "getObservacaoReal")],
      ["Texto automatico de campanha removido da observacao", "aplicar-evolucoes-e-observacao.mjs", naoContem("actions/marketing.actions.ts", "Originado do CRM comercial")],
      ["Fila comercial nao avisa cedo demais (era 8 dias)", "ajustar-fila-comercial.mjs", naoContem("app/(app)/page.tsx", "+ 8 * UM_DIA_MS")],
      ["Upload de foto mais rapido (cache de pastas do Drive)", "corrigir-lentidao-upload-foto.mjs", contem("lib/google-drive.ts", "clientFolderIdCache")],
    ],
  },
  {
    titulo: "Agenda: bloqueio, rolagem e proximo agendamento",
    itens: [
      ["Bloqueio por periodo (ex.: 'ate o dia')", "bloquear-periodo-na-agenda.mjs", contem("app/(app)/agenda/components/NovoAgendamentoModal.tsx", "bloqueioAteData")],
      ["Bloqueio ignora dias ja fechados (nao trava mais)", "corrigir-bloqueio-periodo.mjs", contem("actions/agendamento.actions.ts", "filtrarDatasBloqueioValidas")],
      ["Rolagem da agenda sem travar (computador)", "rolagem-agenda-v3.mjs", contem("app/(app)/agenda/components/AgendaCalendar.tsx", "agendaRolaNaPagina")],
      ["Botao abre como Procedimento apos avaliacao", "melhorar-botao-proximo-agendamento.mjs", contem("app/(app)/agenda/components/AgendaClient.tsx", "veioDeAvaliacao")],
      ["Botao renomeado para 'Agendar proximo'", "renomear-botao-agendar-proximo.mjs", contem("app/(app)/agenda/components/AppointmentDetailsModal.tsx", "Agendar próximo")],
      ["Procedimento aparece junto da observacao (nao some mais)", "corrigir-procedimento-na-agenda.mjs", contem("app/(app)/agenda/components/AgendaCalendar.tsx", "O PROCEDIMENTO vem sempre primeiro")],
    ],
  },
  {
    titulo: "Conversao de lead e data do atendimento",
    itens: [
      ["Lead converte mesmo sem vinculo direto ao agendamento", "corrigir-conversao-de-lead.mjs", contem("actions/agendamento.actions.ts", "2a tentativa")],
      ["Data do atendimento usa a data do agendamento, nao a de hoje", "corrigir-data-do-atendimento.mjs", contem("actions/agendamento.actions.ts", "a data em que ele ACONTECEU")],
      ["Tela 'Em aberto' no menu", "adicionar-tela-atendimentos-abertos.mjs", existsSync("app/(app)/atendimentos-abertos/page.tsx")],
    ],
  },
  {
    titulo: "Financeiro e pacotes",
    itens: [
      ["Vincular cliente a um lancamento manual", "vincular-cliente-em-lancamento.mjs", contem("app/(app)/financeiro/types.ts", "ClienteFinanceiroOption")],
      ["Nome da cliente visivel na busca do lancamento", "corrigir-nome-invisivel-lancamento.mjs", contem("app/(app)/financeiro/components/NovoLancamentoModal.tsx", "text-slate-900\">{item.nome}")],
      ["Controle de saldo de pacote (aba Pacotes na ficha)", "adicionar-saldo-de-pacote.mjs", contem("prisma/schema.prisma", "model PacoteCliente")],
      ["'Investimento' da cliente soma pagamentos de pacote", "corrigir-investimento-com-pacote.mjs", contem("app/(app)/clientes/components/ClienteProfileHeader.tsx", "data.pacotes.reduce")],
      ["Aviso de pacote em aberto na finalizacao", "avisar-pacote-na-finalizacao.mjs", contem("app/(app)/agenda/components/FinalizarAtendimentoModal.tsx", "Esta cliente tem pacote em aberto")],
    ],
  },
  {
    titulo: "Evolucao clinica, motivos de perda e CEP",
    itens: [
      ["Editar evolucao clinica (guarda o texto anterior)", "permitir-editar-evolucao.mjs", contem("prisma/schema.prisma", "model ClienteEvolucaoVersao")],
      ["Motivos de perda configuraveis em Configuracoes", "motivos-de-perda-configuraveis.mjs", contem("prisma/schema.prisma", "model MotivoPerdaLead")],
      ["Busca de CEP nao trava mais (limite de 8s)", "corrigir-travamento-cep.mjs", contem("components/clientes/EnderecoClienteFields.tsx", "TEMPO_LIMITE_CONSULTA_MS")],
      ["Botoes da ficha avisam 'Salvando...'", "avisar-salvando-na-ficha.mjs", contem("app/(app)/clientes/components/ClienteClinicoTabs.tsx", "function BotaoSalvar")],
      ["Fotos: cada grupo abre/fecha de forma independente", "corrigir-fotos-e-download.mjs", contem("app/(app)/clientes/components/ClienteClinicoTabs.tsx", "estadoGrupos")],
    ],
  },
];

let totalOk = 0;
let totalFalta = 0;
const pendencias = [];

for (const grupo of grupos) {
  console.log("== " + grupo.titulo + " ==");

  for (const [nome, script, resultado] of grupo.itens) {
    if (resultado === true) {
      console.log("  [OK]    " + nome);
      totalOk += 1;
    } else if (resultado === false) {
      console.log("  [FALTA] " + nome + "  ->  " + script);
      totalFalta += 1;
      pendencias.push(script);
    } else {
      console.log("  [??]    " + nome + " (arquivo nao encontrado - projeto pode estar incompleto)");
    }
  }

  console.log("");
}

console.log("=".repeat(50));
console.log("Resumo: " + totalOk + " ja aplicado(s), " + totalFalta + " pendente(s).");

if (pendencias.length > 0) {
  const unicos = [...new Set(pendencias)];
  console.log("\nScripts que faltam rodar:");
  unicos.forEach((s) => console.log("  - " + s));
}

console.log("\nManda esta tela inteira no chat.\n");
