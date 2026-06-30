"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Cliente = {
  id: number;
  nome: string;
  telefone?: string;
};

type Props = {
  clientes: Cliente[];
  origens: any[];
  procedimentosInteresse: any[];
};

export default function ClientesClient({
  clientes,
  origens,
  procedimentosInteresse,
}: Props) {
  const router = useRouter();

  const [clienteSelecionado, setClienteSelecionado] =
    useState<Cliente | null>(null);

  return (
    <div>
      <h1>Clientes</h1>

      <div>
        {clientes.map((cliente) => (
          <div
            key={cliente.id}
            className="flex items-center justify-between border p-2"
          >
            <div>
              <p>{cliente.nome}</p>
              <p className="text-sm text-gray-500">{cliente.telefone}</p>
            </div>

            {/* BOTÃO OLHO (DETALHES) */}
            <button
              onClick={() => {
                if (!cliente?.id) {
                  console.error("Cliente sem ID:", cliente);
                  return;
                }

                setClienteSelecionado(cliente);

                router.push(`/clientes/${cliente.id}`);
              }}
            >
              👁 Ver detalhes
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}