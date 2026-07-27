"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  FileUp,
  FlaskConical,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  LinhaRelatorioImportacao,
  RelatorioImportacaoClientes,
  StatusLinhaImportacao,
} from "@/lib/importacao-clientes";

type RespostaImportacao = {
  modo: "dry-run" | "importar";
  hash: string;
  mensagem: string;
  importados?: number;
  relatorio: RelatorioImportacaoClientes;
  backup: {
    valido: boolean;
    realizadoEm: string | null;
    validadeHoras: number;
  };
};

const FRASE_CONFIRMACAO = "IMPORTAR CLIENTES";

const ROTULOS_STATUS: Record<StatusLinhaImportacao, string> = {
  pronta: "Pronta",
  invalida: "Inválida",
  duplicada_existente: "Já cadastrada",
  duplicada_arquivo: "Repetida no arquivo",
};

const CLASSES_STATUS: Record<StatusLinhaImportacao, string> = {
  pronta: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
  invalida: "border-rose-300/20 bg-rose-400/10 text-rose-200",
  duplicada_existente: "border-amber-300/20 bg-amber-400/10 text-amber-100",
  duplicada_arquivo: "border-orange-300/20 bg-orange-400/10 text-orange-100",
};

function escaparCsv(valor: string | number) {
  let texto = String(valor ?? "");
  if (/^[=+@\-\t\r]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

function baixarArquivo(nome: string, conteudo: string) {
  const blob = new Blob(["\uFEFF", conteudo], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function baixarModelo() {
  const cabecalho = [
    "nome",
    "telefone",
    "whatsapp",
    "cpf",
    "origem",
    "procedimentoInteresse",
    "nascimento",
    "observacoes",
    "enderecoOriginal",
    "areaEstetica",
    "areaCilios",
    "status",
  ];
  const exemplo = [
    "Cliente Exemplo",
    "(11) 99999-0000",
    "(11) 99999-0000",
    "",
    "Indicação",
    "Avaliação",
    "15/05/1990",
    "Linha fictícia, remova antes de usar",
    "Rua Exemplo, 123, Centro",
    "SIM",
    "NÃO",
    "Ativa",
  ];

  baixarArquivo(
    "modelo-importacao-clientes.csv",
    `${cabecalho.map(escaparCsv).join(";")}\n${exemplo.map(escaparCsv).join(";")}\n`,
  );
}

function baixarRelatorio(relatorio: RelatorioImportacaoClientes) {
  const cabecalho = ["linha", "nome", "status", "mensagens"];
  const linhas = relatorio.linhas.map((item) => [
    item.linha,
    item.nome,
    ROTULOS_STATUS[item.status],
    item.mensagens.join(" | "),
  ]);
  const conteudo = [cabecalho, ...linhas]
    .map((linha) => linha.map(escaparCsv).join(";"))
    .join("\n");
  baixarArquivo("relatorio-importacao-clientes.csv", `${conteudo}\n`);
}

function formatarDataHora(valor: string | null) {
  if (!valor) return "Nenhuma exportação localizada";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

function ResumoCard({
  titulo,
  valor,
  descricao,
}: {
  titulo: string;
  valor: number;
  descricao: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.10] bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {titulo}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{valor}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{descricao}</p>
    </div>
  );
}

function LinhaRelatorio({ item }: { item: LinhaRelatorioImportacao }) {
  return (
    <tr className="border-t border-white/[0.06] align-top">
      <td className="px-3 py-3 text-slate-400">{item.linha}</td>
      <td className="px-3 py-3 font-medium text-slate-200">{item.nome}</td>
      <td className="px-3 py-3">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[0.68rem] font-bold ${CLASSES_STATUS[item.status]}`}
        >
          {ROTULOS_STATUS[item.status]}
        </span>
      </td>
      <td className="px-3 py-3 text-xs leading-5 text-slate-400">
        {item.mensagens.length > 0 ? item.mensagens.join(" ") : "Sem apontamentos."}
      </td>
    </tr>
  );
}

export default function ImportarClientesSection() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<RespostaImportacao | null>(null);
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState<"dry-run" | "importar" | null>(null);
  const [confirmouBackup, setConfirmouBackup] = useState(false);
  const [fraseConfirmacao, setFraseConfirmacao] = useState("");

  const podeImportar = useMemo(
    () =>
      Boolean(
        arquivo &&
          resultado?.modo === "dry-run" &&
          resultado.hash &&
          resultado.relatorio.invalidas === 0 &&
          resultado.relatorio.prontas > 0 &&
          resultado.backup.valido &&
          confirmouBackup &&
          fraseConfirmacao.trim() === FRASE_CONFIRMACAO,
      ),
    [arquivo, resultado, confirmouBackup, fraseConfirmacao],
  );

  async function executar(modo: "dry-run" | "importar") {
    if (!arquivo) {
      setErro("Selecione o arquivo CSV antes de continuar.");
      return;
    }

    setErro("");
    setProcessando(modo);

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);
      formData.append("modo", modo);

      if (modo === "importar") {
        formData.append("hashDryRun", resultado?.hash ?? "");
        formData.append("confirmouBackup", String(confirmouBackup));
        formData.append("fraseConfirmacao", fraseConfirmacao);
      }

      const response = await fetch("/api/clientes/importar", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as RespostaImportacao & { erro?: string };

      if (!response.ok) {
        throw new Error(payload.erro || "Não foi possível processar a importação.");
      }

      setResultado(payload);
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Falha inesperada na importação.");
    } finally {
      setProcessando(null);
    }
  }

  function alterarArquivo(file: File | null) {
    setArquivo(file);
    setResultado(null);
    setErro("");
    setConfirmouBackup(false);
    setFraseConfirmacao("");
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-cyan-300/20 bg-cyan-400/[0.045]">
      <div className="border-b border-white/[0.08] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-white">Importar clientes</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
                Ferramenta administrativa temporária para importar exclusivamente clientes. O CSV é processado em memória, o dry-run não grava dados e registros duplicados são ignorados.
              </p>
            </div>
          </div>

          <Button type="button" variant="outline" onClick={baixarModelo}>
            <Download className="h-4 w-4" />
            Baixar modelo CSV
          </Button>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-200">Arquivo CSV UTF-8</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => alterarArquivo(event.target.files?.[0] ?? null)}
              className="block w-full rounded-2xl border border-white/[0.10] bg-white/[0.05] px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-violet-500 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-violet-400"
            />
            <span className="text-xs leading-5 text-slate-500">
              Limite de 5 MB e 10.000 linhas. No Excel, use Salvar como, CSV UTF-8. O modelo utiliza ponto e vírgula como separador.
            </span>
          </label>

          <Button
            type="button"
            onClick={() => executar("dry-run")}
            disabled={!arquivo || processando !== null}
          >
            {processando === "dry-run" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4" />
            )}
            Executar dry-run
          </Button>
        </div>

        {arquivo ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <FileUp className="h-4 w-4" />
            <span>{arquivo.name}</span>
            <span>{(arquivo.size / 1024).toFixed(1)} KB</span>
          </div>
        ) : null}

        {erro ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{erro}</span>
          </div>
        ) : null}

        {resultado ? (
          <div className="space-y-5">
            <div
              className={`flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6 ${
                resultado.modo === "importar"
                  ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                  : "border-sky-300/20 bg-sky-400/10 text-sky-100"
              }`}
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{resultado.mensagem}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <ResumoCard titulo="Total" valor={resultado.relatorio.totalLinhas} descricao="Linhas de clientes analisadas" />
              <ResumoCard titulo="Prontas" valor={resultado.relatorio.prontas} descricao="Novos clientes aptos" />
              <ResumoCard titulo="Inválidas" valor={resultado.relatorio.invalidas} descricao="Precisam ser corrigidas" />
              <ResumoCard titulo="Já cadastradas" valor={resultado.relatorio.duplicadasExistentes} descricao="Serão ignoradas" />
              <ResumoCard titulo="Repetidas" valor={resultado.relatorio.duplicadasArquivo} descricao="Duplicadas no CSV" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.10] bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white">Colunas reconhecidas</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(resultado.relatorio.colunasMapeadas).map(([campo, coluna]) => (
                    <span
                      key={campo}
                      className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-xs text-violet-100"
                    >
                      {String(coluna)} → {campo}
                    </span>
                  ))}
                </div>
                {resultado.relatorio.colunasIgnoradas.length > 0 ? (
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Ignoradas: {resultado.relatorio.colunasIgnoradas.join(", ")}
                  </p>
                ) : null}
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  resultado.backup.valido
                    ? "border-emerald-300/20 bg-emerald-400/[0.08]"
                    : "border-amber-300/20 bg-amber-400/[0.08]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-200" />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Backup Premium {resultado.backup.valido ? "válido" : "necessário"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Última exportação: {formatarDataHora(resultado.backup.realizadoEm)}. Para importar, a exportação deve ter ocorrido nas últimas {resultado.backup.validadeHoras} horas.
                    </p>
                    {!resultado.backup.valido ? (
                      <Button asChild size="sm" variant="outline" className="mt-3">
                        <Link href="/backup">Abrir Backup Premium</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/[0.10] bg-white/[0.035]">
              <div className="flex flex-col gap-3 border-b border-white/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Relatório por linha</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Exibindo até 100 linhas na tela. O download inclui o relatório completo.
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => baixarRelatorio(resultado.relatorio)}>
                  <Download className="h-4 w-4" />
                  Baixar relatório
                </Button>
              </div>
              <div className="max-h-96 overflow-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="sticky top-0 bg-[#111827] text-xs uppercase tracking-[0.1em] text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Linha</th>
                      <th className="px-3 py-3">Cliente</th>
                      <th className="px-3 py-3">Resultado</th>
                      <th className="px-3 py-3">Apontamentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.relatorio.linhas.slice(0, 100).map((item) => (
                      <LinhaRelatorio key={`${item.linha}-${item.nome}`} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {resultado.modo === "dry-run" ? (
              <div className="rounded-3xl border border-rose-300/20 bg-rose-400/[0.055] p-5">
                <div className="flex items-start gap-3">
                  <Database className="mt-0.5 h-5 w-5 shrink-0 text-rose-100" />
                  <div>
                    <h4 className="font-semibold text-white">Confirmação da importação definitiva</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      Esta etapa cria clientes em uma única transação. Não atualiza cadastros existentes e não altera agenda, financeiro, estoque, marketing ou outros módulos.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.10] bg-white/[0.04] p-4 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={confirmouBackup}
                      onChange={(event) => setConfirmouBackup(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-white/20 accent-rose-500"
                    />
                    <span>
                      Confirmo que exportei e guardei o Backup Premium indicado acima.
                    </span>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-200">
                      Digite {FRASE_CONFIRMACAO}
                    </span>
                    <input
                      value={fraseConfirmacao}
                      onChange={(event) => setFraseConfirmacao(event.target.value)}
                      className="premium-input w-full"
                      autoComplete="off"
                    />
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-slate-500">
                      A importação fica bloqueada enquanto houver linha inválida, backup vencido ou confirmação incompleta.
                    </p>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={!podeImportar || processando !== null}
                      onClick={() => executar("importar")}
                    >
                      {processando === "importar" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Database className="h-4 w-4" />
                      )}
                      Importar definitivamente
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
