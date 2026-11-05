"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { formatarData, formatarMoeda } from "@/lib/format";
import type { Canal, Numero, PainelDono } from "@/lib/painel-dono";

type Detalhe = {
  titulo: string;
  subtitulo?: string;
  numero: Numero;
  /** Lista de pessoas/atendimentos (conta quantos) em vez de somar valores. */
  contagem?: boolean;
};

type AbrirDetalhe = (detalhe: Detalhe) => void;

/* ------------------------------------------------------------- pecas */

function Valor({
  numero,
  titulo,
  subtitulo,
  contagem,
  abrir,
  className = "",
  texto,
}: {
  numero: Numero;
  titulo: string;
  subtitulo?: string;
  contagem?: boolean;
  abrir: AbrirDetalhe;
  className?: string;
  texto?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => abrir({ titulo, subtitulo, numero, contagem })}
      title="Ver de onde veio"
      className={`text-left underline decoration-dotted decoration-1 underline-offset-4 hover:opacity-80 ${className}`}
    >
      {texto ?? (contagem ? String(numero.valor) : formatarMoeda(numero.valor))}
    </button>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-slate-100 py-1.5 text-sm first:border-t-0">
      <span className="min-w-0 text-slate-600">{rotulo}</span>
      <span className="shrink-0 font-semibold text-slate-900">{children}</span>
    </div>
  );
}

function Bloco({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-bold text-slate-950">{titulo}</h2>
      {descricao ? <p className="mt-0.5 text-xs text-slate-500">{descricao}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Cartao({ children, tom = "neutro" }: { children: React.ReactNode; tom?: "verde" | "vermelho" | "neutro" }) {
  const cores =
    tom === "verde"
      ? "border-emerald-200 bg-emerald-50/60"
      : tom === "vermelho"
        ? "border-rose-200 bg-rose-50/60"
        : "border-slate-200 bg-slate-50/60";
  return <div className={`min-w-0 rounded-2xl border p-4 ${cores}`}>{children}</div>;
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{children}</p>;
}

/* ------------------------------------------------------------- detalhe */

function DetalheModal({ detalhe, onClose }: { detalhe: Detalhe; onClose: () => void }) {
  useEffect(() => {
    const fechar = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [onClose]);

  const { numero } = detalhe;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 backdrop-blur-sm sm:items-center sm:p-4"
      style={{ backgroundColor: "rgba(2, 6, 23, 0.55)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={detalhe.titulo}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:max-w-2xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold">{detalhe.titulo}</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {detalhe.contagem
                ? `${numero.valor} no período`
                : `${formatarMoeda(numero.valor)} em ${numero.itens.length} ${numero.itens.length === 1 ? "lançamento" : "lançamentos"}`}
              {detalhe.subtitulo ? ` · ${detalhe.subtitulo}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>

        {numero.itens.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">Nada neste período.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {numero.itens.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {item.href ? (
                      <Link href={item.href} className="hover:text-violet-700 hover:underline">
                        {item.titulo}
                      </Link>
                    ) : (
                      item.titulo
                    )}
                    {item.data ? <span className="ml-2 text-xs font-normal text-slate-500">{formatarData(item.data)}</span> : null}
                  </p>
                  {item.detalhe ? <p className="mt-0.5 truncate text-xs text-slate-500" title={item.detalhe}>{item.detalhe}</p> : null}
                </div>
                {item.valor !== null ? (
                  <span className="shrink-0 text-sm font-semibold text-slate-900">{formatarMoeda(item.valor)}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- tela */

const NOMES_CANAL: Record<Canal | "total", string> = {
  google: "Google",
  instagram: "Instagram",
  outros: "Outros",
  total: "Total",
};

function textoRetorno(valor: number | null) {
  if (valor === null) return "—";
  return `${formatarMoeda(valor)} por R$ 1`;
}

export default function PainelDonoClient({ dados }: { dados: PainelDono }) {
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const abrir: AbrirDetalhe = setDetalhe;
  const { entrou, saiu, clientes, anuncios } = dados;
  const positivo = dados.sobrou >= 0;
  const sobraFinalPositiva = dados.sobraDepoisDePagar >= 0;

  const canais: Array<Canal | "total"> = ["google", "instagram"];
  if (anuncios.gasto.outros.valor > 0 || anuncios.renderam.outros.valor > 0 || anuncios.clientes.outros.valor > 0) {
    canais.push("outros");
  }
  canais.push("total");

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------- Bloco 1 */}
      <Bloco titulo="Resumo do período" descricao="Dinheiro que de fato entrou e saiu (pago) nas datas escolhidas.">
        <div className="grid gap-3 lg:grid-cols-3">
          <Cartao>
            <Rotulo>Quanto entrou</Rotulo>
            <Valor numero={entrou.total} titulo="Quanto entrou" abrir={abrir} className="mt-1 block text-3xl font-bold text-emerald-700" />
            <div className="mt-3">
              <Linha rotulo="Serviços">
                <Valor numero={entrou.servicos} titulo="Entrou · serviços" abrir={abrir} />
              </Linha>
              <Linha rotulo="Produtos">
                <Valor numero={entrou.produtos} titulo="Entrou · produtos" abrir={abrir} />
              </Linha>
              <Linha rotulo="Outros">
                <Valor
                  numero={entrou.outros}
                  titulo="Entrou · outros"
                  subtitulo="sinais, pacotes e lançamentos à mão"
                  abrir={abrir}
                />
              </Linha>
              {entrou.outros.valor > 0 ? (
                <p className="text-[11px] leading-4 text-slate-500">
                  Sinais {formatarMoeda(entrou.sinais)} · Pacotes {formatarMoeda(entrou.pacotes)} · À mão {formatarMoeda(entrou.aMao)}
                </p>
              ) : null}
            </div>
          </Cartao>

          <Cartao>
            <Rotulo>Quanto saiu</Rotulo>
            <Valor numero={saiu.total} titulo="Quanto saiu" subtitulo="despesas pagas + taxas da maquininha" abrir={abrir} className="mt-1 block text-3xl font-bold text-rose-700" />
            <div className="mt-3">
              {saiu.categorias.map((categoria) => (
                <Linha key={categoria.nome} rotulo={categoria.nome}>
                  <Valor numero={categoria} titulo={`Saiu · ${categoria.nome}`} abrir={abrir} />
                </Linha>
              ))}
              <Linha rotulo="Taxas da maquininha">
                <Valor numero={saiu.taxas} titulo="Saiu · taxas da maquininha" abrir={abrir} />
              </Linha>
              {saiu.categorias.length === 0 && saiu.taxas.valor === 0 ? (
                <p className="text-xs text-slate-500">Nenhuma despesa paga no período.</p>
              ) : null}
            </div>
          </Cartao>

          <Cartao tom={positivo ? "verde" : "vermelho"}>
            <Rotulo>Quanto sobrou</Rotulo>
            <p className={`mt-1 text-4xl font-bold ${positivo ? "text-emerald-700" : "text-rose-700"}`}>{formatarMoeda(dados.sobrou)}</p>
            <p className="mt-1 text-xs text-slate-500">Entrou menos saiu (o que ficou no caixa).</p>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <Linha rotulo="Ainda a pagar deste período">
                <Valor numero={dados.aPagar} titulo="Ainda a pagar" subtitulo="contas do período que ainda não foram pagas" abrir={abrir} className="text-amber-800" />
              </Linha>
              <div className="flex items-baseline justify-between gap-3 border-t border-amber-200 pt-2 text-sm">
                <span className="font-semibold text-slate-700">Sobra depois de pagar tudo</span>
                <span className={`shrink-0 text-lg font-bold ${sobraFinalPositiva ? "text-emerald-700" : "text-rose-700"}`}>
                  {formatarMoeda(dados.sobraDepoisDePagar)}
                </span>
              </div>
            </div>
          </Cartao>
        </div>
      </Bloco>

      {/* ---------------------------------------------- Bloco 2 */}
      <Bloco titulo="Clientes">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Cartao>
            <Rotulo>Clientes novos</Rotulo>
            <Valor numero={clientes.novos} titulo="Clientes novos" subtitulo="cadastradas no período" contagem abrir={abrir} className="mt-1 block text-3xl font-bold text-slate-950" />
            <p className="mt-1 text-xs text-slate-500">Cadastradas no período.</p>
          </Cartao>
          <Cartao>
            <Rotulo>Atendimentos</Rotulo>
            <Valor numero={clientes.atendimentos} titulo="Atendimentos" subtitulo="finalizados no período" contagem abrir={abrir} className="mt-1 block text-3xl font-bold text-slate-950" />
            <p className="mt-1 text-xs text-slate-500">Atendimentos finalizados.</p>
          </Cartao>
          <Cartao>
            <Rotulo>Ticket médio</Rotulo>
            <div className="mt-2">
              <Linha rotulo="Por cliente">
                <Valor
                  numero={clientes.vendas}
                  titulo="Ticket médio"
                  subtitulo={`vendas pagas de ${clientes.clientesQueCompraram} cliente(s)`}
                  abrir={abrir}
                  texto={clientes.ticketCliente === null ? "—" : formatarMoeda(clientes.ticketCliente)}
                />
              </Linha>
              <Linha rotulo="Por atendimento">
                <Valor
                  numero={clientes.vendas}
                  titulo="Ticket médio"
                  subtitulo={`${clientes.vendas.itens.length} venda(s) paga(s)`}
                  abrir={abrir}
                  texto={clientes.ticketAtendimento === null ? "—" : formatarMoeda(clientes.ticketAtendimento)}
                />
              </Linha>
            </div>
            <p className="mt-1 text-xs text-slate-500">Quanto cada cliente gastou, em média, no período.</p>
          </Cartao>
          <Cartao>
            <Rotulo>Clientes que voltaram</Rotulo>
            <Valor numero={clientes.voltaram} titulo="Clientes que voltaram" subtitulo="atendidas no período que já tinham vindo antes" contagem abrir={abrir} className="mt-1 block text-3xl font-bold text-slate-950" />
            <p className="mt-1 text-xs text-slate-500">
              Renderam{" "}
              <Valor numero={clientes.voltaramRenderam} titulo="Quanto renderam as clientes que voltaram" abrir={abrir} className="font-semibold text-emerald-700" />
            </p>
          </Cartao>
        </div>
      </Bloco>

      {/* ---------------------------------------------- Bloco 3 */}
      <Bloco
        titulo="Anúncios"
        descricao="Só conta quem veio de clique pago (Google Ads ou Instagram Ads). Cliente do anúncio = cadastrou ou comprou pelo anúncio no período."
      >
        <div className="overflow-x-auto">
          <div className="grid min-w-[560px] gap-x-3" style={{ gridTemplateColumns: `minmax(150px,1.2fr) repeat(${canais.length}, minmax(110px,1fr))` }}>
            <span />
            {canais.map((canal) => (
              <span key={canal} className={`pb-2 text-right text-xs font-bold uppercase tracking-[0.12em] ${canal === "total" ? "text-slate-900" : "text-slate-500"}`}>
                {NOMES_CANAL[canal]}
              </span>
            ))}

            <span className="border-t border-slate-100 py-2 text-sm text-slate-600">Quanto gastei</span>
            {canais.map((canal) => (
              <span key={canal} className="border-t border-slate-100 py-2 text-right text-sm font-semibold text-rose-700">
                <Valor numero={anuncios.gasto[canal]} titulo={`Gasto em anúncios · ${NOMES_CANAL[canal]}`} abrir={abrir} />
              </span>
            ))}

            <span className="border-t border-slate-100 py-2 text-sm text-slate-600">Leads</span>
            {canais.map((canal) => (
              <span key={canal} className="border-t border-slate-100 py-2 text-right text-sm font-semibold text-slate-900">
                <Valor numero={anuncios.leads[canal]} titulo={`Leads dos anúncios · ${NOMES_CANAL[canal]}`} contagem abrir={abrir} />
              </span>
            ))}

            <span className="border-t border-slate-100 py-2 text-sm text-slate-600">Clientes</span>
            {canais.map((canal) => (
              <span key={canal} className="border-t border-slate-100 py-2 text-right text-sm font-semibold text-slate-900">
                <Valor numero={anuncios.clientes[canal]} titulo={`Clientes dos anúncios · ${NOMES_CANAL[canal]}`} subtitulo="cadastrou ou comprou pelo anúncio" contagem abrir={abrir} />
              </span>
            ))}

            <span className="border-t border-slate-100 py-2 text-sm text-slate-600">Quanto renderam</span>
            {canais.map((canal) => (
              <span key={canal} className="border-t border-slate-100 py-2 text-right text-sm font-semibold text-emerald-700">
                <Valor numero={anuncios.renderam[canal]} titulo={`Quanto os clientes dos anúncios renderam · ${NOMES_CANAL[canal]}`} subtitulo="vendas fechadas e pagas" abrir={abrir} />
              </span>
            ))}

            <span className="border-t border-slate-200 py-2 text-sm font-semibold text-slate-700">Retorno</span>
            {canais.map((canal) => {
              const retorno = anuncios.retorno[canal];
              return (
                <span
                  key={canal}
                  className={`border-t border-slate-200 py-2 text-right text-sm font-bold ${retorno === null ? "text-slate-400" : retorno >= 1 ? "text-emerald-700" : "text-rose-700"}`}
                >
                  {textoRetorno(retorno)}
                </span>
              );
            })}
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-4 text-slate-500">
          Retorno = quanto voltou em vendas para cada R$ 1 gasto no anúncio. O gasto do Google entra sozinho; o do Instagram só aparece quando é lançado em Marketing &gt; Mais &gt; Lançar custo.
        </p>
      </Bloco>

      {detalhe ? <DetalheModal detalhe={detalhe} onClose={() => setDetalhe(null)} /> : null}
    </div>
  );
}
