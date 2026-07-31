"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("TubePick: error inesperado", error);
  }, [error]);

  return (
    <section
      role="alert"
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-24 text-center sm:px-6"
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Algo salió mal</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Hubo un error inesperado. Puedes intentarlo de nuevo o volver al inicio.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Reintentar
        </button>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-input bg-background px-6 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Home className="size-4" aria-hidden="true" />
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
