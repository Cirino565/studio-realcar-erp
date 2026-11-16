#!/usr/bin/env node
/*
 * LEAD QUE DESMARCOU E REAGENDOU VOLTA SOZINHO PARA "AGENDADO" - Studio Realcar
 *
 * Ao marcar um horario para uma cliente que tem lead em andamento sem
 * horario valido (desmarcou, faltou ou ainda nao tinha marcado), o lead
 * passa a apontar para o horario novo e vai sozinho para "Agendado", com
 * registro no historico. Lead que ja tem horario valido nao muda.
 * No deploy, conserta os casos que ja existem (como a Sara): lead preso a
 * horario cancelado e cliente com horario novo marcado.
 *
 * Pode rodar mais de uma vez; se algum trecho nao for encontrado, NADA e
 * gravado.
 *
 * Uso: node lead-reagendado-automatico.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{"prisma/migrations/20261116120000_lead_religar_reagendados/migration.sql":"-- Conserta leads que desmarcaram/faltaram e ja foram reagendados: o lead\n-- continuava preso ao horario cancelado. Liga ao proximo horario ativo da\n-- cliente (que ainda nao seja de outro lead) e move para \"Agendado\".\nWITH candidatos AS (\n  SELECT DISTINCT ON (l.\"id\")\n    l.\"id\" AS lead_id,\n    novo.\"id\" AS agendamento_id,\n    novo.\"data\" AS data_novo\n  FROM \"Lead\" l\n  JOIN \"Agendamento\" antigo ON antigo.\"id\" = l.\"agendamentoId\"\n  JOIN \"Agendamento\" novo\n    ON novo.\"clienteId\" = l.\"clienteId\"\n   AND novo.\"id\" <> antigo.\"id\"\n   AND novo.\"data\" >= NOW()\n   AND novo.\"status\" NOT IN ('Cancelado', 'Faltou', 'Atendido')\n   AND NOT EXISTS (SELECT 1 FROM \"Lead\" x WHERE x.\"agendamentoId\" = novo.\"id\")\n  WHERE l.\"etapa\" NOT IN ('Convertido', 'Perdido')\n    AND antigo.\"status\" IN ('Cancelado', 'Faltou')\n  ORDER BY l.\"id\", novo.\"data\" ASC\n),\nunicos AS (\n  SELECT DISTINCT ON (agendamento_id) lead_id, agendamento_id, data_novo\n  FROM candidatos\n  ORDER BY agendamento_id, lead_id DESC\n),\natualizados AS (\n  UPDATE \"Lead\" l\n     SET \"agendamentoId\" = u.agendamento_id,\n         \"etapa\" = 'Agendado',\n         \"proximoContatoEm\" = NULL,\n         \"updatedAt\" = NOW()\n    FROM unicos u\n   WHERE l.\"id\" = u.lead_id\n  RETURNING l.\"id\", u.data_novo\n)\nINSERT INTO \"LeadInteracao\" (\"leadId\", \"tipo\", \"descricao\", \"createdAt\")\nSELECT a.\"id\", 'Reagendamento',\n       'Ligado automaticamente ao novo horário de ' || to_char(a.data_novo AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || ' (tinha desmarcado e reagendou).',\n       NOW()\nFROM atualizados a;\n"},"arquivos":[{"arquivo":"actions/agendamento.actions.ts","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"async function resolverCliente(dados: NovoAgendamento) {","depois":"/**\n * Cliente com lead em andamento que nao tem horario valido (desmarcou,\n * faltou ou ainda nao tinha marcado): o novo horario passa a ser o do lead\n * e o lead vai sozinho para \"Agendado\".\n */\nasync function religarLeadAoNovoHorarioNoTx(\n  tx: Prisma.TransactionClient,\n  clienteId: number,\n  filtroNovo: Prisma.AgendamentoWhereInput,\n) {\n  const leads = await tx.lead.findMany({\n    where: { clienteId, etapa: { notIn: [\"Convertido\", \"Perdido\"] } },\n    select: { id: true, agendamento: { select: { status: true } } },\n    orderBy: { updatedAt: \"desc\" },\n  });\n  const lead = leads.find(\n    (item) => !item.agendamento || [\"Cancelado\", \"Faltou\"].includes(item.agendamento.status),\n  );\n  if (!lead) return;\n\n  const novo = await tx.agendamento.findFirst({\n    where: { ...filtroNovo, clienteId, lead: { is: null } },\n    orderBy: [{ data: \"asc\" }, { id: \"desc\" }],\n    select: { id: true, data: true },\n  });\n  if (!novo) return;\n\n  await tx.lead.update({\n    where: { id: lead.id },\n    data: { agendamentoId: novo.id, etapa: \"Agendado\", proximoContatoEm: null },\n  });\n  await tx.leadInteracao.create({\n    data: {\n      leadId: lead.id,\n      tipo: \"Reagendamento\",\n      descricao: `Novo horário marcado para ${formatarDataHoraLeadAgenda(novo.data)}. Lead movido automaticamente para Agendado.`,\n    },\n  });\n}\n\nasync function resolverCliente(dados: NovoAgendamento) {"},{"nome":"ajuste 2","antes":"          usarSinalGuardado:\n            Boolean(dados.usarSinalGuardado) && naturezaAtendimento !== \"RETORNO\" && !dados.sinalPago,\n        });\n      }\n    }\n  });","depois":"          usarSinalGuardado:\n            Boolean(dados.usarSinalGuardado) && naturezaAtendimento !== \"RETORNO\" && !dados.sinalPago,\n        });\n      }\n    }\n\n    // Lead que tinha desmarcado/faltado (ou ainda nao tinha marcado) volta\n    // sozinho para \"Agendado\", ligado a este novo horario.\n    await religarLeadAoNovoHorarioNoTx(tx, clienteId!, {\n      data: datas[0],\n      procedimento: dados.procedimento,\n      naturezaAtendimento,\n    });\n  });"},{"nome":"ajuste 3","antes":"import { revalidatePath } from \"next/cache\";","depois":"import { revalidatePath } from \"next/cache\";\nimport type { Prisma } from \"@prisma/client\";"}]}]};
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
