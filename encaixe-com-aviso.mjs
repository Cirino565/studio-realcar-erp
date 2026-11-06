#!/usr/bin/env node
/*
 * ENCAIXE SEM INTERVALO SEM PRECISAR MARCAR - Studio Realcar
 *
 * A opcao "Permitir encaixe sem intervalo de 30 min" saiu: horarios colados
 * em outro atendimento aparecem na lista como "encaixe" e podem ser salvos
 * direto. Um aviso amarelo mostra que ficou sem intervalo e com quem
 * (ex.: "Intervalo de 30 min apos Oscar"). Dois atendimentos ao mesmo tempo
 * continuam bloqueados. Vale na agenda, no agendar pelo lead e no pacote.
 *
 * Nao muda o banco. Pode rodar mais de uma vez; se algum trecho nao for
 * encontrado, NADA e gravado.
 *
 * Uso: node encaixe-com-aviso.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DATA = {"novosArquivos":{},"arquivos":[{"arquivo":"app/(app)/agenda/components/NovoAgendamentoModal.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  const [permitirEncaixeSemIntervalo, setPermitirEncaixeSemIntervalo] =\n    useState(false);\n\n  const quantidadeOpcoesAvancadasAtivas =\n    Number(excecaoHorario) +\n    Number(\n      tipoAtendimento === \"agendamento\" &&\n        intervaloEntreAtendimentos > 0 &&\n        permitirEncaixeSemIntervalo,\n    );","depois":"  // Encaixe sem o intervalo padrao fica sempre liberado: o horario aparece\n  // como \"encaixe\" e um aviso amarelo mostra que ficou sem intervalo.\n  // Dois atendimentos ao mesmo tempo continuam bloqueados.\n  const permitirEncaixeSemIntervalo = true;\n\n  const quantidadeOpcoesAvancadasAtivas = Number(excecaoHorario);"},{"nome":"ajuste 2","antes":"    setExcecaoHorario(false);\n    setPermitirEncaixeSemIntervalo(false);\n","depois":"    setExcecaoHorario(false);\n","modo":"remover"},{"nome":"ajuste 3","antes":"              {tipoAtendimento === \"agendamento\" &&\n              intervaloEntreAtendimentos > 0 ? (\n                <label className=\"flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm dark:border-amber-400/20 dark:bg-amber-400/10\">\n                  <span className=\"min-w-0\">\n                    <span className=\"block font-bold text-amber-950 dark:text-amber-100\">\n                      Permitir encaixe sem intervalo de{\" \"}\n                      {intervaloEntreAtendimentos} min\n                    </span>\n                    <span className=\"mt-0.5 block text-xs leading-5 text-amber-800/80 dark:text-amber-100/70\">\n                      O padrão reserva {intervaloEntreAtendimentos} minutos entre\n                      compromissos. Ative somente para um encaixe excepcional.\n                      Sobreposição real continua bloqueada.\n                    </span>\n                  </span>\n\n                  <input\n                    type=\"checkbox\"\n                    checked={permitirEncaixeSemIntervalo}\n                    onChange={(event) => {\n                      setPermitirEncaixeSemIntervalo(event.target.checked);\n                      setHora(\"\");\n                      setErro(\"\");\n                      setErroAcaoHorario(false);\n                    }}\n                    className=\"mt-0.5 size-5 shrink-0 accent-amber-600\"\n                  />\n                </label>\n              ) : null}\n","depois":"","modo":"remover"},{"nome":"ajuste 4","antes":"              Encaixe selecionado: este horário não terá o intervalo padrão de{\" \"}\n              {intervaloEntreAtendimentos} minutos entre compromissos.","depois":"              Encaixe: este horário fica sem o intervalo de{\" \"}\n              {intervaloEntreAtendimentos} minutos\n              {horarioSelecionadoNaDisponibilidade.motivo\n                ? ` (${horarioSelecionadoNaDisponibilidade.motivo})`\n                : \"\"}\n              . Pode salvar normalmente."}]},{"arquivo":"app/(app)/marketing/components/MarketingClient.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  const [permitirEncaixeSemIntervalo, setPermitirEncaixeSemIntervalo] =\n    useState(false);\n  const [horarios, setHorarios] = useState<","depois":"  // Encaixe sem intervalo sempre liberado (aparece marcado como \"encaixe\").\n  const permitirEncaixeSemIntervalo = true;\n  const [horarios, setHorarios] = useState<"},{"nome":"ajuste 2","antes":"        <label className=\"flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 transition hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-400/10 dark:hover:bg-amber-400/15\">\n          <span className=\"min-w-0\">\n            <span className=\"block text-sm font-bold text-amber-950 dark:text-amber-100\">\n              Permitir encaixe sem intervalo de 30 min\n            </span>\n            <span className=\"mt-0.5 block text-xs leading-5 text-amber-800 dark:text-amber-100/70\">\n              Por padrão, a agenda reserva 30 minutos entre clientes. Ative apenas quando quiser atender um cliente logo após o outro. Sobreposição real continua bloqueada.\n            </span>\n          </span>\n          <input\n            type=\"checkbox\"\n            checked={permitirEncaixeSemIntervalo}\n            onChange={(event) => {\n              setPermitirEncaixeSemIntervalo(event.target.checked);\n              setHora(\"\");\n              setErro(null);\n            }}\n            className=\"mt-0.5 size-5 shrink-0 accent-amber-600\"\n          />\n        </label>\n\n","depois":"","modo":"remover"},{"nome":"ajuste 3","antes":"          {permitirEncaixeSemIntervalo ? \" Encaixes sem o intervalo padrão de 30 minutos estão liberados para esta marcação.\" : \"\"}\n","depois":"","modo":"remover"},{"nome":"ajuste 4","antes":"              {horarios.find((item) => item.hora === hora)?.encaixe\n                ? \" · encaixe sem intervalo\"\n                : \"\"}","depois":"              {horarios.find((item) => item.hora === hora)?.encaixe\n                ? \" · encaixe: fica sem o intervalo de 30 min (pode salvar)\"\n                : \"\"}"},{"nome":"ajuste 5","antes":"    setSinalPago(false);\n    setPermitirEncaixeSemIntervalo(false);\n    setErro(null);\n  }, [lead, profissionais, avaliacao]);","depois":"    setSinalPago(false);\n    setErro(null);\n  }, [lead, profissionais, avaliacao]);"}]},{"arquivo":"components/pacotes/PacotesNaAgenda.tsx","obrigatorio":true,"patches":[{"nome":"ajuste 1","antes":"  const [encaixe, setEncaixe] = useState(false);","depois":"  // Encaixe sem intervalo sempre liberado (aparece marcado como \"encaixe\").\n  const encaixe = true;"},{"nome":"ajuste 2","antes":"              Escolha outro dia\n              {encaixe ? \".\" : \" ou ligue o encaixe abaixo.\"}","depois":"              Escolha outro dia."},{"nome":"ajuste 3","antes":"          <label className=\"mt-2 flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-amber-300/70 bg-amber-50/70 p-2.5 dark:border-amber-400/20 dark:bg-amber-400/10\">\n            <span className=\"min-w-0\">\n              <span className=\"block text-xs font-bold text-amber-950 dark:text-amber-100\">\n                Permitir encaixe sem intervalo\n              </span>\n              <span className=\"mt-0.5 block text-[11px] leading-4 text-amber-900 dark:text-amber-100\">\n                Libera horários que ficam colados em outro atendimento. Dois\n                atendimentos ao mesmo tempo continuam bloqueados.\n              </span>\n            </span>\n            <input\n              type=\"checkbox\"\n              checked={encaixe}\n              onChange={(event) => {\n                setEncaixe(event.target.checked);\n                if (diaProxima) {\n                  void carregarHorarios({\n                    dia: diaProxima,\n                    encaixe: event.target.checked,\n                    procedimentoId,\n                  });\n                }\n              }}\n              className=\"mt-0.5 size-5 shrink-0 accent-amber-600\"\n            />\n          </label>\n","depois":"          {horarios.find((item) => item.hora === horaProxima)?.encaixe ? (\n            <p className=\"mt-2 text-[11px] font-semibold text-amber-900 dark:text-amber-100\">\n              Encaixe: este horário fica sem o intervalo de 30 min. Pode salvar normalmente.\n            </p>\n          ) : null}\n"}]}]};
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
