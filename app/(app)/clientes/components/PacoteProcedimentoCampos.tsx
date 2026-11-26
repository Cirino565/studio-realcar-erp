"use client";

import { useState } from "react";

export type ProcedimentoParaPacote = {
  id: number;
  nome: string;
  valorPadrao: number;
};

const campo =
  "h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:placeholder:text-slate-500";
const rotulo = "text-xs font-semibold text-slate-600 dark:text-slate-400";

/** "Depilacao Pacote 6" ou "Pacote 10 sessoes" -> 6 / 10. */
export function sessoesDoNome(nome: string) {
  const achado =
    nome.match(/pacote\s*(?:de\s*)?(\d{1,3})/i) || nome.match(/(\d{1,3})\s*sess/i);
  const numero = achado ? Number(achado[1]) : 0;
  return numero > 0 && numero <= 200 ? numero : null;
}

function valorCampo(valor: number) {
  return valor > 0
    ? valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";
}

/**
 * Campos do pacote na ficha: escolher o procedimento preenche sozinho o nome,
 * o valor da tabela e o numero de sessoes (tudo continua editavel).
 */
export default function PacoteProcedimentoCampos({
  procedimentos,
}: {
  procedimentos: ProcedimentoParaPacote[];
}) {
  const [procedimentoId, setProcedimentoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [sessoes, setSessoes] = useState("");

  const dePacote = procedimentos.filter((item) => /pacote/i.test(item.nome));
  const outros = procedimentos.filter((item) => !/pacote/i.test(item.nome));

  function escolher(id: string) {
    setProcedimentoId(id);
    const item = procedimentos.find((procedimento) => String(procedimento.id) === id);
    if (!item) return;
    setDescricao(item.nome);
    setValorTotal(valorCampo(item.valorPadrao));
    const numero = sessoesDoNome(item.nome);
    setSessoes(numero ? String(numero) : "");
  }

  return (
    <>
      {procedimentos.length > 0 ? (
        <label className="block space-y-2">
          <span className={rotulo}>Procedimento do pacote</span>
          <select value={procedimentoId} onChange={(event) => escolher(event.target.value)} className={campo}>
            <option value="">Escolha o procedimento</option>
            {dePacote.length > 0 ? (
              <optgroup label="Pacotes">
                {dePacote.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {outros.length > 0 ? (
              <optgroup label="Outros procedimentos">
                {outros.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </label>
      ) : null}

      <label className="block space-y-2">
        <span className={rotulo}>Descrição do pacote</span>
        <input
          name="descricao"
          required
          value={descricao}
          onChange={(event) => setDescricao(event.target.value)}
          placeholder="Ex: Pacote Criolipólise 5 sessões"
          className={campo}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-2">
          <span className={rotulo}>Valor total</span>
          <input
            name="valorTotal"
            required
            inputMode="decimal"
            value={valorTotal}
            onChange={(event) => setValorTotal(event.target.value)}
            placeholder="0,00"
            className={campo}
          />
        </label>
        <label className="space-y-2">
          <span className={rotulo}>Nº de sessões</span>
          <input
            name="sessoes"
            inputMode="numeric"
            value={sessoes}
            onChange={(event) => setSessoes(event.target.value.replace(/\D/g, "").slice(0, 3))}
            placeholder="Ex: 6"
            className={campo}
          />
        </label>
      </div>
    </>
  );
}
