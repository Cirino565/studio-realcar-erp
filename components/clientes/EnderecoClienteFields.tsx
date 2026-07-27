"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";

export type EnderecoClienteValues = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  enderecoOriginal: string;
};

type Props = {
  initialValues?: Partial<EnderecoClienteValues>;
  onValuesChange?: (values: EnderecoClienteValues) => void;
};

type RespostaCep = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  fonte: string;
  erro?: string;
};

const VALORES_VAZIOS: EnderecoClienteValues = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  enderecoOriginal: "",
};

function somenteDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarCep(valor: string) {
  const digitos = somenteDigitos(valor).slice(0, 8);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}

function normalizarValores(
  valores?: Partial<EnderecoClienteValues>,
): EnderecoClienteValues {
  return {
    cep: formatarCep(valores?.cep ?? ""),
    logradouro: valores?.logradouro ?? "",
    numero: valores?.numero ?? "",
    complemento: valores?.complemento ?? "",
    bairro: valores?.bairro ?? "",
    cidade: valores?.cidade ?? "",
    estado: (valores?.estado ?? "").toUpperCase().slice(0, 2),
    enderecoOriginal: valores?.enderecoOriginal ?? "",
  };
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-2 block text-[0.68rem] font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
      {children}
    </span>
  );
}

export default function EnderecoClienteFields({
  initialValues,
  onValuesChange,
}: Props) {
  const [values, setValues] = useState<EnderecoClienteValues>(() =>
    normalizarValores(initialValues),
  );
  const valuesRef = useRef(values);
  const requisicaoRef = useRef(0);
  const ultimoCepConsultadoRef = useRef("");
  const [consultando, setConsultando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [sucesso, setSucesso] = useState(false);

  function aplicar(next: EnderecoClienteValues) {
    valuesRef.current = next;
    setValues(next);
    onValuesChange?.(next);
  }

  function alterar<K extends keyof EnderecoClienteValues>(
    campo: K,
    valor: EnderecoClienteValues[K],
  ) {
    const next = { ...valuesRef.current, [campo]: valor };
    if (campo === "cep") {
      setMensagem("");
      setSucesso(false);
    }
    aplicar(next);
  }

  async function consultarCep(forcar = false) {
    const cep = somenteDigitos(valuesRef.current.cep);

    if (cep.length === 0) {
      setMensagem("");
      setSucesso(false);
      return;
    }

    if (cep.length !== 8) {
      setMensagem("Informe um CEP com 8 dígitos.");
      setSucesso(false);
      return;
    }

    if (!forcar && ultimoCepConsultadoRef.current === cep) return;

    ultimoCepConsultadoRef.current = cep;
    const requisicao = ++requisicaoRef.current;
    setConsultando(true);
    setMensagem("");
    setSucesso(false);

    try {
      const resposta = await fetch(`/api/cep/${cep}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const dados = (await resposta.json()) as RespostaCep;

      if (!resposta.ok) {
        throw new Error(dados.erro || "Não foi possível consultar o CEP.");
      }

      if (requisicao !== requisicaoRef.current) return;

      aplicar({
        ...valuesRef.current,
        cep: formatarCep(dados.cep || cep),
        logradouro: dados.logradouro || "",
        bairro: dados.bairro || "",
        cidade: dados.cidade || "",
        estado: (dados.estado || "").toUpperCase().slice(0, 2),
      });
      setMensagem(
        `Endereço localizado${dados.fonte ? ` por ${dados.fonte}` : ""}. Informe o número e confira os dados.`,
      );
      setSucesso(true);
    } catch (causa) {
      if (requisicao !== requisicaoRef.current) return;
      setMensagem(
        causa instanceof Error
          ? causa.message
          : "A consulta de CEP falhou. Preencha o endereço manualmente.",
      );
      setSucesso(false);
    } finally {
      if (requisicao === requisicaoRef.current) setConsultando(false);
    }
  }

  useEffect(() => {
    const cep = somenteDigitos(values.cep);
    if (cep.length !== 8 || ultimoCepConsultadoRef.current === cep) return;

    const timer = window.setTimeout(() => {
      void consultarCep();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [values.cep]);

  const possuiEnderecoOriginal = Boolean(values.enderecoOriginal.trim());

  return (
    <fieldset className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.035] sm:col-span-2">
      <legend className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        Endereço
      </legend>

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-800 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-200">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Digite o CEP para preencher rua, bairro, cidade e estado. Número e complemento são informados manualmente. Se a consulta estiver indisponível, todos os campos continuam editáveis.
        </p>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="min-w-0">
          <Label>CEP</Label>
          <div className="flex min-w-0 gap-2">
            <input
              name="cep"
              value={values.cep}
              onChange={(event) => alterar("cep", formatarCep(event.target.value))}
              onBlur={() => void consultarCep()}
              placeholder="00000-000"
              className="premium-input min-w-0 flex-1 text-base sm:text-sm"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={9}
            />
            <button
              type="button"
              onClick={() => void consultarCep(true)}
              disabled={consultando || somenteDigitos(values.cep).length !== 8}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:border-violet-400/30 dark:hover:text-violet-200"
              aria-label="Buscar endereço pelo CEP"
            >
              {consultando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Buscar</span>
            </button>
          </div>
          {mensagem ? (
            <p
              className={`mt-2 text-xs leading-5 ${
                sucesso
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {mensagem}
            </p>
          ) : null}
        </label>

        <label className="min-w-0">
          <Label>Número</Label>
          <input
            name="numero"
            value={values.numero}
            onChange={(event) => alterar("numero", event.target.value)}
            placeholder="Ex.: 123 ou S/N"
            className="premium-input w-full min-w-0 text-base sm:text-sm"
            autoComplete="address-line2"
          />
        </label>

        <label className="min-w-0 sm:col-span-2">
          <Label>Logradouro</Label>
          <input
            name="logradouro"
            value={values.logradouro}
            onChange={(event) => alterar("logradouro", event.target.value)}
            placeholder="Rua, avenida, travessa"
            className="premium-input w-full min-w-0 text-base sm:text-sm"
            autoComplete="address-line1"
          />
        </label>

        <label className="min-w-0">
          <Label>Complemento</Label>
          <input
            name="complemento"
            value={values.complemento}
            onChange={(event) => alterar("complemento", event.target.value)}
            placeholder="Apartamento, bloco, referência"
            className="premium-input w-full min-w-0 text-base sm:text-sm"
          />
        </label>

        <label className="min-w-0">
          <Label>Bairro</Label>
          <input
            name="bairro"
            value={values.bairro}
            onChange={(event) => alterar("bairro", event.target.value)}
            placeholder="Bairro"
            className="premium-input w-full min-w-0 text-base sm:text-sm"
            autoComplete="address-level3"
          />
        </label>

        <label className="min-w-0">
          <Label>Cidade</Label>
          <input
            name="cidade"
            value={values.cidade}
            onChange={(event) => alterar("cidade", event.target.value)}
            placeholder="Cidade"
            className="premium-input w-full min-w-0 text-base sm:text-sm"
            autoComplete="address-level2"
          />
        </label>

        <label className="min-w-0">
          <Label>Estado</Label>
          <input
            name="estado"
            value={values.estado}
            onChange={(event) =>
              alterar(
                "estado",
                event.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2),
              )
            }
            placeholder="UF"
            className="premium-input w-full min-w-0 text-base uppercase sm:text-sm"
            autoComplete="address-level1"
            maxLength={2}
          />
        </label>
      </div>

      {possuiEnderecoOriginal ? (
        <label className="mt-4 block min-w-0">
          <Label>Endereço original importado</Label>
          <textarea
            name="enderecoOriginal"
            value={values.enderecoOriginal}
            onChange={(event) => alterar("enderecoOriginal", event.target.value)}
            rows={3}
            className="premium-input w-full min-w-0 resize-y py-3 text-base sm:text-sm"
          />
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Texto preservado da planilha anterior. Ele não foi separado automaticamente para evitar alterações incorretas.
          </p>
        </label>
      ) : (
        <input type="hidden" name="enderecoOriginal" value={values.enderecoOriginal} />
      )}
    </fieldset>
  );
}
