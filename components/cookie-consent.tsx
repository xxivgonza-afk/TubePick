"use client";

import { Cookie } from "lucide-react";
import { useSyncExternalStore, useState } from "react";
import { COOKIE_CONSENT_KEY } from "@/constants/site";

const emptySubscribe = () => () => {};

function hasConsent(): boolean {
  try {
    return window.localStorage.getItem(COOKIE_CONSENT_KEY) === "1";
  } catch {
    return true;
  }
}

export function CookieConsent() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [dismissed, setDismissed] = useState(false);

  if (!mounted || dismissed || hasConsent()) return null;

  function accept() {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, "1");
    } catch {
      // localStorage no disponible: no insistimos
    }
    setDismissed(true);
  }

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <Cookie className="hidden size-5 shrink-0 text-brand sm:block" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          {`Usamos una cookie propia (90 días) solo para personalizar «Sorpréndeme»; se crea únicamente
          cuando la usas. Sin publicidad ni seguimiento. `}
          <a href="/cookies" className="font-medium text-foreground underline underline-offset-2 hover:text-brand">
            Más información
          </a>
        </p>
        <button
          type="button"
          onClick={accept}
          className="inline-flex h-9 shrink-0 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}