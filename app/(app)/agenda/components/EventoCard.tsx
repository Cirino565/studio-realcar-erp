import { Clock, MessageCircle } from "lucide-react";

type Props = {
  horario: string;
  cliente: string;
  procedimento: string;
  status?: string;
  onMessage?: () => void;
};

function getStatusClass(status?: string) {
  const normalized = status?.toLowerCase() || "agendado";

  if (normalized.includes("confirm")) {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  }

  if (normalized.includes("cancel")) {
    return "border-rose-400/25 bg-rose-400/10 text-rose-200";
  }

  if (normalized.includes("realiz")) {
    return "border-sky-400/25 bg-sky-400/10 text-sky-200";
  }

  return "border-violet-400/25 bg-violet-400/10 text-violet-200";
}

export default function EventoCard({
  horario,
  cliente,
  procedimento,
  status = "Agendado",
  onMessage,
}: Props) {
  return (
    <div className="group rounded-2xl border border-white/[0.08] bg-white/[0.045] p-3 shadow-lg shadow-black/10 transition hover:border-violet-400/35 hover:bg-white/[0.065]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Clock size={13} className="text-violet-300" />
            {horario}
          </div>

          <p className="truncate text-sm font-semibold text-white">{cliente}</p>
          <p className="mt-0.5 truncate text-xs text-slate-400">{procedimento}</p>
        </div>

        {onMessage ? (
          <button
            type="button"
            onClick={onMessage}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-2 text-slate-400 opacity-100 transition hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-200 lg:opacity-0 lg:group-hover:opacity-100"
            aria-label="Gerar mensagem de WhatsApp"
          >
            <MessageCircle size={15} />
          </button>
        ) : null}
      </div>

      <div className="mt-3">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-medium ${getStatusClass(status)}`}>
          {status}
        </span>
      </div>
    </div>
  );
}
