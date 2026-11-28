import type { DadosCompararMeses } from "@/lib/comparar-meses";

import CartaoMes from "./CartaoMes";
import GraficoAno from "./GraficoAno";
import Leitura from "./Leitura";

/** Aba "Mes a mes" da Gestao: os ultimos 12 meses comparados. */
export default function CompararMeses({ dados }: { dados: DadosCompararMeses }) {
  return (
    <div className="space-y-4">
      <section className="premium-card p-4 sm:p-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">O studio está crescendo?</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
          Cada mês comparado com o mês anterior.{" "}
          <span className="font-semibold text-emerald-700">▲ verde</span> é melhora,{" "}
          <span className="font-semibold text-rose-700">▼ vermelho</span> é piora. O mês atual é
          comparado com os mesmos dias do mês passado, para a conta ser justa.
        </p>
      </section>

      <Leitura meses={dados.meses} />

      <GraficoAno meses={dados.meses} />

      <div className="space-y-3">
        {dados.meses.map((mes, indice) => (
          <CartaoMes key={mes.chave} mes={mes} abertoDeInicio={indice < 2} />
        ))}
      </div>

      <p className="px-1 text-xs leading-5 text-slate-400">
        Como é calculado: &quot;Entrou&quot; é o dinheiro recebido de verdade (lançamentos pagos).
        &quot;Lucro&quot; é o que entrou já sem as taxas da maquininha, menos o material usado nos
        atendimentos e produtos vendidos, menos as despesas do studio (compras de estoque não contam
        aqui, porque o material entra quando é usado). São as mesmas contas da aba Período. Meses
        antigos, de antes do sistema guardar o custo do material, podem mostrar lucro maior do que
        foi de verdade.
      </p>
    </div>
  );
}
