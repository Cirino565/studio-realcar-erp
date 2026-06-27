import Link from "next/link";
import { redirect } from "next/navigation";

import { criarAgendamento } from "@/actions/agendamento.actions";
import { Button } from "@/components/ui/button";
import { requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams?: Promise<{
    data?: string;
    hora?: string;
    profissionalId?: string;
  }>;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string) {
  const value = getString(formData, key).replace(".", "").replace(",", ".");
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function validDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date().toISOString().slice(0, 10);
  }

  return value;
}

function validTime(value?: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return "09:00";
  }

  return value;
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="premium-input min-h-12 w-full"
      />
    </label>
  );
}

async function salvarAgendamentoMobile(formData: FormData) {
  "use server";

  const data = getString(formData, "data") || new Date().toISOString().slice(0, 10);
  const hora = getString(formData, "hora") || "09:00";
  const clienteId = getNumber(formData, "clienteId");
  const profissionalId = getNumber(formData, "profissionalId");
  const procedimento = getString(formData, "procedimento") || getString(formData, "procedimentoOutro") || "Avaliação";
  const novoClienteNome = getString(formData, "novoClienteNome");
  const novoClienteWhatsapp = getString(formData, "novoClienteWhatsapp");
  const novoClienteOrigem = getString(formData, "novoClienteOrigem");

  await criarAgendamento({
    clienteId: clienteId > 0 ? clienteId : undefined,
    novoCliente:
      clienteId > 0
        ? undefined
        : {
            nome: novoClienteNome,
            whatsapp: novoClienteWhatsapp,
            telefone: novoClienteWhatsapp,
            origem: novoClienteOrigem,
            procedimentoInteresse: procedimento,
          },
    profissionalId: profissionalId > 0 ? profissionalId : undefined,
    procedimento,
    data: `${data}T${hora}:00`,
    duracao: getNumber(formData, "duracao") || 60,
    valor: getNumber(formData, "valor"),
    status: getString(formData, "status") || "Agendado",
    observacoes: getString(formData, "observacoes"),
  });

  redirect(`/agenda?data=${data}`);
}

export default async function NovoAgendamentoPage({ searchParams }: Props) {
  await requirePagePermission("agenda.gerenciar");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const dataPadrao = validDate(resolvedSearchParams.data);
  const horaPadrao = validTime(resolvedSearchParams.hora);
  const profissionalPadrao = resolvedSearchParams.profissionalId || "";

  const [clientes, profissionais, origensCliente, servicos] = await Promise.all([
    prisma.cliente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, telefone: true, whatsapp: true } }),
    prisma.profissional.findMany({ where: { status: "Ativa" }, orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
    prisma.origemCliente.findMany({ where: { status: "Ativa" }, orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
    prisma.procedimentoServico.findMany({ where: { status: "Ativo" }, orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
  ]);

  const origemPadrao = origensCliente[0]?.nome || "Indicação";
  const servicoPadrao = servicos[0];

  return (
    <div className="app-mobile-safe mx-auto max-w-5xl space-y-5 sm:space-y-6">
      <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
        <Button variant="ghost" asChild className="w-full justify-center sm:w-auto">
          <Link href={`/agenda?data=${dataPadrao}`}>Voltar para agenda</Link>
        </Button>
      </div>

      <section className="premium-card overflow-hidden">
        <div className="border-b border-white/[0.08] bg-white/[0.035] p-5 sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Novo agendamento</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Página de cadastro compatível com celular. Use cliente cadastrado ou informe um novo cliente abaixo.
          </p>
        </div>

        <form action={salvarAgendamentoMobile} className="space-y-6 p-5 sm:p-7">
          <div className="rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-sm leading-6 text-cyan-100">
            Para cliente já cadastrado, selecione na lista. Para cliente novo, deixe a lista em “Cadastrar novo cliente” e preencha nome/WhatsApp.
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="space-y-4 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
              <h2 className="text-base font-semibold text-white">Cliente</h2>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cliente cadastrado</span>
                <select name="clienteId" defaultValue="" className="premium-input min-h-12 w-full">
                  <option value="">Cadastrar novo cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome} {cliente.whatsapp || cliente.telefone ? `· ${cliente.whatsapp || cliente.telefone}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <Field label="Nome do novo cliente" name="novoClienteNome" placeholder="Preencha se não selecionar cliente cadastrado" />
              <Field label="WhatsApp do novo cliente" name="novoClienteWhatsapp" placeholder="(11) 99999-9999" />

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Origem do novo cliente</span>
                <select name="novoClienteOrigem" defaultValue={origemPadrao} className="premium-input min-h-12 w-full">
                  {origensCliente.length > 0 ? (
                    origensCliente.map((origem) => (
                      <option key={origem.id} value={origem.nome}>{origem.nome}</option>
                    ))
                  ) : (
                    <option value="Indicação">Indicação</option>
                  )}
                </select>
              </label>
            </section>

            <section className="space-y-4 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
              <h2 className="text-base font-semibold text-white">Atendimento</h2>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Profissional</span>
                <select name="profissionalId" defaultValue={profissionalPadrao} className="premium-input min-h-12 w-full">
                  <option value="">Sem profissional definido</option>
                  {profissionais.map((profissional) => (
                    <option key={profissional.id} value={profissional.id}>
                      {profissional.nome} {profissional.area ? `· ${profissional.area}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Procedimento</span>
                <select name="procedimento" defaultValue={servicoPadrao?.nome || "Avaliação"} className="premium-input min-h-12 w-full">
                  {servicos.length > 0 ? (
                    servicos.map((servico) => (
                      <option key={servico.id} value={servico.nome}>
                        {servico.nome} · {servico.duracaoPadrao} min
                      </option>
                    ))
                  ) : (
                    <option value="Avaliação">Avaliação</option>
                  )}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Data" name="data" type="date" required defaultValue={dataPadrao} />
                <Field label="Hora" name="hora" type="time" required defaultValue={horaPadrao} />
                <Field label="Duração em minutos" name="duracao" type="number" defaultValue={servicoPadrao?.duracaoPadrao || 60} />
                <Field label="Valor" name="valor" placeholder="0,00" />
              </div>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</span>
                <select name="status" defaultValue="Agendado" className="premium-input min-h-12 w-full">
                  <option value="Agendado">Agendado</option>
                  <option value="Confirmado">Confirmado</option>
                  <option value="Atendido">Atendido</option>
                  <option value="Faltou">Faltou</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Observações</span>
                <textarea name="observacoes" rows={4} className="premium-input min-h-28 w-full py-3" />
              </label>
            </section>
          </div>

          <div className="grid gap-3 border-t border-white/[0.08] pt-5 sm:flex sm:justify-end">
            <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
              <Link href={`/agenda?data=${dataPadrao}`}>Cancelar</Link>
            </Button>
            <Button type="submit" className="w-full sm:w-auto">Salvar agendamento</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
