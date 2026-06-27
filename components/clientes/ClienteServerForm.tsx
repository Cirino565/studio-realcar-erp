import Link from "next/link";
import type { Cliente, OrigemCliente, ProcedimentoInteresse } from "@prisma/client";

import { Button } from "@/components/ui/button";

type Props = {
  titulo: string;
  descricao: string;
  cliente?: Cliente | null;
  origens: OrigemCliente[];
  procedimentosInteresse: ProcedimentoInteresse[];
  action: (formData: FormData) => Promise<void>;
};

const ORIGENS_FALLBACK = [
  "Indicação",
  "Google Ads",
  "Facebook Ads",
  "Instagram",
  "WhatsApp",
  "Busca orgânica",
  "Cliente antigo",
  "Passou na frente",
  "Outro",
];

const PROCEDIMENTOS_FALLBACK = [
  "Avaliação",
  "Limpeza de pele",
  "Botox",
  "Preenchimento",
  "Bioestimulador",
  "Depilação",
  "Massagem",
  "Drenagem",
  "Peeling",
  "Outro",
];

function dateValue(value?: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
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

export default function ClienteServerForm({
  titulo,
  descricao,
  cliente,
  origens,
  procedimentosInteresse,
  action,
}: Props) {
  const origensDisponiveis = origens.length > 0 ? origens.map((origem) => origem.nome) : ORIGENS_FALLBACK;
  const procedimentosDisponiveis =
    procedimentosInteresse.length > 0
      ? procedimentosInteresse.map((procedimento) => procedimento.nome)
      : PROCEDIMENTOS_FALLBACK;
  const origemPadrao = cliente?.origem || origensDisponiveis[0] || "Indicação";
  const procedimentoPadrao =
    cliente?.procedimentoInteresse || cliente?.procedimento || procedimentosDisponiveis[0] || "Avaliação";

  return (
    <div className="app-mobile-safe mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
        <Button variant="ghost" asChild className="w-full justify-center sm:w-auto">
          <Link href="/clientes">Voltar para clientes</Link>
        </Button>
      </div>

      <section className="premium-card overflow-hidden">
        <div className="border-b border-white/[0.08] bg-white/[0.035] p-5 sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{titulo}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">{descricao}</p>
        </div>

        <form action={action} className="space-y-5 p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nome completo" name="nome" required defaultValue={cliente?.nome} placeholder="Nome do cliente" />
            </div>

            <Field label="Telefone" name="telefone" defaultValue={cliente?.telefone} placeholder="(11) 99999-9999" />
            <Field label="WhatsApp" name="whatsapp" defaultValue={cliente?.whatsapp} placeholder="(11) 99999-9999" />
            <Field label="CPF" name="cpf" defaultValue={cliente?.cpf} placeholder="000.000.000-00" />
            <Field label="Instagram" name="instagram" defaultValue={cliente?.instagram} placeholder="@perfil" />

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Origem</span>
              <select name="origem" defaultValue={origemPadrao} className="premium-input min-h-12 w-full">
                {origensDisponiveis.map((origem) => (
                  <option key={origem} value={origem}>
                    {origem}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Procedimento de interesse</span>
              <select name="procedimentoInteresse" defaultValue={procedimentoPadrao} className="premium-input min-h-12 w-full">
                {procedimentosDisponiveis.map((procedimento) => (
                  <option key={procedimento} value={procedimento}>
                    {procedimento}
                  </option>
                ))}
              </select>
            </label>

            <Field label="Nascimento" name="nascimento" type="date" defaultValue={dateValue(cliente?.nascimento)} />

            <label className="space-y-2 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Observações</span>
              <textarea
                name="observacoes"
                defaultValue={cliente?.observacoes ?? ""}
                rows={5}
                placeholder="Preferências, restrições, observações comerciais ou informações úteis para o atendimento."
                className="premium-input min-h-32 w-full py-3"
              />
            </label>
          </div>

          <div className="grid gap-3 border-t border-white/[0.08] pt-5 sm:flex sm:justify-end">
            <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
              <Link href={cliente ? `/clientes/${cliente.id}` : "/clientes"}>Cancelar</Link>
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              Salvar cliente
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
