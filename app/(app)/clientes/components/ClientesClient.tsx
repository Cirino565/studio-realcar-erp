"use client";

import { useRouter } from "next/navigation";

type Cliente = {
  id: number;
  nome: string;
  telefone?: string;
  procedimento?: string;
  status?: string;
};

type Props = {
  clientes: Cliente[];
  origens: any[];
  procedimentosInteresse: any[];
};

export default function ClientesClient({
  clientes,
}: Props) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-white">Clientes</h1>

      {/* LISTA (MANTIDA IGUAL AO SEU LAYOUT) */}
      <div className="space-y-2">
        {clientes.map((cliente) => (
          <div
            key={cliente.id}
            className="flex items-center justify-between p-4 border border-white/10 rounded-lg bg-white/5"
          >
            {/* INFO CLIENTE */}
            <div>
              <p className="text-white font-medium">{cliente.nome}</p>
              <p className="text-sm text-gray-400">{cliente.telefone}</p>
            </div>

            {/* BOTÃO VER DETALHES (SÓ CORRIGIDO, SEM MEXER NO DESIGN) */}
            <button
              onClick={() => {
                if (!cliente?.id) {
                  console.error("Cliente sem ID:", cliente);
                  return;
                }

                router.push(`/clientes/${cliente.id}`);
              }}
              className="flex items-center gap-2 text-sm text-white hover:text-purple-400"
            >
              👁 Ver detalhes
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}