"use client";

import { RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "ui-sans-serif, system-ui, sans-serif", padding: 24 }}>
        <main style={{ textAlign: "center", maxWidth: 420 }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>😵</p>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Algo salió mal</h1>
          <p style={{ fontSize: 14, color: "#666", margin: "0 0 24px" }}>
            Tuvimos un error inesperado al cargar la página (ref.: {error.digest ?? "–"}). Inténtalo de
            nuevo.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 40,
              padding: "0 20px",
              borderRadius: 10,
              border: "1px solid #d4d4d8",
              background: "#fff",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}