import { NextResponse } from "next/server";

import { canAccess, getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const TEMPO_LIMITE_MS = 5_000;

type ContextoRota = {
  params: Promise<{ cep: string }> | { cep: string };
};

type EnderecoNormalizado = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  fonte: "ViaCEP" | "BrasilAPI";
};

function responderErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function somenteDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarCep(cep: string) {
  return `${cep.slice(0, 5)}-${cep.slice(5)}`;
}

async function consultarViaCep(cep: string): Promise<EnderecoNormalizado | null> {
  const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });

  if (!resposta.ok) return null;

  const dados = (await resposta.json()) as {
    erro?: boolean;
    cep?: string;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };

  if (dados.erro) return null;

  return {
    cep: dados.cep || formatarCep(cep),
    logradouro: dados.logradouro?.trim() || "",
    bairro: dados.bairro?.trim() || "",
    cidade: dados.localidade?.trim() || "",
    estado: dados.uf?.trim().toUpperCase() || "",
    fonte: "ViaCEP",
  };
}

async function consultarBrasilApi(cep: string): Promise<EnderecoNormalizado | null> {
  const resposta = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
  });

  if (!resposta.ok) return null;

  const dados = (await resposta.json()) as {
    cep?: string;
    street?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };

  return {
    cep: dados.cep ? formatarCep(somenteDigitos(dados.cep)) : formatarCep(cep),
    logradouro: dados.street?.trim() || "",
    bairro: dados.neighborhood?.trim() || "",
    cidade: dados.city?.trim() || "",
    estado: dados.state?.trim().toUpperCase() || "",
    fonte: "BrasilAPI",
  };
}

export async function GET(_request: Request, contexto: ContextoRota) {
  const usuario = await getCurrentUser();
  if (!usuario) return responderErro("Não autenticado.", 401);
  if (!canAccess(usuario, "clientes.gerenciar")) {
    return responderErro("Sem permissão para consultar CEP no cadastro de clientes.", 403);
  }

  const { cep: parametroCep } = await contexto.params;
  const cep = somenteDigitos(parametroCep);

  if (!/^\d{8}$/.test(cep)) {
    return responderErro("Informe um CEP com 8 dígitos.", 400);
  }

  try {
    const endereco =
      (await consultarViaCep(cep).catch(() => null)) ??
      (await consultarBrasilApi(cep).catch(() => null));

    if (!endereco) {
      return responderErro(
        "CEP não encontrado. Confira o número ou preencha o endereço manualmente.",
        404,
      );
    }

    return NextResponse.json(endereco);
  } catch {
    return responderErro(
      "A consulta de CEP está indisponível. Preencha o endereço manualmente.",
      503,
    );
  }
}
