/**
 * ATUALIZACAO - tela de evolucoes pendentes, observacao visivel na agenda,
 * remove texto automatico de campanha
 *
 * O QUE ESTE SCRIPT FAZ
 *
 * 1. Cria uma tela nova (menu > Mais > Evolucoes) que lista TODAS as
 *    evolucoes clinicas pendentes, sem limite de quantidade nem de data,
 *    da mais antiga para a mais recente, com busca por cliente, procedimento
 *    ou profissional. O card do Dashboard continua existindo do jeito que
 *    esta, como um resumo rapido - a tela nova e para consulta completa.
 *
 * 2. Na Agenda, a observacao do agendamento passa a aparecer no calendario
 *    mesmo em horarios curtos (como uma avaliacao de 30-40 minutos), que
 *    antes so mostravam a observacao se o horario tivesse mais de ~57
 *    minutos.
 *
 * 3. Remove o texto automatico "Originado do CRM comercial. Lead #X" que
 *    era gravado sozinho na observacao ao converter um lead de campanha em
 *    agendamento. Essa origem ja fica registrada no cadastro do cliente e
 *    no proprio lead - nao precisa repetir na observacao, que fica livre
 *    para anotacoes de verdade.
 *
 * Como usar: coloque este arquivo na RAIZ do projeto e rode
 *     node aplicar-evolucoes-e-observacao.mjs
 *
 * E seguro rodar duas vezes: se ja estiver aplicado, ele avisa e pula.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Buffer } from "node:buffer";

const ARQ_CALENDAR = "app/(app)/agenda/components/AgendaCalendar.tsx";
const ARQ_MARKETING = "actions/marketing.actions.ts";
const ARQ_SIDEBAR = "components/layout/Sidebar.tsx";
const ARQ_NOVA_PAGE = "app/(app)/evolucoes-pendentes/page.tsx";
const ARQ_NOVO_CLIENT = "app/(app)/evolucoes-pendentes/components/EvolucoesPendentesPageClient.tsx";

console.log("\nAtualizacao - evolucoes pendentes, observacao e campanha\n");

const obrigatorios = [ARQ_CALENDAR, ARQ_MARKETING, ARQ_SIDEBAR, "package.json"];
const faltando = obrigatorios.filter((caminho) => !existsSync(caminho));

if (faltando.length > 0) {
  console.error("ERRO: nao encontrei estes arquivos do projeto:\n");
  faltando.forEach((caminho) => console.error("   - " + caminho));
  console.error(
    "\nColoque este script na pasta raiz do projeto (a mesma que tem o package.json) e rode de novo.\n",
  );
  process.exit(1);
}

let aplicadas = 0;
let jaEstava = 0;
const erros = [];

function editar(caminho, edicoes) {
  const bruto = readFileSync(caminho, "utf8");
  const usaCRLF = bruto.includes("\r\n");
  let atual = bruto.replace(/\r\n/g, "\n");

  for (const [descricao, antigo, novo] of edicoes) {
    if (atual.includes(novo)) {
      jaEstava += 1;
      console.log("  [pulou] " + descricao + " (ja estava aplicada)");
      continue;
    }

    const ocorrencias = atual.split(antigo).length - 1;

    if (ocorrencias === 1) {
      atual = atual.replace(antigo, novo);
      aplicadas += 1;
      console.log("  [ok]    " + descricao);
      continue;
    }

    erros.push({ descricao, arquivo: caminho, ocorrencias });
    console.log("  [FALHOU] " + descricao);
  }

  return usaCRLF ? atual.replace(/\n/g, "\r\n") : atual;
}

// ---- 1) Agenda: observacao visivel em horarios curtos ----
const novoCalendar = editar(ARQ_CALENDAR, [
  [
    "calendario: separa a observacao real do texto de status",
    `function getAppointmentNote(appointment: AgendamentoAgenda) {
  const note = appointment.observacoes?.split("\\n").find(Boolean)?.trim();
  if (note) return note;

  if (appointment.valor > 0) {
    return appointment.valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return appointment.status;
}`,
    `function getAppointmentNote(appointment: AgendamentoAgenda) {
  const note = appointment.observacoes?.split("\\n").find(Boolean)?.trim();
  if (note) return note;

  if (appointment.valor > 0) {
    return appointment.valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return appointment.status;
}

// A observação de verdade (o texto que a Vivian digitou), separada do
// fallback acima - usada para decidir se ela aparece já nos horários
// curtos, tipo uma avaliação de 30-40 minutos.
function getObservacaoReal(appointment: AgendamentoAgenda) {
  return appointment.observacoes?.split("\\n").find(Boolean)?.trim() || null;
}`,
  ],
  [
    "calendario: calcula a observacao real de cada agendamento",
    `                      const note = getAppointmentNote(appointment);`,
    `                      const note = getAppointmentNote(appointment);
                      const observacaoReal = getObservacaoReal(appointment);`,
  ],
  [
    "calendario: mostra a observacao no lugar do procedimento, ja em horarios curtos",
    `                            {height >= 52 ? (
                              <p
                                className={\`\${
                                  isCompactAppointment ? "mt-0.5" : "mt-1"
                                } line-clamp-1 text-[0.64rem] font-semibold leading-tight sm:text-[0.7rem]\`}
                                style={{ color: statusPalette.mutedText }}
                              >
                                {appointment.procedimento}
                              </p>
                            ) : null}`,
    `                            {height >= 52 ? (
                              <p
                                className={\`\${
                                  isCompactAppointment ? "mt-0.5" : "mt-1"
                                } line-clamp-1 text-[0.64rem] font-semibold leading-tight sm:text-[0.7rem]\`}
                                style={{ color: statusPalette.mutedText }}
                                title={observacaoReal || undefined}
                              >
                                {observacaoReal || appointment.procedimento}
                              </p>
                            ) : null}`,
  ],
  [
    "calendario: evita repetir a observacao na segunda linha",
    `                            {height >= 82 ? (
                              <p
                                className="mt-1 line-clamp-1 text-[0.59rem] font-medium opacity-90"
                                style={{ color: statusPalette.mutedText }}
                              >
                                {appointment.status}
                                {note !== appointment.status ? \` · \${note}\` : ""}
                              </p>
                            ) : null}`,
    `                            {height >= 82 ? (
                              <p
                                className="mt-1 line-clamp-1 text-[0.59rem] font-medium opacity-90"
                                style={{ color: statusPalette.mutedText }}
                              >
                                {appointment.status}
                                {!observacaoReal && note !== appointment.status
                                  ? \` · \${note}\`
                                  : ""}
                                {observacaoReal ? \` · \${appointment.procedimento}\` : ""}
                              </p>
                            ) : null}`,
  ],
]);
writeFileSync(ARQ_CALENDAR, novoCalendar, "utf8");

// ---- 2) Marketing: remove o texto automatico da campanha ----
const novoMarketing = editar(ARQ_MARKETING, [
  [
    "marketing: remove texto automatico de campanha na observacao do agendamento",
    `      status: "Agendado",
      observacoes: \`Originado do CRM comercial. Lead #\${lead.id}.\`,
    };`,
    `      status: "Agendado",
      // Não repete "veio de campanha/lead" aqui: essa origem já fica
      // registrada em campanhaAquisicaoId do cliente e no próprio Lead.
      // O campo de observação do agendamento fica livre para anotações
      // reais sobre o atendimento (ex.: "trouxe foto de referência").
      observacoes: null,
    };`,
  ],
]);
writeFileSync(ARQ_MARKETING, novoMarketing, "utf8");

// ---- 3) Sidebar: novo item de menu, posicionado DEPOIS da Agenda para nao
// alterar os 4 atalhos diretos da barra inferior do celular ----
const novoSidebar = editar(ARQ_SIDEBAR, [
  [
    "menu: adiciona o item Evolucoes (depois da Agenda, sem mexer nos atalhos do celular)",
    `  {
    nome: "Agenda",
    icon: Calendar,
    href: "/agenda",
    permissao: "agenda.visualizar",
  },`,
    `  {
    nome: "Agenda",
    icon: Calendar,
    href: "/agenda",
    permissao: "agenda.visualizar",
  },
  {
    nome: "Evoluções",
    icon: Activity,
    href: "/evolucoes-pendentes",
    permissao: "clientes.clinico",
  },`,
  ],
]);
writeFileSync(ARQ_SIDEBAR, novoSidebar, "utf8");

// ---- 4) Cria os dois arquivos novos da tela de evolucoes pendentes ----
function criarArquivoNovo(caminho, conteudoB64, descricao) {
  const conteudo = Buffer.from(conteudoB64, "base64").toString("utf8");

  if (existsSync(caminho)) {
    const atual = readFileSync(caminho, "utf8").replace(/\r\n/g, "\n");
    if (atual === conteudo.replace(/\r\n/g, "\n")) {
      jaEstava += 1;
      console.log("  [pulou] " + descricao + " (ja estava aplicada)");
      return;
    }
  }

  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo, "utf8");
  aplicadas += 1;
  console.log("  [ok]    " + descricao);
}

criarArquivoNovo(
  ARQ_NOVA_PAGE,
  "aW1wb3J0IHsgcmVxdWlyZVBhZ2VQZXJtaXNzaW9uIH0gZnJvbSAiQC9saWIvYXV0aCI7CmltcG9ydCB7IHByaXNtYSB9IGZyb20gIkAvbGliL3ByaXNtYSI7CgppbXBvcnQgRXZvbHVjb2VzUGVuZGVudGVzUGFnZUNsaWVudCBmcm9tICIuL2NvbXBvbmVudHMvRXZvbHVjb2VzUGVuZGVudGVzUGFnZUNsaWVudCI7CgpmdW5jdGlvbiBmb3JtYXRhclByb2NlZGltZW50b0FnZW5kYW1lbnRvKGFnZW5kYW1lbnRvOiB7CiAgcHJvY2VkaW1lbnRvOiBzdHJpbmc7CiAgbmF0dXJlemFBdGVuZGltZW50bz86IHN0cmluZyB8IG51bGw7Cn0pIHsKICByZXR1cm4gYWdlbmRhbWVudG8ubmF0dXJlemFBdGVuZGltZW50byA9PT0gIlJFVE9STk8iCiAgICA/IGBSZXRvcm5vLCAke2FnZW5kYW1lbnRvLnByb2NlZGltZW50b31gCiAgICA6IGFnZW5kYW1lbnRvLnByb2NlZGltZW50bzsKfQoKZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gRXZvbHVjb2VzUGVuZGVudGVzUGFnZSgpIHsKICAvLyBBIHByw7NwcmlhIHDDoWdpbmEgasOhIGV4aWdlICJjbGllbnRlcy5jbGluaWNvIiBwYXJhIHNlciBhYmVydGEsIGVudMOjbwogIC8vIHF1ZW0gY2hlZ291IGFxdWkgc2VtcHJlIHBvZGUgcmVnaXN0cmFyIGV2b2x1w6fDo28uCiAgYXdhaXQgcmVxdWlyZVBhZ2VQZXJtaXNzaW9uKCJjbGllbnRlcy5jbGluaWNvIik7CgogIC8vIFNlbSAidGFrZSI6IGFxdWkgw6kgYSB0ZWxhIGZlaXRhIHBhcmEgdmVyIFRVRE8gcXVlIGFpbmRhIGZhbHRhLCBwb3IKICAvLyBpc3NvIG7Do28gdGVtIGxpbWl0ZSBkZSBxdWFudGlkYWRlIG5lbSBkZSBkYXRhIC0gZGlmZXJlbnRlIGRvIGNhcmQgZG8KICAvLyBEYXNoYm9hcmQsIHF1ZSDDqSBzw7MgdW0gcmVzdW1vIHLDoXBpZG8gZG8gcXVlIGVzdMOhIG1haXMgdXJnZW50ZS4KICBjb25zdCBldm9sdWNvZXNQZW5kZW50ZXMgPSBhd2FpdCBwcmlzbWEuYWdlbmRhbWVudG8uZmluZE1hbnkoewogICAgd2hlcmU6IHsKICAgICAgc3RhdHVzOiAiQXRlbmRpZG8iLAogICAgICBldm9sdWNhb1N0YXR1czogIlBFTkRFTlRFIiwKICAgIH0sCiAgICBpbmNsdWRlOiB7CiAgICAgIGNsaWVudGU6IHsgc2VsZWN0OiB7IGlkOiB0cnVlLCBub21lOiB0cnVlLCB3aGF0c2FwcDogdHJ1ZSwgdGVsZWZvbmU6IHRydWUgfSB9LAogICAgICBwcm9maXNzaW9uYWw6IHsgc2VsZWN0OiB7IG5vbWU6IHRydWUgfSB9LAogICAgfSwKICAgIG9yZGVyQnk6IFt7IGV2b2x1Y2FvUGVuZGVudGVEZXNkZTogImFzYyIgfSwgeyB1cGRhdGVkQXQ6ICJhc2MiIH1dLAogIH0pOwoKICBjb25zdCBpdGVucyA9IGV2b2x1Y29lc1BlbmRlbnRlcy5tYXAoKGFnZW5kYW1lbnRvKSA9PiAoewogICAgaWQ6IGFnZW5kYW1lbnRvLmlkLAogICAgY2xpZW50ZUlkOiBhZ2VuZGFtZW50by5jbGllbnRlSWQsCiAgICBjbGllbnRlOiBhZ2VuZGFtZW50by5jbGllbnRlLm5vbWUsCiAgICBwcm9jZWRpbWVudG86IGZvcm1hdGFyUHJvY2VkaW1lbnRvQWdlbmRhbWVudG8oYWdlbmRhbWVudG8pLAogICAgcHJvZmlzc2lvbmFsOiBhZ2VuZGFtZW50by5wcm9maXNzaW9uYWw/Lm5vbWUgfHwgbnVsbCwKICAgIGRhdGE6IGFnZW5kYW1lbnRvLmRhdGEudG9JU09TdHJpbmcoKSwKICAgIHBlbmRlbnRlRGVzZGU6CiAgICAgIGFnZW5kYW1lbnRvLmV2b2x1Y2FvUGVuZGVudGVEZXNkZT8udG9JU09TdHJpbmcoKSB8fAogICAgICBhZ2VuZGFtZW50by51cGRhdGVkQXQudG9JU09TdHJpbmcoKSwKICB9KSk7CgogIHJldHVybiAoCiAgICA8RXZvbHVjb2VzUGVuZGVudGVzUGFnZUNsaWVudCBpdGVuc0luaWNpYWlzPXtpdGVuc30gLz4KICApOwp9Cg==",
  "cria a pagina da tela de evolucoes pendentes",
);
criarArquivoNovo(
  ARQ_NOVO_CLIENT,
  "InVzZSBjbGllbnQiOwoKaW1wb3J0IHsgdXNlTWVtbywgdXNlU3RhdGUgfSBmcm9tICJyZWFjdCI7CmltcG9ydCB7IHVzZVJvdXRlciB9IGZyb20gIm5leHQvbmF2aWdhdGlvbiI7CmltcG9ydCB7IEFjdGl2aXR5LCBBbGVydFRyaWFuZ2xlLCBDaGVja0NpcmNsZTIsIFNlYXJjaCB9IGZyb20gImx1Y2lkZS1yZWFjdCI7CgppbXBvcnQgUmVnaXN0cmFyRXZvbHVjYW9QZW5kZW50ZU1vZGFsLCB7CiAgdHlwZSBFdm9sdWNhb1BlbmRlbnRlSXRlbSwKfSBmcm9tICJAL2NvbXBvbmVudHMvYXRlbmRpbWVudG8vUmVnaXN0cmFyRXZvbHVjYW9QZW5kZW50ZU1vZGFsIjsKCnR5cGUgUHJvcHMgPSB7CiAgaXRlbnNJbmljaWFpczogRXZvbHVjYW9QZW5kZW50ZUl0ZW1bXTsKfTsKCmZ1bmN0aW9uIG5vcm1hbGl6YXJCdXNjYSh2YWxvcjogc3RyaW5nKSB7CiAgcmV0dXJuIHZhbG9yCiAgICAubm9ybWFsaXplKCJORkQiKQogICAgLnJlcGxhY2UoL1tcdTAzMDAtXHUwMzZmXS9nLCAiIikKICAgIC50cmltKCkKICAgIC50b0xvd2VyQ2FzZSgpOwp9CgpmdW5jdGlvbiB0ZW1wb1BlbmRlbnRlKHZhbHVlOiBzdHJpbmcpIHsKICBjb25zdCBkaWZmID0gTWF0aC5tYXgoMCwgRGF0ZS5ub3coKSAtIG5ldyBEYXRlKHZhbHVlKS5nZXRUaW1lKCkpOwogIGNvbnN0IGhvcmFzID0gTWF0aC5mbG9vcihkaWZmIC8gKDYwICogNjAgKiAxMDAwKSk7CiAgaWYgKGhvcmFzIDwgMSkgcmV0dXJuICJow6EgbWVub3MgZGUgMSBob3JhIjsKICBpZiAoaG9yYXMgPCAyNCkgcmV0dXJuIGBow6EgJHtob3Jhc30gaG9yYSR7aG9yYXMgPT09IDEgPyAiIiA6ICJzIn1gOwogIGNvbnN0IGRpYXMgPSBNYXRoLmZsb29yKGhvcmFzIC8gMjQpOwogIGlmIChkaWFzIDwgMzApIHJldHVybiBgaMOhICR7ZGlhc30gZGlhJHtkaWFzID09PSAxID8gIiIgOiAicyJ9YDsKICBjb25zdCBtZXNlcyA9IE1hdGguZmxvb3IoZGlhcyAvIDMwKTsKICByZXR1cm4gYGjDoSAke21lc2VzfSAke21lc2VzID09PSAxID8gIm3DqnMiIDogIm1lc2VzIn1gOwp9CgpmdW5jdGlvbiBmb3JtYXRhckRhdGFBdGVuZGltZW50byh2YWx1ZTogc3RyaW5nKSB7CiAgcmV0dXJuIG5ldyBJbnRsLkRhdGVUaW1lRm9ybWF0KCJwdC1CUiIsIHsKICAgIGRheTogIjItZGlnaXQiLAogICAgbW9udGg6ICIyLWRpZ2l0IiwKICAgIHllYXI6ICJudW1lcmljIiwKICB9KS5mb3JtYXQobmV3IERhdGUodmFsdWUpKTsKfQoKLy8gRGVwb2lzIGRlIDMgZGlhcyBzZW0gcmVnaXN0cmFyLCBvIGF0cmFzbyB2aXJhIGRlc3RhcXVlIG1haXMgZm9ydGUgLQovLyBhanVkYSBhIGJhdGVyIG8gb2xobyBlIHNhYmVyIG8gcXVlIGrDoSBwYXNzb3UgZG8gcmF6b8OhdmVsLgpmdW5jdGlvbiBlc3RhQXRyYXNhZGEocGVuZGVudGVEZXNkZTogc3RyaW5nKSB7CiAgY29uc3QgZGlhcyA9IChEYXRlLm5vdygpIC0gbmV3IERhdGUocGVuZGVudGVEZXNkZSkuZ2V0VGltZSgpKSAvICgyNCAqIDYwICogNjAgKiAxMDAwKTsKICByZXR1cm4gZGlhcyA+PSAzOwp9CgpleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBFdm9sdWNvZXNQZW5kZW50ZXNQYWdlQ2xpZW50KHsgaXRlbnNJbmljaWFpcyB9OiBQcm9wcykgewogIGNvbnN0IHJvdXRlciA9IHVzZVJvdXRlcigpOwogIGNvbnN0IFtyZXNvbHZpZG9zLCBzZXRSZXNvbHZpZG9zXSA9IHVzZVN0YXRlPG51bWJlcltdPihbXSk7CiAgY29uc3QgW3NlbGVjaW9uYWRvSWQsIHNldFNlbGVjaW9uYWRvSWRdID0gdXNlU3RhdGU8bnVtYmVyIHwgbnVsbD4obnVsbCk7CiAgY29uc3QgW2J1c2NhLCBzZXRCdXNjYV0gPSB1c2VTdGF0ZSgiIik7CgogIGNvbnN0IHBlbmRlbnRlcyA9IHVzZU1lbW8oCiAgICAoKSA9PiBpdGVuc0luaWNpYWlzLmZpbHRlcigoaXRlbSkgPT4gIXJlc29sdmlkb3MuaW5jbHVkZXMoaXRlbS5pZCkpLAogICAgW2l0ZW5zSW5pY2lhaXMsIHJlc29sdmlkb3NdLAogICk7CgogIGNvbnN0IHBlbmRlbnRlc0ZpbHRyYWRvcyA9IHVzZU1lbW8oKCkgPT4gewogICAgY29uc3QgdGVybW8gPSBub3JtYWxpemFyQnVzY2EoYnVzY2EpOwogICAgaWYgKCF0ZXJtbykgcmV0dXJuIHBlbmRlbnRlczsKCiAgICByZXR1cm4gcGVuZGVudGVzLmZpbHRlcigKICAgICAgKGl0ZW0pID0+CiAgICAgICAgbm9ybWFsaXphckJ1c2NhKGl0ZW0uY2xpZW50ZSkuaW5jbHVkZXModGVybW8pIHx8CiAgICAgICAgbm9ybWFsaXphckJ1c2NhKGl0ZW0ucHJvY2VkaW1lbnRvKS5pbmNsdWRlcyh0ZXJtbykgfHwKICAgICAgICBub3JtYWxpemFyQnVzY2EoaXRlbS5wcm9maXNzaW9uYWwgfHwgIiIpLmluY2x1ZGVzKHRlcm1vKSwKICAgICk7CiAgfSwgW3BlbmRlbnRlcywgYnVzY2FdKTsKCiAgY29uc3Qgc2VsZWNpb25hZG8gPQogICAgcGVuZGVudGVzRmlsdHJhZG9zLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09IHNlbGVjaW9uYWRvSWQpIHx8IG51bGw7CgogIGZ1bmN0aW9uIGNvbmNsdWlyKGlkOiBudW1iZXIpIHsKICAgIHNldFJlc29sdmlkb3MoKGF0dWFpcykgPT4gWy4uLmF0dWFpcywgaWRdKTsKICAgIHNldFNlbGVjaW9uYWRvSWQobnVsbCk7CiAgICAvLyBBdHVhbGl6YSBvcyBuw7ptZXJvcyBkbyBjYXJkIG5vIERhc2hib2FyZCB0YW1iw6ltLCBzZW0gcHJlY2lzYXIKICAgIC8vIHRyb2NhciBkZSB0ZWxhLgogICAgcm91dGVyLnJlZnJlc2goKTsKICB9CgogIGNvbnN0IHRvdGFsQXRyYXNhZGFzID0gcGVuZGVudGVzLmZpbHRlcigoaXRlbSkgPT4KICAgIGVzdGFBdHJhc2FkYShpdGVtLnBlbmRlbnRlRGVzZGUpLAogICkubGVuZ3RoOwoKICByZXR1cm4gKAogICAgPGRpdiBjbGFzc05hbWU9ImFwcC1tb2JpbGUtc2FmZSBzcGFjZS15LTQgcGItNiBzbTpzcGFjZS15LTYgc206cGItMCI+CiAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT0icmVsYXRpdmUgb3ZlcmZsb3ctaGlkZGVuIHJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItc2xhdGUtMjAwIGJnLXdoaXRlIHAtNCBzaGFkb3ctc20gZGFyazpib3JkZXItd2hpdGUvMTAgZGFyazpiZy13aGl0ZS9bMC4wNl0gc206cm91bmRlZC0zeGwgc206cC03Ij4KICAgICAgICA8ZGl2IGNsYXNzTmFtZT0icG9pbnRlci1ldmVudHMtbm9uZSBhYnNvbHV0ZSBpbnNldC0wIGJnLVtyYWRpYWwtZ3JhZGllbnQoY2lyY2xlX2F0X3RvcF9yaWdodCxyZ2JhKDIxNywxMTksNiwwLjEyKSx0cmFuc3BhcmVudF8zNiUpXSIgLz4KCiAgICAgICAgPGRpdiBjbGFzc05hbWU9InJlbGF0aXZlIGZsZXggZmxleC13cmFwIGl0ZW1zLXN0YXJ0IGp1c3RpZnktYmV0d2VlbiBnYXAtMyI+CiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0ibWluLXctMCI+CiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJpbmxpbmUtZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgcm91bmRlZC1mdWxsIGJvcmRlciBib3JkZXItYW1iZXItMjAwIGJnLWFtYmVyLTUwIHB4LTMgcHktMS41IHRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LWFtYmVyLTcwMCBkYXJrOmJvcmRlci1hbWJlci00MDAvMjAgZGFyazpiZy1hbWJlci01MDAvMTUgZGFyazp0ZXh0LWFtYmVyLTIwMCI+CiAgICAgICAgICAgICAgPEFjdGl2aXR5IHNpemU9ezE0fSAvPgogICAgICAgICAgICAgIFJlZ2lzdHJvIGNsw61uaWNvCiAgICAgICAgICAgIDwvZGl2PgoKICAgICAgICAgICAgPGgxIGNsYXNzTmFtZT0ibXQtMyB0ZXh0LXhsIGZvbnQtYm9sZCB0cmFja2luZy10aWdodCB0ZXh0LXNsYXRlLTkwMCBkYXJrOnRleHQtd2hpdGUgc206dGV4dC0zeGwiPgogICAgICAgICAgICAgIEV2b2x1w6fDtWVzIHBlbmRlbnRlcwogICAgICAgICAgICA8L2gxPgoKICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJtdC0yIG1heC13LTJ4bCB0ZXh0LXNtIGxlYWRpbmctNiB0ZXh0LXNsYXRlLTYwMCBkYXJrOnRleHQtc2xhdGUtNDAwIj4KICAgICAgICAgICAgICBUb2RvcyBvcyBhdGVuZGltZW50b3MgZmluYWxpemFkb3MgcXVlIGFpbmRhIGVzcGVyYW0gbyByZWdpc3RybwogICAgICAgICAgICAgIGNsw61uaWNvLCBkbyBtYWlzIGFudGlnbyBwYXJhIG8gbWFpcyByZWNlbnRlLiBOYWRhIHNhaSBkZXNzYQogICAgICAgICAgICAgIGxpc3RhIGF0w6kgdm9jw6ogcmVnaXN0cmFyIGEgZXZvbHXDp8Ojby4KICAgICAgICAgICAgPC9wPgogICAgICAgICAgPC9kaXY+CgogICAgICAgICAgPGRpdiBjbGFzc05hbWU9ImZsZXggZ2FwLTIiPgogICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0icm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1zbGF0ZS0yMDAgYmctd2hpdGUgcHgtNCBweS0yLjUgdGV4dC1jZW50ZXIgc2hhZG93LXNtIGRhcms6Ym9yZGVyLXdoaXRlLzEwIGRhcms6Ymctd2hpdGUvWzAuMDZdIj4KICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQtMnhsIGZvbnQtYm9sZCB0ZXh0LXNsYXRlLTkwMCBkYXJrOnRleHQtd2hpdGUiPgogICAgICAgICAgICAgICAge3BlbmRlbnRlcy5sZW5ndGh9CiAgICAgICAgICAgICAgPC9wPgogICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bMTFweF0gZm9udC1zZW1pYm9sZCB0ZXh0LXNsYXRlLTUwMCBkYXJrOnRleHQtc2xhdGUtNDAwIj4KICAgICAgICAgICAgICAgIG5vIHRvdGFsCiAgICAgICAgICAgICAgPC9wPgogICAgICAgICAgICA8L2Rpdj4KCiAgICAgICAgICAgIHt0b3RhbEF0cmFzYWRhcyA+IDAgPyAoCiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9InJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItcm9zZS0yMDAgYmctcm9zZS01MCBweC00IHB5LTIuNSB0ZXh0LWNlbnRlciBkYXJrOmJvcmRlci1yb3NlLTQwMC8yMCBkYXJrOmJnLXJvc2UtNTAwLzEwIj4KICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC0yeGwgZm9udC1ib2xkIHRleHQtcm9zZS03MDAgZGFyazp0ZXh0LXJvc2UtMzAwIj4KICAgICAgICAgICAgICAgICAge3RvdGFsQXRyYXNhZGFzfQogICAgICAgICAgICAgICAgPC9wPgogICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LVsxMXB4XSBmb250LXNlbWlib2xkIHRleHQtcm9zZS02MDAgZGFyazp0ZXh0LXJvc2UtMzAwIj4KICAgICAgICAgICAgICAgICAgaMOhIDMrIGRpYXMKICAgICAgICAgICAgICAgIDwvcD4KICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgKSA6IG51bGx9CiAgICAgICAgICA8L2Rpdj4KICAgICAgICA8L2Rpdj4KICAgICAgPC9zZWN0aW9uPgoKICAgICAgPGxhYmVsIGNsYXNzTmFtZT0icmVsYXRpdmUgYmxvY2sgbWluLXctMCI+CiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJzci1vbmx5Ij5CdXNjYXIgcG9yIGNsaWVudGUsIHByb2NlZGltZW50byBvdSBwcm9maXNzaW9uYWw8L3NwYW4+CgogICAgICAgIDxTZWFyY2gKICAgICAgICAgIHNpemU9ezE4fQogICAgICAgICAgY2xhc3NOYW1lPSJwb2ludGVyLWV2ZW50cy1ub25lIGFic29sdXRlIGxlZnQtNCB0b3AtMS8yIC10cmFuc2xhdGUteS0xLzIgdGV4dC1zbGF0ZS00MDAiCiAgICAgICAgLz4KCiAgICAgICAgPGlucHV0CiAgICAgICAgICB2YWx1ZT17YnVzY2F9CiAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRCdXNjYShldmVudC50YXJnZXQudmFsdWUpfQogICAgICAgICAgcGxhY2Vob2xkZXI9IkJ1c2NhciBwb3IgY2xpZW50ZSwgcHJvY2VkaW1lbnRvIG91IHByb2Zpc3Npb25hbCIKICAgICAgICAgIGNsYXNzTmFtZT0icHJlbWl1bS1pbnB1dCB3LWZ1bGwgcGwtMTEiCiAgICAgICAgLz4KICAgICAgPC9sYWJlbD4KCiAgICAgIHtwZW5kZW50ZXNGaWx0cmFkb3MubGVuZ3RoID09PSAwID8gKAogICAgICAgIDxkaXYgY2xhc3NOYW1lPSJyb3VuZGVkLTJ4bCBib3JkZXIgYm9yZGVyLWRhc2hlZCBib3JkZXItZW1lcmFsZC0yMDAgYmctZW1lcmFsZC01MC83MCBwLTggdGV4dC1jZW50ZXIgZGFyazpib3JkZXItZW1lcmFsZC00MDAvMjAgZGFyazpiZy1lbWVyYWxkLTUwMC8xMCI+CiAgICAgICAgICA8Q2hlY2tDaXJjbGUyIGNsYXNzTmFtZT0ibXgtYXV0byBzaXplLTcgdGV4dC1lbWVyYWxkLTYwMCBkYXJrOnRleHQtZW1lcmFsZC0zMDAiIC8+CiAgICAgICAgICA8cCBjbGFzc05hbWU9Im10LTMgdGV4dC1zbSBmb250LXNlbWlib2xkIHRleHQtZW1lcmFsZC05MDAgZGFyazp0ZXh0LWVtZXJhbGQtMjAwIj4KICAgICAgICAgICAge2J1c2NhCiAgICAgICAgICAgICAgPyAiTmVuaHVtIHJlc3VsdGFkbyBwYXJhIGVzc2EgYnVzY2EuIgogICAgICAgICAgICAgIDogIk5lbmh1bWEgZXZvbHXDp8OjbyBwZW5kZW50ZS4ifQogICAgICAgICAgPC9wPgogICAgICAgICAgPHAgY2xhc3NOYW1lPSJtdC0xIHRleHQteHMgdGV4dC1lbWVyYWxkLTcwMCBkYXJrOnRleHQtZW1lcmFsZC0zMDAiPgogICAgICAgICAgICB7YnVzY2EKICAgICAgICAgICAgICA/ICJUZW50ZSBidXNjYXIgcG9yIG91dHJvIG5vbWUgb3UgcHJvY2VkaW1lbnRvLiIKICAgICAgICAgICAgICA6ICJUb2RvcyBvcyBhdGVuZGltZW50b3MgZmluYWxpemFkb3MgZXN0w6NvIGNvbSBvcyByZWdpc3Ryb3MgY2zDrW5pY29zIGVtIGRpYS4ifQogICAgICAgICAgPC9wPgogICAgICAgIDwvZGl2PgogICAgICApIDogKAogICAgICAgIDxkaXYgY2xhc3NOYW1lPSJzcGFjZS15LTIuNSI+CiAgICAgICAgICB7cGVuZGVudGVzRmlsdHJhZG9zLm1hcCgoaXRlbSkgPT4gewogICAgICAgICAgICBjb25zdCBhdHJhc2FkYSA9IGVzdGFBdHJhc2FkYShpdGVtLnBlbmRlbnRlRGVzZGUpOwoKICAgICAgICAgICAgcmV0dXJuICgKICAgICAgICAgICAgICA8ZGl2CiAgICAgICAgICAgICAgICBrZXk9e2l0ZW0uaWR9CiAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2Byb3VuZGVkLTJ4bCBib3JkZXIgYmctd2hpdGUgcC00IHNoYWRvdy1zbSBkYXJrOmJnLXdoaXRlL1swLjA0XSAkewogICAgICAgICAgICAgICAgICBhdHJhc2FkYQogICAgICAgICAgICAgICAgICAgID8gImJvcmRlci1yb3NlLTIwMCBkYXJrOmJvcmRlci1yb3NlLTQwMC8yNSIKICAgICAgICAgICAgICAgICAgICA6ICJib3JkZXItYW1iZXItMjAwIGRhcms6Ym9yZGVyLWFtYmVyLTQwMC8yMCIKICAgICAgICAgICAgICAgIH1gfQogICAgICAgICAgICAgID4KICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJmbGV4IGl0ZW1zLXN0YXJ0IGp1c3RpZnktYmV0d2VlbiBnYXAtMyI+CiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJtaW4tdy0wIj4KICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9InRydW5jYXRlIGZvbnQtc2VtaWJvbGQgdGV4dC1zbGF0ZS05MDAgZGFyazp0ZXh0LXdoaXRlIj4KICAgICAgICAgICAgICAgICAgICAgIHtpdGVtLmNsaWVudGV9CiAgICAgICAgICAgICAgICAgICAgPC9wPgogICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT0ibXQtMC41IHRydW5jYXRlIHRleHQtc20gdGV4dC1zbGF0ZS01MDAgZGFyazp0ZXh0LXNsYXRlLTQwMCI+CiAgICAgICAgICAgICAgICAgICAgICB7aXRlbS5wcm9jZWRpbWVudG99IMK3IHtmb3JtYXRhckRhdGFBdGVuZGltZW50byhpdGVtLmRhdGEpfQogICAgICAgICAgICAgICAgICAgIDwvcD4KCiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9Im10LTIgZmxleCBmbGV4LXdyYXAgZ2FwLTEuNSB0ZXh0LVsxMXB4XSBmb250LXNlbWlib2xkIj4KICAgICAgICAgICAgICAgICAgICAgIDxzcGFuCiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHJvdW5kZWQtbGcgcHgtMiBweS0xICR7CiAgICAgICAgICAgICAgICAgICAgICAgICAgYXRyYXNhZGEKICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gImJnLXJvc2UtNTAgdGV4dC1yb3NlLTcwMCBkYXJrOmJnLXJvc2UtNTAwLzE1IGRhcms6dGV4dC1yb3NlLTMwMCIKICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogImJnLWFtYmVyLTUwIHRleHQtYW1iZXItNzAwIGRhcms6YmctYW1iZXItNTAwLzE1IGRhcms6dGV4dC1hbWJlci0zMDAiCiAgICAgICAgICAgICAgICAgICAgICAgIH1gfQogICAgICAgICAgICAgICAgICAgICAgPgogICAgICAgICAgICAgICAgICAgICAgICB7dGVtcG9QZW5kZW50ZShpdGVtLnBlbmRlbnRlRGVzZGUpfQogICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPgoKICAgICAgICAgICAgICAgICAgICAgIHtpdGVtLnByb2Zpc3Npb25hbCA/ICgKICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJyb3VuZGVkLWxnIGJnLXNsYXRlLTEwMCBweC0yIHB5LTEgdGV4dC1zbGF0ZS02MDAgZGFyazpiZy13aGl0ZS9bMC4wNl0gZGFyazp0ZXh0LXNsYXRlLTMwMCI+CiAgICAgICAgICAgICAgICAgICAgICAgICAge2l0ZW0ucHJvZmlzc2lvbmFsfQogICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+CiAgICAgICAgICAgICAgICAgICAgICApIDogbnVsbH0KICAgICAgICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgICAgICAgPC9kaXY+CgogICAgICAgICAgICAgICAgICA8c3BhbgogICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YGlubGluZS1mbGV4IHNocmluay0wIGl0ZW1zLWNlbnRlciBnYXAtMSByb3VuZGVkLWZ1bGwgcHgtMi41IHB5LTEgdGV4dC1bMTBweF0gZm9udC1ib2xkIHVwcGVyY2FzZSB0cmFja2luZy13aWRlICR7CiAgICAgICAgICAgICAgICAgICAgICBhdHJhc2FkYQogICAgICAgICAgICAgICAgICAgICAgICA/ICJiZy1yb3NlLTUwIHRleHQtcm9zZS03MDAgZGFyazpiZy1yb3NlLTUwMC8xNSBkYXJrOnRleHQtcm9zZS0zMDAiCiAgICAgICAgICAgICAgICAgICAgICAgIDogImJnLWFtYmVyLTUwIHRleHQtYW1iZXItNzAwIGRhcms6YmctYW1iZXItNTAwLzE1IGRhcms6dGV4dC1hbWJlci0zMDAiCiAgICAgICAgICAgICAgICAgICAgfWB9CiAgICAgICAgICAgICAgICAgID4KICAgICAgICAgICAgICAgICAgICA8QWxlcnRUcmlhbmdsZSBzaXplPXsxMn0gLz4gUGVuZGVudGUKICAgICAgICAgICAgICAgICAgPC9zcGFuPgogICAgICAgICAgICAgICAgPC9kaXY+CgogICAgICAgICAgICAgICAgPGJ1dHRvbgogICAgICAgICAgICAgICAgICB0eXBlPSJidXR0b24iCiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldFNlbGVjaW9uYWRvSWQoaXRlbS5pZCl9CiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0ibXQtMyBpbmxpbmUtZmxleCBtaW4taC0xMCB3LWZ1bGwgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0yIHJvdW5kZWQteGwgYmctYW1iZXItNjAwIHB4LTMgcHktMiB0ZXh0LXhzIGZvbnQtYm9sZCB0ZXh0LXdoaXRlIHRyYW5zaXRpb24gaG92ZXI6YmctYW1iZXItNzAwIgogICAgICAgICAgICAgICAgPgogICAgICAgICAgICAgICAgICA8QWN0aXZpdHkgY2xhc3NOYW1lPSJzaXplLTQiIC8+CiAgICAgICAgICAgICAgICAgIFJlZ2lzdHJhciBldm9sdcOnw6NvCiAgICAgICAgICAgICAgICA8L2J1dHRvbj4KICAgICAgICAgICAgICA8L2Rpdj4KICAgICAgICAgICAgKTsKICAgICAgICAgIH0pfQogICAgICAgIDwvZGl2PgogICAgICApfQoKICAgICAgPFJlZ2lzdHJhckV2b2x1Y2FvUGVuZGVudGVNb2RhbAogICAgICAgIG9wZW49e0Jvb2xlYW4oc2VsZWNpb25hZG8pfQogICAgICAgIGl0ZW09e3NlbGVjaW9uYWRvfQogICAgICAgIHRlbVByb3hpbWE9e3BlbmRlbnRlc0ZpbHRyYWRvcy5sZW5ndGggPiAxfQogICAgICAgIG9uQ2xvc2U9eygpID0+IHNldFNlbGVjaW9uYWRvSWQobnVsbCl9CiAgICAgICAgb25TYXZlZD17Y29uY2x1aXJ9CiAgICAgIC8+CiAgICA8L2Rpdj4KICApOwp9Cg==",
  "cria o componente da tela de evolucoes pendentes",
);

// ---- resultado final ----
if (erros.length > 0) {
  console.error("\nAlgumas partes NAO foram aplicadas:\n");
  erros.forEach((erro) => {
    console.error("   - " + erro.descricao);
    console.error("     arquivo: " + erro.arquivo);
    console.error("     trechos encontrados: " + erro.ocorrencias + " (esperado 1)");
  });
  console.error("\nManda esta mensagem inteira no chat que eu ajusto.\n");
  process.exit(1);
}

console.log(
  "\nPronto! " +
    aplicadas +
    " alteracao(oes) aplicada(s)" +
    (jaEstava > 0 ? ", " + jaEstava + " ja estava(m) no lugar" : "") +
    ".\n",
);
console.log("A nova tela fica em: menu > Mais > Evoluções\n");
console.log("Agora rode:  npm run build\n");
