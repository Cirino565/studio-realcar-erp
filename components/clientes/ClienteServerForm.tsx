import Link from "next/link";
import type { CampanhaMarketing, Cliente, OrigemCliente, ProcedimentoInteresse } from "@prisma/client";

import EnderecoClienteFields from "@/components/clientes/EnderecoClienteFields";
import ProcedimentoSearchSelect from "@/components/clientes/ProcedimentoSearchSelect";
import { Button } from "@/components/ui/button";

type Props = {
  titulo: string;
  descricao: string;
  cliente?: Cliente | null;
  origens: OrigemCliente[];
  procedimentosInteresse: ProcedimentoInteresse[];
  campanhas: CampanhaMarketing[];
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
    <label className="min-w-0 space-y-2">
      <span className="block break-words text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="premium-input min-h-12 w-full min-w-0 max-w-full"
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
  campanhas,
  action,
}: Props) {
  const origensDisponiveis =
    origens.length > 0 ? origens.map((origem) => origem.nome) : ORIGENS_FALLBACK;

  const procedimentosDisponiveis =
    procedimentosInteresse.length > 0
      ? procedimentosInteresse.map((procedimento) => procedimento.nome)
      : PROCEDIMENTOS_FALLBACK;

  const origemPadrao =
    cliente?.origem || origensDisponiveis[0] || "Indicação";

  const procedimentoPadrao =
    cliente?.procedimentoInteresse ||
    cliente?.procedimento ||
    procedimentosDisponiveis[0] ||
    "Avaliação";

  return (
    <div
      className="app-mobile-safe cliente-form-locked mx-auto w-full min-w-0 max-w-4xl overflow-x-hidden overscroll-x-none space-y-5 sm:space-y-6"
      style={{
        touchAction: "pan-y",
        overscrollBehaviorX: "none",
        maxWidth: "100%",
      }}
    >
      <div className="grid min-w-0 gap-3 sm:flex sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          asChild
          className="w-full min-w-0 justify-center sm:w-auto"
        >
          <Link href="/clientes">Voltar para clientes</Link>
        </Button>
      </div>

      <section className="premium-card w-full min-w-0 max-w-full overflow-hidden">
        <div className="min-w-0 border-b border-white/[0.08] bg-white/[0.035] p-5 sm:p-7">
          <h1 className="break-words text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {titulo}
          </h1>

          <p className="mt-2 break-words text-sm leading-6 text-slate-400">
            {descricao}
          </p>
        </div>

        <form
          action={action}
          className="w-full min-w-0 max-w-full space-y-5 overflow-x-hidden p-5 sm:p-7"
        >
          <div className="grid min-w-0 max-w-full gap-4 sm:grid-cols-2">
            <div className="min-w-0 sm:col-span-2">
              <Field
                label="Nome completo"
                name="nome"
                required
                defaultValue={cliente?.nome}
                placeholder="Nome do cliente"
              />
            </div>

            <Field
              label="Telefone"
              name="telefone"
              defaultValue={cliente?.telefone}
              placeholder="(11) 99999-9999"
            />

            <Field
              label="WhatsApp"
              name="whatsapp"
              defaultValue={cliente?.whatsapp}
              placeholder="(11) 99999-9999"
            />

            <Field
              label="CPF"
              name="cpf"
              defaultValue={cliente?.cpf}
              placeholder="000.000.000-00"
            />

            <label className="min-w-0 space-y-2">
              <span className="block break-words text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Origem
              </span>

              <select
                name="origem"
                defaultValue={origemPadrao}
                className="premium-input min-h-12 w-full min-w-0 max-w-full"
              >
                {origensDisponiveis.map((origem) => (
                  <option key={origem} value={origem}>
                    {origem}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0 space-y-2">
              <span className="block break-words text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Campanha de aquisição
              </span>

              <select
                name="campanhaAquisicaoId"
                defaultValue={cliente?.campanhaAquisicaoId ?? ""}
                className="premium-input min-h-12 w-full min-w-0 max-w-full"
              >
                <option value="">Sem campanha vinculada</option>
                {campanhas.map((campanha) => (
                  <option key={campanha.id} value={campanha.id}>
                    {campanha.nome} · {campanha.canal} · {campanha.status}
                  </option>
                ))}
              </select>
            </label>

            <div className="min-w-0 space-y-2">
              <span className="block break-words text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Procedimento de interesse
              </span>

              <ProcedimentoSearchSelect
                name="procedimentoInteresse"
                options={procedimentosDisponiveis}
                defaultValue={procedimentoPadrao}
              />
            </div>

            <Field
              label="Nascimento"
              name="nascimento"
              type="date"
              defaultValue={dateValue(cliente?.nascimento)}
            />

            <div className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Responsável legal (se o cliente for menor de idade)
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Nome do responsável"
                  name="responsavelNome"
                  defaultValue={cliente?.responsavelNome ?? ""}
                  placeholder="Ex: nome da mãe ou responsável"
                />

                <Field
                  label="Telefone do responsável"
                  name="responsavelTelefone"
                  defaultValue={cliente?.responsavelTelefone ?? ""}
                  placeholder="(11) 91234-5678"
                />

                <label className="min-w-0 space-y-2">
                  <span className="block break-words text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Vínculo
                  </span>
                  <select
                    name="responsavelParentesco"
                    defaultValue={cliente?.responsavelParentesco ?? ""}
                    className="premium-input min-h-12 w-full min-w-0 max-w-full"
                  >
                    <option value="">Selecione</option>
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Avó">Avó</option>
                    <option value="Avô">Avô</option>
                    <option value="Tutor(a) legal">Tutor(a) legal</option>
                    <option value="Outro">Outro</option>
                  </select>
                </label>
              </div>

              <p className="text-xs leading-5 text-slate-500">
                Preencha quando quem assina a anamnese e autoriza o atendimento
                for diferente de quem recebe o atendimento.
              </p>
            </div>

            <div className="min-w-0 space-y-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 sm:col-span-2 dark:border-teal-400/20 dark:bg-teal-500/10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-800 dark:text-teal-200">
                  Contato de confiança
                  <span className="ml-2 normal-case tracking-normal text-slate-500 dark:text-slate-400">
                    opcional
                  </span>
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  Pessoa próxima que podemos contatar caso seja necessário falar com alguém de confiança do cliente.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Nome"
                  name="contatoConfiancaNome"
                  defaultValue={cliente?.contatoConfiancaNome ?? ""}
                  placeholder="Nome da pessoa"
                />

                <Field
                  label="Telefone / WhatsApp"
                  name="contatoConfiancaTelefone"
                  defaultValue={cliente?.contatoConfiancaTelefone ?? ""}
                  placeholder="(11) 91234-5678"
                />

                <label className="min-w-0 space-y-2">
                  <span className="block break-words text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Vínculo
                  </span>
                  <select
                    name="contatoConfiancaVinculo"
                    defaultValue={cliente?.contatoConfiancaVinculo ?? ""}
                    className="premium-input min-h-12 w-full min-w-0 max-w-full"
                  >
                    <option value="">Selecione</option>
                    <option value="Cônjuge / companheiro(a)">Cônjuge / companheiro(a)</option>
                    <option value="Mãe">Mãe</option>
                    <option value="Pai">Pai</option>
                    <option value="Filho(a)">Filho(a)</option>
                    <option value="Irmão(ã)">Irmão(ã)</option>
                    <option value="Amigo(a)">Amigo(a)</option>
                    <option value="Outro">Outro</option>
                  </select>
                </label>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-teal-200 bg-white px-4 py-3 dark:border-teal-400/20 dark:bg-white/[0.05]">
                <input
                  type="checkbox"
                  name="contatoConfiancaAutorizado"
                  defaultChecked={cliente?.contatoConfiancaAutorizado ?? false}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-teal-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Cliente autoriza contato, se necessário
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Uso restrito a situações relacionadas ao atendimento.
                  </span>
                </span>
              </label>
            </div>
            <EnderecoClienteFields
              initialValues={{
                cep: cliente?.cep ?? "",
                logradouro: cliente?.logradouro ?? "",
                numero: cliente?.numero ?? "",
                complemento: cliente?.complemento ?? "",
                bairro: cliente?.bairro ?? "",
                cidade: cliente?.cidade ?? "",
                estado: cliente?.estado ?? "",
                enderecoOriginal: cliente?.enderecoOriginal ?? "",
              }}
            />

            <fieldset className="min-w-0 rounded-2xl border border-white/[0.10] bg-white/[0.035] p-4 sm:col-span-2">
              <legend className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Áreas de atendimento
              </legend>
              <p className="mb-3 text-xs leading-5 text-slate-400">
                Selecione uma ou as duas áreas. O cadastro também pode permanecer sem área definida.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    name="areaEstetica"
                    defaultChecked={cliente?.areaEstetica ?? false}
                    className="h-4 w-4 rounded border-white/20 accent-violet-500"
                  />
                  Estética
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    name="areaCilios"
                    defaultChecked={cliente?.areaCilios ?? false}
                    className="h-4 w-4 rounded border-white/20 accent-violet-500"
                  />
                  Cílios
                </label>
              </div>
            </fieldset>

            <label className="min-w-0 space-y-2 sm:col-span-2">
              <span className="block break-words text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Observações
              </span>

              <textarea
                name="observacoes"
                defaultValue={cliente?.observacoes ?? ""}
                rows={5}
                placeholder="Preferências, restrições, observações comerciais ou informações úteis para o atendimento."
                className="premium-input min-h-32 w-full min-w-0 max-w-full resize-y py-3"
              />
            </label>
          </div>

          <div className="grid min-w-0 gap-3 border-t border-white/[0.08] pt-5 sm:flex sm:justify-end">
            <Button
              type="button"
              variant="outline"
              asChild
              className="w-full min-w-0 sm:w-auto"
            >
              <Link href={cliente ? `/clientes/${cliente.id}` : "/clientes"}>
                Cancelar
              </Link>
            </Button>

            <Button
              type="submit"
              className="w-full min-w-0 sm:w-auto"
            >
              Salvar cliente
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}