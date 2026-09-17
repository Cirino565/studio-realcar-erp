"use client";

import type { ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/**
 * Mostra um spinner enquanto o link em que está dentro está navegando.
 *
 * Sem isso, clicar num link para abrir outra tela (ex.: "Ver prontuário")
 * não dava nenhum sinal enquanto a página carregava - e era comum a pessoa
 * clicar várias vezes achando que não tinha funcionado.
 *
 * IMPORTANTE: só funciona dentro de um <Link> do Next.js (não de um <a>
 * comum), e precisa estar DENTRO dele, não ao lado.
 *
 * Dois modos:
 *   - "substituir" (padrão): troca o conteúdo pelo spinner. Bom para
 *     botões só com ícone, ex.: <IndicadorNavegacao><Eye /></IndicadorNavegacao>
 *   - "preceder": mostra o spinner ANTES do conteúdo, sem escondê-lo. Bom
 *     para botões com texto, ex.: "Ver ficha" continua visível.
 */
export function IndicadorNavegacao({
  children,
  className = "size-4 animate-spin",
  modo = "substituir",
}: {
  children: ReactNode;
  className?: string;
  modo?: "substituir" | "preceder";
}) {
  const { pending } = useLinkStatus();

  if (!pending) return <>{children}</>;

  if (modo === "preceder") {
    return (
      <>
        <Loader2 className={className} />
        {children}
      </>
    );
  }

  return <Loader2 className={className} />;
}
