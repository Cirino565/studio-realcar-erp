"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";

import { criarLancamento } from "@/actions/lancamento.actions";
import { Button } from "@/components/ui/button";
import type {
  CampanhaFinanceiroOption,
  ClienteFinanceiroOption,
  ContaFinanceiraData,
  FormaPagamentoConfigData,
} from "../types";

type Props = {
  open: boolean;
  contas: ContaFinanceiraData[];
  formasPagamento: FormaPagamentoConfigData[];
  campanhas: CampanhaFinanceiroOption[];
  clientes: ClienteFinanceiroOption[];
  onClose: () => void;
  onSaved: () => void;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizarTexto(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const categoriasEntrada = ["Procedimentos", "Pacotes", "Produtos", "Avaliação", "Outros recebimentos"];
const categoriasSaida = ["Produtos e insumos", "Aluguel", "Marketing", "Equipamentos", "Salários", "Impostos", "Outras despesas"];

function hoje() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export default function NovoLancamentoModal({ open, contas, formasPagamento, campanhas, clientes, onClose, onSaved }: Props) {
  const principal = contas.find((item) => item.principal);
  const pix = formasPagamento.find((item) => item.nome === "Pix") || formasPagamento[0];
  const [isPending, startTransition] = useTransition();
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [categoria, setCategoria] = useState(categoriasEntrada[0]);
  const [data, setData] = useState(hoje());
  const [observacoes, setObservacoes] = useState("");
  const [formaId, setFormaId] = useState(pix ? String(pix.id) : "");
  const [contaId, setContaId] = useState(principal ? String(principal.id) : "");
  const [campanhaId, setCampanhaId] = useState("");
  const [erro, setErro] = useState("");

  // Cliente vinculado ao lançamento (opcional) - por exemplo, um
  // adiantamento de pacote fechado na avaliação, antes de existir venda ou
  // agendamento. Mesma busca já usada no seletor de cliente da Agenda.
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [buscaClienteAberta, setBuscaClienteAberta] = useState(false);
  const buscaClienteRef = useRef<HTMLDivElement | null>(null);

  const clienteSelecionado = useMemo(
    () => clientes.find((item) => item.id === clienteId) || null,
    [clienteId, clientes],
  );

  const clientesFiltrados = useMemo(() => {
    const query = normalizarTexto(buscaCliente);
    const digits = onlyDigits(buscaCliente);

    if (query.length < 2 && digits.length < 2) return [];

    return clientes
      .filter((item) => {
        const nomeCorresponde = query.length >= 2 && normalizarTexto(item.nome).includes(query);
        const telefoneCorresponde =
          digits.length >= 2 &&
          (onlyDigits(item.telefone).includes(digits) || onlyDigits(item.whatsapp || "").includes(digits));

        return nomeCorresponde || telefoneCorresponde;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
      .slice(0, 8);
  }, [buscaCliente, clientes]);

  useEffect(() => {
    function fecharAoClicarFora(event: MouseEvent) {
      if (!buscaClienteRef.current?.contains(event.target as Node)) {
        setBuscaClienteAberta(false);
      }
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  const forma = useMemo(() => formasPagamento.find((item) => String(item.id) === formaId), [formaId, formasPagamento]);
  const valorNumero = Number(valor.replace(",", ".")) || 0;
  const taxaPrevista = tipo === "ENTRADA" && forma ? Math.min(valorNumero, valorNumero * forma.taxaPercentual / 100 + forma.taxaFixa) : 0;

  if (!open) return null;

  const categorias = tipo === "ENTRADA" ? categoriasEntrada : categoriasSaida;

  function trocarTipo(value: "ENTRADA" | "SAIDA") {
    setTipo(value);
    setCategoria(value === "ENTRADA" ? categoriasEntrada[0] : categoriasSaida[0]);
  }

  function salvar() {
    if (!descricao.trim() || valorNumero <= 0 || !data) {
      setErro("Preencha descrição, valor e data.");
      return;
    }
    setErro("");
    startTransition(async () => {
      try {
        await criarLancamento({
          descricao: descricao.trim(),
          valor: valorNumero,
          tipo,
          categoria,
          observacoes: observacoes.trim(),
          data,
          formaPagamento: tipo === "ENTRADA" ? forma?.nome : undefined,
          formaPagamentoConfigId: tipo === "ENTRADA" && forma ? forma.id : null,
          contaFinanceiraId: contaId ? Number(contaId) : null,
          campanhaId: campanhaId ? Number(campanhaId) : null,
          clienteId: clienteId || undefined,
        });
        setDescricao(""); setValor(""); setObservacoes(""); setCampanhaId("");
        setClienteId(null); setBuscaCliente("");
        onSaved(); onClose();
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">Financeiro</p><h2 className="mt-2 text-2xl font-semibold text-white">Novo lançamento</h2></div><button type="button" onClick={onClose} className="rounded-xl border border-white/10 p-2 text-slate-300"><X className="size-4" /></button></div>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm text-slate-300">Descrição<input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="premium-input" /></label>

          <div ref={buscaClienteRef} className="relative grid gap-2 text-sm text-slate-300">
            <span>Cliente relacionada (opcional)</span>

            {clienteSelecionado ? (
              <div className="flex items-center justify-between rounded-xl border border-violet-300 bg-violet-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{clienteSelecionado.nome}</p>
                  <p className="text-xs text-slate-500">{clienteSelecionado.telefone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setClienteId(null); setBuscaCliente(""); }}
                  className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-white"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <>
                <input
                  value={buscaCliente}
                  onChange={(e) => { setBuscaCliente(e.target.value); setBuscaClienteAberta(true); }}
                  onFocus={() => setBuscaClienteAberta(true)}
                  placeholder="Nome ou telefone da cliente"
                  className="premium-input"
                />

                {buscaClienteAberta && clientesFiltrados.length > 0 ? (
                  <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    {clientesFiltrados.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setClienteId(item.id);
                          setBuscaCliente("");
                          setBuscaClienteAberta(false);
                        }}
                        className="flex w-full flex-col items-start bg-white px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="font-medium text-slate-900">{item.nome}</span>
                        <span className="text-xs text-slate-500">{item.telefone}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}

            <span className="text-xs text-slate-500">
              Use para adiantamentos e pacotes fechados antes de existir venda ou agendamento - assim o valor fica ligado à ficha da cliente.
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2 text-sm text-slate-300">Valor<input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" className="premium-input" /></label>
            <label className="grid gap-2 text-sm text-slate-300">Data<input type="date" value={data} onChange={(e) => setData(e.target.value)} className="premium-input" /></label>
            <label className="grid gap-2 text-sm text-slate-300">Tipo<select value={tipo} onChange={(e) => trocarTipo(e.target.value as "ENTRADA" | "SAIDA")} className="premium-input bg-slate-900"><option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option></select></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-slate-300">Categoria<select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="premium-input bg-slate-900">{categorias.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="grid gap-2 text-sm text-slate-300">Conta<select value={contaId} onChange={(e) => setContaId(e.target.value)} className="premium-input bg-slate-900"><option value="">Sem conta</option>{contas.map((item) => <option key={item.id} value={item.id}>{item.nome}{item.principal ? " · principal" : ""}</option>)}</select></label>
          </div>
          {tipo === "ENTRADA" ? <label className="grid gap-2 text-sm text-slate-300">Forma de pagamento<select value={formaId} onChange={(e) => setFormaId(e.target.value)} className="premium-input bg-slate-900"><option value="">Não informada</option>{formasPagamento.filter((item) => item.status === "Ativa").map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select>{forma && valorNumero > 0 ? <span className="text-xs text-cyan-200">Taxa prevista: R$ {taxaPrevista.toFixed(2).replace(".", ",")} · líquido R$ {(valorNumero - taxaPrevista).toFixed(2).replace(".", ",")}</span> : null}</label> : null}
          <label className="grid gap-2 text-sm text-slate-300">Campanha relacionada<select value={campanhaId} onChange={(e) => setCampanhaId(e.target.value)} className="premium-input bg-slate-900"><option value="">Sem campanha</option>{campanhas.map((item) => <option key={item.id} value={item.id}>{item.nome} · {item.canal}</option>)}</select></label>
          <label className="grid gap-2 text-sm text-slate-300">Observações<textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="premium-input min-h-24" /></label>
          {erro ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200">{erro}</div> : null}
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="button" onClick={salvar} disabled={isPending}>{isPending ? "Salvando..." : "Salvar lançamento"}</Button></div>
        </div>
      </div>
    </div>
  );
}
