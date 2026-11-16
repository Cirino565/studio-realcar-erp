"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Clock3, Copy, Loader2, X } from "lucide-react";

import {
  buscarHorariosLivresSemana,
  type ResultadoHorariosLivres,
} from "@/actions/agendamento.actions";
import { mensagemErroAcao } from "@/lib/erro-acao";
import {
  diaFalado,
  horaFalada,
  MAX_HORARIOS_CLIENTE,
  mensagemHorariosCliente,
  ordenarEscolhidos,
  sugerirHorarios,
  type HorarioEscolhido,
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
  { valor: "qualquer", rotulo: "Qualquer" },
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
  const [aviso, setAviso] = useState("");
  const [copiado, setCopiado] = useState(false);
  const pedido = useRef(0);

  const servico = servicosOrdenados.find((item) => String(item.id) === filtros.servicoId);
  const duracao = servico?.duracaoPadrao || 60;

  function carregar(novos: Filtros) {
    setFiltros(novos);
    setCarregando(true);
    setErro("");
    setAviso("");
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

  function alternar(item: HorarioEscolhido) {
    setCopiado(false);
    const existe = escolhidos.some((atual) => chave(atual) === chave(item));
    if (existe) {
      setAviso("");
      setEscolhidos((atual) => atual.filter((outro) => chave(outro) !== chave(item)));
      return;
    }
    if (escolhidos.length >= MAX_HORARIOS_CLIENTE) {
      setAviso(`No máximo ${MAX_HORARIOS_CLIENTE} horários para a cliente. Toque em um marcado para tirar.`);
      return;
    }
    setAviso("");
    setEscolhidos((atual) => ordenarEscolhidos([...atual, item]));
  }

  const hojeISO = resultado?.hojeISO ?? "";
  const mensagem = mensagemHorariosCliente({
    procedimento: servico?.nome,
    periodo: filtros.periodo,
    escolhidos,
    hojeISO,
  });
  const totalLivres = resultado?.dias.reduce((soma, dia) => soma + dia.horarios.length, 0) ?? 0;
  const profissionalNome = profissionais.find((item) => item.id === filtros.profissionalId)?.nome;

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

  function agendar() {
    const unico = escolhidos[0];
    if (escolhidos.length !== 1 || !unico) return;
    onAgendar({
      data: unico.data,
      hora: unico.hora,
      profissionalId: filtros.profissionalId,
      procedimento: servico?.nome,
      duracao,
    });
  }

  const unico = escolhidos.length === 1 ? escolhidos[0] : null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Clock3 size={18} className="text-violet-600" />
              Horários livres
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              A lista é só para você. Para a cliente vão no máximo {MAX_HORARIOS_CLIENTE}, em dias diferentes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X size={17} />
          </button>
        </header>

        <div className="space-y-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className={`grid gap-2 ${profissionais.length > 1 ? "sm:grid-cols-2" : ""}`}>
            <label className="block text-xs font-semibold text-slate-600">
              Procedimento
              <select
                value={filtros.servicoId}
                onChange={(e) => mudar({ servicoId: e.target.value })}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
              >
                <option value="">Não sei ainda (60 min)</option>
                {servicosOrdenados.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.nome} ({item.duracaoPadrao || 60} min)
                  </option>
                ))}
              </select>
            </label>
            {profissionais.length > 1 ? (
              <label className="block text-xs font-semibold text-slate-600">
                Profissional
                <select
                  value={String(filtros.profissionalId)}
                  onChange={(e) => mudar({ profissionalId: Number(e.target.value) })}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
                >
                  {profissionais.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Período">
            {PERIODOS.map((item) => (
              <button
                key={item.valor}
                type="button"
                onClick={() => mudar({ periodo: item.valor })}
                aria-pressed={filtros.periodo === item.valor}
                className={`h-9 rounded-lg text-sm font-semibold transition ${
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={semanaAnterior}
              disabled={historico.length === 0 || carregando}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:invisible"
            >
              <ChevronLeft size={15} /> Anterior
            </button>
            <p className="text-center text-xs text-slate-500">
              {carregando
                ? "Buscando…"
                : resultado
                  ? `${totalLivres} horário${totalLivres === 1 ? "" : "s"} livre${totalLivres === 1 ? "" : "s"}${profissionais.length > 1 && profissionalNome ? ` · ${profissionalNome}` : ""}`
                  : ""}
            </p>
            <button
              type="button"
              onClick={proximaSemana}
              disabled={!resultado || carregando}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-40"
            >
              Próxima semana <ChevronRight size={15} />
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
              {resultado.dias.map((dia) => (
                <li key={dia.data} className="rounded-xl border border-slate-200 px-3 py-2">
                  <p className="text-sm font-bold capitalize text-slate-900">{diaFalado(dia.data, hojeISO)}</p>
                  {dia.horarios.length === 0 ? (
                    <p className="mt-1 text-xs text-slate-500">Sem horário livre neste período.</p>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {dia.horarios.map((hora) => {
                        const item = { data: dia.data, hora };
                        const marcado = escolhidos.some((atual) => chave(atual) === chave(item));
                        return (
                          <button
                            key={hora}
                            type="button"
                            onClick={() => alternar(item)}
                            aria-pressed={marcado}
                            className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-sm font-semibold tabular-nums transition ${
                              marcado
                                ? "border-violet-600 bg-violet-600 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50"
                            }`}
                          >
                            {marcado ? <Check size={13} /> : null}
                            {hora}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </li>
              ))}
              {resultado.dias.length === 0 ? (
                <li className="py-6 text-center text-sm text-slate-500">Nenhum dia de atendimento neste intervalo.</li>
              ) : null}
            </ul>
          ) : null}

          {resultado && resultado.fechados.length > 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Fechado (feriado):{" "}
              {resultado.fechados.map((item) => `${diaFalado(item.data, hojeISO)} · ${item.motivo}`).join("; ")}
            </p>
          ) : null}
        </div>

        <footer className="space-y-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
          <p className="text-xs font-semibold text-slate-600">
            Para a cliente ({escolhidos.length} de {MAX_HORARIOS_CLIENTE}) · toque nos horários para trocar
          </p>
          {aviso ? <p className="text-xs font-medium text-amber-700">{aviso}</p> : null}
          <p className="max-h-28 min-h-[2.5rem] overflow-y-auto sm:max-h-44 whitespace-pre-line rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800">
            {mensagem ? (
              // Mostra como fica no WhatsApp (*texto* em negrito).
              mensagem.split(/(\*[^*\n]+\*)/).map((parte, indice) =>
                parte.startsWith("*") && parte.endsWith("*") && parte.length > 2 ? (
                  <strong key={indice}>{parte.slice(1, -1)}</strong>
                ) : (
                  <span key={indice}>{parte}</span>
                ),
              )
            ) : (
              <span className="text-slate-400">Escolha até {MAX_HORARIOS_CLIENTE} horários na lista.</span>
            )}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={copiar}
              disabled={!mensagem}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              {copiado ? <Check size={16} /> : <Copy size={16} />}
              {copiado ? "Copiado! Cole no WhatsApp" : "Copiar para o WhatsApp"}
            </button>
            <button
              type="button"
              onClick={agendar}
              disabled={!unico}
              title={unico ? "" : "Deixe só 1 horário marcado para agendar"}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-3 text-sm font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-40"
            >
              <CalendarPlus size={16} />
              {unico ? `Agendar ${diaFalado(unico.data, hojeISO).split(" (")[0]} ${horaFalada(unico.hora)}` : "Agendar (deixe 1 marcado)"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
