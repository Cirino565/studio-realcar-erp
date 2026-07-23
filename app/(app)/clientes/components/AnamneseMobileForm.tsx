"use client";

import {
  useMemo,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSignature,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";

import {
  criarNovaRevisaoAnamnese,
  salvarRespostasAnamneseRapida,
} from "@/actions/anamnese-config.actions";
import { Button } from "@/components/ui/button";
import { formatarData } from "@/lib/format";
import type {
  ClienteAnamneseData,
  ClienteAnamneseModeloData,
  ClienteAnamnesePerguntaModelo,
  ClienteAnamneseRespostaData,
} from "../types";

type Props = {
  clienteId: number;
  clienteNome: string;
  procedimento: string;
  modelo: ClienteAnamneseModeloData | null;
  fichaAtual: ClienteAnamneseData | null;
  historico: ClienteAnamneseData[];
  respostas: ClienteAnamneseRespostaData[];
};

type Etapa = {
  titulo: string;
  perguntas: ClienteAnamnesePerguntaModelo[];
};

function normalizarRespostas(valor: string | null | undefined) {
  return (valor ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function AssinaturaCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const desenhando = useRef(false);
  const [assinatura, setAssinatura] = useState("");

  function contexto() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    return ctx;
  }

  function ponto(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
      y: ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
    };
  }

  function iniciar(event: ReactPointerEvent<HTMLCanvasElement>) {
    const ctx = contexto();
    if (!ctx) return;
    const { x, y } = ponto(event);
    desenhando.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function mover(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = contexto();
    if (!ctx) return;
    const { x, y } = ponto(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function finalizar(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    desenhando.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setAssinatura(canvas.toDataURL("image/png"));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function limpar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setAssinatura("");
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="assinaturaCliente" value={assinatura} />
      <div className="overflow-hidden rounded-3xl border-2 border-dashed border-slate-300 bg-white shadow-inner dark:border-slate-500">
        <canvas
          ref={canvasRef}
          width={900}
          height={280}
          onPointerDown={iniciar}
          onPointerMove={mover}
          onPointerUp={finalizar}
          onPointerCancel={finalizar}
          className="h-48 w-full touch-none bg-white sm:h-56"
          aria-label="Área para assinatura do cliente"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          Assine com o dedo dentro do quadro.
        </p>
        <button
          type="button"
          onClick={limpar}
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200"
        >
          <RotateCcw size={16} /> Limpar
        </button>
      </div>
    </div>
  );
}

function RespostaMobile({
  pergunta,
  index,
  anterior,
}: {
  pergunta: ClienteAnamnesePerguntaModelo;
  index: number;
  anterior?: ClienteAnamneseRespostaData;
}) {
  const [simNao, setSimNao] = useState(
    anterior?.resposta === "Sim" ? "Sim" : anterior?.resposta === "Não" ? "Não" : "",
  );
  const [unica, setUnica] = useState(anterior?.resposta ?? "");
  const [multiplas, setMultiplas] = useState(() => normalizarRespostas(anterior?.resposta));
  const opcoes = useMemo(
    () =>
      pergunta.opcoes
        ?.split("\n")
        .map((item) => item.trim())
        .filter(Boolean) ?? [],
    [pergunta.opcoes],
  );

  if (pergunta.tipo === "SIM_NAO") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {["Não", "Sim"].map((opcao) => {
            const ativo = simNao === opcao;
            return (
              <label
                key={opcao}
                className={`flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 px-4 text-base font-bold transition ${
                  ativo
                    ? "border-violet-500 bg-violet-50 text-violet-800 dark:border-violet-400 dark:bg-violet-500/15 dark:text-violet-100"
                    : "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name={`resposta_${index}`}
                  value={opcao}
                  checked={ativo}
                  onChange={() => setSimNao(opcao)}
                  className="sr-only"
                />
                {ativo ? <CheckCircle2 size={19} /> : null}
                {opcao}
              </label>
            );
          })}
        </div>
        {simNao === "Sim" ? (
          <textarea
            name={`observacao_${index}`}
            rows={3}
            defaultValue={anterior?.observacao ?? ""}
            className="premium-input min-h-24 w-full py-3 text-base"
            placeholder="Detalhe aqui, se necessário"
          />
        ) : null}
      </div>
    );
  }

  if (pergunta.tipo === "MULTIPLA_ESCOLHA") {
    return (
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {opcoes.map((opcao) => {
            const ativo = unica === opcao;
            return (
              <label
                key={opcao}
                className={`flex min-h-13 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition ${
                  ativo
                    ? "border-violet-500 bg-violet-50 text-violet-800 dark:border-violet-400 dark:bg-violet-500/15 dark:text-violet-100"
                    : "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name={`resposta_${index}`}
                  value={opcao}
                  checked={ativo}
                  onChange={() => setUnica(opcao)}
                  className="sr-only"
                />
                <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${ativo ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300"}`}>
                  {ativo ? <Check size={13} /> : null}
                </span>
                {opcao}
              </label>
            );
          })}
        </div>
        {unica.toLowerCase().includes("outro") ? (
          <input
            name={`observacao_${index}`}
            defaultValue={anterior?.observacao ?? ""}
            className="premium-input w-full text-base"
            placeholder="Especifique"
          />
        ) : null}
      </div>
    );
  }

  if (pergunta.tipo === "MULTIPLA_SELECAO") {
    return (
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {opcoes.map((opcao) => {
            const ativo = multiplas.includes(opcao);
            return (
              <label
                key={opcao}
                className={`flex min-h-13 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition ${
                  ativo
                    ? "border-violet-500 bg-violet-50 text-violet-800 dark:border-violet-400 dark:bg-violet-500/15 dark:text-violet-100"
                    : "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                }`}
              >
                <input
                  type="checkbox"
                  name={`resposta_${index}`}
                  value={opcao}
                  checked={ativo}
                  onChange={() =>
                    setMultiplas((atuais) =>
                      atuais.includes(opcao)
                        ? atuais.filter((item) => item !== opcao)
                        : [...atuais, opcao],
                    )
                  }
                  className="sr-only"
                />
                <span className={`flex size-5 shrink-0 items-center justify-center rounded-md border ${ativo ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300"}`}>
                  {ativo ? <Check size={13} /> : null}
                </span>
                {opcao}
              </label>
            );
          })}
        </div>
        {multiplas.some((item) => item.toLowerCase().includes("outro")) ? (
          <input
            name={`observacao_${index}`}
            defaultValue={anterior?.observacao ?? ""}
            className="premium-input w-full text-base"
            placeholder="Especifique"
          />
        ) : null}
      </div>
    );
  }

  if (pergunta.tipo === "ACEITE") {
    return (
      <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
        <input
          type="checkbox"
          name={`resposta_${index}`}
          value="Aceito"
          defaultChecked={anterior?.resposta === "Aceito"}
          className="mt-1 size-5 accent-emerald-600"
        />
        Confirmo esta declaração.
      </label>
    );
  }

  if (pergunta.tipo === "TEXTO_LONGO") {
    return (
      <textarea
        name={`resposta_${index}`}
        rows={4}
        defaultValue={anterior?.resposta ?? ""}
        className="premium-input min-h-28 w-full py-3 text-base"
        placeholder="Digite a resposta"
      />
    );
  }

  return (
    <input
      name={`resposta_${index}`}
      type={pergunta.tipo === "NUMERO" ? "text" : "text"}
      inputMode={pergunta.tipo === "NUMERO" ? "decimal" : undefined}
      defaultValue={anterior?.resposta ?? ""}
      className="premium-input h-13 w-full text-base"
      placeholder={pergunta.tipo === "NUMERO" ? "Digite o valor" : "Digite a resposta"}
    />
  );
}

export default function AnamneseMobileForm({
  clienteId,
  clienteNome,
  procedimento,
  modelo,
  fichaAtual,
  historico,
  respostas,
}: Props) {
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [erro, setErro] = useState("");
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement | null>(null);
  const conteudoEtapaRef = useRef<HTMLDivElement | null>(null);

  const respostasDaFicha = useMemo(() => {
    if (fichaAtual) {
      const vinculadas = respostas.filter((item) => item.anamneseId === fichaAtual.id);
      if (vinculadas.length > 0) return vinculadas;
    }
    return respostas.filter(
      (item) => item.anamneseId == null && item.procedimento === procedimento,
    );
  }, [fichaAtual, respostas, procedimento]);

  const etapas = useMemo<Etapa[]>(() => {
    const resultado: Etapa[] = [];
    let atual: Etapa = { titulo: "Informações", perguntas: [] };

    for (const pergunta of modelo?.perguntas ?? []) {
      if (pergunta.tipo === "SECAO") {
        if (atual.perguntas.length > 0) resultado.push(atual);
        atual = { titulo: pergunta.pergunta, perguntas: [] };
      } else {
        atual.perguntas.push(pergunta);
      }
    }
    if (atual.perguntas.length > 0) resultado.push(atual);
    return resultado;
  }, [modelo]);

  const totalEtapas = etapas.length + 1;
  const etapaAssinatura = etapaAtual === etapas.length;
  const progresso = totalEtapas > 0 ? ((etapaAtual + 1) / totalEtapas) * 100 : 100;

  const indicePergunta = useMemo(() => {
    const mapa = new Map<number, number>();
    (modelo?.perguntas ?? []).forEach((pergunta, index) => mapa.set(pergunta.id, index));
    return mapa;
  }, [modelo]);

  function irParaEtapa(proximaEtapa: number) {
    setErro("");
    setEtapaAtual(Math.max(0, Math.min(etapas.length, proximaEtapa)));
    requestAnimationFrame(() => {
      conteudoEtapaRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function validarEtapa() {
    const form = formRef.current;
    const etapa = etapas[etapaAtual];
    if (!form || !etapa) return true;
    const dados = new FormData(form);

    const faltante = etapa.perguntas.find((pergunta) => {
      if (!pergunta.obrigatoria) return false;
      const index = indicePergunta.get(pergunta.id);
      if (index == null) return false;
      return dados.getAll(`resposta_${index}`).filter((item) => String(item).trim()).length === 0;
    });

    if (faltante) {
      setErro(`Responda: ${faltante.pergunta}`);
      return false;
    }
    setErro("");
    return true;
  }

  function validarFinalizacao() {
    const form = formRef.current;
    if (!form) return false;
    const dados = new FormData(form);

    for (let etapaIndex = 0; etapaIndex < etapas.length; etapaIndex += 1) {
      const faltante = etapas[etapaIndex].perguntas.find((pergunta) => {
        if (!pergunta.obrigatoria) return false;
        const index = indicePergunta.get(pergunta.id);
        if (index == null) return false;
        return dados.getAll(`resposta_${index}`).filter((item) => String(item).trim()).length === 0;
      });

      if (faltante) {
        irParaEtapa(etapaIndex);
        setErro(`Responda: ${faltante.pergunta}`);
        return false;
      }
    }

    if (dados.get("declaracaoFinal") !== "on") {
      setErro("Confirme a declaração final antes de assinar.");
      return false;
    }

    const assinatura = String(dados.get("assinaturaCliente") || "");
    if (!assinatura.startsWith("data:image/")) {
      setErro("A assinatura da cliente é obrigatória para finalizar.");
      return false;
    }

    setErro("");
    return true;
  }

  if (!modelo) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
        Não existe ficha configurada para este procedimento.
      </div>
    );
  }

  if (fichaAtual?.status === "FINALIZADA") {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-400/20 dark:bg-emerald-400/10">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={22} />
            <div className="min-w-0">
              <h3 className="font-bold text-emerald-950 dark:text-emerald-100">
                Anamnese finalizada e assinada
              </h3>
              <p className="mt-1 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                Versão {fichaAtual.versao} · {fichaAtual.assinadaEm ? formatarData(fichaAtual.assinadaEm) : "assinatura registrada"}
              </p>
            </div>
          </div>
          {fichaAtual.assinaturaCliente ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fichaAtual.assinaturaCliente} alt={`Assinatura de ${fichaAtual.assinaturaNome || clienteNome}`} className="mx-auto max-h-36 max-w-full" />
            </div>
          ) : null}

          {respostasDaFicha.length > 0 ? (
            <details className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4 text-slate-800 dark:border-emerald-400/20 dark:bg-white/[0.05] dark:text-slate-100">
              <summary className="cursor-pointer text-sm font-bold">Ver respostas desta versão</summary>
              <div className="mt-4 space-y-3">
                {respostasDaFicha.map((resposta) => (
                  <div key={resposta.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-sm font-semibold">{resposta.perguntaTexto}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{resposta.resposta || "Sem resposta"}</p>
                    {resposta.observacao ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{resposta.observacao}</p> : null}
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          <Button
            type="button"
            className="mt-4 w-full sm:w-auto"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await criarNovaRevisaoAnamnese(clienteId, procedimento);
              })
            }
          >
            {isPending ? <Loader2 className="animate-spin" /> : <FileSignature />}
            Iniciar nova versão
          </Button>
        </div>

        {historico.length > 1 ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.035]">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Histórico de versões</p>
            <div className="mt-3 space-y-2">
              {historico.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                  <span className="font-semibold">Versão {item.versao}</span>
                  <span className="text-slate-500">{item.status === "FINALIZADA" ? "Assinada" : "Rascunho"}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={salvarRespostasAnamneseRapida}
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.value === "finalizar" && !validarFinalizacao()) {
          event.preventDefault();
        }
      }}
      className="space-y-4"
    >
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="modeloId" value={modelo.id} />
      <input type="hidden" name="procedimento" value={procedimento} />
      <input type="hidden" name="totalPerguntas" value={modelo.perguntas.length} />

      <div className="sticky top-2 z-20 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-950/95">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{procedimento}</p>
            <p className="mt-0.5 text-xs text-slate-500">Etapa {etapaAtual + 1} de {totalEtapas}</p>
          </div>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
            {Math.round(progresso)}%
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Profissional responsável</span>
          <input name="profissional" defaultValue={fichaAtual?.profissional ?? ""} className="premium-input h-13 w-full text-base" placeholder="Nome da profissional" />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Data da ficha</span>
          <input name="dataFicha" type="date" defaultValue={(fichaAtual?.dataFicha || new Date().toISOString()).slice(0, 10)} className="premium-input h-13 w-full text-base" />
        </label>
      </div>

      {(modelo.perguntas ?? []).map((pergunta, index) => (
        <div key={`hidden-${pergunta.id}`}>
          <input type="hidden" name={`perguntaId_${index}`} value={pergunta.id} />
          <input type="hidden" name={`perguntaTexto_${index}`} value={pergunta.pergunta} />
          <input type="hidden" name={`tipo_${index}`} value={pergunta.tipo} />
        </div>
      ))}

      <div ref={conteudoEtapaRef} className="scroll-mt-28">
        {etapas.map((etapa, indiceEtapa) => (
          <section
            key={`${indiceEtapa}-${etapa.titulo}`}
            hidden={indiceEtapa !== etapaAtual}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-5"
          >
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600 dark:text-violet-300">
                {etapa.titulo}
              </p>
              <h3 className="mt-2 text-lg font-bold text-slate-950 dark:text-white">
                Responda por toque sempre que possível
              </h3>
            </div>
            <div className="space-y-5">
              {etapa.perguntas.map((pergunta) => {
                const index = indicePergunta.get(pergunta.id) ?? 0;
                const anterior = respostasDaFicha.find(
                  (item) =>
                    item.perguntaId === pergunta.id ||
                    item.perguntaTexto === pergunta.pergunta,
                );

                return (
                  <div
                    key={pergunta.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <p className="text-base font-semibold leading-6 text-slate-900 dark:text-white">
                        {pergunta.pergunta}
                      </p>
                      {pergunta.obrigatoria ? (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[0.65rem] font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
                          Obrigatória
                        </span>
                      ) : null}
                    </div>
                    <RespostaMobile
                      pergunta={pergunta}
                      index={index}
                      anterior={anterior}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {etapaAssinatura ? (
          <section className="rounded-3xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-400/20 dark:bg-violet-500/10 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white p-3 text-violet-700 shadow-sm dark:bg-white/10 dark:text-violet-200">
                <FileSignature size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                  Revisão e assinatura
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Entregue o celular ao cliente para confirmar e assinar.
                </p>
              </div>
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200">
              <input
                type="checkbox"
                name="declaracaoFinal"
                className="mt-1 size-5 accent-violet-600"
              />
              <span>
                Declaro que as informações fornecidas nesta anamnese são verdadeiras e completas conforme meu conhecimento, e confirmo que revisei as respostas antes da assinatura.
              </span>
            </label>
            <div className="mt-5">
              <p className="mb-3 text-sm font-bold text-slate-900 dark:text-white">
                Assinatura de {clienteNome}
              </p>
              <AssinaturaCanvas />
            </div>
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
              Depois de finalizada e assinada, esta versão fica bloqueada. Qualquer alteração futura deve ser feita em uma nova versão.
            </div>
          </section>
        ) : null}
      </div>

      {erro ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100">{erro}</div> : null}

      <div className="sticky bottom-2 z-20 grid gap-2 rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-950/95 sm:flex sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {etapaAtual > 0 ? (
            <button type="button" onClick={() => irParaEtapa(etapaAtual - 1)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200 sm:flex-none">
              <ChevronLeft size={18} /> Voltar
            </button>
          ) : null}
          <button type="submit" name="intencao" value="rascunho" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200 sm:flex-none">
            <Save size={17} /> Salvar rascunho
          </button>
        </div>

        {!etapaAssinatura ? (
          <button type="button" onClick={() => { if (validarEtapa()) irParaEtapa(etapaAtual + 1); }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-bold text-white shadow-sm">
            Próximo <ChevronRight size={18} />
          </button>
        ) : (
          <button type="submit" name="intencao" value="finalizar" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm">
            <ShieldCheck size={18} /> Finalizar e assinar
          </button>
        )}
      </div>
    </form>
  );
}
