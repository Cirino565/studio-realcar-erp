"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Loader2,
  Star,
  X,
} from "lucide-react";

import {
  buscarHorariosLivresSemana,
  type ResultadoHorariosLivres,
} from "@/actions/agendamento.actions";
import { mensagemErroAcao } from "@/lib/erro-acao";
import {
  diaFalado,
  horaFalada,
  mensagemHorariosCliente,
  minutosDaHora,
  ordenarEscolhidos,
  sugerirHorarios,
  type DiaHorariosLivres,
  type HorarioEscolhido,
  type OcupadoDoDia,
  type PeriodoHorario,
} from "@/lib/horarios-livres";

type Servico = { id: number; nome: string; duracaoPadrao: number };
type Profissional = { id: number; nome: string };

export type HorarioLivreParaAgendar = {
  data: string;
  hora: string;
  profissionalId: number;
  procedimento?: string;
  duracao: number;
};

type Props = {
  servicos: Servico[];
  profissionais: Profissional[];
  profissionalInicialId?: number;
  onClose: () => void;
  onAgendar: (horario: HorarioLivreParaAgendar) => void;
};

const PERIODOS: { valor: PeriodoHorario; rotulo: string }[] = [
  { valor: "manha", rotulo: "Manhã" },
  { valor: "tarde", rotulo: "Tarde" },
  { valor: "qualquer", rotulo: "Dia todo" },
];

type Filtros = {
  servicoId: string;
  profissionalId: number;
  periodo: PeriodoHorario;
  inicio?: string;
};

function chave(item: HorarioEscolhido) {
  return `${item.data} ${item.hora}`;
}

/** Linhas do dia em ordem: quem esta marcado e, entre eles, os livres. */
type LinhaDia =
  | { tipo: "ocupado"; item: OcupadoDoDia }
  | { tipo: "livres"; horarios: string[] };

function linhasDoDia(dia: DiaHorariosLivres): LinhaDia[] {
  const ocupados = dia.ocupados ?? [];
  const linhas: LinhaDia[] = [];
  let resto = [...dia.horarios];
  for (const item of ocupados) {
    const antes = resto.filter((hora) => minutosDaHora(hora) < minutosDaHora(item.inicio));
    if (antes.length > 0) linhas.push({ tipo: "livres", horarios: antes });
    resto = resto.filter((hora) => minutosDaHora(hora) >= minutosDaHora(item.inicio));
    linhas.push({ tipo: "ocupado", item });
  }
  if (resto.length > 0) linhas.push({ tipo: "livres", horarios: resto });
  return linhas;
}

export default function HorariosLivresModal({
  servicos,
  profissionais,
  profissionalInicialId,
  onClose,
  onAgendar,
}: Props) {
  const servicosOrdenados = useMemo(
    () => [...servicos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [servicos],
  );

  const [filtros, setFiltros] = useState<Filtros>(() => ({
    servicoId: "",
    profissionalId:
      profissionais.find((item) => item.id === profissionalInicialId)?.id ??
      profissionais[0]?.id ??
      0,
    periodo: "qualquer",
  }));
  const [resultado, setResultado] = useState<ResultadoHorariosLivres | null>(null);
  const [historico, setHistorico] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [escolhidos, setEscolhidos] = useState<HorarioEscolhido[]>([]);
  const [copiado, setCopiado] = useState(false);
  const [verMensagem, setVerMensagem] = useState(false);
  const pedido = useRef(0);

  const servico = servicosOrdenados.find((item) => String(item.id) === filtros.servicoId);
  const duracao = servico?.duracaoPadrao || 60;

  function carregar(novos: Filtros) {
    setFiltros(novos);
    setCarregando(true);
    setErro("");
    setCopiado(false);
    void buscar(novos, ++pedido.current);
  }

  // So muda a tela depois da resposta (e ignora respostas antigas).
  async function buscar(novos: Filtros, numero: number) {
    try {
      const servicoNovo = servicosOrdenados.find((item) => String(item.id) === novos.servicoId);
      const dados = await buscarHorariosLivresSemana({
        profissionalId: novos.profissionalId,
        duracao: servicoNovo?.duracaoPadrao || 60,
        periodo: novos.periodo,
        inicio: novos.inicio,
      });
      if (numero !== pedido.current) return;
      setResultado(dados);
      setEscolhidos(sugerirHorarios(dados.dias, novos.periodo));
    } catch (e) {
      if (numero !== pedido.current) return;
      setErro(mensagemErroAcao(e, "Não foi possível buscar os horários."));
    } finally {
      if (numero === pedido.current) setCarregando(false);
    }
  }

  // Busca so quando a janela abre (e quando muda um filtro).
  useEffect(() => {
    void buscar(filtros, ++pedido.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function mudar(parcial: Partial<Filtros>) {
    setHistorico([]);
    carregar({ ...filtros, ...parcial, inicio: undefined });
  }

  function proximaSemana() {
    if (!resultado) return;
    setHistorico((atual) => [...atual, resultado.inicio]);
    carregar({ ...filtros, inicio: resultado.proximoInicio });
  }

  function semanaAnterior() {
    const anterior = historico[historico.length - 1];
    if (!anterior) return;
    setHistorico((atual) => atual.slice(0, -1));
    carregar({ ...filtros, inicio: anterior });
  }

  // Sem limite fixo: marca quantos quiser mandar.
  function alternar(item: HorarioEscolhido) {
    setCopiado(false);
    setEscolhidos((atual) =>
      atual.some((outro) => chave(outro) === chave(item))
        ? atual.filter((outro) => chave(outro) !== chave(item))
        : ordenarEscolhidos([...atual, item]),
    );
  }

  const hojeISO = resultado?.hojeISO ?? "";
  const mensagem = mensagemHorariosCliente({
    procedimento: servico?.nome,
    periodo: filtros.periodo,
    escolhidos,
    hojeISO,
  });

  async function copiar() {
    if (!mensagem) return;
    try {
      await navigator.clipboard.writeText(mensagem);
    } catch {
      const campo = document.createElement("textarea");
      campo.value = mensagem;
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      campo.remove();
    }
    setCopiado(true);
  }

  const unico = escolhidos.length === 1 ? escolhidos[0] : null;

  function agendar() {
    if (!unico) return;
    onAgendar({
      data: unico.data,
      hora: unico.hora,
      profissionalId: filtros.profissionalId,
      procedimento: servico?.nome,
      duracao,
    });
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-stretch justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4">
      {/* No celular ocupa a tela toda; no computador, janela. */}
      <div className="flex h-[100dvh] w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-3xl">
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 sm:px-5 sm:py-3">
          <p className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Clock3 size={18} className="text-violet-600" />
            Horários livres
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X size={17} />
          </button>
        </header>

        <div className="space-y-2 border-b border-slate-100 px-3 py-2 sm:px-5 sm:py-3">
          <div className={`grid gap-2 ${profissionais.length > 1 ? "grid-cols-2" : ""}`}>
            <select
              value={filtros.servicoId}
              onChange={(e) => mudar({ servicoId: e.target.value })}
              aria-label="Procedimento"
              className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-sm font-medium text-slate-900"
            >
              <option value="">Procedimento? (60 min)</option>
              {servicosOrdenados.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.nome} ({item.duracaoPadrao || 60} min)
                </option>
              ))}
            </select>
            {profissionais.length > 1 ? (
              <select
                value={String(filtros.profissionalId)}
                onChange={(e) => mudar({ profissionalId: Number(e.target.value) })}
                aria-label="Profissional"
                className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-sm font-medium text-slate-900"
              >
                {profissionais.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.nome}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Período">
            {PERIODOS.map((item) => (
              <button
                key={item.valor}
                type="button"
                onClick={() => mudar({ periodo: item.valor })}
                aria-pressed={filtros.periodo === item.valor}
                className={`h-8 rounded-lg text-sm font-semibold transition ${
                  filtros.periodo === item.valor
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 sm:px-5 sm:py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={semanaAnterior}
              disabled={historico.length === 0 || carregando}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:invisible"
            >
              <ChevronLeft size={15} /> Anterior
            </button>
            <p className="flex items-center gap-1 text-[11px] text-slate-500">
              <Star size={12} className="fill-amber-400 text-amber-400" /> encosta em outro horário
            </p>
            <button
              type="button"
              onClick={proximaSemana}
              disabled={!resultado || carregando}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-40"
            >
              Próxima <ChevronRight size={15} />
            </button>
          </div>

          {erro ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{erro}</p>
          ) : carregando && !resultado ? (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Buscando horários…
            </p>
          ) : resultado ? (
            <ul className={`space-y-2 transition-opacity ${carregando ? "opacity-50" : ""}`}>
              {resultado.dias.map((dia) => {
                const linhas = linhasDoDia(dia);
                const colados = new Set(dia.colados ?? []);
                return (
                  <li key={dia.data} className="rounded-xl border border-slate-200 px-2.5 py-2">
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-bold capitalize text-slate-900">{diaFalado(dia.data, hojeISO)}</span>
                      <span className="text-[11px] text-slate-500">
                        {(dia.ocupados ?? []).filter((item) => item.tipo === "agendamento").length} marcado(s)
                      </span>
                    </p>
                    {linhas.length === 0 ? (
                      <p className="mt-1 text-xs text-slate-500">Sem horário livre neste período.</p>
                    ) : (
                      <div className="mt-1.5 space-y-1.5">
                        {linhas.map((linha, indice) =>
                          linha.tipo === "ocupado" ? (
                            <div
                              key={`o-${indice}`}
                              className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs ${
                                linha.item.tipo === "bloqueio"
                                  ? "bg-slate-100 text-slate-500"
                                  : "bg-violet-50 text-violet-900"
                              }`}
                            >
                              <span className="shrink-0 font-bold tabular-nums">
                                {linha.item.inicio}–{linha.item.fim}
                              </span>
                              <span className="min-w-0 truncate">
                                <strong className="font-semibold">{linha.item.titulo}</strong>
                                {linha.item.detalhe ? ` · ${linha.item.detalhe}` : ""}
                              </span>
                            </div>
                          ) : (
                            <div key={`l-${indice}`} className="flex flex-wrap gap-1.5">
                              {linha.horarios.map((hora) => {
                                const item = { data: dia.data, hora };
                                const marcado = escolhidos.some((atual) => chave(atual) === chave(item));
                                const colado = colados.has(hora);
                                return (
                                  <button
                                    key={hora}
                                    type="button"
                                    onClick={() => alternar(item)}
                                    aria-pressed={marcado}
                                    title={colado ? "Encosta em outro horário: agenda sem buraco" : undefined}
                                    className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-sm font-semibold tabular-nums transition ${
                                      marcado
                                        ? "border-violet-600 bg-violet-600 text-white"
                                        : colado
                                          ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                                          : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50"
                                    }`}
                                  >
                                    {marcado ? <Check size={13} /> : colado ? <Star size={12} className="fill-amber-400 text-amber-400" /> : null}
                                    {hora}
                                  </button>
                                );
                              })}
                            </div>
                          ),
                        )}
                        {dia.horarios.length === 0 ? (
                          <p className="text-xs text-slate-500">Sem horário livre neste período.</p>
                        ) : null}
                      </div>
                    )}
                  </li>
                );
              })}
              {resultado.dias.length === 0 ? (
                <li className="py-6 text-center text-sm text-slate-500">Nenhum dia de atendimento neste intervalo.</li>
              ) : null}
              {resultado.fechados.length > 0 ? (
                <li className="text-xs text-slate-500">
                  Fechado (feriado):{" "}
                  {resultado.fechados.map((item) => `${diaFalado(item.data, hojeISO)} · ${item.motivo}`).join("; ")}
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        <footer className="space-y-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-3">
          <button
            type="button"
            onClick={() => setVerMensagem((atual) => !atual)}
            className="flex w-full items-center justify-between gap-2 text-left text-xs font-semibold text-slate-600"
            aria-expanded={verMensagem}
          >
            <span>
              Para a cliente: {escolhidos.length} horário{escolhidos.length === 1 ? "" : "s"}
              <span className="font-normal text-slate-500"> · toque nos horários para trocar</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-0.5 text-violet-700">
              {verMensagem ? "Esconder" : "Ver mensagem"}
              <ChevronDown size={14} className={`transition ${verMensagem ? "rotate-180" : ""}`} />
            </span>
          </button>
          {verMensagem ? (
            <p className="max-h-40 overflow-y-auto whitespace-pre-line rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800">
              {mensagem ? (
                mensagem.split(/(\*[^*\n]+\*)/).map((parte, indice) =>
                  parte.startsWith("*") && parte.endsWith("*") && parte.length > 2 ? (
                    <strong key={indice}>{parte.slice(1, -1)}</strong>
                  ) : (
                    <span key={indice}>{parte}</span>
                  ),
                )
              ) : (
                <span className="text-slate-400">Escolha os horários na lista.</span>
              )}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copiar}
              disabled={!mensagem}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              {copiado ? <Check size={16} /> : <Copy size={16} />}
              {copiado ? "Copiado!" : "Copiar mensagem"}
            </button>
            <button
              type="button"
              onClick={agendar}
              disabled={!unico}
              title={unico ? "" : "Deixe só 1 horário marcado para agendar"}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-white px-2 text-sm font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-40"
            >
              <CalendarPlus size={16} />
              {unico ? `Agendar ${horaFalada(unico.hora)}` : "Agendar"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
