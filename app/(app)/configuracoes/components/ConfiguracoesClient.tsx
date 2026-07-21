"use client";

import type * as React from "react";
import { useMemo, useState, useTransition } from "react";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Copy,
  Image as ImageIcon,
  ListChecks,
  Mail,
  MapPin,
  MessageCircle,
  Palette,
  Phone,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  ClipboardList,
  Trash2,
} from "lucide-react";

import {
  salvarConfiguracaoClinica,
  type SalvarConfiguracaoInput,
} from "@/actions/configuracao.actions";
import {
  criarCadastrosAuxiliaresPadrao,
  criarOrigemCliente,
  criarProcedimentoInteresse,
  criarProcedimentoServico,
  excluirOrigemCliente,
  excluirProcedimentoInteresse,
  excluirProcedimentoServico,
} from "@/actions/cadastro-auxiliar.actions";
import { Button } from "@/components/ui/button";
import type {
  AnamneseModeloView,
  CadastroAuxiliarView,
  ConfiguracaoClinicaView,
  ConfiguracoesTab,
  ProcedimentoServicoView,
} from "../types";
import AnamneseConfigSection from "./AnamneseConfigSection";

type Props = {
  configuracao: ConfiguracaoClinicaView;
  origens: CadastroAuxiliarView[];
  procedimentosInteresse: CadastroAuxiliarView[];
  servicos: ProcedimentoServicoView[];
  anamneseModelos: AnamneseModeloView[];
};

type FieldProps = {
  label: string;
  name: keyof SalvarConfiguracaoInput;
  value: string | number;
  placeholder?: string;
  type?: "text" | "email" | "number" | "url";
  min?: number;
  onChange: (name: keyof SalvarConfiguracaoInput, value: string) => void;
};

type TextAreaProps = {
  label: string;
  name: keyof SalvarConfiguracaoInput;
  value: string;
  placeholder?: string;
  rows?: number;
  onChange: (name: keyof SalvarConfiguracaoInput, value: string) => void;
};

const tabs: {
  key: ConfiguracoesTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "clinica", label: "Clínica", icon: Building2 },
  { key: "agenda", label: "Agenda", icon: CalendarClock },
  { key: "mensagens", label: "Mensagens", icon: MessageCircle },
  { key: "identidade", label: "Identidade", icon: Palette },
  { key: "auxiliares", label: "Auxiliares", icon: ListChecks },
  { key: "anamnese", label: "Anamnese", icon: ClipboardList },
];

const defaultConfirmacao =
  "Olá, {cliente}! Seu agendamento no {clinica} está confirmado para {data} às {hora}.";
const defaultLembrete =
  "Olá, {cliente}! Passando para lembrar do seu horário no {clinica}: {data} às {hora}.";
const defaultRetorno =
  "Olá, {cliente}! Tudo bem? Estamos passando para saber como você está após seu atendimento no {clinica}.";

function toText(value: string | null | undefined) {
  return value ?? "";
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type HorariosAgendaForm = {
  semanaAbertura: string;
  semanaFechamento: string;
  sabadoAtivo: boolean;
  sabadoAbertura: string;
  sabadoFechamento: string;
};

const HORARIOS_AGENDA_PADRAO: HorariosAgendaForm = {
  semanaAbertura: "09:00",
  semanaFechamento: "19:00",
  sabadoAtivo: true,
  sabadoAbertura: "09:00",
  sabadoFechamento: "17:00",
};

function parseHorariosAgenda(value?: string | null): HorariosAgendaForm {
  if (!value) {
    return { ...HORARIOS_AGENDA_PADRAO };
  }

  const semana = value.match(/SEG-SEX=(\d{2}:\d{2})-(\d{2}:\d{2})/i);
  const sabado = value.match(/SAB=(FECHADO|(\d{2}:\d{2})-(\d{2}:\d{2}))/i);

  if (semana || sabado) {
    return {
      semanaAbertura: semana?.[1] || HORARIOS_AGENDA_PADRAO.semanaAbertura,
      semanaFechamento: semana?.[2] || HORARIOS_AGENDA_PADRAO.semanaFechamento,
      sabadoAtivo: sabado ? sabado[1].toUpperCase() !== "FECHADO" : true,
      sabadoAbertura: sabado?.[2] || HORARIOS_AGENDA_PADRAO.sabadoAbertura,
      sabadoFechamento: sabado?.[3] || HORARIOS_AGENDA_PADRAO.sabadoFechamento,
    };
  }

  return { ...HORARIOS_AGENDA_PADRAO };
}

function serializarHorariosAgenda(value: HorariosAgendaForm) {
  const sabado = value.sabadoAtivo
    ? `${value.sabadoAbertura}-${value.sabadoFechamento}`
    : "FECHADO";

  return `SEG-SEX=${value.semanaAbertura}-${value.semanaFechamento};SAB=${sabado};DOM=FECHADO`;
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "SR"
  );
}

function buildInitialForm(
  configuracao: ConfiguracaoClinicaView,
): SalvarConfiguracaoInput {
  return {
    nome: configuracao.nome || "Studio Realçar",
    razaoSocial: toText(configuracao.razaoSocial),
    cnpj: toText(configuracao.cnpj),
    telefone: toText(configuracao.telefone),
    whatsapp: toText(configuracao.whatsapp),
    email: toText(configuracao.email),
    site: toText(configuracao.site),
    instagram: toText(configuracao.instagram),
    endereco: toText(configuracao.endereco),
    bairro: toText(configuracao.bairro),
    cidade: toText(configuracao.cidade),
    estado: toText(configuracao.estado),
    cep: toText(configuracao.cep),
    responsavelTecnico: toText(configuracao.responsavelTecnico),
    registroProfissional: toText(configuracao.registroProfissional),
    especialidadePrincipal: toText(configuracao.especialidadePrincipal),
    horarioAtendimento: configuracao.horarioAtendimento || serializarHorariosAgenda(HORARIOS_AGENDA_PADRAO),
    intervaloAgenda: configuracao.intervaloAgenda,
    antecedenciaLembrete: configuracao.antecedenciaLembrete,
    toleranciaAtraso: configuracao.toleranciaAtraso,
    moeda: configuracao.moeda || "BRL",
    timezone: configuracao.timezone || "America/Sao_Paulo",
    logoUrl: toText(configuracao.logoUrl),
    corPrincipal: configuracao.corPrincipal || "violet",
    assinaturaMensagem: toText(configuracao.assinaturaMensagem),
    mensagemConfirmacao:
      toText(configuracao.mensagemConfirmacao) || defaultConfirmacao,
    mensagemLembrete: toText(configuracao.mensagemLembrete) || defaultLembrete,
    mensagemRetorno: toText(configuracao.mensagemRetorno) || defaultRetorno,
    politicaCancelamento: toText(configuracao.politicaCancelamento),
    observacoesInternas: toText(configuracao.observacoesInternas),
  };
}

function Field({
  label,
  name,
  value,
  placeholder,
  type = "text",
  min,
  onChange,
}: FieldProps) {
  return (
    <label className="grid gap-2 text-sm text-slate-300">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        value={value}
        placeholder={placeholder}
        type={type}
        min={min}
        onChange={(event) => onChange(name, event.target.value)}
        className="h-11 rounded-2xl border border-white/[0.10] bg-white/[0.06] px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/40 focus:bg-white/[0.09] focus:ring-4 focus:ring-violet-500/10"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  value,
  placeholder,
  rows = 4,
  onChange,
}: TextAreaProps) {
  return (
    <label className="grid gap-2 text-sm text-slate-300">
      <span className="font-medium">{label}</span>
      <textarea
        name={name}
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(event) => onChange(name, event.target.value)}
        className="resize-none rounded-2xl border border-white/[0.10] bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-300/40 focus:bg-white/[0.09] focus:ring-4 focus:ring-violet-500/10"
      />
    </label>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/[0.10] bg-white/[0.06] p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.08] text-violet-200">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-white">
            {value || "Não informado"}
          </p>
        </div>
      </div>
    </div>
  );
}

function MessagePreview({
  title,
  value,
  clinicName,
}: {
  title: string;
  value: string;
  clinicName: string;
}) {
  const preview = value
    .replaceAll("{cliente}", "Ana")
    .replaceAll("{clinica}", clinicName || "Studio Realçar")
    .replaceAll("{data}", "20/06/2026")
    .replaceAll("{hora}", "14:00");

  return (
    <div className="rounded-3xl border border-white/[0.10] bg-[#111827]/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        <Copy className="h-4 w-4 text-slate-500" />
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-300">
        {preview}
      </p>
    </div>
  );
}

type AuxiliarListProps = {
  title: string;
  description: string;
  items: CadastroAuxiliarView[];
  placeholder: string;
  statusLabel: string;
  onCreate: (nome: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

function AuxiliarList({
  title,
  description,
  items,
  placeholder,
  statusLabel,
  onCreate,
  onDelete,
}: AuxiliarListProps) {
  const [nome, setNome] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function adicionar() {
    const valor = nome.trim();
    if (!valor) return;

    startTransition(async () => {
      await onCreate(valor);
      setNome("");
    });
  }

  function excluir(id: number) {
    if (
      !confirm(
        "Deseja excluir esta opção? Cadastros antigos continuarão com o texto já salvo.",
      )
    ) {
      return;
    }

    setPendingId(id);
    startTransition(async () => {
      await onDelete(id);
      setPendingId(null);
    });
  }

  return (
    <div className="rounded-[2rem] border border-white/[0.10] bg-white/[0.05] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
        </div>
        <span className="w-fit rounded-full border border-white/[0.10] bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-300">
          {items.length} opções
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          placeholder={placeholder}
          className="premium-input"
        />
        <Button
          type="button"
          onClick={adicionar}
          disabled={isPending || !nome.trim()}
          className="sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      <div className="mt-5 grid gap-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-3xl border border-white/[0.08] bg-[#111827]/70 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {item.nome}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {statusLabel}: {item.status} · Ordem {item.ordem || 0}
                </p>
              </div>
              <button
                type="button"
                onClick={() => excluir(item.id)}
                disabled={isPending && pendingId === item.id}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/15 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-white/[0.10] p-6 text-center text-sm text-slate-400">
            Nenhuma opção cadastrada. Use o botão de opções padrão ou adicione
            manualmente.
          </div>
        )}
      </div>
    </div>
  );
}

type ServicosListProps = {
  items: ProcedimentoServicoView[];
  procedimentosInteresse: CadastroAuxiliarView[];
};

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  const amount = Number(digits) / 100;

  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCurrency(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function ServicosList({ items, procedimentosInteresse }: ServicosListProps) {
  const [procedimentoSelecionado, setProcedimentoSelecionado] = useState("");
  const [duracao, setDuracao] = useState("60");
  const [valor, setValor] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const procedimentosAtivos = procedimentosInteresse.filter(
    (item) => item.status === "Ativo",
  );
  const servicoJaExiste = items.some(
    (item) => item.nome.toLowerCase() === procedimentoSelecionado.toLowerCase(),
  );

  function adicionar() {
    const nome = procedimentoSelecionado.trim();
    if (!nome || servicoJaExiste) return;

    startTransition(async () => {
      await criarProcedimentoServico({
        nome,
        duracaoPadrao: Number(duracao) || 60,
        valorPadrao: parseCurrency(valor),
        status: "Ativo",
      });
      setProcedimentoSelecionado("");
      setDuracao("60");
      setValor("");
    });
  }

  function excluir(id: number) {
    if (
      !confirm(
        "Deseja excluir este serviço? Agendamentos antigos continuarão com o texto já salvo.",
      )
    ) {
      return;
    }

    setPendingId(id);
    startTransition(async () => {
      await excluirProcedimentoServico(id);
      setPendingId(null);
    });
  }

  return (
    <div className="rounded-[2rem] border border-white/[0.10] bg-white/[0.05] p-5 xl:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">
            Serviços da agenda
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Selecione um procedimento já cadastrado e defina duração e valor
            padrão. A agenda usa esse tempo para bloquear automaticamente os
            horários seguintes.
          </p>
        </div>
        <span className="w-fit rounded-full border border-white/[0.10] bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-300">
          {items.length} serviços
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1.2fr_150px_180px_auto]">
        <select
          value={procedimentoSelecionado}
          onChange={(event) => setProcedimentoSelecionado(event.target.value)}
          className="premium-input w-full"
        >
          <option value="">Selecione um procedimento</option>
          {procedimentosAtivos.map((procedimento) => (
            <option key={procedimento.id} value={procedimento.nome}>
              {procedimento.nome}
            </option>
          ))}
        </select>
        <select
          value={duracao}
          onChange={(event) => setDuracao(event.target.value)}
          className="premium-input w-full"
        >
          <option value="30">30 min</option>
          <option value="45">45 min</option>
          <option value="60">1h</option>
          <option value="90">1h30</option>
          <option value="120">2h</option>
          <option value="150">2h30</option>
          <option value="180">3h</option>
          <option value="240">4h</option>
        </select>
        <div className="flex h-11 items-center overflow-hidden rounded-2xl border border-white/[0.10] bg-white/[0.06] focus-within:border-violet-300/40 focus-within:bg-white/[0.09] focus-within:ring-4 focus-within:ring-violet-500/10">
          <span className="border-r border-white/[0.10] px-4 text-sm font-semibold text-slate-300">
            R$
          </span>
          <input
            value={valor}
            onChange={(event) =>
              setValor(formatCurrencyInput(event.target.value))
            }
            placeholder="0,00"
            className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>
        <Button
          type="button"
          onClick={adicionar}
          disabled={isPending || !procedimentoSelecionado || servicoJaExiste}
          className="md:w-auto"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {servicoJaExiste ? (
        <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          Este procedimento já está configurado como serviço da agenda. Edite ou
          exclua o serviço existente antes de cadastrar outro igual.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-3xl border border-white/[0.08] bg-[#111827]/70 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {item.nome}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.duracaoPadrao} min ·{" "}
                  {item.valorPadrao.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => excluir(item.id)}
                disabled={isPending && pendingId === item.id}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-400/15 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-white/[0.10] p-6 text-center text-sm text-slate-400 md:col-span-2">
            Nenhum serviço cadastrado. Crie primeiro os procedimentos de
            interesse e depois vincule os serviços da agenda.
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfiguracoesClient({
  configuracao,
  origens,
  procedimentosInteresse,
  servicos,
  anamneseModelos,
}: Props) {
  const [activeTab, setActiveTab] = useState<ConfiguracoesTab>("clinica");
  const [form, setForm] = useState<SalvarConfiguracaoInput>(() =>
    buildInitialForm(configuracao),
  );
  const [horariosAgenda, setHorariosAgenda] = useState<HorariosAgendaForm>(() =>
    parseHorariosAgenda(configuracao.horarioAtendimento),
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const perfilCompleto = useMemo(() => {
    const checks = [
      form.nome,
      form.whatsapp,
      form.email,
      form.endereco,
      form.responsavelTecnico,
      form.horarioAtendimento,
    ];
    return Math.round(
      (checks.filter((item) => String(item || "").trim()).length /
        checks.length) *
        100,
    );
  }, [form]);

  function handleChange(name: keyof SalvarConfiguracaoInput, value: string) {
    setSaved(false);
    setForm((current) => ({
      ...current,
      [name]: [
        "intervaloAgenda",
        "antecedenciaLembrete",
        "toleranciaAtraso",
      ].includes(name)
        ? toNumber(value)
        : value,
    }));
  }

  function handleHorarioAgendaChange(
    campo: keyof HorariosAgendaForm,
    value: string | boolean,
  ) {
    setSaved(false);

    setHorariosAgenda((current) => {
      const next = {
        ...current,
        [campo]: value,
      } as HorariosAgendaForm;

      setForm((formAtual) => ({
        ...formAtual,
        horarioAtendimento: serializarHorariosAgenda(next),
      }));

      return next;
    });
  }

  function handleSubmit(
    event?:
      React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
  ) {
    event?.preventDefault();
    setSaved(false);

    startTransition(async () => {
      await salvarConfiguracaoClinica(form);
      setSaved(true);
    });
  }

  return (
    <div className="app-mobile-safe space-y-6 pb-4 sm:pb-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/[0.10] bg-white/[0.06] shadow-2xl shadow-black/20">
        <div className="relative p-5 sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute right-0 top-0 h-60 w-60 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-400 text-lg font-bold text-white shadow-lg shadow-violet-950/30">
                {form.logoUrl ? (
                  <ImageIcon className="h-6 w-6" />
                ) : (
                  getInitials(form.nome)
                )}
              </div>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-200">
                  <Settings2 className="h-3.5 w-3.5" /> Central operacional
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Configurações Premium
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Centralize dados da clínica, agenda, identidade e modelos de
                  mensagem usados pelo ERP.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[22rem]">
              <InfoCard
                icon={ShieldCheck}
                label="Perfil"
                value={`${perfilCompleto}% completo`}
              />
              <InfoCard
                icon={Clock3}
                label="Agenda"
                value={`${form.intervaloAgenda} min`}
              />
              <InfoCard
                icon={MessageCircle}
                label="Lembrete"
                value={`${form.antecedenciaLembrete}h antes`}
              />
              <InfoCard
                icon={Sparkles}
                label="Tema"
                value={form.corPrincipal}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-white/[0.10] bg-white/[0.06] p-3 shadow-xl shadow-black/10 xl:sticky xl:top-24 xl:self-start">
          <div className="grid gap-2 sm:grid-cols-4 xl:grid-cols-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-white/[0.12] text-white shadow-lg shadow-black/10 ring-1 ring-white/[0.10]"
                      : "text-slate-400 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${active ? "text-violet-200" : "text-slate-500"}`}
                  />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="space-y-6">
          {activeTab === "clinica" && (
            <section className="rounded-[2rem] border border-white/[0.10] bg-white/[0.06] p-5 shadow-xl shadow-black/10 sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-200">
                  <Building2 className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Dados da clínica
                  </h2>
                  <p className="text-sm text-slate-400">
                    Informações comerciais e institucionais do Studio Realçar.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Nome fantasia"
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                />
                <Field
                  label="Razão social"
                  name="razaoSocial"
                  value={form.razaoSocial || ""}
                  onChange={handleChange}
                />
                <Field
                  label="CNPJ"
                  name="cnpj"
                  value={form.cnpj || ""}
                  placeholder="00.000.000/0000-00"
                  onChange={handleChange}
                />
                <Field
                  label="Responsável técnico"
                  name="responsavelTecnico"
                  value={form.responsavelTecnico || ""}
                  onChange={handleChange}
                />
                <Field
                  label="Registro profissional"
                  name="registroProfissional"
                  value={form.registroProfissional || ""}
                  onChange={handleChange}
                />
                <Field
                  label="Especialidade principal"
                  name="especialidadePrincipal"
                  value={form.especialidadePrincipal || ""}
                  onChange={handleChange}
                />
                <Field
                  label="Telefone"
                  name="telefone"
                  value={form.telefone || ""}
                  onChange={handleChange}
                />
                <Field
                  label="WhatsApp principal"
                  name="whatsapp"
                  value={form.whatsapp || ""}
                  placeholder="11999999999"
                  onChange={handleChange}
                />
                <Field
                  label="E-mail"
                  name="email"
                  value={form.email || ""}
                  type="email"
                  onChange={handleChange}
                />
                <Field
                  label="Site"
                  name="site"
                  value={form.site || ""}
                  type="url"
                  placeholder="https://..."
                  onChange={handleChange}
                />
                <Field
                  label="Instagram"
                  name="instagram"
                  value={form.instagram || ""}
                  placeholder="@studiorealcar"
                  onChange={handleChange}
                />
                <Field
                  label="CEP"
                  name="cep"
                  value={form.cep || ""}
                  onChange={handleChange}
                />
                <Field
                  label="Endereço"
                  name="endereco"
                  value={form.endereco || ""}
                  onChange={handleChange}
                />
                <Field
                  label="Bairro"
                  name="bairro"
                  value={form.bairro || ""}
                  onChange={handleChange}
                />
                <Field
                  label="Cidade"
                  name="cidade"
                  value={form.cidade || ""}
                  onChange={handleChange}
                />
                <Field
                  label="Estado"
                  name="estado"
                  value={form.estado || ""}
                  placeholder="SP"
                  onChange={handleChange}
                />
              </div>
            </section>
          )}

          {activeTab === "agenda" && (
            <section className="rounded-[2rem] border border-white/[0.10] bg-white/[0.06] p-5 shadow-xl shadow-black/10 sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-200">
                  <CalendarClock className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Agenda e operação
                  </h2>
                  <p className="text-sm text-slate-400">
                    Parâmetros usados para organização dos atendimentos.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-3 rounded-3xl border border-white/[0.10] bg-[#111827]/45 p-4 md:col-span-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Horários de atendimento
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Estes horários controlam os períodos disponíveis na agenda.
                    </p>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 sm:grid-cols-[1fr_160px_160px] sm:items-end">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        Segunda a sexta
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Atendimento regular
                      </p>
                    </div>

                    <label className="grid gap-2 text-sm text-slate-300">
                      <span className="font-medium">Abertura</span>
                      <input
                        type="time"
                        value={horariosAgenda.semanaAbertura}
                        onChange={(event) =>
                          handleHorarioAgendaChange(
                            "semanaAbertura",
                            event.target.value,
                          )
                        }
                        className="h-11 rounded-2xl border border-white/[0.10] bg-white/[0.06] px-4 text-sm text-white outline-none transition focus:border-violet-300/40 focus:ring-4 focus:ring-violet-500/10"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-slate-300">
                      <span className="font-medium">Fechamento</span>
                      <input
                        type="time"
                        value={horariosAgenda.semanaFechamento}
                        onChange={(event) =>
                          handleHorarioAgendaChange(
                            "semanaFechamento",
                            event.target.value,
                          )
                        }
                        className="h-11 rounded-2xl border border-white/[0.10] bg-white/[0.06] px-4 text-sm text-white outline-none transition focus:border-violet-300/40 focus:ring-4 focus:ring-violet-500/10"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-violet-400/15 bg-violet-400/[0.05] p-4 sm:grid-cols-[1fr_160px_160px] sm:items-end">
                    <div>
                      <label className="inline-flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={horariosAgenda.sabadoAtivo}
                          onChange={(event) =>
                            handleHorarioAgendaChange(
                              "sabadoAtivo",
                              event.target.checked,
                            )
                          }
                          className="h-4 w-4 rounded border-white/20 accent-violet-500"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-white">
                            Sábado
                          </span>
                          <span className="mt-1 block text-xs text-slate-400">
                            Marque para permitir agendamentos aos sábados
                          </span>
                        </span>
                      </label>
                    </div>

                    <label className="grid gap-2 text-sm text-slate-300">
                      <span className="font-medium">Abertura</span>
                      <input
                        type="time"
                        value={horariosAgenda.sabadoAbertura}
                        disabled={!horariosAgenda.sabadoAtivo}
                        onChange={(event) =>
                          handleHorarioAgendaChange(
                            "sabadoAbertura",
                            event.target.value,
                          )
                        }
                        className="h-11 rounded-2xl border border-white/[0.10] bg-white/[0.06] px-4 text-sm text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-40 focus:border-violet-300/40 focus:ring-4 focus:ring-violet-500/10"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-slate-300">
                      <span className="font-medium">Fechamento</span>
                      <input
                        type="time"
                        value={horariosAgenda.sabadoFechamento}
                        disabled={!horariosAgenda.sabadoAtivo}
                        onChange={(event) =>
                          handleHorarioAgendaChange(
                            "sabadoFechamento",
                            event.target.value,
                          )
                        }
                        className="h-11 rounded-2xl border border-white/[0.10] bg-white/[0.06] px-4 text-sm text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-40 focus:border-violet-300/40 focus:ring-4 focus:ring-violet-500/10"
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-xs text-slate-400">
                    Domingo permanece fechado. Padrão atual: segunda a sexta, 09h às 19h; sábado, 09h às 17h.
                  </div>
                </div>
                <Field
                  label="Intervalo padrão da agenda"
                  name="intervaloAgenda"
                  value={form.intervaloAgenda}
                  type="number"
                  min={5}
                  onChange={handleChange}
                />
                <Field
                  label="Lembrete manual padrão"
                  name="antecedenciaLembrete"
                  value={form.antecedenciaLembrete}
                  type="number"
                  min={0}
                  onChange={handleChange}
                />
                <Field
                  label="Tolerância de atraso"
                  name="toleranciaAtraso"
                  value={form.toleranciaAtraso}
                  type="number"
                  min={0}
                  onChange={handleChange}
                />
                <Field
                  label="Moeda"
                  name="moeda"
                  value={form.moeda}
                  onChange={handleChange}
                />
                <Field
                  label="Timezone"
                  name="timezone"
                  value={form.timezone}
                  onChange={handleChange}
                />
              </div>

              <div className="mt-5 rounded-3xl border border-white/[0.10] bg-[#111827]/60 p-4 text-sm leading-6 text-slate-400">
                O intervalo da agenda e a antecedência do lembrete já ficam
                preparados para a futura agenda diária/semanal e para
                automações.
              </div>
            </section>
          )}

          {activeTab === "mensagens" && (
            <section className="rounded-[2rem] border border-white/[0.10] bg-white/[0.06] p-5 shadow-xl shadow-black/10 sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-200">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Modelos de WhatsApp manual
                  </h2>
                  <p className="text-sm text-slate-400">
                    Textos base para copiar ou abrir no WhatsApp sem custo de
                    API.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-4">
                  <TextArea
                    label="Mensagem de confirmação"
                    name="mensagemConfirmacao"
                    value={form.mensagemConfirmacao || ""}
                    rows={4}
                    onChange={handleChange}
                  />
                  <TextArea
                    label="Mensagem de lembrete"
                    name="mensagemLembrete"
                    value={form.mensagemLembrete || ""}
                    rows={4}
                    onChange={handleChange}
                  />
                  <TextArea
                    label="Mensagem de retorno"
                    name="mensagemRetorno"
                    value={form.mensagemRetorno || ""}
                    rows={4}
                    onChange={handleChange}
                  />
                  <TextArea
                    label="Assinatura padrão"
                    name="assinaturaMensagem"
                    value={form.assinaturaMensagem || ""}
                    rows={3}
                    placeholder="Studio Realçar · Clínica de Estética"
                    onChange={handleChange}
                  />
                  <TextArea
                    label="Política de cancelamento"
                    name="politicaCancelamento"
                    value={form.politicaCancelamento || ""}
                    rows={4}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-4">
                  <MessagePreview
                    title="Confirmação"
                    value={form.mensagemConfirmacao || defaultConfirmacao}
                    clinicName={form.nome}
                  />
                  <MessagePreview
                    title="Lembrete"
                    value={form.mensagemLembrete || defaultLembrete}
                    clinicName={form.nome}
                  />
                  <div className="rounded-3xl border border-white/[0.10] bg-white/[0.05] p-4 text-xs leading-5 text-slate-400">
                    Variáveis disponíveis:{" "}
                    <span className="text-slate-200">{"{cliente}"}</span>,{" "}
                    <span className="text-slate-200">{"{clinica}"}</span>,{" "}
                    <span className="text-slate-200">{"{data}"}</span> e{" "}
                    <span className="text-slate-200">{"{hora}"}</span>.
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "identidade" && (
            <section className="rounded-[2rem] border border-white/[0.10] bg-white/[0.06] p-5 shadow-xl shadow-black/10 sm:p-6">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-fuchsia-400/10 text-fuchsia-200">
                  <Palette className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Identidade e preferências
                  </h2>
                  <p className="text-sm text-slate-400">
                    Base para personalização visual e dados internos.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="URL da logo"
                  name="logoUrl"
                  value={form.logoUrl || ""}
                  type="url"
                  placeholder="https://..."
                  onChange={handleChange}
                />
                <Field
                  label="Cor principal"
                  name="corPrincipal"
                  value={form.corPrincipal}
                  placeholder="violet"
                  onChange={handleChange}
                />
              </div>
              <div className="mt-4">
                <TextArea
                  label="Observações internas"
                  name="observacoesInternas"
                  value={form.observacoesInternas || ""}
                  rows={5}
                  onChange={handleChange}
                />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <InfoCard
                  icon={Mail}
                  label="E-mail"
                  value={form.email || "Não informado"}
                />
                <InfoCard
                  icon={Phone}
                  label="Contato"
                  value={form.whatsapp || form.telefone || "Não informado"}
                />
                <InfoCard
                  icon={MapPin}
                  label="Cidade"
                  value={
                    [form.cidade, form.estado].filter(Boolean).join(" - ") ||
                    "Não informado"
                  }
                />
              </div>
            </section>
          )}

          {activeTab === "auxiliares" && (
            <section className="rounded-[2rem] border border-white/[0.10] bg-white/[0.06] p-5 shadow-xl shadow-black/10 sm:p-6">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
                    <ListChecks className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Cadastros auxiliares
                    </h2>
                    <p className="text-sm text-slate-400">
                      Gerencie as opções usadas nos campos selecionáveis do ERP
                      sem alterar código.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    startTransition(async () => {
                      await criarCadastrosAuxiliaresPadrao();
                    });
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  Criar opções padrão
                </Button>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <AuxiliarList
                  title="Origens de cliente"
                  description="Opções do campo Origem no cadastro do cliente, como indicação, Google Ads ou busca orgânica."
                  items={origens}
                  placeholder="Ex: Evento presencial"
                  statusLabel="Status"
                  onCreate={(nome) =>
                    criarOrigemCliente({ nome, status: "Ativa" })
                  }
                  onDelete={excluirOrigemCliente}
                />

                <AuxiliarList
                  title="Procedimentos de interesse"
                  description="Opções comerciais usadas no primeiro cadastro do cliente antes do procedimento clínico realizado."
                  items={procedimentosInteresse}
                  placeholder="Ex: Harmonização facial"
                  statusLabel="Status"
                  onCreate={(nome) =>
                    criarProcedimentoInteresse({ nome, status: "Ativo" })
                  }
                  onDelete={excluirProcedimentoInteresse}
                />

                <ServicosList
                  items={servicos}
                  procedimentosInteresse={procedimentosInteresse}
                />
              </div>

              <div className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                Procedimento de interesse é usado para marketing e triagem
                inicial. Serviços da agenda são usados para duração padrão,
                valor previsto e bloqueio automático de horário.
              </div>
            </section>
          )}

          {activeTab === "anamnese" && (
            <AnamneseConfigSection
              modelos={anamneseModelos}
              servicos={servicos}
            />
          )}

          <div className="rounded-3xl border border-white/[0.10] bg-[#151a2a]/92 p-3 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:sticky lg:bottom-5 lg:z-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                {saved ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                ) : (
                  <Settings2 className="h-4 w-4 text-slate-500" />
                )}
                <span>
                  {saved
                    ? "Configurações salvas com sucesso."
                    : "Revise os dados antes de salvar."}
                </span>
              </div>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                <Save className="h-4 w-4" />
                {isPending ? "Salvando..." : "Salvar configurações"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
