#!/usr/bin/env node
/*
 * HORARIOS LIVRES E ENCAIXE NA PROXIMA SESSAO DO PACOTE - Studio Realcar
 *
 * IMPORTANTE: rode antes o "agendar-dentro-do-pacote.mjs".
 *
 * No bloco "Agendar a proxima sessao" do cartao do pacote:
 *  - a Hora agora e uma lista so com os horarios LIVRES do dia escolhido,
 *    pela mesma regra da agenda (clinica aberta, sem choque com outro
 *    atendimento ou bloqueio, respeitando o intervalo entre atendimentos);
 *  - dia fechado ou lotado mostra o aviso "Sem horario livre neste dia";
 *  - caixa "Permitir encaixe sem intervalo": libera os horarios colados em
 *    outro atendimento (marcados como "encaixe"). Sobreposicao real continua
 *    bloqueada, igual a agenda;
 *  - se escolher o dia e esquecer a hora, avisa antes de salvar.
 *
 * Nao mexe no banco de dados. Pode rodar mais de uma vez; se algum trecho
 * nao for encontrado, NADA e gravado.
 *
 * Uso: node horarios-livres-no-pacote.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"components/pacotes/PacotesNaAgenda.tsx","obrigatorio":true,"patches":[{"nome":"horarios livres no pacote (1/8)","antes":"import { useState, useTransition } from \"react\";","depois":"import { useRef, useState, useTransition } from \"react\";"},{"nome":"horarios livres no pacote (2/8)","antes":"import { criarAgendamento } from \"@/actions/agendamento.actions\";","depois":"import {\n  buscarDisponibilidadeAgenda,\n  criarAgendamento,\n} from \"@/actions/agendamento.actions\";"},{"nome":"horarios livres no pacote (3/8)","antes":"  const [diaProxima, setDiaProxima] = useState(\"\");\n  const [horaProxima, setHoraProxima] = useState(() =>\n    agendamentoBase ? horaDoAgendamento(agendamentoBase.data) : \"\",\n  );","depois":"  const [diaProxima, setDiaProxima] = useState(\"\");\n  const [horaProxima, setHoraProxima] = useState(\"\");\n  const [encaixe, setEncaixe] = useState(false);\n  const [horarios, setHorarios] = useState<\n    { hora: string; disponivel: boolean; encaixe?: boolean }[]\n  >([]);\n  const [carregandoHorarios, setCarregandoHorarios] = useState(false);\n  const buscaAtual = useRef(0);"},{"nome":"horarios livres no pacote (4/8)","antes":"  function escolherProcedimento(id: string) {\n    setProcedimentoId(id);","depois":"  // Mesma regra da agenda: so aparecem os horarios livres do dia (clinica\n  // aberta, sem conflito e respeitando o intervalo entre atendimentos). Com\n  // \"encaixe\" ligado, o intervalo padrao deixa de valer.\n  async function carregarHorarios(opcoes: {\n    dia: string;\n    encaixe: boolean;\n    procedimentoId: string;\n  }) {\n    const busca = ++buscaAtual.current;\n    setHoraProxima(\"\");\n    setHorarios([]);\n\n    if (!agendamentoBase || !opcoes.dia || !agendamentoBase.profissionalId) {\n      return;\n    }\n\n    const escolhido = procedimentos.find(\n      (item) => String(item.id) === opcoes.procedimentoId,\n    );\n\n    setCarregandoHorarios(true);\n\n    try {\n      const lista = await buscarDisponibilidadeAgenda({\n        profissionalId: agendamentoBase.profissionalId,\n        data: opcoes.dia,\n        duracao: escolhido?.duracaoPadrao || agendamentoBase.duracao || 60,\n        permitirEncaixeSemIntervalo: opcoes.encaixe,\n      });\n\n      if (busca !== buscaAtual.current) return;\n\n      setHorarios(lista);\n\n      // Sugere o mesmo horario do atendimento de hoje, se estiver livre.\n      const mesmaHora = horaDoAgendamento(agendamentoBase.data);\n      if (lista.some((item) => item.disponivel && item.hora === mesmaHora)) {\n        setHoraProxima(mesmaHora);\n      }\n    } catch {\n      if (busca === buscaAtual.current) setHorarios([]);\n    } finally {\n      if (busca === buscaAtual.current) setCarregandoHorarios(false);\n    }\n  }\n\n  function escolherDia(dia: string) {\n    setDiaProxima(dia);\n    void carregarHorarios({ dia, encaixe, procedimentoId });\n  }\n\n  function escolherProcedimento(id: string) {\n    setProcedimentoId(id);\n    if (diaProxima) {\n      void carregarHorarios({ dia: diaProxima, encaixe, procedimentoId: id });\n    }"},{"nome":"horarios livres no pacote (5/8)","antes":"              observacoes: `Sessão do ${resultado.descricao}.`,\n              sinalPago: false,\n              naturezaAtendimento: \"RETORNO\",\n              agendamentoOrigemId: agendamentoBase.id,\n            });","depois":"              observacoes: `Sessão do ${resultado.descricao}.`,\n              sinalPago: false,\n              naturezaAtendimento: \"RETORNO\",\n              agendamentoOrigemId: agendamentoBase.id,\n              permitirEncaixeSemIntervalo: encaixe,\n            });"},{"nome":"horarios livres no pacote (6/8)","antes":"onClick={() => setDiaProxima(dataEmDias(dias))}","depois":"onClick={() => escolherDia(dataEmDias(dias))}"},{"nome":"horarios livres no pacote (7/8)","antes":"                onChange={(event) => setDiaProxima(event.target.value)}\n                className={campo}\n              />\n            </label>\n            <label className=\"block\">\n              <span className={rotulo}>Hora</span>\n              <input\n                type=\"time\"\n                value={horaProxima}\n                onChange={(event) => setHoraProxima(event.target.value)}\n                className={campo}\n              />\n            </label>\n          </div>","depois":"                onChange={(event) => escolherDia(event.target.value)}\n                className={campo}\n              />\n            </label>\n            <label className=\"block\">\n              <span className={rotulo}>Hora</span>\n              <select\n                value={horaProxima}\n                onChange={(event) => setHoraProxima(event.target.value)}\n                disabled={!diaProxima || carregandoHorarios}\n                className={campo}\n              >\n                <option value=\"\">\n                  {!diaProxima\n                    ? \"Escolha o dia\"\n                    : carregandoHorarios\n                      ? \"Carregando...\"\n                      : horarios.some((item) => item.disponivel)\n                        ? \"Selecione\"\n                        : \"Sem horário livre\"}\n                </option>\n                {horarios\n                  .filter((item) => item.disponivel)\n                  .map((item) => (\n                    <option key={item.hora} value={item.hora}>\n                      {item.hora}\n                      {item.encaixe ? \" · encaixe\" : \"\"}\n                    </option>\n                  ))}\n              </select>\n            </label>\n          </div>\n          {diaProxima &&\n          !carregandoHorarios &&\n          !horarios.some((item) => item.disponivel) ? (\n            <p className=\"mt-2 text-[11px] font-semibold text-rose-700 dark:text-rose-300\">\n              Sem horário livre neste dia (clínica fechada ou agenda cheia).\n              Escolha outro dia\n              {encaixe ? \".\" : \" ou ligue o encaixe abaixo.\"}\n            </p>\n          ) : null}\n          <label className=\"mt-2 flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-amber-300/70 bg-amber-50/70 p-2.5 dark:border-amber-400/20 dark:bg-amber-400/10\">\n            <span className=\"min-w-0\">\n              <span className=\"block text-xs font-bold text-amber-950 dark:text-amber-100\">\n                Permitir encaixe sem intervalo\n              </span>\n              <span className=\"mt-0.5 block text-[11px] leading-4 text-amber-900 dark:text-amber-100\">\n                Libera horários que ficam colados em outro atendimento. Dois\n                atendimentos ao mesmo tempo continuam bloqueados.\n              </span>\n            </span>\n            <input\n              type=\"checkbox\"\n              checked={encaixe}\n              onChange={(event) => {\n                setEncaixe(event.target.checked);\n                if (diaProxima) {\n                  void carregarHorarios({\n                    dia: diaProxima,\n                    encaixe: event.target.checked,\n                    procedimentoId,\n                  });\n                }\n              }}\n              className=\"mt-0.5 size-5 shrink-0 accent-amber-600\"\n            />\n          </label>"},{"nome":"horarios livres no pacote (8/8)","antes":"    if (pendente) return;\n    setErro(\"\");\n    setErroAgenda(\"\");\n","depois":"    if (pendente) return;\n    setErro(\"\");\n    setErroAgenda(\"\");\n\n    if (agendamentoBase && diaProxima && !horaProxima) {\n      setErro(\n        \"Escolha o horário da próxima sessão (ou apague o dia para salvar só o pacote).\",\n      );\n      return;\n    }\n"}]}]};
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
