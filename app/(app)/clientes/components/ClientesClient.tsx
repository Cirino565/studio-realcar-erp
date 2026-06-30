"use client";

import { useRouter } from "next/navigation";

/* =========================
   TIPOS CORRIGIDOS
========================= */
type Agendamento = {
  id: number;
  procedimento: string;
  data: Date;
  status: string;
};

type Cliente = {
  id: number;
  nome: string;
  telefone?: string | null;
  whatsapp?: string | null;
  procedimento?: string | null;
  status?: string | null;
  agendamentos?: Agendamento[];
};

type Props = {
  clientes: Cliente[];
  origens: any[];
  procedimentosInteresse: any[];
};

/* =========================
   COMPONENTE
========================= */
export default function ClientesClient({
  clientes,
  origens,
  procedimentosInteresse,
}: Props) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      {/* HEADER */}
      <h1 className="text-xl font-semibold text-white">
        Clientes
      </h1>

      {/* LISTA */}
      <div className="space-y-2">
        {clientes?.map((cliente) => (
          <div
            key={cliente.id}
            className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5"
          >
            {/* INFO CLIENTE */}
            <div className="flex flex-col">
              <span className="text-white font-medium">
                {cliente.nome}
              </span>

              <span className="text-sm text-gray-400">
                {cliente.telefone || "Sem telefone"}
              </span>
            </div>

            {/* BOTÃO VER DETALHES (SEM MEXER NO LAYOUT) */}
            <button
              onClick={() => {
                if (!cliente?.id) {
                  console.error("Cliente sem ID:", cliente);
                  return;
                }

                router.push(`/clientes/${cliente.id}`);
              }}
              className="text-sm text-white hover:text-purple-400 transition"
            >
              👁 Ver detalhes
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}