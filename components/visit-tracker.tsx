"use client";

import { useEffect } from "react";
import { bumpVisitCount } from "@/lib/user-context";

/**
 * Rastreador invisible de visitas (cliente): incrementa el contador local
 * que alimenta la personalización de "Sorpréndeme" (el servidor lo recibe
 * vía cookie cuando el usuario pulsa el botón). Sin login ni red: solo
 * localStorage del navegador.
 */
export function VisitTracker() {
  useEffect(() => {
    bumpVisitCount();
  }, []);

  return null;
}
