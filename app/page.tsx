"use client"

import { useEffect, useState } from "react"

export default function ClientesAssistencial() {
  const [clientes, setClientes] = useState<any[]>([])

  // depois vamos ligar na API real
  useEffect(() => {
    setClientes([
      { id: 1, nome: "Maria Silva", ultimo: "12/01" },
      { id: 2, nome: "João Souza", ultimo: "Nunca" },
    ])
  }, [])

  return (
    <div className="flex flex-col gap-3 p-3">
      
      <h1 className="text-xl font-bold">Clientes</h1>

      {clientes.map((c) => (
        <div key={c.id} className="p-4 rounded-xl border shadow-sm flex flex-col gap-2">
          
          <div className="text-lg font-semibold">
            {c.nome}
          </div>

          <div className="text-sm text-gray-500">
            Último atendimento: {c.ultimo}
          </div>

          <div className="flex gap-2 mt-2">
            <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg">
              Abrir
            </button>

            <button className="flex-1 bg-green-600 text-white py-2 rounded-lg">
              Atender
            </button>
          </div>

        </div>
      ))}

    </div>
  )
}