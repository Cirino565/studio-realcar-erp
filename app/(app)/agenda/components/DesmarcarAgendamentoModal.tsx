"use client";

import { useMemo, useState } from "react";
import { CalendarX2, Clock3, Loader2, X } from "lucide-react";

import { desmarcarAgendamento, type DecisaoSinal } from "@/actions/remarcacao.actions";

type Props = {
  open: boolean;
  agendamento: {
    id: number;
    data: string;
    procedimento: string;
    clienteNome: string;
    valorSinal: number;
    sinalPago: boolean;
    retorno: boolean;
  } | null;
  onClose: () => void;
  onConcluido: () => void;
};

const HORAS_REGRA = 12;

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataHora(valor: string) {
  return new Date(valor).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function Opcao({
  ativo,
  titulo,
  detalhe,
  onClick,
}: {
  ativo: boolean;
  titulo: string;
  detalhe?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition ${
        ativo
          ? "border-violet-500 bg-violet-50 font-semibold text-violet-900 ring-1 ring-violet-500"
          : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/50"
      }`}
    >
      <span className="block">{titulo}</span>
      {detalhe ? <span className="mt-0.5 block text-xs font-normal text-slate-500">{detalhe}</span> : null}
    </button>
  );
}

export default function DesmarcarAgendamentoModal({ open, agendamento, onClose, onConcluido }: Props) {
  if (!open || !agendamento) return null;
  return <Conteudo key={agendamento.id} agendamento={agendamento} onClose={onClose} onConcluido={onConcluido} />;
}

function Conteudo({
  agendamento,
  onClose,
  onConcluido,
}: {
  agendamento: NonNullable<Props["agendamento"]>;
  onClose: () => void;
  onConcluido: () => void;
}) {
  // Calculado uma vez, quando a janela abre.
  const [horas] = useState(() => (new Date(agendamento.data).getTime() - Date.now()) / 3_600_000);
  const jaPassou = horas <= 0;
  const emCimaDaHora = !jaPassou && horas < HORAS_REGRA;
  const temSinal = agendamento.sinalPago && agendamento.valorSinal > 0 && !agendamento.retorno;

  const [tipo, setTipo] = useState<"CANCELOU" | "FALTOU">(jaPassou ? "FALTOU" : "CANCELOU");
  const [vaiRemarcar, setVaiRemarcar] = useState<boolean | null>(null);
  const [sinal, setSinal] = useState<DecisaoSinal | null>(null);
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Sugestao pela regra das 12h (a pessoa pode trocar).
  const sugestaoSinal: DecisaoSinal | null = useMemo(() => {
    if (!temSinal || vaiRemarcar === null) return null;
    if (tipo === "FALTOU" || emCimaDaHora || jaPassou) return "RETER";
    return vaiRemarcar ? "GUARDAR" : null;
  }, [temSinal, vaiRemarcar, tipo, emCimaDaHora, jaPassou]);

  const sinalEscolhido = sinal ?? sugestaoSinal;
  const sinalValido = !temSinal || (sinalEscolhido !== null && !(sinalEscolhido === "GUARDAR" && !vaiRemarcar));
  const podeConfirmar = vaiRemarcar !== null && sinalValido && !salvando;

  const textoHoras = jaPassou
    ? "O horário já passou."
    : horas < 1
      ? "Falta menos de 1 hora para o horário."
      : `Faltam ${Math.floor(horas)} horas para o horário.`;

  async function confirmar() {
    if (!podeConfirmar || vaiRemarcar === null) return;
    setErro("");
    setSalvando(true);
    try {
      await desmarcarAgendamento({
        agendamentoId: agendamento.id,
        tipo,
        vaiRemarcar,
        sinal: temSinal ? sinalEscolhido : null,
        observacao,
      });
      onConcluido();
    } catch (e) {
      setSalvando(false);
      setErro(e instanceof Error && e.message ? e.message : "Não foi possível desmarcar. Tente de novo.");
    }
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-base font-bold text-slate-900">
              <CalendarX2 size={18} className="text-amber-600" />
              Cliente desmarcou
            </p>
            <p className="mt-0.5 truncate text-sm text-slate-600">
              {agendamento.clienteNome} · {agendamento.procedimento}
            </p>
            <p className="text-xs text-slate-500">{dataHora(agendamento.data)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            aria-label="Fechar"
            className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X size={17} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          <p
            className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
              jaPassou || emCimaDaHora ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"
            }`}
          >
            <Clock3 size={16} className="mt-0.5 shrink-0" />
            <span>
              {textoHoras}{" "}
              {jaPassou ? "" : emCimaDaHora ? "Menos de 12h: em cima da hora." : "Mais de 12h de antecedência."}
            </span>
          </p>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">O que aconteceu?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Opcao ativo={tipo === "CANCELOU"} titulo="Avisou que não vem" detalhe="Fica como Cancelado" onClick={() => setTipo("CANCELOU")} />
              <Opcao ativo={tipo === "FALTOU"} titulo="Não veio e não avisou" detalhe="Fica como Faltou" onClick={() => setTipo("FALTOU")} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ela vai remarcar?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Opcao
                ativo={vaiRemarcar === true}
                titulo="Sim, ainda sem data"
                detalhe="Vai para a lista Para remarcar"
                onClick={() => {
                  setVaiRemarcar(true);
                  setSinal(null);
                }}
              />
              <Opcao
                ativo={vaiRemarcar === false}
                titulo="Não vai remarcar"
                onClick={() => {
                  setVaiRemarcar(false);
                  setSinal(null);
                }}
              />
            </div>
            <p className="text-xs text-slate-500">
              Se ela já passou a nova data, feche aqui e use &quot;Editar agenda&quot; para mudar a data: o sinal vai junto.
            </p>
          </div>

          {temSinal && vaiRemarcar !== null ? (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Sinal de {moeda(agendamento.valorSinal)}
              </p>
              <div className="grid gap-2">
                {vaiRemarcar ? (
                  <Opcao
                    ativo={sinalEscolhido === "GUARDAR"}
                    titulo="Guardar para a nova data"
                    detalhe="Vai junto quando ela remarcar e é descontado na hora de cobrar"
                    onClick={() => setSinal("GUARDAR")}
                  />
                ) : null}
                <Opcao
                  ativo={sinalEscolhido === "RETER"}
                  titulo="Ficar com o sinal"
                  detalhe="Desmarcou em cima da hora ou faltou: o valor continua como entrada"
                  onClick={() => setSinal("RETER")}
                />
                <Opcao
                  ativo={sinalEscolhido === "DEVOLVER"}
                  titulo="Devolver o sinal"
                  detalhe="Sai do Financeiro (lançamento cancelado)"
                  onClick={() => setSinal("DEVOLVER")}
                />
              </div>
              {sugestaoSinal && sinal === null ? (
                <p className="text-xs text-slate-500">
                  Sugestão pela regra das 12h. Pode trocar se combinou diferente com a cliente.
                </p>
              ) : null}
            </div>
          ) : null}

          <label className="block space-y-1">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Observação (opcional)</span>
            <input
              value={observacao}
              onChange={(evento) => setObservacao(evento.target.value)}
              placeholder="Ex.: viagem, vai mandar a data na semana que vem"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400"
            />
          </label>

          {erro ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{erro}</p> : null}
        </div>

        <footer className="flex gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={!podeConfirmar}
            className="inline-flex h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-amber-600 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {salvando ? <Loader2 size={16} className="animate-spin" /> : <CalendarX2 size={16} />}
            Confirmar e liberar o horário
          </button>
        </footer>
      </div>
    </div>
  );
}
