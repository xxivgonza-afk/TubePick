import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/constants/site";

export const metadata: Metadata = {
  title: "404 — Página no encontrada",
  description: `Lo sentimos, esta página no existe. Vuelve a ${SITE_NAME} y descubre qué ver en YouTube.`,
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-24 text-center sm:px-6">
      <p className="text-6xl font-semibold tracking-tight">404</p>
      <h1 className="text-xl font-semibold tracking-tight">Esta página no existe</h1>
      <p className="text-sm text-muted-foreground">
        Pero hay mucho que ver. Cuéntanos qué te apetece y te lo buscamos.
      </p>
      <Link
        href="/"
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
