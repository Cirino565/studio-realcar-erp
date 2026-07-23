import {
  DECLARACAO_ANAMNESE_LEGADO,
  STUDIO_REALCAR_IDENTIDADE,
} from "@/lib/studio-realcar";

export type AnamnesePdfResposta = {
  perguntaTexto: string;
  resposta: string | null;
  observacao: string | null;
};

export type AnamnesePdfDados = {
  clienteNome: string;
  procedimento: string;
  versao: number;
  dataFicha: string;
  assinadaEm: string | null;
  profissional: string | null;
  assinaturaNome: string | null;
  assinaturaCliente: string | null;
  declaracaoTexto: string | null;
  declaracaoVersao: string | null;
  respostas: AnamnesePdfResposta[];
};

type ImagemJpeg = {
  bytes: Uint8Array;
  largura: number;
  altura: number;
};

type PaginaPdf = {
  comandos: Uint8Array[];
  y: number;
};

const LARGURA_PAGINA = 595;
const ALTURA_PAGINA = 842;
const MARGEM_X = 46;
const TOPO = 48;
const RODAPE = 42;
const LARGURA_CONTEUDO = LARGURA_PAGINA - MARGEM_X * 2;

function concatenarBytes(partes: Uint8Array[]) {
  const tamanho = partes.reduce((total, parte) => total + parte.length, 0);
  const resultado = new Uint8Array(tamanho);
  let posicao = 0;

  for (const parte of partes) {
    resultado.set(parte, posicao);
    posicao += parte.length;
  }

  return resultado;
}

function ascii(texto: string) {
  return new TextEncoder().encode(texto);
}

const MAPA_CP1252 = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

function paraCp1252(texto: string) {
  const bytes: number[] = [];

  for (const caractere of texto.normalize("NFC")) {
    const codigo = caractere.codePointAt(0) ?? 0x3f;

    if (codigo <= 0x7f || (codigo >= 0xa0 && codigo <= 0xff)) {
      bytes.push(codigo);
      continue;
    }

    bytes.push(MAPA_CP1252.get(codigo) ?? 0x3f);
  }

  return new Uint8Array(bytes);
}

function escaparTextoPdf(texto: string) {
  const limpo = texto.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  const entrada = paraCp1252(limpo);
  const saida: number[] = [];

  for (const byte of entrada) {
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) {
      saida.push(0x5c);
    }
    saida.push(byte);
  }

  return new Uint8Array(saida);
}

function comandoTexto(
  fonte: "F1" | "F2",
  tamanho: number,
  x: number,
  yTopo: number,
  texto: string,
) {
  const yPdf = ALTURA_PAGINA - yTopo;
  return concatenarBytes([
    ascii(`BT /${fonte} ${tamanho} Tf 1 0 0 1 ${x.toFixed(2)} ${yPdf.toFixed(2)} Tm (`),
    escaparTextoPdf(texto),
    ascii(") Tj ET\n"),
  ]);
}

function comandoTextoCentralizado(
  fonte: "F1" | "F2",
  tamanho: number,
  yTopo: number,
  texto: string,
) {
  const larguraAproximada = Math.min(
    LARGURA_CONTEUDO,
    texto.length * tamanho * 0.52,
  );
  const x = Math.max(MARGEM_X, (LARGURA_PAGINA - larguraAproximada) / 2);
  return comandoTexto(fonte, tamanho, x, yTopo, texto);
}

function comandoLinha(x1: number, y1Topo: number, x2: number, y2Topo: number) {
  const y1 = ALTURA_PAGINA - y1Topo;
  const y2 = ALTURA_PAGINA - y2Topo;
  return ascii(
    `0.82 0.84 0.88 RG 0.7 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`,
  );
}

function comandoRetanguloPreenchido(
  x: number,
  yTopo: number,
  largura: number,
  altura: number,
  cinza: number,
) {
  const y = ALTURA_PAGINA - yTopo - altura;
  return ascii(
    `${cinza} g ${x.toFixed(2)} ${y.toFixed(2)} ${largura.toFixed(2)} ${altura.toFixed(2)} re f 0 g\n`,
  );
}

function quebrarTexto(texto: string, tamanho: number, larguraMaxima: number) {
  const palavras = texto
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (palavras.length === 0) return [""];

  const larguraMedia = tamanho * 0.51;
  const maximoCaracteres = Math.max(12, Math.floor(larguraMaxima / larguraMedia));
  const linhas: string[] = [];
  let linha = "";

  for (const palavraOriginal of palavras) {
    let palavra = palavraOriginal;

    while (palavra.length > maximoCaracteres) {
      if (linha) {
        linhas.push(linha);
        linha = "";
      }
      linhas.push(palavra.slice(0, maximoCaracteres));
      palavra = palavra.slice(maximoCaracteres);
    }

    const candidata = linha ? `${linha} ${palavra}` : palavra;
    if (candidata.length <= maximoCaracteres) {
      linha = candidata;
    } else {
      if (linha) linhas.push(linha);
      linha = palavra;
    }
  }

  if (linha) linhas.push(linha);
  return linhas;
}

function formatarDataHora(valor: string | null | undefined) {
  if (!valor) return "Não informado";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function formatarData(valor: string | null | undefined) {
  if (!valor) return "Não informada";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(data);
}

function nomeArquivoSeguro(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 70);
}

async function converterAssinaturaParaJpeg(
  dataUrl: string | null,
): Promise<ImagemJpeg | null> {
  if (!dataUrl || typeof document === "undefined") return null;

  return new Promise((resolve) => {
    const imagem = new Image();

    imagem.onload = () => {
      const larguraMaxima = 900;
      const proporcao = Math.min(1, larguraMaxima / Math.max(1, imagem.naturalWidth));
      const largura = Math.max(1, Math.round(imagem.naturalWidth * proporcao));
      const altura = Math.max(1, Math.round(imagem.naturalHeight * proporcao));
      const canvas = document.createElement("canvas");
      canvas.width = largura;
      canvas.height = altura;
      const contexto = canvas.getContext("2d");

      if (!contexto) {
        resolve(null);
        return;
      }

      contexto.fillStyle = "#ffffff";
      contexto.fillRect(0, 0, largura, altura);
      contexto.drawImage(imagem, 0, 0, largura, altura);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }

          resolve({
            bytes: new Uint8Array(await blob.arrayBuffer()),
            largura,
            altura,
          });
        },
        "image/jpeg",
        0.9,
      );
    };

    imagem.onerror = () => resolve(null);
    imagem.src = dataUrl;
  });
}

async function converterLogoParaJpeg(): Promise<ImagemJpeg | null> {
  if (typeof document === "undefined") return null;

  return new Promise((resolve) => {
    const imagem = new Image();

    imagem.onload = () => {
      const larguraMaxima = 700;
      const proporcao = Math.min(1, larguraMaxima / Math.max(1, imagem.naturalWidth));
      const largura = Math.max(1, Math.round(imagem.naturalWidth * proporcao));
      const altura = Math.max(1, Math.round(imagem.naturalHeight * proporcao));
      const canvas = document.createElement("canvas");
      canvas.width = largura;
      canvas.height = altura;
      const contexto = canvas.getContext("2d");

      if (!contexto) {
        resolve(null);
        return;
      }

      contexto.fillStyle = "#ffffff";
      contexto.fillRect(0, 0, largura, altura);
      contexto.drawImage(imagem, 0, 0, largura, altura);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }

          resolve({
            bytes: new Uint8Array(await blob.arrayBuffer()),
            largura,
            altura,
          });
        },
        "image/jpeg",
        0.92,
      );
    };

    imagem.onerror = () => resolve(null);
    imagem.src = STUDIO_REALCAR_IDENTIDADE.logoPublica;
  });
}

function construirPdf(
  dados: AnamnesePdfDados,
  assinatura: ImagemJpeg | null,
  logo: ImagemJpeg | null,
) {
  const paginas: PaginaPdf[] = [];

  function novaPagina() {
    const pagina: PaginaPdf = { comandos: [], y: TOPO };
    paginas.push(pagina);
    return pagina;
  }

  let pagina = novaPagina();

  function garantirEspaco(altura: number) {
    if (pagina.y + altura <= ALTURA_PAGINA - RODAPE) return;
    pagina = novaPagina();
  }

  function texto(
    valor: string,
    opcoes: {
      fonte?: "F1" | "F2";
      tamanho?: number;
      x?: number;
      largura?: number;
      entreLinhas?: number;
      espacoDepois?: number;
    } = {},
  ) {
    const fonte = opcoes.fonte ?? "F1";
    const tamanho = opcoes.tamanho ?? 10;
    const x = opcoes.x ?? MARGEM_X;
    const largura = opcoes.largura ?? LARGURA_CONTEUDO;
    const entreLinhas = opcoes.entreLinhas ?? tamanho + 3;
    const espacoDepois = opcoes.espacoDepois ?? 3;
    const linhas = quebrarTexto(valor || " ", tamanho, largura);

    garantirEspaco(linhas.length * entreLinhas + espacoDepois);
    for (const linha of linhas) {
      pagina.comandos.push(comandoTexto(fonte, tamanho, x, pagina.y, linha));
      pagina.y += entreLinhas;
    }
    pagina.y += espacoDepois;
  }

  pagina.comandos.push(
    comandoRetanguloPreenchido(MARGEM_X, pagina.y, LARGURA_CONTEUDO, 118, 0.975),
  );

  if (logo) {
    const larguraLogo = 90;
    const alturaLogo = Math.min(82, (larguraLogo * logo.altura) / logo.largura);
    const xLogo = (LARGURA_PAGINA - larguraLogo) / 2;
    const yLogoPdf = ALTURA_PAGINA - (TOPO + 7) - alturaLogo;
    pagina.comandos.push(
      ascii(
        `q ${larguraLogo.toFixed(2)} 0 0 ${alturaLogo.toFixed(2)} ${xLogo.toFixed(2)} ${yLogoPdf.toFixed(2)} cm /ImLogo Do Q\n`,
      ),
    );
  } else {
    pagina.comandos.push(
      comandoTextoCentralizado("F2", 15, TOPO + 38, "STUDIO REALÇAR"),
    );
  }

  pagina.comandos.push(
    comandoTextoCentralizado(
      "F2",
      9,
      TOPO + 101,
      "FICHA DE ANAMNESE ASSINADA",
    ),
  );
  pagina.y = TOPO + 132;

  pagina.comandos.push(
    comandoTextoCentralizado("F2", 17, pagina.y, dados.procedimento),
  );
  pagina.y += 26;
  pagina.comandos.push(comandoLinha(MARGEM_X, pagina.y, MARGEM_X + LARGURA_CONTEUDO, pagina.y));
  pagina.y += 14;

  texto(`Cliente: ${dados.clienteNome}`, { fonte: "F2", tamanho: 11, espacoDepois: 2 });
  texto(`Versão: ${dados.versao}`, { tamanho: 10, espacoDepois: 1 });
  texto(`Data da ficha: ${formatarData(dados.dataFicha)}`, { tamanho: 10, espacoDepois: 1 });
  texto(`Profissional responsável: ${dados.profissional || "Não informado"}`, {
    tamanho: 10,
    espacoDepois: 10,
  });

  texto("QUESTIONÁRIO", { fonte: "F2", tamanho: 12, espacoDepois: 8 });

  for (const [indice, resposta] of dados.respostas.entries()) {
    const respostaPrincipal = resposta.resposta?.trim() || "Sem resposta registrada";
    const observacao = resposta.observacao?.trim();
    const linhasPergunta = quebrarTexto(`${indice + 1}. ${resposta.perguntaTexto}`, 10, LARGURA_CONTEUDO);
    const linhasResposta = quebrarTexto(`Resposta: ${respostaPrincipal}`, 10, LARGURA_CONTEUDO - 8);
    const linhasObservacao = observacao
      ? quebrarTexto(`Detalhe: ${observacao}`, 9, LARGURA_CONTEUDO - 8)
      : [];
    const alturaEstimativa =
      linhasPergunta.length * 13 +
      linhasResposta.length * 13 +
      linhasObservacao.length * 12 +
      13;

    garantirEspaco(alturaEstimativa);
    texto(`${indice + 1}. ${resposta.perguntaTexto}`, {
      fonte: "F2",
      tamanho: 10,
      espacoDepois: 2,
    });
    texto(`Resposta: ${respostaPrincipal}`, {
      tamanho: 10,
      x: MARGEM_X + 8,
      largura: LARGURA_CONTEUDO - 8,
      espacoDepois: observacao ? 1 : 5,
    });

    if (observacao) {
      texto(`Detalhe: ${observacao}`, {
        tamanho: 9,
        x: MARGEM_X + 8,
        largura: LARGURA_CONTEUDO - 8,
        espacoDepois: 5,
      });
    }

    pagina.comandos.push(comandoLinha(MARGEM_X, pagina.y, MARGEM_X + LARGURA_CONTEUDO, pagina.y));
    pagina.y += 9;
  }

  const declaracao = dados.declaracaoTexto?.trim() || DECLARACAO_ANAMNESE_LEGADO;
  const paragrafosDeclaracao = declaracao
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  garantirEspaco(310);
  texto("DECLARAÇÃO, PRIVACIDADE E ASSINATURA", {
    fonte: "F2",
    tamanho: 12,
    espacoDepois: 8,
  });

  for (const paragrafo of paragrafosDeclaracao) {
    texto(paragrafo, { tamanho: 9.5, entreLinhas: 13.5, espacoDepois: 7 });
  }

  texto(
    `Responsável: ${STUDIO_REALCAR_IDENTIDADE.responsavel} | Canal de atendimento e privacidade: WhatsApp ${STUDIO_REALCAR_IDENTIDADE.whatsappExibicao}`,
    { fonte: "F2", tamanho: 8.5, entreLinhas: 12, espacoDepois: 10 },
  );

  if (assinatura) {
    const larguraImagem = Math.min(250, LARGURA_CONTEUDO * 0.62);
    const alturaImagem = Math.min(95, (larguraImagem * assinatura.altura) / assinatura.largura);
    garantirEspaco(alturaImagem + 58);
    const yPdf = ALTURA_PAGINA - pagina.y - alturaImagem;
    pagina.comandos.push(
      ascii(
        `q ${larguraImagem.toFixed(2)} 0 0 ${alturaImagem.toFixed(2)} ${MARGEM_X.toFixed(2)} ${yPdf.toFixed(2)} cm /ImAssinatura Do Q\n`,
      ),
    );
    pagina.y += alturaImagem + 8;
  } else {
    texto("Assinatura registrada no sistema, imagem indisponível no momento da geração.", {
      tamanho: 9,
      espacoDepois: 10,
    });
  }

  pagina.comandos.push(comandoLinha(MARGEM_X, pagina.y, MARGEM_X + 260, pagina.y));
  pagina.y += 14;
  texto(dados.assinaturaNome || dados.clienteNome, {
    fonte: "F2",
    tamanho: 10,
    espacoDepois: 2,
  });
  texto(`Assinado em: ${formatarDataHora(dados.assinadaEm)}`, { tamanho: 9, espacoDepois: 2 });
  texto(`Identificação interna: anamnese versão ${dados.versao}`, { tamanho: 8, espacoDepois: 1 });
  texto(
    `Versão da declaração: ${dados.declaracaoVersao || "declaração anterior"}`,
    { tamanho: 8, espacoDepois: 0 },
  );

  paginas.forEach((item, indice) => {
    item.comandos.push(
      comandoLinha(MARGEM_X, ALTURA_PAGINA - 31, MARGEM_X + LARGURA_CONTEUDO, ALTURA_PAGINA - 31),
    );
    item.comandos.push(
      comandoTexto(
        "F1",
        8,
        MARGEM_X,
        ALTURA_PAGINA - 18,
        `Studio Realçar, documento gerado pelo sistema, página ${indice + 1} de ${paginas.length}`,
      ),
    );
  });

  const objetos: Array<Uint8Array | null> = [null];
  const adicionarObjeto = (conteudo: Uint8Array | string) => {
    objetos.push(typeof conteudo === "string" ? ascii(conteudo) : conteudo);
    return objetos.length - 1;
  };

  const catalogoId = adicionarObjeto("");
  const paginasId = adicionarObjeto("");
  const fonteRegularId = adicionarObjeto(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  const fonteNegritoId = adicionarObjeto(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );

  let assinaturaId: number | null = null;
  if (assinatura) {
    const cabecalho = ascii(
      `<< /Type /XObject /Subtype /Image /Width ${assinatura.largura} /Height ${assinatura.altura} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${assinatura.bytes.length} >>\nstream\n`,
    );
    assinaturaId = adicionarObjeto(
      concatenarBytes([cabecalho, assinatura.bytes, ascii("\nendstream")]),
    );
  }

  let logoId: number | null = null;
  if (logo) {
    const cabecalho = ascii(
      `<< /Type /XObject /Subtype /Image /Width ${logo.largura} /Height ${logo.altura} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.bytes.length} >>\nstream\n`,
    );
    logoId = adicionarObjeto(
      concatenarBytes([cabecalho, logo.bytes, ascii("\nendstream")]),
    );
  }

  const idsPaginas: number[] = [];

  for (const item of paginas) {
    const stream = concatenarBytes(item.comandos);
    const conteudoId = adicionarObjeto(
      concatenarBytes([
        ascii(`<< /Length ${stream.length} >>\nstream\n`),
        stream,
        ascii("endstream"),
      ]),
    );

    const xObjects = [
      assinaturaId ? `/ImAssinatura ${assinaturaId} 0 R` : null,
      logoId ? `/ImLogo ${logoId} 0 R` : null,
    ].filter(Boolean);
    const recursosImagem =
      xObjects.length > 0 ? ` /XObject << ${xObjects.join(" ")} >>` : "";
    const paginaId = adicionarObjeto(
      `<< /Type /Page /Parent ${paginasId} 0 R /MediaBox [0 0 ${LARGURA_PAGINA} ${ALTURA_PAGINA}] /Resources << /Font << /F1 ${fonteRegularId} 0 R /F2 ${fonteNegritoId} 0 R >>${recursosImagem} >> /Contents ${conteudoId} 0 R >>`,
    );
    idsPaginas.push(paginaId);
  }

  objetos[catalogoId] = ascii(`<< /Type /Catalog /Pages ${paginasId} 0 R >>`);
  objetos[paginasId] = ascii(
    `<< /Type /Pages /Kids [${idsPaginas.map((id) => `${id} 0 R`).join(" ")}] /Count ${idsPaginas.length} >>`,
  );

  const cabecalhoPdf = new Uint8Array([
    0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a,
    0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a,
  ]);
  const partes: Uint8Array[] = [cabecalhoPdf];
  const offsets = [0];
  let tamanhoAtual = cabecalhoPdf.length;

  for (let id = 1; id < objetos.length; id += 1) {
    const conteudo = objetos[id] ?? ascii("");
    offsets[id] = tamanhoAtual;
    const objeto = concatenarBytes([
      ascii(`${id} 0 obj\n`),
      conteudo,
      ascii("\nendobj\n"),
    ]);
    partes.push(objeto);
    tamanhoAtual += objeto.length;
  }

  const inicioXref = tamanhoAtual;
  const linhasXref = ["xref", `0 ${objetos.length}`, "0000000000 65535 f "];
  for (let id = 1; id < objetos.length; id += 1) {
    linhasXref.push(`${String(offsets[id]).padStart(10, "0")} 00000 n `);
  }

  const final = ascii(
    `${linhasXref.join("\n")}\ntrailer\n<< /Size ${objetos.length} /Root ${catalogoId} 0 R >>\nstartxref\n${inicioXref}\n%%EOF`,
  );
  partes.push(final);

  return concatenarBytes(partes);
}

export async function gerarArquivoPdfAnamnese(dados: AnamnesePdfDados) {
  const [assinatura, logo] = await Promise.all([
    converterAssinaturaParaJpeg(dados.assinaturaCliente),
    converterLogoParaJpeg(),
  ]);
  const bytes = construirPdf(dados, assinatura, logo);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const data = formatarData(dados.assinadaEm || dados.dataFicha).replaceAll("/", "-");
  const nomeArquivo = `Anamnese_${nomeArquivoSeguro(dados.procedimento)}_${nomeArquivoSeguro(dados.clienteNome)}_${data}.pdf`;
  const arquivo = new File([blob], nomeArquivo, { type: "application/pdf" });

  return { blob, arquivo, nomeArquivo };
}

export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
