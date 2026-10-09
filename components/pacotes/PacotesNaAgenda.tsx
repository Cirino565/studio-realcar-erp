"use client";

import { useRef, useState, useTransition } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  LoaderCircle,
  PackagePlus,
  Wallet,
} from "lucide-react";

import {
  buscarDisponibilidadeAgenda,
  criarAgendamento,
} from "@/actions/agendamento.actions";
import {
  fecharPacoteNaAgenda,
  receberRestantePacoteNaAgenda,
  type PacoteSalvoNaAgenda,
} from "@/actions/pacote-agenda.actions";
import { formatarMoeda } from "@/lib/format";

export type FormaPagamentoPacote = { id: number; nome: string };

export type ProcedimentoPacote = {
  id: number;
  nome: string;
  valorPadrao: number;
  duracaoPadrao?: number;
};

// Atendimento de onde o pacote esta sendo fechado. Com ele o cartao consegue
// marcar a proxima sessao ali mesmo (mesma profissional, mesmo horario).
export type AgendamentoBasePacote = {
  id: number;
  profissionalId: number | null;
  data: string;
  duracao: number;
};

const FUSO = "America/Sao_Paulo";

function horaDoAgendamento(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: FUSO,
  }).format(new Date(data));
}

function dataEmDias(dias: number) {
  const alvo = new Date(Date.now() + dias * 86_400_000);
  return alvo.toLocaleDateString("en-CA", { timeZone: FUSO });
}

function dataBonita(dia: string) {
  const [ano, mes, diaMes] = dia.split("-");
  return `${diaMes}/${mes}/${ano}`;
}

export type PacoteComSaldo = {
  id: number;
  descricao: string;
  valorTotal: number;
  valorPago: number;
};

function paraNumero(texto: string) {
  const limpo = texto.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : 0;
}

function valorParaCampo(valor: number) {
  return Number(valor) > 0
    ? Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";
}

function formaInicial(formas: FormaPagamentoPacote[]) {
  const pix = formas.find((forma) => forma.nome.trim().toLowerCase() === "pix");
  return String((pix || formas[0])?.id || "");
}

function mensagemDoErro(erro: unknown) {
  if (erro instanceof Error && erro.message.trim()) {
    const texto = erro.message.trim();
    if (
      !texto.includes("An error occurred in the Server Components render") &&
      !texto.includes("A digest property is included")
    ) {
      return texto;
    }
  }
  return "Não foi possível salvar agora. Nada foi duplicado. Confira a conexão e tente de novo.";
}

const campo =
  "mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white";
const rotulo =
  "block text-xs font-bold text-slate-700 dark:text-slate-200";

/**
 * "Fechou pacote?" - aparece depois que o atendimento e finalizado.
 * Cria o pacote e ja lanca o sinal no Financeiro, sem precisar abrir a ficha.
 */
export function FecharPacoteCard({
  clienteId,
  formasPagamento,
  procedimentos = [],
  onPacoteRegistrado,
  onAgendar,
  agendamentoBase,
}: {
  clienteId: number;
  formasPagamento: FormaPagamentoPacote[];
  procedimentos?: ProcedimentoPacote[];
  // Avisa a tela de cima qual procedimento foi fechado, para o botao
  // "Agendar retorno" ja abrir com ele preenchido.
  onPacoteRegistrado?: (dados: {
    procedimentoId: number | null;
    descricao: string;
  }) => void;
  // Mostra o botao "Agendar retorno agora" no cartao de pacote registrado.
  onAgendar?: () => void;
  // Quando informado, aparece "Agendar a proxima sessao" dentro do cartao.
  agendamentoBase?: AgendamentoBasePacote;
}) {
  const [aberto, setAberto] = useState(false);
  const [procedimentoId, setProcedimentoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [valorSinal, setValorSinal] = useState("");
  const [formaId, setFormaId] = useState(() => formaInicial(formasPagamento));
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState<PacoteSalvoNaAgenda | null>(null);
  const [diaProxima, setDiaProxima] = useState("");
  const [horaProxima, setHoraProxima] = useState("");
  const [encaixe, setEncaixe] = useState(false);
  const [horarios, setHorarios] = useState<
    { hora: string; disponivel: boolean; encaixe?: boolean }[]
  >([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const buscaAtual = useRef(0);
  const [agendadoPara, setAgendadoPara] = useState<{
    dia: string;
    hora: string;
  } | null>(null);
  const [erroAgenda, setErroAgenda] = useState("");
  const [pendente, iniciar] = useTransition();

  // Mesma regra da agenda: so aparecem os horarios livres do dia (clinica
  // aberta, sem conflito e respeitando o intervalo entre atendimentos). Com
  // "encaixe" ligado, o intervalo padrao deixa de valer.
  async function carregarHorarios(opcoes: {
    dia: string;
    encaixe: boolean;
    procedimentoId: string;
  }) {
    const busca = ++buscaAtual.current;
    setHoraProxima("");
    setHorarios([]);

    if (!agendamentoBase || !opcoes.dia || !agendamentoBase.profissionalId) {
      return;
    }

    const escolhido = procedimentos.find(
      (item) => String(item.id) === opcoes.procedimentoId,
    );

    setCarregandoHorarios(true);

    try {
      const lista = await buscarDisponibilidadeAgenda({
        profissionalId: agendamentoBase.profissionalId,
        data: opcoes.dia,
        duracao: escolhido?.duracaoPadrao || agendamentoBase.duracao || 60,
        permitirEncaixeSemIntervalo: opcoes.encaixe,
      });

      if (busca !== buscaAtual.current) return;

      setHorarios(lista);

      // Sugere o mesmo horario do atendimento de hoje, se estiver livre.
      const mesmaHora = horaDoAgendamento(agendamentoBase.data);
      if (lista.some((item) => item.disponivel && item.hora === mesmaHora)) {
        setHoraProxima(mesmaHora);
      }
    } catch {
      if (busca === buscaAtual.current) setHorarios([]);
    } finally {
      if (busca === buscaAtual.current) setCarregandoHorarios(false);
    }
  }

  function escolherDia(dia: string) {
    setDiaProxima(dia);
    void carregarHorarios({ dia, encaixe, procedimentoId });
  }

  function escolherProcedimento(id: string) {
    setProcedimentoId(id);
    if (diaProxima) {
      void carregarHorarios({ dia: diaProxima, encaixe, procedimentoId: id });
    }
    const escolhido = procedimentos.find((item) => String(item.id) === id);

    if (!escolhido) {
      setDescricao("");
      setValorTotal("");
      return;
    }

    setDescricao("Pacote " + escolhido.nome);
    setValorTotal(valorParaCampo(escolhido.valorPadrao));
  }

  function salvar() {
    if (pendente) return;
    setErro("");
    setErroAgenda("");

    if (agendamentoBase && diaProxima && !horaProxima) {
      setErro(
        "Escolha o horário da próxima sessão (ou apague o dia para salvar só o pacote).",
      );
      return;
    }

    iniciar(async () => {
      try {
        const resultado = await fecharPacoteNaAgenda({
          clienteId,
          descricao,
          valorTotal: paraNumero(valorTotal),
          valorSinal: paraNumero(valorSinal),
          formaPagamentoConfigId: formaId ? Number(formaId) : null,
        });
        setSalvo(resultado);
        onPacoteRegistrado?.({
          procedimentoId: procedimentoId ? Number(procedimentoId) : null,
          descricao: resultado.descricao,
        });

        // Se escolheu dia e hora, ja marca a proxima sessao (retorno).
        if (agendamentoBase && diaProxima && horaProxima) {
          try {
            const escolhido = procedimentos.find(
              (item) => String(item.id) === procedimentoId,
            );
            const agendamento = await criarAgendamento({
              clienteId,
              profissionalId: agendamentoBase.profissionalId || undefined,
              procedimento: escolhido?.nome || resultado.descricao,
              data: `${diaProxima}T${horaProxima}:00`,
              duracao:
                escolhido?.duracaoPadrao || agendamentoBase.duracao || 60,
              valor: 0,
              status: "Agendado",
              observacoes: `Sessão do ${resultado.descricao}.`,
              sinalPago: false,
              naturezaAtendimento: "RETORNO",
              agendamentoOrigemId: agendamentoBase.id,
              permitirEncaixeSemIntervalo: encaixe,
            });

            if (agendamento.ok) {
              setAgendadoPara({ dia: diaProxima, hora: horaProxima });
            } else {
              setErroAgenda(agendamento.mensagem);
            }
          } catch {
            setErroAgenda(
              "Não foi possível marcar o horário agora. Use o botão abaixo para escolher outro.",
            );
          }
        }
      } catch (error) {
        setErro(mensagemDoErro(error));
      }
    });
  }

  if (salvo) {
    const falta = Math.max(0, salvo.valorTotal - salvo.valorPago);

    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-400/30 dark:bg-emerald-500/10">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-200 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-200">
            <CheckCircle2 className="size-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
              Pacote registrado
            </p>
            <p className="mt-0.5 break-words text-sm font-bold text-emerald-950 dark:text-emerald-50">
              {salvo.descricao}
            </p>
            <p className="mt-1 text-xs leading-5 text-emerald-900 dark:text-emerald-100">
              Pago {formatarMoeda(salvo.valorPago)} de{" "}
              {formatarMoeda(salvo.valorTotal)}.{" "}
              {falta > 0 ? (
                <strong className="font-extrabold">
                  Falta cobrar {formatarMoeda(falta)}
                </strong>
              ) : (
                <strong className="font-extrabold">Pacote quitado</strong>
              )}
              . O aviso aparece sempre que a cliente for atendida.
            </p>
            {procedimentoId && !agendadoPara ? (
              <p className="mt-1 text-xs font-bold text-emerald-950 dark:text-emerald-50">
                Toque em &quot;Agendar retorno&quot;: o procedimento já vai
                preenchido.
              </p>
            ) : null}
            {agendadoPara ? (
              <p className="mt-2 rounded-xl bg-emerald-200 px-3 py-2 text-xs font-bold text-emerald-950 dark:bg-emerald-400/20 dark:text-emerald-100">
                Próxima sessão marcada para {dataBonita(agendadoPara.dia)} às{" "}
                {agendadoPara.hora}.
              </p>
            ) : null}
            {erroAgenda ? (
              <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                O pacote foi salvo, mas a sessão não foi marcada: {erroAgenda}
              </p>
            ) : null}
            {onAgendar && !agendadoPara ? (
              <button
                type="button"
                onClick={onAgendar}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-xs font-bold text-emerald-950 ring-1 ring-emerald-600/30 dark:bg-emerald-500/25 dark:text-emerald-100"
              >
                <CalendarPlus className="size-4" />
                Agendar retorno agora
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-left transition hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
          <PackagePlus className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-amber-950 dark:text-amber-50">
            Fechou pacote com a cliente?
          </span>
          <span className="mt-0.5 block text-xs text-amber-900 dark:text-amber-100">
            Registre o pacote e o sinal aqui mesmo.
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-400/30 dark:bg-amber-500/10">
      <div className="flex items-center gap-2">
        <PackagePlus className="size-4 text-amber-800 dark:text-amber-200" />
        <p className="text-sm font-bold text-amber-950 dark:text-amber-50">
          Registrar pacote
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {procedimentos.length > 0 ? (
          <label className="block sm:col-span-2">
            <span className={rotulo}>Procedimento do pacote</span>
            <select
              value={procedimentoId}
              onChange={(event) => escolherProcedimento(event.target.value)}
              className={campo}
            >
              <option value="">Escolha na lista (ou digite abaixo)</option>
              {procedimentos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                  {item.valorPadrao > 0
                    ? " - " + formatarMoeda(item.valorPadrao)
                    : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block sm:col-span-2">
          <span className={rotulo}>Nome do pacote</span>
          <input
            type="text"
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            placeholder="Ex.: Pacote Criolipólise"
            className={campo}
          />
        </label>

        <label className="block">
          <span className={rotulo}>Valor total (R$)</span>
          <input
            type="text"
            inputMode="decimal"
            value={valorTotal}
            onChange={(event) => setValorTotal(event.target.value)}
            placeholder="Digite o valor total aqui"
            className={campo}
          />
        </label>

        <label className="block">
          <span className={rotulo}>Sinal pago agora (R$)</span>
          <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Se não pagou sinal, deixe em branco.
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={valorSinal}
            onChange={(event) => setValorSinal(event.target.value)}
            placeholder="Digite o valor do sinal aqui"
            className={campo}
          />
        </label>

        {paraNumero(valorSinal) > 0 && formasPagamento.length > 0 ? (
          <label className="block sm:col-span-2">
            <span className={rotulo}>Forma de pagamento do sinal</span>
            <select
              value={formaId}
              onChange={(event) => setFormaId(event.target.value)}
              className={campo}
            >
              {formasPagamento.map((forma) => (
                <option key={forma.id} value={forma.id}>
                  {forma.nome}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {agendamentoBase ? (
        <div className="mt-3 rounded-xl border border-amber-300/70 bg-white/60 p-3 dark:border-amber-400/20 dark:bg-white/[0.04]">
          <p className="text-xs font-bold text-amber-950 dark:text-amber-50">
            Agendar a próxima sessão (opcional)
          </p>
          <p className="mt-0.5 text-[11px] text-amber-900 dark:text-amber-100">
            Escolha o dia e a hora e a sessão já fica marcada ao salvar.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[7, 15, 30].map((dias) => (
              <button
                key={dias}
                type="button"
                onClick={() => escolherDia(dataEmDias(dias))}
                className="rounded-full border border-amber-400 bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-950 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-100"
              >
                Daqui a {dias} dias
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="block">
              <span className={rotulo}>Dia</span>
              <input
                type="date"
                value={diaProxima}
                min={dataEmDias(0)}
                onChange={(event) => escolherDia(event.target.value)}
                className={campo}
              />
            </label>
            <label className="block">
              <span className={rotulo}>Hora</span>
              <select
                value={horaProxima}
                onChange={(event) => setHoraProxima(event.target.value)}
                disabled={!diaProxima || carregandoHorarios}
                className={campo}
              >
                <option value="">
                  {!diaProxima
                    ? "Escolha o dia"
                    : carregandoHorarios
                      ? "Carregando..."
                      : horarios.some((item) => item.disponivel)
                        ? "Selecione"
                        : "Sem horário livre"}
                </option>
                {horarios
                  .filter((item) => item.disponivel)
                  .map((item) => (
                    <option key={item.hora} value={item.hora}>
                      {item.hora}
                      {item.encaixe ? " · encaixe" : ""}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          {diaProxima &&
          !carregandoHorarios &&
          !horarios.some((item) => item.disponivel) ? (
            <p className="mt-2 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
              Sem horário livre neste dia (clínica fechada ou agenda cheia).
              Escolha outro dia
              {encaixe ? "." : " ou ligue o encaixe abaixo."}
            </p>
          ) : null}
          <label className="mt-2 flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-amber-300/70 bg-amber-50/70 p-2.5 dark:border-amber-400/20 dark:bg-amber-400/10">
            <span className="min-w-0">
              <span className="block text-xs font-bold text-amber-950 dark:text-amber-100">
                Permitir encaixe sem intervalo
              </span>
              <span className="mt-0.5 block text-[11px] leading-4 text-amber-900 dark:text-amber-100">
                Libera horários que ficam colados em outro atendimento. Dois
                atendimentos ao mesmo tempo continuam bloqueados.
              </span>
            </span>
            <input
              type="checkbox"
              checked={encaixe}
              onChange={(event) => {
                setEncaixe(event.target.checked);
                if (diaProxima) {
                  void carregarHorarios({
                    dia: diaProxima,
                    encaixe: event.target.checked,
                    procedimentoId,
                  });
                }
              }}
              className="mt-0.5 size-5 shrink-0 accent-amber-600"
            />
          </label>
        </div>
      ) : null}

      {paraNumero(valorTotal) > 0 ? (
        <p className="mt-2 text-xs font-semibold text-amber-900 dark:text-amber-100">
          Vai ficar faltando{" "}
          {formatarMoeda(
            Math.max(0, paraNumero(valorTotal) - paraNumero(valorSinal)),
          )}
          .
        </p>
      ) : null}

      {erro ? (
        <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          {erro}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setAberto(false)}
          disabled={pendente}
          className="h-10 rounded-xl border border-amber-300 bg-white px-4 text-xs font-bold text-amber-900 disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={salvar}
          disabled={pendente}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-bold text-amber-950 ring-1 ring-amber-500/40 disabled:opacity-70 dark:bg-amber-500/25 dark:text-amber-100"
        >
          {pendente ? (
            <>
              <LoaderCircle className="size-4 animate-spin" /> Salvando...
            </>
          ) : (
            "Salvar pacote"
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * "Receber o restante do pacote" - para o retorno (ou qualquer atendimento
 * da cliente que ainda tem saldo no pacote). Recebe, lanca no Financeiro e
 * quita o pacote, sem sair da tela.
 */
export function ReceberRestantePacoteCard({
  pacotes,
  formasPagamento,
}: {
  pacotes: PacoteComSaldo[];
  formasPagamento: FormaPagamentoPacote[];
}) {
  const [formaId, setFormaId] = useState(() => formaInicial(formasPagamento));
  const [recebidos, setRecebidos] = useState<
    Record<number, PacoteSalvoNaAgenda>
  >({});
  const [erro, setErro] = useState("");
  const [pagandoId, setPagandoId] = useState<number | null>(null);
  const [pendente, iniciar] = useTransition();

  // Pacotes ainda com saldo, mais os que acabaram de ser recebidos aqui (a
  // pagina atualiza em segundo plano e tira o pacote quitado da lista, mas a
  // confirmacao precisa continuar na tela).
  const pendentes = pacotes.filter(
    (pacote) =>
      !recebidos[pacote.id] && pacote.valorTotal - pacote.valorPago > 0.004,
  );
  const jaRecebidos = Object.values(recebidos);

  if (pendentes.length === 0 && jaRecebidos.length === 0) return null;

  function receber(pacote: PacoteComSaldo) {
    if (pendente) return;
    setErro("");
    setPagandoId(pacote.id);

    iniciar(async () => {
      try {
        const resultado = await receberRestantePacoteNaAgenda({
          pacoteId: pacote.id,
          formaPagamentoConfigId: formaId ? Number(formaId) : null,
        });
        setRecebidos((atuais) => ({ ...atuais, [pacote.id]: resultado }));
      } catch (error) {
        setErro(mensagemDoErro(error));
      } finally {
        setPagandoId(null);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-400/30 dark:bg-amber-500/10">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
          <Wallet className="size-[18px]" />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            Receber o restante do pacote
          </p>

          {jaRecebidos.map((recebido) => (
            <div key={`ok-${recebido.pacoteId}`}>
              <p className="break-words text-sm font-bold text-amber-950 dark:text-amber-50">
                {recebido.descricao}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="size-4 shrink-0" />
                {recebido.quitado
                  ? "Recebido. Pacote quitado."
                  : `Recebido. Ainda falta ${formatarMoeda(
                      Math.max(0, recebido.valorTotal - recebido.valorPago),
                    )}.`}
              </p>
            </div>
          ))}

          {pendentes.length > 0 && formasPagamento.length > 0 ? (
            <label className="block">
              <span className={rotulo}>Forma de pagamento</span>
              <select
                value={formaId}
                onChange={(event) => setFormaId(event.target.value)}
                disabled={pendente}
                className={campo}
              >
                {formasPagamento.map((forma) => (
                  <option key={forma.id} value={forma.id}>
                    {forma.nome}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {pendentes.map((pacote) => {
            const falta = Math.max(0, pacote.valorTotal - pacote.valorPago);

            return (
              <div key={pacote.id}>
                <p className="break-words text-sm font-bold text-amber-950 dark:text-amber-50">
                  {pacote.descricao}
                </p>
                <p className="mt-0.5 text-xs text-amber-900 dark:text-amber-100">
                  Pago {formatarMoeda(pacote.valorPago)} de{" "}
                  {formatarMoeda(pacote.valorTotal)}.
                </p>

                <button
                  type="button"
                  onClick={() => receber(pacote)}
                  disabled={pendente || !formaId}
                  className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-bold text-amber-950 ring-1 ring-amber-500/40 transition hover:bg-amber-400 disabled:opacity-70 dark:bg-amber-500/25 dark:text-amber-100 dark:hover:bg-amber-500/40"
                >
                  {pendente && pagandoId === pacote.id ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />{" "}
                      Recebendo...
                    </>
                  ) : (
                    `Receber ${formatarMoeda(falta)}`
                  )}
                </button>
              </div>
            );
          })}


          {erro ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {erro}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
