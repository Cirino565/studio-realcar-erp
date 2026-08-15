/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, CalendarDays, Save, UserRound, X } from "lucide-react";

import { atualizarClienteNoAtendimento } from "@/actions/cliente.actions";
import EnderecoClienteFields, {
  type EnderecoClienteValues,
} from "@/components/clientes/EnderecoClienteFields";

type ClienteAtendimento = {
  id: number;
  nome: string;
  telefone: string;
  whatsapp: string | null;
  cpf: string | null;
  nascimento: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  enderecoOriginal: string | null;
  responsavelNome: string | null;
  responsavelTelefone: string | null;
  responsavelParentesco: string | null;
  observacoes: string | null;
};

type Props = {
  open: boolean;
  cliente: ClienteAtendimento | null;
  onClose: () => void;
  onSaved: (cliente: ClienteAtendimento) => void;
};

/**
 * Menor de idade pela data de nascimento informada. Sem data preenchida
 * devolve false - nao da para afirmar, entao a secao do responsavel fica
 * disponivel mas fechada, em vez de sumir.
 */
function ehMenorDeIdade(nascimento: string) {
  if (!nascimento) return false;

  const data = new Date(`${nascimento}T12:00:00`);
  if (Number.isNaN(data.getTime())) return false;

  const hoje = new Date();
  let idade = hoje.getFullYear() - data.getFullYear();
  const mes = hoje.getMonth() - data.getMonth();

  if (mes < 0 || (mes === 0 && hoje.getDate() < data.getDate())) {
    idade--;
  }

  return idade >= 0 && idade < 18;
}

type FormState = {
  nome: string;
  responsavelNome: string;
  responsavelTelefone: string;
  responsavelParentesco: string;
  telefone: string;
  whatsapp: string;
  cpf: string;
  nascimento: string;
  observacoes: string;
} & EnderecoClienteValues;

function dataInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function montarForm(cliente: ClienteAtendimento): FormState {
  return {
    nome: cliente.nome || "",
    responsavelNome: cliente.responsavelNome || "",
    responsavelTelefone: cliente.responsavelTelefone || "",
    responsavelParentesco: cliente.responsavelParentesco || "",
    telefone: cliente.telefone || "",
    whatsapp: cliente.whatsapp || "",
    cpf: cliente.cpf || "",
    nascimento: dataInput(cliente.nascimento),
    observacoes: cliente.observacoes || "",
    cep: cliente.cep || "",
    logradouro: cliente.logradouro || "",
    numero: cliente.numero || "",
    complemento: cliente.complemento || "",
    bairro: cliente.bairro || "",
    cidade: cliente.cidade || "",
    estado: cliente.estado || "",
    enderecoOriginal: cliente.enderecoOriginal || "",
  };
}

export default function ClienteQuickEditModal({
  open,
  cliente,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !cliente) {
      setForm(null);
      setErro(null);
      return;
    }

    setForm(montarForm(cliente));
    setErro(null);
  }, [open, cliente]);

  if (!open || !cliente || !form) return null;

  function atualizar<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setErro(null);
    setForm((atual) => (atual ? { ...atual, [campo]: valor } : atual));
  }

  function salvar() {
    if (!cliente || !form) return;

    const clienteAtual = cliente;
    const formAtual = form;

    setErro(null);

    if (!formAtual.nome.trim()) {
      setErro("Informe o nome da cliente.");
      return;
    }

    if (!formAtual.telefone.trim() && !formAtual.whatsapp.trim()) {
      setErro("Informe pelo menos o telefone ou o WhatsApp da cliente.");
      return;
    }

    startTransition(async () => {
      try {
        const atualizado = await atualizarClienteNoAtendimento({
          id: clienteAtual.id,
          nome: formAtual.nome,
          responsavelNome: formAtual.responsavelNome,
          responsavelTelefone: formAtual.responsavelTelefone,
          responsavelParentesco: formAtual.responsavelParentesco,
          telefone: formAtual.telefone,
          whatsapp: formAtual.whatsapp,
          cpf: formAtual.cpf,
          nascimento: formAtual.nascimento,
          observacoes: formAtual.observacoes,
          cep: formAtual.cep,
          logradouro: formAtual.logradouro,
          numero: formAtual.numero,
          complemento: formAtual.complemento,
          bairro: formAtual.bairro,
          cidade: formAtual.cidade,
          estado: formAtual.estado,
          enderecoOriginal: formAtual.enderecoOriginal,
        });

        onSaved(atualizado);
        onClose();
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o cadastro da cliente.",
        );
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[140] h-[100dvh] w-[100vw] overflow-hidden overscroll-none"
      style={{ touchAction: "pan-y" }}
    >
      <button
        type="button"
        aria-label="Fechar edição rápida da cliente"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
      />

      <aside
        className="absolute inset-y-0 right-0 flex h-[100dvh] w-[100vw] min-w-0 max-w-[620px] flex-col overflow-hidden border-l border-slate-200 bg-slate-50 shadow-2xl"
        style={{ touchAction: "pan-y" }}
      >
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <UserRound size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Cadastro rápido
                </p>
                <h2 className="truncate text-base font-bold text-slate-950">
                  {cliente.nome}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              aria-label="Fechar"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-5">
          <div className="w-full min-w-0 max-w-full space-y-4">
            {erro ? (
              <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <p>{erro}</p>
              </div>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Nome
                  </span>
                  <input
                    value={form.nome}
                    onChange={(event) => atualizar("nome", event.target.value)}
                    className="premium-input w-full"
                    autoComplete="name"
                  />
                </label>

                <label>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Telefone
                  </span>
                  <input
                    value={form.telefone}
                    onChange={(event) => atualizar("telefone", event.target.value)}
                    className="premium-input w-full"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </label>

                <label>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    WhatsApp
                  </span>
                  <input
                    value={form.whatsapp}
                    onChange={(event) => atualizar("whatsapp", event.target.value)}
                    className="premium-input w-full"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </label>

                <label>
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    CPF
                  </span>
                  <input
                    value={form.cpf}
                    onChange={(event) => atualizar("cpf", event.target.value)}
                    className="premium-input w-full"
                    inputMode="numeric"
                  />
                </label>

                <label>
                  <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    <CalendarDays size={13} /> Data de nascimento
                  </span>
                  <input
                    type="date"
                    value={form.nascimento}
                    onChange={(event) => atualizar("nascimento", event.target.value)}
                    className="premium-input w-full"
                  />
                </label>
              </div>

              <details
                open={ehMenorDeIdade(form.nascimento)}
                className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Responsável legal
                  {ehMenorDeIdade(form.nascimento)
                    ? " · cliente menor de idade"
                    : " · opcional"}
                </summary>

                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <label>
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Nome
                    </span>
                    <input
                      value={form.responsavelNome}
                      onChange={(event) =>
                        atualizar("responsavelNome", event.target.value)
                      }
                      className="premium-input w-full"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Telefone
                    </span>
                    <input
                      value={form.responsavelTelefone}
                      onChange={(event) =>
                        atualizar("responsavelTelefone", event.target.value)
                      }
                      className="premium-input w-full"
                      inputMode="tel"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Vínculo
                    </span>
                    <select
                      value={form.responsavelParentesco}
                      onChange={(event) =>
                        atualizar("responsavelParentesco", event.target.value)
                      }
                      className="premium-input w-full"
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
              </details>
            </section>

            <EnderecoClienteFields
              key={cliente.id}
              initialValues={form}
              onValuesChange={(endereco) => {
                setErro(null);
                setForm((atual) => (atual ? { ...atual, ...endereco } : atual));
              }}
            />

            <label className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Observações cadastrais
              </span>
              <textarea
                value={form.observacoes}
                onChange={(event) => atualizar("observacoes", event.target.value)}
                rows={4}
                className="premium-input min-h-24 w-full resize-y py-3"
              />
            </label>
          </div>
        </main>

        <footer className="shrink-0 border-t border-slate-200 bg-white p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:px-5">
          <button
            type="button"
            onClick={salvar}
            disabled={isPending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Save size={17} />
            {isPending ? "Salvando cadastro..." : "Salvar e voltar ao atendimento"}
          </button>
        </footer>
      </aside>
    </div>
  );
}