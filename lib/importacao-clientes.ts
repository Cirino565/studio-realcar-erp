import type { Prisma } from "@prisma/client";

export const IMPORTACAO_CLIENTES_MAX_LINHAS = 10_000;

export const COLUNAS_MODELO_CLIENTES = [
  "nome",
  "telefone",
  "whatsapp",
  "cpf",
  "instagram",
  "origem",
  "procedimentoInteresse",
  "nascimento",
  "observacoes",
  "areaEstetica",
  "areaCilios",
  "status",
] as const;

type ColunaCliente =
  | (typeof COLUNAS_MODELO_CLIENTES)[number]
  | "areaCombinada";

type ClienteExistente = {
  id: number;
  nome: string;
  telefone: string;
  whatsapp: string | null;
  cpf: string | null;
};

export type StatusLinhaImportacao =
  | "pronta"
  | "invalida"
  | "duplicada_existente"
  | "duplicada_arquivo";

export type LinhaRelatorioImportacao = {
  linha: number;
  nome: string;
  status: StatusLinhaImportacao;
  mensagens: string[];
};

export type RelatorioImportacaoClientes = {
  totalLinhas: number;
  prontas: number;
  invalidas: number;
  duplicadasExistentes: number;
  duplicadasArquivo: number;
  colunasDetectadas: string[];
  colunasMapeadas: Partial<Record<ColunaCliente, string>>;
  colunasIgnoradas: string[];
  linhas: LinhaRelatorioImportacao[];
};

export type AnaliseImportacaoClientes = {
  relatorio: RelatorioImportacaoClientes;
  dadosImportacao: Prisma.ClienteCreateManyInput[];
};

type CsvRecord = {
  linha: number;
  valores: string[];
};

const ALIASES: Record<ColunaCliente, string[]> = {
  nome: ["nome", "nomecompleto", "cliente", "nomedocliente"],
  telefone: ["telefone", "fone", "telefonedocliente", "celular"],
  whatsapp: ["whatsapp", "whats", "zap", "telefonewhatsapp"],
  cpf: ["cpf", "documento", "cpfdocliente"],
  instagram: ["instagram", "insta", "perfilinstagram"],
  origem: ["origem", "origemcliente", "canaldeorigem", "canal"],
  procedimentoInteresse: [
    "procedimentointeresse",
    "procedimentodeinteresse",
    "interesse",
    "servicointeresse",
  ],
  nascimento: [
    "nascimento",
    "datanascimento",
    "datadenascimento",
    "aniversario",
  ],
  observacoes: ["observacoes", "observacao", "obs", "anotacoes"],
  areaEstetica: ["areaestetica", "estetica", "clienteestetica"],
  areaCilios: ["areacilios", "cilios", "clientecilios"],
  areaCombinada: ["area", "areas", "areadeatendimento", "segmento"],
  status: ["status", "situacao", "statuscliente"],
};

function normalizarCabecalho(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function apenasDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

function normalizarContato(valor: string) {
  let digitos = apenasDigitos(valor);
  if (digitos.length >= 12 && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }
  return digitos;
}

function formatarTelefone(valor: string) {
  const digitos = normalizarContato(valor);
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  return valor.trim();
}

function formatarCpf(valor: string) {
  const digitos = apenasDigitos(valor);
  if (digitos.length !== 11) return valor.trim();
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function cpfValido(valor: string) {
  const cpf = apenasDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcularDigito = (tamanho: number) => {
    let soma = 0;
    for (let indice = 0; indice < tamanho; indice += 1) {
      soma += Number(cpf[indice]) * (tamanho + 1 - indice);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(9) === Number(cpf[9]) && calcularDigito(10) === Number(cpf[10]);
}

function detectarDelimitador(linha: string) {
  const candidatos = [";", ",", "\t"];
  let melhor = ";";
  let maior = -1;

  for (const delimitador of candidatos) {
    let quantidade = 0;
    let dentroDeAspas = false;
    for (let indice = 0; indice < linha.length; indice += 1) {
      const caractere = linha[indice];
      if (caractere === '"') {
        if (dentroDeAspas && linha[indice + 1] === '"') {
          indice += 1;
        } else {
          dentroDeAspas = !dentroDeAspas;
        }
      } else if (!dentroDeAspas && caractere === delimitador) {
        quantidade += 1;
      }
    }
    if (quantidade > maior) {
      maior = quantidade;
      melhor = delimitador;
    }
  }

  return melhor;
}

function parseCsv(textoOriginal: string) {
  const texto = textoOriginal.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const primeiraLinha = texto.split("\n").find((linha) => linha.trim()) ?? "";
  const delimitador = detectarDelimitador(primeiraLinha);
  const registros: CsvRecord[] = [];

  let atual = "";
  let valores: string[] = [];
  let dentroDeAspas = false;
  let linhaFisica = 1;
  let linhaRegistro = 1;

  const finalizarCampo = () => {
    valores.push(atual.trim());
    atual = "";
  };

  const finalizarRegistro = () => {
    finalizarCampo();
    if (valores.some((valor) => valor.trim())) {
      registros.push({ linha: linhaRegistro, valores });
    }
    valores = [];
    linhaRegistro = linhaFisica + 1;
  };

  for (let indice = 0; indice < texto.length; indice += 1) {
    const caractere = texto[indice];

    if (caractere === '"') {
      if (dentroDeAspas && texto[indice + 1] === '"') {
        atual += '"';
        indice += 1;
      } else {
        dentroDeAspas = !dentroDeAspas;
      }
      continue;
    }

    if (!dentroDeAspas && caractere === delimitador) {
      finalizarCampo();
      continue;
    }

    if (!dentroDeAspas && caractere === "\n") {
      finalizarRegistro();
      linhaFisica += 1;
      continue;
    }

    if (caractere === "\n") linhaFisica += 1;
    atual += caractere;
  }

  if (dentroDeAspas) {
    throw new Error("O CSV possui aspas abertas sem fechamento.");
  }

  if (atual.length > 0 || valores.length > 0) finalizarRegistro();
  return registros;
}

function mapearColunas(cabecalhos: string[]) {
  const normalizados = cabecalhos.map(normalizarCabecalho);
  const indices = new Map<ColunaCliente, number>();
  const colunasMapeadas: Partial<Record<ColunaCliente, string>> = {};

  for (const [coluna, aliases] of Object.entries(ALIASES) as [ColunaCliente, string[]][]) {
    const indice = normalizados.findIndex((item) => aliases.includes(item));
    if (indice >= 0) {
      indices.set(coluna, indice);
      colunasMapeadas[coluna] = cabecalhos[indice];
    }
  }

  const indicesUsados = new Set(indices.values());
  const colunasIgnoradas = cabecalhos.filter((_, indice) => !indicesUsados.has(indice));

  return { indices, colunasMapeadas, colunasIgnoradas };
}

function valorDaColuna(
  valores: string[],
  indices: Map<ColunaCliente, number>,
  coluna: ColunaCliente,
) {
  const indice = indices.get(coluna);
  return indice === undefined ? "" : valores[indice]?.trim() ?? "";
}

function interpretarBooleano(valor: string) {
  const normalizado = normalizarCabecalho(valor);
  if (!normalizado) return { valor: false, valido: true };
  if (["sim", "s", "true", "1", "x", "marcado", "ativo"].includes(normalizado)) {
    return { valor: true, valido: true };
  }
  if (["nao", "n", "false", "0", "desmarcado", "inativo"].includes(normalizado)) {
    return { valor: false, valido: true };
  }
  return { valor: false, valido: false };
}

function interpretarAreaCombinada(valor: string) {
  const normalizado = normalizarCabecalho(valor);
  if (!normalizado) return { estetica: false, cilios: false, valido: true };

  const estetica = normalizado.includes("estetica");
  const cilios = normalizado.includes("cilio") || normalizado.includes("lash");
  const ambas = ["ambas", "asduas", "todos", "todas"].includes(normalizado);

  if (estetica || cilios || ambas) {
    return {
      estetica: estetica || ambas,
      cilios: cilios || ambas,
      valido: true,
    };
  }

  if (["nenhuma", "semarea", "naodefinida"].includes(normalizado)) {
    return { estetica: false, cilios: false, valido: true };
  }

  return { estetica: false, cilios: false, valido: false };
}

function interpretarData(valor: string) {
  const limpo = valor.trim();
  if (!limpo) return { valor: null as Date | null, valido: true };

  let ano: number;
  let mes: number;
  let dia: number;

  const brasileira = limpo.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  const iso = limpo.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (brasileira) {
    dia = Number(brasileira[1]);
    mes = Number(brasileira[2]);
    ano = Number(brasileira[3]);
  } else if (iso) {
    ano = Number(iso[1]);
    mes = Number(iso[2]);
    dia = Number(iso[3]);
  } else {
    return { valor: null as Date | null, valido: false };
  }

  const data = new Date(Date.UTC(ano, mes - 1, dia, 12));
  const valida =
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia &&
    ano >= 1900 &&
    data.getTime() <= Date.now();

  return { valor: valida ? data : null, valido: valida };
}

function interpretarStatus(valor: string) {
  const normalizado = normalizarCabecalho(valor);
  if (!normalizado || ["ativa", "ativo"].includes(normalizado)) {
    return { valor: "Ativa", valido: true };
  }
  if (["inativa", "inativo"].includes(normalizado)) {
    return { valor: "Inativa", valido: true };
  }
  return { valor: "Ativa", valido: false };
}

function chavesIdentidade(cliente: {
  telefone?: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
}) {
  const chaves = new Set<string>();
  const cpf = apenasDigitos(cliente.cpf ?? "");
  const telefone = normalizarContato(cliente.telefone ?? "");
  const whatsapp = normalizarContato(cliente.whatsapp ?? "");

  if (cpf.length === 11) chaves.add(`cpf:${cpf}`);
  if (telefone.length >= 10) chaves.add(`contato:${telefone}`);
  if (whatsapp.length >= 10) chaves.add(`contato:${whatsapp}`);
  return chaves;
}

export function analisarCsvClientes(
  texto: string,
  clientesExistentes: ClienteExistente[],
): AnaliseImportacaoClientes {
  if (texto.includes("\u0000")) {
    throw new Error("O arquivo parece ser uma planilha binária. Exporte a planilha como CSV UTF-8 antes de importar.");
  }

  const registros = parseCsv(texto);
  if (registros.length < 2) {
    throw new Error("O CSV precisa conter uma linha de cabeçalho e pelo menos uma linha de cliente.");
  }

  const cabecalhos = registros[0].valores.map((item) => item.trim());
  const { indices, colunasMapeadas, colunasIgnoradas } = mapearColunas(cabecalhos);

  if (!indices.has("nome")) {
    throw new Error("A coluna obrigatória nome não foi encontrada.");
  }
  if (!indices.has("telefone") && !indices.has("whatsapp")) {
    throw new Error("O CSV precisa ter pelo menos a coluna telefone ou whatsapp.");
  }

  const linhasDados = registros.slice(1);
  if (linhasDados.length > IMPORTACAO_CLIENTES_MAX_LINHAS) {
    throw new Error(`O limite é de ${IMPORTACAO_CLIENTES_MAX_LINHAS.toLocaleString("pt-BR")} clientes por arquivo.`);
  }

  const chavesExistentes = new Set<string>();
  for (const cliente of clientesExistentes) {
    for (const chave of chavesIdentidade(cliente)) chavesExistentes.add(chave);
  }

  const chavesArquivo = new Set<string>();
  const linhas: LinhaRelatorioImportacao[] = [];
  const dadosImportacao: Prisma.ClienteCreateManyInput[] = [];

  for (const registro of linhasDados) {
    const erros: string[] = [];
    const avisos: string[] = [];
    if (registro.valores.length !== cabecalhos.length) {
      erros.push(
        `Quantidade de colunas diferente do cabeçalho: esperadas ${cabecalhos.length}, recebidas ${registro.valores.length}.`,
      );
    }
    const nome = valorDaColuna(registro.valores, indices, "nome").replace(/\s+/g, " ").trim();
    const telefoneOriginal = valorDaColuna(registro.valores, indices, "telefone");
    const whatsappOriginal = valorDaColuna(registro.valores, indices, "whatsapp");
    const cpfOriginal = valorDaColuna(registro.valores, indices, "cpf");
    const telefoneNormalizado = normalizarContato(telefoneOriginal || whatsappOriginal);
    const whatsappNormalizado = normalizarContato(whatsappOriginal || telefoneOriginal);

    if (nome.length < 2) erros.push("Nome não informado ou muito curto.");
    if (![10, 11].includes(telefoneNormalizado.length)) {
      erros.push("Telefone ou WhatsApp deve conter DDD e 10 ou 11 dígitos.");
    }
    if (whatsappOriginal && ![10, 11].includes(normalizarContato(whatsappOriginal).length)) {
      erros.push("WhatsApp possui quantidade de dígitos inválida.");
    }
    if (telefoneOriginal && ![10, 11].includes(normalizarContato(telefoneOriginal).length)) {
      erros.push("Telefone possui quantidade de dígitos inválida.");
    }
    if (cpfOriginal && !cpfValido(cpfOriginal)) {
      erros.push("CPF inválido.");
    }

    const nascimento = interpretarData(valorDaColuna(registro.valores, indices, "nascimento"));
    if (!nascimento.valido) erros.push("Data de nascimento inválida. Use DD/MM/AAAA ou AAAA-MM-DD.");

    const areaEstetica = interpretarBooleano(valorDaColuna(registro.valores, indices, "areaEstetica"));
    const areaCilios = interpretarBooleano(valorDaColuna(registro.valores, indices, "areaCilios"));
    const areaCombinada = interpretarAreaCombinada(valorDaColuna(registro.valores, indices, "areaCombinada"));

    if (!areaEstetica.valido) erros.push("Valor inválido na coluna areaEstetica. Use SIM ou NÃO.");
    if (!areaCilios.valido) erros.push("Valor inválido na coluna areaCilios. Use SIM ou NÃO.");
    if (!areaCombinada.valido) erros.push("Área de atendimento inválida.");

    const status = interpretarStatus(valorDaColuna(registro.valores, indices, "status"));
    if (!status.valido) erros.push("Status inválido. Use Ativa ou Inativa.");

    const esteticaFinal = indices.has("areaEstetica")
      ? areaEstetica.valor
      : areaCombinada.estetica;
    const ciliosFinal = indices.has("areaCilios")
      ? areaCilios.valor
      : areaCombinada.cilios;

    const dados: Prisma.ClienteCreateManyInput = {
      nome,
      telefone: formatarTelefone(telefoneOriginal || whatsappOriginal),
      whatsapp: formatarTelefone(whatsappOriginal || telefoneOriginal),
      cpf: cpfOriginal ? formatarCpf(cpfOriginal) : null,
      instagram: valorDaColuna(registro.valores, indices, "instagram") || null,
      origem: valorDaColuna(registro.valores, indices, "origem") || null,
      procedimentoInteresse:
        valorDaColuna(registro.valores, indices, "procedimentoInteresse") || null,
      nascimento: nascimento.valor,
      observacoes: valorDaColuna(registro.valores, indices, "observacoes") || null,
      areaEstetica: esteticaFinal,
      areaCilios: ciliosFinal,
      status: status.valor,
    };

    const chaves = chavesIdentidade(dados);
    const duplicadaExistente = [...chaves].some((chave) => chavesExistentes.has(chave));
    const duplicadaArquivo = [...chaves].some((chave) => chavesArquivo.has(chave));

    if (duplicadaExistente) avisos.push("Cliente já existente por CPF, telefone ou WhatsApp.");
    if (duplicadaArquivo) avisos.push("Registro repetido dentro do próprio arquivo.");

    let linhaStatus: StatusLinhaImportacao;
    if (erros.length > 0) {
      linhaStatus = "invalida";
    } else if (duplicadaExistente) {
      linhaStatus = "duplicada_existente";
    } else if (duplicadaArquivo) {
      linhaStatus = "duplicada_arquivo";
    } else {
      linhaStatus = "pronta";
      dadosImportacao.push(dados);
      for (const chave of chaves) chavesArquivo.add(chave);
    }

    linhas.push({
      linha: registro.linha,
      nome: nome || "Sem nome",
      status: linhaStatus,
      mensagens: [...erros, ...avisos],
    });
  }

  const relatorio: RelatorioImportacaoClientes = {
    totalLinhas: linhas.length,
    prontas: linhas.filter((linha) => linha.status === "pronta").length,
    invalidas: linhas.filter((linha) => linha.status === "invalida").length,
    duplicadasExistentes: linhas.filter((linha) => linha.status === "duplicada_existente").length,
    duplicadasArquivo: linhas.filter((linha) => linha.status === "duplicada_arquivo").length,
    colunasDetectadas: cabecalhos,
    colunasMapeadas,
    colunasIgnoradas,
    linhas,
  };

  return { relatorio, dadosImportacao };
}
