// Calculo do indicador de retorno de clientes (Relatorios > aba Retorno).
// Arquivo sem React: so recebe listas simples e devolve numeros.
//
// Regras:
//  - "Visita" = um DIA em que a cliente foi atendida (status Atendido). Varios
//    procedimentos no mesmo dia contam como uma visita so.
//  - Atendimentos marcados como "Retorno" (revisao gratuita) nao contam: eles
//    nao sao a cliente voltando para comprar de novo.
//  - Visitas seguidas com menos de N dias entre uma e outra (sessoes de pacote,
//    revisao em 15 dias...) contam como UM tratamento so. N e escolhido na tela
//    (padrao 30 dias; 0 = toda visita em outro dia conta).
//  - Cliente "recorrente" = voltou depois de N dias ou mais da ultima visita.
//  - Ciclo = dias entre o fim de um tratamento e o comeco do seguinte.

export type VisitaRetorno = {
  clienteId: number;
  dia: string; // AAAA-MM-DD (horario de Sao Paulo)
  procedimento: string;
};

export type ClienteRetorno = {
  id: number;
  origem: string | null;
  campanha: string | null;
};

export type VendaRetorno = {
  clienteId: number;
  dia: string; // AAAA-MM-DD
  valor: number;
};

export type RetornoDados = {
  visitas: VisitaRetorno[];
  clientes: ClienteRetorno[];
  vendas: VendaRetorno[];
};

export type LinhaRetorno = {
  nome: string;
  clientes: number;
  voltaram: number;
  taxa: number | null; // 0 a 1
  baseMadura: number; // clientes cuja 1a visita foi ha mais de 90 dias
  voltaramMaduros: number;
  taxaMadura: number | null;
  cicloMedio: number | null; // dias
  gastoMedio: number | null; // R$ por cliente (todas as compras)
  gastoAposPrimeira: number | null; // R$ por cliente, so o que veio depois da 1a visita
};

export type ResumoRetorno = {
  atendidos: number;
  recorrentes: number;
  umaVez: number;
  taxa: number | null;
  baseMadura: number;
  voltaramMaduros: number;
  taxaMadura: number | null;
  cicloMedio: number | null;
  cicloMediano: number | null;
  totalIntervalos: number;
  distribuicao: { label: string; qtd: number }[];
  gastoMedioRecorrente: number | null;
  gastoMedioUmaVez: number | null;
};

export type ResultadoRetorno = {
  resumo: ResumoRetorno;
  porServico: LinhaRetorno[];
  porOrigem: LinhaRetorno[];
  porCampanha: LinhaRetorno[];
};

export const DIAS_PARA_JULGAR = 90;

// Quantos dias precisam passar para uma nova visita contar como "volta".
// 0 = toda visita em outro dia conta.
export const JANELAS_RETORNO = [0, 15, 30, 45] as const;
export const JANELA_PADRAO = 30;

const formatadorDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Dia (AAAA-MM-DD) no horario de Sao Paulo. */
export function diaSaoPaulo(valor: Date | string): string {
  return formatadorDia.format(new Date(valor));
}

function diasEntre(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000,
  );
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function media(lista: number[]): number | null {
  if (lista.length === 0) return null;
  return lista.reduce((a, b) => a + b, 0) / lista.length;
}

function mediana(lista: number[]): number | null {
  if (lista.length === 0) return null;
  const ordenada = [...lista].sort((a, b) => a - b);
  const meio = Math.floor(ordenada.length / 2);
  return ordenada.length % 2 === 1
    ? ordenada[meio]
    : (ordenada[meio - 1] + ordenada[meio]) / 2;
}

// Olha os dias de visita de uma cliente e separa em "tratamentos": visitas
// seguidas com menos de `janela` dias entre uma e outra (sessoes de um pacote,
// revisao em 15 dias...) contam como um tratamento so. So conta como VOLTA
// quando a cliente reaparece `janela` dias ou mais depois da ultima visita.
function analisarDias(dias: string[], janela: number) {
  const unicos = [...new Set(dias)].sort();
  const voltas: number[] = [];
  let fimPrimeiro = unicos[0];
  let aindaNoPrimeiro = true;
  for (let i = 1; i < unicos.length; i++) {
    const diferenca = diasEntre(unicos[i - 1], unicos[i]);
    if (diferenca >= janela) {
      voltas.push(diferenca);
      aindaNoPrimeiro = false;
    } else if (aindaNoPrimeiro) {
      fimPrimeiro = unicos[i];
    }
  }
  return { primeiro: unicos[0], fimPrimeiro, voltas, voltou: voltas.length > 0 };
}

type Grupo = {
  nome: string;
  // por cliente: dias de visita dentro do grupo
  diasPorCliente: Map<number, string[]>;
};

function montarLinha(
  grupo: Grupo,
  hoje: string,
  janela: number,
  gastoTotal: Map<number, number>,
  gastoApos: Map<number, number>,
  comGasto: boolean,
): LinhaRetorno {
  let voltaram = 0;
  let baseMadura = 0;
  let voltaramMaduros = 0;
  const gaps: number[] = [];
  let somaGasto = 0;
  let somaApos = 0;

  for (const [clienteId, dias] of grupo.diasPorCliente) {
    const analise = analisarDias(dias, janela);
    const voltou = analise.voltou;
    if (voltou) voltaram++;
    gaps.push(...analise.voltas);

    if (diasEntre(analise.primeiro, hoje) > DIAS_PARA_JULGAR) {
      baseMadura++;
      if (voltou) voltaramMaduros++;
    }

    if (comGasto) {
      somaGasto += gastoTotal.get(clienteId) ?? 0;
      somaApos += gastoApos.get(clienteId) ?? 0;
    }
  }

  const clientes = grupo.diasPorCliente.size;
  return {
    nome: grupo.nome,
    clientes,
    voltaram,
    taxa: clientes > 0 ? voltaram / clientes : null,
    baseMadura,
    voltaramMaduros,
    taxaMadura: baseMadura > 0 ? voltaramMaduros / baseMadura : null,
    cicloMedio: media(gaps),
    gastoMedio: comGasto && clientes > 0 ? somaGasto / clientes : null,
    gastoAposPrimeira: comGasto && clientes > 0 ? somaApos / clientes : null,
  };
}

export function calcularRetorno(
  dados: RetornoDados,
  janela: number = JANELA_PADRAO,
  hoje: string = diaSaoPaulo(new Date()),
): ResultadoRetorno {
  // dias de visita por cliente (geral) e por cliente+servico
  const diasPorCliente = new Map<number, string[]>();
  const servicos = new Map<
    string,
    { rotulos: Map<string, number>; porCliente: Map<number, string[]> }
  >();

  for (const visita of dados.visitas) {
    const lista = diasPorCliente.get(visita.clienteId) ?? [];
    lista.push(visita.dia);
    diasPorCliente.set(visita.clienteId, lista);

    const rotulo = visita.procedimento.trim() || "Sem procedimento";
    const chave = normalizar(rotulo);
    let servico = servicos.get(chave);
    if (!servico) {
      servico = { rotulos: new Map(), porCliente: new Map() };
      servicos.set(chave, servico);
    }
    servico.rotulos.set(rotulo, (servico.rotulos.get(rotulo) ?? 0) + 1);
    const doServico = servico.porCliente.get(visita.clienteId) ?? [];
    doServico.push(visita.dia);
    servico.porCliente.set(visita.clienteId, doServico);
  }

  // fim do primeiro tratamento de cada cliente (o que vem depois e "retorno")
  const fimPrimeiroTratamento = new Map<number, string>();
  for (const [clienteId, dias] of diasPorCliente) {
    fimPrimeiroTratamento.set(clienteId, analisarDias(dias, janela).fimPrimeiro);
  }

  // gasto (vendas) por cliente
  const gastoTotal = new Map<number, number>();
  const gastoApos = new Map<number, number>();
  for (const venda of dados.vendas) {
    const primeira = fimPrimeiroTratamento.get(venda.clienteId);
    if (!primeira) continue; // cliente sem visita registrada: fora da conta
    gastoTotal.set(
      venda.clienteId,
      (gastoTotal.get(venda.clienteId) ?? 0) + venda.valor,
    );
    if (venda.dia > primeira) {
      gastoApos.set(
        venda.clienteId,
        (gastoApos.get(venda.clienteId) ?? 0) + venda.valor,
      );
    }
  }

  // ---------- resumo geral ----------
  const todosGaps: number[] = [];
  let recorrentes = 0;
  let baseMadura = 0;
  let voltaramMaduros = 0;
  const gastosRecorrentes: number[] = [];
  const gastosUmaVez: number[] = [];

  for (const [clienteId, dias] of diasPorCliente) {
    const analise = analisarDias(dias, janela);
    const voltou = analise.voltou;
    if (voltou) recorrentes++;
    todosGaps.push(...analise.voltas);
    if (diasEntre(analise.primeiro, hoje) > DIAS_PARA_JULGAR) {
      baseMadura++;
      if (voltou) voltaramMaduros++;
    }
    (voltou ? gastosRecorrentes : gastosUmaVez).push(
      gastoTotal.get(clienteId) ?? 0,
    );
  }

  const atendidos = diasPorCliente.size;
  const faixas = [
    { label: "Até 30 dias", min: 0, max: 30 },
    { label: "31 a 60 dias", min: 31, max: 60 },
    { label: "61 a 90 dias", min: 61, max: 90 },
    { label: "91 a 120 dias", min: 91, max: 120 },
    { label: "Mais de 120 dias", min: 121, max: Infinity },
  ];
  const distribuicao = faixas.map((faixa) => ({
    label: faixa.label,
    qtd: todosGaps.filter((g) => g >= faixa.min && g <= faixa.max).length,
  }));

  const resumo: ResumoRetorno = {
    atendidos,
    recorrentes,
    umaVez: atendidos - recorrentes,
    taxa: atendidos > 0 ? recorrentes / atendidos : null,
    baseMadura,
    voltaramMaduros,
    taxaMadura: baseMadura > 0 ? voltaramMaduros / baseMadura : null,
    cicloMedio: media(todosGaps),
    cicloMediano: mediana(todosGaps),
    totalIntervalos: todosGaps.length,
    distribuicao,
    gastoMedioRecorrente: media(gastosRecorrentes),
    gastoMedioUmaVez: media(gastosUmaVez),
  };

  // ---------- por servico ----------
  const porServico = [...servicos.values()]
    .map((servico) => {
      const nome = [...servico.rotulos.entries()].sort(
        (a, b) => b[1] - a[1],
      )[0][0];
      return montarLinha(
        { nome, diasPorCliente: servico.porCliente },
        hoje,
        janela,
        gastoTotal,
        gastoApos,
        false,
      );
    })
    .sort((a, b) => b.clientes - a.clientes || a.nome.localeCompare(b.nome));

  // ---------- por origem / campanha ----------
  const infoCliente = new Map(dados.clientes.map((c) => [c.id, c]));

  function agrupar(
    escolher: (c: ClienteRetorno | undefined) => string,
  ): LinhaRetorno[] {
    const grupos = new Map<string, Grupo>();
    for (const [clienteId, dias] of diasPorCliente) {
      const nome = escolher(infoCliente.get(clienteId));
      let grupo = grupos.get(nome);
      if (!grupo) {
        grupo = { nome, diasPorCliente: new Map() };
        grupos.set(nome, grupo);
      }
      grupo.diasPorCliente.set(clienteId, dias);
    }
    return [...grupos.values()]
      .map((grupo) =>
        montarLinha(grupo, hoje, janela, gastoTotal, gastoApos, true),
      )
      .sort((a, b) => b.clientes - a.clientes || a.nome.localeCompare(b.nome));
  }

  return {
    resumo,
    porServico,
    porOrigem: agrupar((c) => c?.origem?.trim() || "Sem origem"),
    porCampanha: agrupar((c) => c?.campanha?.trim() || "Sem campanha"),
  };
}
