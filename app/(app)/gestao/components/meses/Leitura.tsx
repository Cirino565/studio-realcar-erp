import type { MesComparado } from "@/lib/comparar-meses";

import { reais, reaisCentavos, vieramDeCada10 } from "./numeros";

type Frase = { tom: "bom" | "ruim" | "neutro"; texto: string };

function maisOuMenos(delta: number) {
  return delta >= 0 ? `${reais(delta)} a mais` : `${reais(-delta)} a menos`;
}

/** As conclusoes principais, em frases curtas, sem precisar ler tabela. */
function montarFrases(meses: MesComparado[]): Frase[] {
  const frases: Frase[] = [];
  const atual = meses[0];
  const fechado = meses[1];
  const nomeAnterior = (mes: MesComparado) => {
    const indice = meses.indexOf(mes);
    return meses[indice + 1]?.nome.toLowerCase() ?? "o mês anterior";
  };

  if (atual && atual.anterior && (atual.numeros.entrou > 0 || atual.anterior.entrou > 0)) {
    const delta = atual.numeros.entrou - atual.anterior.entrou;
    frases.push({
      tom: delta >= 0 ? "bom" : "ruim",
      texto: `${atual.nome} até o dia ${atual.diasContados}: entrou ${reais(atual.numeros.entrou)}, ${maisOuMenos(delta)} que ${nomeAnterior(atual)} nos mesmos dias. Lucro até agora: ${reais(atual.numeros.lucro)}.`,
    });
  }

  if (fechado && fechado.anterior && fechado.numeros.entrou > 0) {
    const n = fechado.numeros;
    const a = fechado.anterior;
    const deltaLucro = n.lucro - a.lucro;
    // O que mais pesou na mudanca do lucro.
    const motivos = [
      { peso: n.entrouLiquido - a.entrouLiquido, texto: (v: number) => (v >= 0 ? `entrou mais dinheiro (+${reais(v)})` : `entrou menos dinheiro (−${reais(-v)})`) },
      { peso: -(n.despesas - a.despesas), texto: (v: number) => (v >= 0 ? `as despesas caíram ${reais(v)}` : `as despesas subiram ${reais(-v)}`) },
      { peso: -(n.material - a.material), texto: (v: number) => (v >= 0 ? `gastou menos material (${reais(v)})` : `gastou mais material (${reais(-v)})`) },
    ].sort((x, y) => Math.abs(y.peso) - Math.abs(x.peso));
    const motivo = motivos[0];
    frases.push({
      tom: deltaLucro >= 0 ? "bom" : "ruim",
      texto:
        Math.abs(deltaLucro) < 1
          ? `${fechado.nome} fechou com lucro de ${reais(n.lucro)}, igual a ${nomeAnterior(fechado)}.`
          : `${fechado.nome} fechou com lucro de ${reais(n.lucro)}, ${maisOuMenos(deltaLucro)} que ${nomeAnterior(fechado)}${
              Math.abs(motivo.peso) >= 1 ? `, principalmente porque ${motivo.texto(motivo.peso)}` : ""
            }.`,
    });

    const de10 = vieramDeCada10(n);
    if (n.faltas >= 3 && de10 !== null && de10 <= 9) {
      frases.push({
        tom: "ruim",
        texto: `Em ${fechado.nome.toLowerCase()} foram ${n.faltas} faltas: de cada 10 clientes marcadas, ${de10} vieram. Confirmar na véspera ajuda a diminuir.`,
      });
    }

    if (n.investimentoAnuncios > 0) {
      frases.push({
        tom: "neutro",
        texto:
          n.leadsViraramClientes > 0
            ? `Em ${fechado.nome.toLowerCase()} foram ${reais(n.investimentoAnuncios)} em anúncios, ${n.leads} contatos chegaram e ${n.leadsViraramClientes} viraram clientes: cada cliente custou ${reaisCentavos(n.investimentoAnuncios / n.leadsViraramClientes)}.`
            : `Em ${fechado.nome.toLowerCase()} foram ${reais(n.investimentoAnuncios)} em anúncios e ${n.leads} contatos chegaram, mas nenhum virou cliente ainda.`,
      });
    }
  }

  // Clientes novas: ultimos 3 meses fechados contra os 3 de antes.
  const fechados = meses.filter((mes) => !mes.emAndamento);
  if (fechados.length >= 6) {
    const recentes = fechados.slice(0, 3).reduce((total, mes) => total + mes.numeros.clientesNovas, 0);
    const antes = fechados.slice(3, 6).reduce((total, mes) => total + mes.numeros.clientesNovas, 0);
    if (recentes > 0 || antes > 0) {
      frases.push({
        tom: recentes >= antes ? "bom" : "ruim",
        texto: `Nos últimos 3 meses chegaram ${recentes} clientes novas, contra ${antes} nos 3 meses anteriores.`,
      });
    }
    const voltaramRecentes = fechados
      .slice(0, 3)
      .reduce((total, mes) => total + Math.max(0, mes.numeros.clientesAtendidas - mes.numeros.clientesNovas), 0);
    const atendidasRecentes = fechados.slice(0, 3).reduce((total, mes) => total + mes.numeros.clientesAtendidas, 0);
    if (atendidasRecentes > 0) {
      const de10 = Math.round((voltaramRecentes / atendidasRecentes) * 10);
      frases.push({
        tom: "neutro",
        texto: `De cada 10 clientes atendidas nos últimos 3 meses, ${de10} já eram clientes e voltaram.`,
      });
    }
  }

  return frases.slice(0, 6);
}

export default function Leitura({ meses }: { meses: MesComparado[] }) {
  const frases = montarFrases(meses);
  if (frases.length === 0) return null;

  return (
    <section className="premium-card p-4 sm:p-5">
      <h2 className="text-lg font-bold text-slate-950">O que os números dizem</h2>
      <ul className="mt-3 space-y-2">
        {frases.map((frase) => (
          <li
            key={frase.texto}
            className={`flex gap-2.5 rounded-2xl border px-3 py-2.5 text-sm leading-6 ${
              frase.tom === "bom"
                ? "border-emerald-100 bg-emerald-50 text-emerald-950"
                : frase.tom === "ruim"
                  ? "border-rose-100 bg-rose-50 text-rose-950"
                  : "border-slate-200 bg-slate-50 text-slate-800"
            }`}
          >
            <span aria-hidden="true" className="font-black">
              {frase.tom === "bom" ? "▲" : frase.tom === "ruim" ? "▼" : "•"}
            </span>
            <span>{frase.texto}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
