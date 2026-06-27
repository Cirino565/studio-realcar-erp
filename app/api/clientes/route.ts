import { NextResponse } from "next/server";

import { canAccess, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const usuario = await getCurrentUser();

  if (!usuario) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  if (!canAccess(usuario, "clientes.visualizar")) {
    return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  }

  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: {
        nome: "asc",
      },
    });

    return NextResponse.json(clientes);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        erro: "Erro ao buscar clientes.",
      },
      {
        status: 500,
      },
    );
  }
}
