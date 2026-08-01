"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { collectUserContext, writeUserContextCookie } from "@/lib/user-context";

interface SurpriseLinkProps {
  href: string;
  children?: React.ReactNode;
  variant?: "default" | "outline";
}

/**
 * Botón "Sorpréndeme": antes de navegar, escribe la cookie de contexto con
 * los intereses del usuario (favoritos, búsquedas recientes y visitas) para
 * que la IA del servidor personalice la sorpresa. El botón funciona como un
 * link normal (href estático en el DOM), así que no rompe en entornos sin JS.
 */
export function SurpriseLink({ href, children, variant = "default" }: SurpriseLinkProps) {
  const router = useRouter();

  function handleClick(event: React.MouseEvent) {
    writeUserContextCookie(collectUserContext());
    router.push(href);
    event.preventDefault();
  }

  return (
    <a href={href} onClick={handleClick} className={buttonVariants({ variant })}>
      <Sparkles className="size-4" aria-hidden="true" />
      {children ?? "Sorpréndeme"}
    </a>
  );
}
