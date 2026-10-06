"use client";

import { useMemo, useState } from "react";
import { Repeat2 } from "lucide-react";

import { formatarMoeda } from "@/lib/format";
import {
  DIAS_PARA_JULGAR,
  calcularRetorno,
  type LinhaRetorno,
  type RetornoDados,
} from "../retorno";

const PAINEL =
  "rounded-3xl border border-white/[0.12] bg-white/[0.08] p-5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-6";

function dias(valor: number | null) {
  if (valor === null) return "—";
  const arredondado = Math.round(valor);
  return `${arredondado} ${arredondado === 1 ? "dia" : "dias"}`;
}

function pessoas(n: number) {
  return `${n} ${n === 1 ? "cliente" : "clientes"}`;
}

function percentual(valor: number | null) {
  if (valor === null) return "—";
  return `${Math.round(valor * 100)}%`;
}

function CartaoNumero({
  titulo,
  valor,
  texto,
}: {
  titulo: string;
  valor: string;
  texto: string;
}) {
  return (
    <div className="rounded-3xl border border-white/[0.12] bg-white/[0.08] p-5 backdrop-blur-xl">
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{valor}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{texto}</p>
    </div>
  );
}

function Tabela({
  titulo,
  descricao,
  colunaNome,
  linhas,
  comGasto,
  acao,
}: {
  titulo: string;
  descricao: string;
  colunaNome: string;
  linhas: LinhaRetorno[];
  comGasto: boolean;
  acao?: React.ReactNode;
}) {
  return (
    <section className={PAINEL}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{titulo}</h2>
          <p className="mt-1 text-sm text-slate-400">{descricao}</p>
        </div>
        {acao}
      </div>

      {linhas.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-white/[0.12] p-5 text-sm text-slate-400">
          Ainda não há atendimentos suficientes para mostrar.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className={`w-full text-left text-sm ${comGasto ? "min-w-[980px]" : "min-w-[760px]"}`}>
            <thead>
              <tr className="border-b border-white/[0.10] text-xs text-slate-400">
                <th className="py-2 pr-3 font-medium">{colunaNome}</th>
                <th className="px-3 py-2 font-medium">Clientes</th>
                <th className="px-3 py-2 font-medium">Voltaram</th>
                <th className="px-3 py-2 font-medium">
                  Entre quem veio há mais de {DIAS_PARA_JULGAR} dias
                </th>
                <th className="px-3 py-2 font-medium">Tempo médio entre visitas</th>
                {comGasto ? (
                  <>
                    <th className="px-3 py-2 font-medium">Rende por cliente</th>
                    <th className="px-3 py-2 font-medium">Dos quais depois da 1ª visita</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.nome} className="border-b border-white/[0.06] last:border-0">
                  <td className="max-w-[240px] truncate py-3 pr-3 font-medium text-white">
                    {linha.nome}
                  </td>
                  <td className="px-3 py-3 text-slate-300">{linha.clientes}</td>
                  <td className="px-3 py-3 text-cyan-100">
                    <strong>{linha.voltaram}</strong>
                    <span className="ml-1 text-xs text-slate-400">({percentual(linha.taxa)})</span>
                  </td>
                  <td className="px-3 py-3 text-slate-300">
                    {linha.baseMadura > 0 ? (
                      <>
                        {linha.voltaramMaduros} de {linha.baseMadura}
                        <span className="ml-1 text-xs text-slate-400">
                          ({percentual(linha.taxaMadura)})
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500">ainda cedo</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-300">{dias(linha.cicloMedio)}</td>
                  {comGasto ? (
                    <>
                      <td className="px-3 py-3 font-medium text-white">
                        {formatarMoeda(linha.gastoMedio ?? 0)}
                      </td>
                      <td className="px-3 py-3 text-slate-300">
                        {formatarMoeda(linha.gastoAposPrimeira ?? 0)}
                      </td>
                    </>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function RetornoClientes({ dados }: { dados: RetornoDados }) {
  const [visaoOrigem, setVisaoOrigem] = useState<"origem" | "campanha">("origem");
  const resultado = useMemo(() => calcularRetorno(dados), [dados]);
  const { resumo } = resultado;

  if (resumo.atendidos === 0) {
    return (
      <section className={PAINEL}>
        <div className="flex items-center gap-3">
          <Repeat2 className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-white">Retorno de clientes</h2>
        </div>
        <p className="mt-4 rounded-2xl border border-dashed border-white/[0.12] p-5 text-sm text-slate-400">
          Ainda não há atendimentos finalizados. Conforme as clientes forem sendo atendidas, os números aparecem aqui.
        </p>
      </section>
    );
  }

  const maiorFaixa = Math.max(1, ...resumo.distribuicao.map((faixa) => faixa.qtd));
  const linhasOrigem = visaoOrigem === "origem" ? resultado.porOrigem : resultado.porCampanha;

  return (
    <div className="space-y-6">
      <p className="rounded-2xl border border-white/[0.10] bg-slate-950/25 px-4 py-3 text-sm text-slate-300">
        Conta cada <strong className="text-white">dia</strong>{" "}
        em que a cliente foi atendida, desde o começo do uso do
        sistema (não depende do período escolhido acima). Várias coisas feitas no mesmo dia contam como uma visita só, e
        as revisões marcadas como &quot;Retorno&quot; não contam.
      </p>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CartaoNumero
          titulo="Clientes atendidas"
          valor={String(resumo.atendidos)}
          texto="Pessoas que já vieram pelo menos uma vez."
        />
        <CartaoNumero
          titulo="Voltaram pelo menos uma vez"
          valor={String(resumo.recorrentes)}
          texto={
            resumo.baseMadura > 0
              ? `Entre quem veio pela 1ª vez há mais de ${DIAS_PARA_JULGAR} dias, ${resumo.voltaramMaduros} de ${resumo.baseMadura} voltaram (${percentual(resumo.taxaMadura)}). Quem veio faz pouco tempo ainda pode voltar.`
              : "Ainda é cedo: ninguém completou 90 dias desde a primeira visita."
          }
        />
        <CartaoNumero
          titulo="Vieram só uma vez"
          valor={String(resumo.umaVez)}
          texto="Até agora não voltaram (inclui quem ainda está dentro do prazo de voltar)."
        />
        <CartaoNumero
          titulo="Tempo médio entre visitas"
          valor={dias(resumo.cicloMedio)}
          texto={
            resumo.totalIntervalos > 0
              ? `A metade das voltas acontece em até ${dias(resumo.cicloMediano)}. Calculado com ${resumo.totalIntervalos} ${resumo.totalIntervalos === 1 ? "volta" : "voltas"}.`
              : "Ainda não há nenhuma volta para calcular."
          }
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className={PAINEL}>
          <h2 className="text-lg font-semibold text-white">De quanto em quanto tempo voltam</h2>
          <p className="mt-1 text-sm text-slate-400">Quantas voltas aconteceram em cada intervalo entre uma visita e a seguinte.</p>
          <div className="mt-5 space-y-3">
            {resumo.distribuicao.map((faixa) => (
              <div key={faixa.label} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 text-slate-300">{faixa.label}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(faixa.qtd / maiorFaixa) * 100}%`,
                      backgroundColor: "#38bdf8",
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-semibold text-white">{faixa.qtd}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={PAINEL}>
          <h2 className="text-lg font-semibold text-white">Quanto cada cliente rende</h2>
          <p className="mt-1 text-sm text-slate-400">Soma das vendas de cada cliente, média por pessoa.</p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.10] bg-slate-950/35 p-4">
              <p className="text-xs text-slate-400">Quem voltou ({pessoas(resumo.recorrentes)})</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {formatarMoeda(resumo.gastoMedioRecorrente ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.10] bg-slate-950/35 p-4">
              <p className="text-xs text-slate-400">Quem veio só uma vez ({pessoas(resumo.umaVez)})</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {formatarMoeda(resumo.gastoMedioUmaVez ?? 0)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-400">
            Só entram vendas finalizadas e ativas, ligadas à cliente. Atendimentos antigos que não passaram pela tela de Vendas não aparecem aqui.
          </p>
        </section>
      </div>

      <Tabela
        titulo="Retorno por serviço"
        descricao="Quantas clientes fizeram o mesmo serviço mais de uma vez, e de quanto em quanto tempo."
        colunaNome="Serviço"
        linhas={resultado.porServico}
        comGasto={false}
      />

      <Tabela
        titulo={visaoOrigem === "origem" ? "Retorno por origem da cliente" : "Retorno por campanha"}
        descricao="Quanto cada cliente rende ao longo do tempo, somando a primeira visita e as seguintes. Dá para ver se quem veio de anúncio está voltando."
        colunaNome={visaoOrigem === "origem" ? "Origem" : "Campanha"}
        linhas={linhasOrigem}
        comGasto
        acao={
          <div className="flex gap-2">
            {(
              [
                ["origem", "Por origem"],
                ["campanha", "Por campanha"],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setVisaoOrigem(valor)}
                style={visaoOrigem === valor ? { color: "#0f172a" } : undefined}
                className={`rounded-2xl px-3 py-2 text-xs font-medium transition ${
                  visaoOrigem === valor
                    ? "bg-cyan-300 text-slate-950"
                    : "border border-white/[0.10] bg-slate-950/25 text-slate-300 hover:bg-white/[0.08]"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        }
      />
    </div>
  );
}
