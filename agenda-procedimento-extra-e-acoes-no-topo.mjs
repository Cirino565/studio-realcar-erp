#!/usr/bin/env node
/**
 * agenda-procedimento-extra-e-acoes-no-topo.mjs
 * ------------------------------------------------------------------
 * O QUE ESTE SCRIPT FAZ
 *
 * 1) PROCEDIMENTO FECHADO NA FINALIZAÇÃO
 *    Quando a cliente fecha outro procedimento durante o atendimento
 *    (ex.: veio para Microagulhamento e fez Jato de Plasma na hora), a
 *    agenda passa a mostrar UM cartão só: "Microagulhamento facial +
 *    Jato de Plasma", com o valor somado, no horário do atendimento.
 *    Não aparece mais um segundo cartão ocupando o horário seguinte e
 *    ficando por cima da próxima cliente.
 *    Ao abrir o atendimento, aparece "Também feito neste atendimento",
 *    com cada procedimento extra, o valor, o total e o botão para
 *    registrar a evolução dele (se ainda estiver pendente).
 *    Vale também para o que já foi lançado (ex.: a Rosana de hoje).
 *    Nos relatórios, financeiro e evoluções NADA muda - cada procedimento
 *    continua contado separado, como deve ser.
 *
 * 2) AÇÕES NO TOPO (CELULAR)
 *    Mensagem, Agendar próximo, Editar agenda e Editar cliente ficam
 *    fixos no topo da janela do atendimento, logo abaixo do nome - não
 *    precisa mais rolar até o fim. Lá embaixo fica só o "Excluir", longe
 *    do dedo, para não apagar nada sem querer.
 *
 * Arquivos alterados (só trechos, nunca o arquivo inteiro):
 *   - app/(app)/agenda/components/AgendaClient.tsx
 *   - app/(app)/agenda/components/AppointmentDetailsModal.tsx
 *
 * É IDEMPOTENTE: rodando de novo, tudo aparece como "[pulou]".
 * Se algum trecho não for encontrado, NADA é salvo - me mande a mensagem.
 * ------------------------------------------------------------------
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const RAIZ = process.cwd();
const ARQUIVOS = {
  "cliente": "app/(app)/agenda/components/AgendaClient.tsx",
  "modal": "app/(app)/agenda/components/AppointmentDetailsModal.tsx"
};
const PATCHES = [
  {
    "arquivo": "cliente",
    "rotulo": "juntar procedimentos extras ao atendimento principal (AgendaClient.tsx)",
    "buscar": "export default function AgendaClient({",
    "substituir": "// Procedimentos fechados DURANTE a finalização (ex.: veio fazer\n// Microagulhamento e fechou um Jato de Plasma na hora) continuam sendo\n// registros próprios - é isso que garante evolução clínica e relatórios\n// separados. Mas na AGENDA eles aparecem dentro do atendimento principal,\n// sem ocupar outro horário e sem ficar por cima da próxima cliente.\nconst MARCADOR_PROCEDIMENTO_ADICIONAL = \"Fechado durante o atendimento de \";\n\nfunction diaSaoPauloAgenda(valor: string) {\n  return new Intl.DateTimeFormat(\"en-CA\", {\n    timeZone: \"America/Sao_Paulo\",\n    year: \"numeric\",\n    month: \"2-digit\",\n    day: \"2-digit\",\n  }).format(new Date(valor));\n}\n\nfunction ehProcedimentoAdicional(item: AgendamentoAgenda) {\n  return (\n    item.status === \"Atendido\" &&\n    Boolean(item.observacoes?.startsWith(MARCADOR_PROCEDIMENTO_ADICIONAL))\n  );\n}\n\nfunction agruparProcedimentosAdicionais(lista: AgendamentoAgenda[]) {\n  const adicionaisPorPrincipal = new Map<number, AgendamentoAgenda[]>();\n  const principalDoAdicional = new Map<number, number>();\n\n  const principais = lista.filter(\n    (item) => item.status === \"Atendido\" && !ehProcedimentoAdicional(item),\n  );\n\n  for (const adicional of lista) {\n    if (!ehProcedimentoAdicional(adicional)) continue;\n\n    const dia = diaSaoPauloAgenda(adicional.data);\n    const inicio = new Date(adicional.data).getTime();\n    const texto = adicional.observacoes || \"\";\n\n    const candidatos = principais.filter(\n      (principal) =>\n        principal.clienteId === adicional.clienteId &&\n        diaSaoPauloAgenda(principal.data) === dia &&\n        new Date(principal.data).getTime() <= inicio,\n    );\n\n    if (candidatos.length === 0) continue;\n\n    const pontuar = (principal: AgendamentoAgenda) =>\n      (texto.startsWith(\n        `${MARCADOR_PROCEDIMENTO_ADICIONAL}${principal.procedimento} em`,\n      )\n        ? 2\n        : 0) + (principal.profissionalId === adicional.profissionalId ? 1 : 0);\n\n    candidatos.sort(\n      (a, b) =>\n        pontuar(b) - pontuar(a) ||\n        new Date(b.data).getTime() - new Date(a.data).getTime(),\n    );\n\n    const principal = candidatos[0];\n    const doPrincipal = adicionaisPorPrincipal.get(principal.id) || [];\n    doPrincipal.push(adicional);\n    adicionaisPorPrincipal.set(principal.id, doPrincipal);\n    principalDoAdicional.set(adicional.id, principal.id);\n  }\n\n  for (const adicionais of adicionaisPorPrincipal.values()) {\n    adicionais.sort(\n      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),\n    );\n  }\n\n  const naGrade = lista\n    .filter((item) => !principalDoAdicional.has(item.id))\n    .map((item) => {\n      const adicionais = adicionaisPorPrincipal.get(item.id);\n      if (!adicionais) return item;\n\n      return {\n        ...item,\n        procedimento: [\n          item.procedimento,\n          ...adicionais.map((adicional) => adicional.procedimento),\n        ].join(\" + \"),\n        valor:\n          item.valor +\n          adicionais.reduce((total, adicional) => total + adicional.valor, 0),\n      };\n    });\n\n  return { naGrade, adicionaisPorPrincipal, principalDoAdicional };\n}\n\nexport default function AgendaClient({",
    "pularSePresente": "function agruparProcedimentosAdicionais("
  },
  {
    "arquivo": "cliente",
    "rotulo": "calcular a agenda agrupada (AgendaClient.tsx)",
    "buscar": "  const [selectedAppointment, setSelectedAppointment] =\n    useState<AgendamentoAgenda | null>(null);",
    "substituir": "  const agendaAgrupada = useMemo(\n    () => agruparProcedimentosAdicionais(agendamentosAtuais),\n    [agendamentosAtuais],\n  );\n\n  // Se o link pedir para focar um procedimento extra, foca o atendimento\n  // principal, que é o que aparece na agenda.\n  const focoNaGrade = useMemo(() => {\n    if (!initialAgendamentoId) return initialAgendamentoId;\n    const principal = agendaAgrupada.principalDoAdicional.get(\n      Number(initialAgendamentoId),\n    );\n    return principal ? String(principal) : initialAgendamentoId;\n  }, [initialAgendamentoId, agendaAgrupada]);\n\n  // O cartão da agenda mostra \"A + B\" e a soma dos valores; ao clicar,\n  // abre o atendimento principal com os dados originais dele.\n  function registroOriginal(item: AgendamentoAgenda) {\n    return agendamentosAtuais.find((atual) => atual.id === item.id) ?? item;\n  }\n\n  const [selectedAppointment, setSelectedAppointment] =\n    useState<AgendamentoAgenda | null>(null);",
    "pularSePresente": "const agendaAgrupada = useMemo("
  },
  {
    "arquivo": "cliente",
    "rotulo": "agenda mostra o atendimento agrupado (AgendaClient.tsx)",
    "buscar": "            agendamentos={agendamentosAtuais}\n            focusAgendamentoId={initialAgendamentoId}",
    "substituir": "            agendamentos={agendaAgrupada.naGrade}\n            focusAgendamentoId={focoNaGrade}",
    "pularSePresente": "agendamentos={agendaAgrupada.naGrade}"
  },
  {
    "arquivo": "cliente",
    "rotulo": "clique no cartão abre o atendimento original (AgendaClient.tsx)",
    "buscar": "            onSelectAppointment={setSelectedAppointment}",
    "substituir": "            onSelectAppointment={(item) =>\n              setSelectedAppointment(registroOriginal(item))\n            }",
    "pularSePresente": "setSelectedAppointment(registroOriginal(item))"
  },
  {
    "arquivo": "cliente",
    "rotulo": "mensagem pelo cartão usa o atendimento original (AgendaClient.tsx)",
    "buscar": "            onMessage={abrirWhatsApp}",
    "substituir": "            onMessage={(item) => abrirWhatsApp(registroOriginal(item))}",
    "pularSePresente": "abrirWhatsApp(registroOriginal(item))"
  },
  {
    "arquivo": "cliente",
    "rotulo": "enviar os procedimentos extras para a janela do atendimento (AgendaClient.tsx)",
    "buscar": "        onEvolucaoRegistrada={marcarEvolucaoConcluida}",
    "substituir": "        onEvolucaoRegistrada={marcarEvolucaoConcluida}\n        procedimentosAdicionais={\n          selectedAppointment\n            ? agendaAgrupada.adicionaisPorPrincipal.get(selectedAppointment.id) ?? []\n            : []\n        }",
    "pularSePresente": "procedimentosAdicionais={"
  },
  {
    "arquivo": "modal",
    "rotulo": "tipo de ícone (AppointmentDetailsModal.tsx)",
    "buscar": "} from \"lucide-react\";",
    "substituir": "} from \"lucide-react\";\nimport type { LucideIcon } from \"lucide-react\";",
    "pularSePresente": "import type { LucideIcon } from \"lucide-react\";"
  },
  {
    "arquivo": "modal",
    "rotulo": "novo campo: procedimentos extras (AppointmentDetailsModal.tsx)",
    "buscar": "  onEvolucaoRegistrada: (agendamentoId: number) => void;\n};",
    "substituir": "  onEvolucaoRegistrada: (agendamentoId: number) => void;\n  procedimentosAdicionais?: AppointmentDetails[];\n};",
    "pularSePresente": "procedimentosAdicionais?: AppointmentDetails[];"
  },
  {
    "arquivo": "modal",
    "rotulo": "botão de ação rápida (AppointmentDetailsModal.tsx)",
    "buscar": "export default function AppointmentDetailsModal({",
    "substituir": "// Botão das ações rápidas que ficam fixas no topo da janela - no celular\n// elas ficavam lá embaixo e era preciso rolar para achar.\nfunction AcaoRapida({\n  icon: Icone,\n  label,\n  onClick,\n  disabled,\n  destaque,\n}: {\n  icon: LucideIcon;\n  label: string;\n  onClick: () => void;\n  disabled?: boolean;\n  destaque?: boolean;\n}) {\n  return (\n    <button\n      type=\"button\"\n      onClick={onClick}\n      disabled={disabled}\n      className={`flex min-h-[3.4rem] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-1.5 text-center text-[10px] font-bold leading-tight transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${\n        destaque\n          ? \"border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100\"\n          : \"border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700\"\n      }`}\n    >\n      <Icone size={17} />\n      <span>{label}</span>\n    </button>\n  );\n}\n\nexport default function AppointmentDetailsModal({",
    "pularSePresente": "function AcaoRapida({"
  },
  {
    "arquivo": "modal",
    "rotulo": "receber os procedimentos extras (AppointmentDetailsModal.tsx)",
    "buscar": "  onEvolucaoRegistrada,\n}: Props) {",
    "substituir": "  onEvolucaoRegistrada,\n  procedimentosAdicionais = [],\n}: Props) {",
    "pularSePresente": "  procedimentosAdicionais = [],\n}: Props) {"
  },
  {
    "arquivo": "modal",
    "rotulo": "estado da evolução do procedimento extra (AppointmentDetailsModal.tsx)",
    "buscar": "  const [adiantandoEvolucao, setAdiantandoEvolucao] = useState(false);\n",
    "substituir": "  const [adiantandoEvolucao, setAdiantandoEvolucao] = useState(false);\n  const [evolucaoAdicional, setEvolucaoAdicional] =\n    useState<AppointmentDetails | null>(null);\n",
    "pularSePresente": "const [evolucaoAdicional, setEvolucaoAdicional] ="
  },
  {
    "arquivo": "modal",
    "rotulo": "limpar ao trocar de atendimento (AppointmentDetailsModal.tsx)",
    "buscar": "    setAdiantandoEvolucao(false);\n  }, [open, appointment?.id]);",
    "substituir": "    setAdiantandoEvolucao(false);\n    setEvolucaoAdicional(null);\n  }, [open, appointment?.id]);",
    "pularSePresente": "    setEvolucaoAdicional(null);\n  }, [open, appointment?.id]);"
  },
  {
    "arquivo": "modal",
    "rotulo": "ações rápidas fixas no topo (AppointmentDetailsModal.tsx)",
    "buscar": "              <X size={17} />\n            </button>\n          </div>\n        </header>",
    "substituir": "              <X size={17} />\n            </button>\n          </div>\n\n          <div className=\"mt-3 grid grid-cols-4 gap-1.5\">\n            <AcaoRapida\n              icon={MessageCircle}\n              label=\"Mensagem\"\n              destaque\n              onClick={() => onWhatsApp(currentAppointment)}\n            />\n            <AcaoRapida\n              icon={CalendarClock}\n              label=\"Agendar próximo\"\n              onClick={() => onReagendar(currentAppointment)}\n            />\n            <AcaoRapida\n              icon={Pencil}\n              label=\"Editar agenda\"\n              disabled={!podeGerenciarAgendamento || isDeleting}\n              onClick={() => onEditar(currentAppointment)}\n            />\n            <AcaoRapida\n              icon={UserRound}\n              label=\"Editar cliente\"\n              disabled={!podeEditarCliente}\n              onClick={() => setEditandoCliente(true)}\n            />\n          </div>\n        </header>",
    "pularSePresente": "label=\"Editar cliente\""
  },
  {
    "arquivo": "modal",
    "rotulo": "lista 'Também feito neste atendimento' (AppointmentDetailsModal.tsx)",
    "buscar": "            {currentAppointment.observacoes ? (",
    "substituir": "            {procedimentosAdicionais.length > 0 ? (\n              <section className=\"rounded-2xl border border-violet-200 bg-violet-50/60 p-3 shadow-sm\">\n                <p className=\"text-[10px] font-bold uppercase tracking-wide text-violet-700\">\n                  Também feito neste atendimento\n                </p>\n\n                <div className=\"mt-2 space-y-2\">\n                  {procedimentosAdicionais.map((adicional) => {\n                    const pendente = adicional.evolucaoStatus === \"PENDENTE\";\n\n                    return (\n                      <div\n                        key={adicional.id}\n                        className=\"rounded-xl border border-violet-100 bg-white p-2.5\"\n                      >\n                        <div className=\"flex items-start justify-between gap-2\">\n                          <p className=\"min-w-0 text-sm font-bold text-slate-900\">\n                            {adicional.procedimento}\n                          </p>\n                          <p className=\"shrink-0 text-xs font-bold text-violet-700\">\n                            {formatCurrency(adicional.valor)}\n                          </p>\n                        </div>\n\n                        {pendente ? (\n                          <button\n                            type=\"button\"\n                            onClick={() => setEvolucaoAdicional(adicional)}\n                            disabled={!podeRegistrarEvolucao}\n                            className=\"mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 text-xs font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500\"\n                          >\n                            <Activity size={14} />\n                            {podeRegistrarEvolucao\n                              ? \"Registrar evolução deste procedimento\"\n                              : \"Evolução pendente\"}\n                          </button>\n                        ) : (\n                          <p className=\"mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700\">\n                            <CheckCircle2 size={12} /> Evolução registrada\n                          </p>\n                        )}\n                      </div>\n                    );\n                  })}\n                </div>\n\n                <div className=\"mt-2 flex items-center justify-between border-t border-violet-100 pt-2 text-xs font-bold text-slate-700\">\n                  <span>Total do atendimento</span>\n                  <span>\n                    {formatCurrency(\n                      currentAppointment.valor +\n                        procedimentosAdicionais.reduce(\n                          (total, adicional) => total + adicional.valor,\n                          0,\n                        ),\n                    )}\n                  </span>\n                </div>\n              </section>\n            ) : null}\n\n            {currentAppointment.observacoes ? (",
    "pularSePresente": "Também feito neste atendimento"
  },
  {
    "arquivo": "modal",
    "rotulo": "embaixo fica só o Excluir (AppointmentDetailsModal.tsx)",
    "buscar": "            <section className=\"rounded-2xl border border-slate-200 bg-white p-3 shadow-sm\">\n              <p className=\"text-[10px] font-bold uppercase tracking-wide text-slate-400\">Ações complementares</p>\n              <div className=\"mt-2 grid grid-cols-2 gap-2\">\n                <Button type=\"button\" variant=\"outline\" onClick={() => onWhatsApp(currentAppointment)} className=\"h-10 rounded-xl border-emerald-200 text-xs text-emerald-700 hover:bg-emerald-50\">\n                  <MessageCircle size={15} /> Mensagem\n                </Button>\n                <Button type=\"button\" variant=\"outline\" onClick={() => onReagendar(currentAppointment)} className=\"h-10 rounded-xl border-slate-200 text-xs text-slate-700 hover:bg-slate-50\" title=\"Agenda o próximo atendimento desta cliente, com os dados dela já preenchidos\">\n                  <CalendarClock size={15} /> Agendar próximo\n                </Button>\n                <Button type=\"button\" variant=\"outline\" onClick={() => onEditar(currentAppointment)} disabled={!podeGerenciarAgendamento || isDeleting} className=\"h-10 rounded-xl border-slate-200 text-xs text-slate-700 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50\">\n                  <Pencil size={15} /> Editar agenda\n                </Button>\n                <Button type=\"button\" variant=\"outline\" onClick={handleExcluir} disabled={!podeGerenciarAgendamento || isDeleting} className=\"h-10 rounded-xl border-rose-200 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50\">\n                  <Trash2 size={15} /> {isDeleting ? \"Excluindo\" : \"Excluir\"}\n                </Button>\n              </div>\n\n              {currentAppointment.serieId && podeGerenciarAgendamento ? (\n                <div className=\"mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3\">\n                  <div className=\"flex items-center gap-2 text-xs font-bold text-violet-800\"><Repeat2 size={14} />Série recorrente</div>\n                  <div className=\"mt-2 grid grid-cols-2 gap-2\">\n                    <button type=\"button\" onClick={() => handleCancelarSerie(\"seguintes\")} disabled={isManagingSeries} className=\"h-9 rounded-lg border border-violet-200 bg-white px-2 text-[10px] font-bold text-violet-700 disabled:opacity-50\">Cancelar próximos</button>\n                    <button type=\"button\" onClick={() => handleCancelarSerie(\"toda\")} disabled={isManagingSeries} className=\"h-9 rounded-lg border border-rose-200 bg-white px-2 text-[10px] font-bold text-rose-700 disabled:opacity-50\">Cancelar série</button>\n                  </div>\n                </div>\n              ) : null}\n            </section>\n",
    "substituir": "            {podeGerenciarAgendamento ? (\n            <section className=\"rounded-2xl border border-slate-200 bg-white p-3 shadow-sm\">\n              <p className=\"text-[10px] font-bold uppercase tracking-wide text-slate-400\">Outras ações</p>\n              {/* Mensagem, Agendar próximo e Editar ficam fixos no topo.\n                  Aqui embaixo fica só o que apaga, para não ser tocado sem querer. */}\n              <div className=\"mt-2\">\n                <Button type=\"button\" variant=\"outline\" onClick={handleExcluir} disabled={isDeleting} className=\"h-10 w-full rounded-xl border-rose-200 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50\">\n                  <Trash2 size={15} /> {isDeleting ? \"Excluindo\" : \"Excluir agendamento\"}\n                </Button>\n              </div>\n\n              {currentAppointment.serieId && podeGerenciarAgendamento ? (\n                <div className=\"mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3\">\n                  <div className=\"flex items-center gap-2 text-xs font-bold text-violet-800\"><Repeat2 size={14} />Série recorrente</div>\n                  <div className=\"mt-2 grid grid-cols-2 gap-2\">\n                    <button type=\"button\" onClick={() => handleCancelarSerie(\"seguintes\")} disabled={isManagingSeries} className=\"h-9 rounded-lg border border-violet-200 bg-white px-2 text-[10px] font-bold text-violet-700 disabled:opacity-50\">Cancelar próximos</button>\n                    <button type=\"button\" onClick={() => handleCancelarSerie(\"toda\")} disabled={isManagingSeries} className=\"h-9 rounded-lg border border-rose-200 bg-white px-2 text-[10px] font-bold text-rose-700 disabled:opacity-50\">Cancelar série</button>\n                  </div>\n                </div>\n              ) : null}\n            </section>\n            ) : null}\n",
    "pularSePresente": "Outras ações"
  },
  {
    "arquivo": "modal",
    "rotulo": "janela de evolução do procedimento extra (AppointmentDetailsModal.tsx)",
    "buscar": "        onClose={() => setAdiantandoEvolucao(false)}\n        onSaved={(agendamentoId) => {\n          setAdiantandoEvolucao(false);\n          onEvolucaoRegistrada(agendamentoId);\n        }}\n      />",
    "substituir": "        onClose={() => setAdiantandoEvolucao(false)}\n        onSaved={(agendamentoId) => {\n          setAdiantandoEvolucao(false);\n          onEvolucaoRegistrada(agendamentoId);\n        }}\n      />\n\n      {evolucaoAdicional ? (\n        <RegistrarEvolucaoPendenteModal\n          open\n          item={{\n            id: evolucaoAdicional.id,\n            clienteId: evolucaoAdicional.clienteId,\n            cliente: evolucaoAdicional.cliente.nome,\n            procedimento: evolucaoAdicional.procedimento,\n            profissional: evolucaoAdicional.profissional?.nome || null,\n            data: evolucaoAdicional.data,\n            pendenteDesde:\n              evolucaoAdicional.evolucaoPendenteDesde ||\n              evolucaoAdicional.updatedAt ||\n              evolucaoAdicional.data,\n          }}\n          onClose={() => setEvolucaoAdicional(null)}\n          onSaved={(agendamentoId) => {\n            setEvolucaoAdicional(null);\n            onEvolucaoRegistrada(agendamentoId);\n          }}\n        />\n      ) : null}",
    "pularSePresente": "{evolucaoAdicional ? ("
  }
];

console.log("Aplicando: procedimento extra junto do atendimento + ações no topo...\n");

const original = {};
const usaCRLF = {};
const conteudos = {};
const caminhos = {};
let faltou = false;

for (const [chave, relativo] of Object.entries(ARQUIVOS)) {
  const caminho = join(RAIZ, ...relativo.split("/"));
  caminhos[chave] = caminho;
  if (!existsSync(caminho)) {
    console.log(`[erro] Não encontrei o arquivo: ${relativo}`);
    faltou = true;
    continue;
  }
  const bruto = readFileSync(caminho, "utf-8");
  original[chave] = bruto;
  usaCRLF[chave] = bruto.includes("\r\n");
  conteudos[chave] = bruto.replace(/\r\n/g, "\n");
}

if (faltou) {
  console.log("\nNada foi salvo. Confira se está rodando na pasta principal do projeto.");
  process.exit(1);
}

let erro = false;

for (const p of PATCHES) {
  const atual = conteudos[p.arquivo];
  if (atual.includes(p.pularSePresente)) {
    console.log(`[pulou] ${p.rotulo}`);
    continue;
  }
  const vezes = atual.split(p.buscar).length - 1;
  if (vezes !== 1) {
    console.log(`[erro] ${p.rotulo} - não encontrei o trecho esperado (${vezes} ocorrência(s), esperado 1).`);
    erro = true;
    continue;
  }
  conteudos[p.arquivo] = atual.replace(p.buscar, () => p.substituir);
  console.log(`[ok] ${p.rotulo}`);
}

if (erro) {
  console.log("\nAlgum trecho não foi encontrado - NADA foi salvo. Manda esta mensagem inteira no chat que eu ajusto.");
  process.exit(1);
}

for (const chave of Object.keys(ARQUIVOS)) {
  const final = usaCRLF[chave] ? conteudos[chave].replace(/\n/g, "\r\n") : conteudos[chave];
  if (final !== original[chave]) writeFileSync(caminhos[chave], final, "utf-8");
}

console.log("\nConcluído.");
