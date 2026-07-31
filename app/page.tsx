import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { QuickCategories } from "@/components/quick-categories";
import { EXAMPLE_QUERIES } from "@/constants/quick-categories";
import { SITE_NAME, SITE_TAGLINE } from "@/constants/site";
import { buildSearchUrl } from "@/features/search/params";

export const metadata: Metadata = {
  title: "Qué ver en YouTube",
  description: SITE_TAGLINE,
  openGraph: {
    title: `${SITE_NAME} — Qué ver en YouTube`,
    description: SITE_TAGLINE,
  },
};

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
      <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
        <Sparkles className="size-3.5 text-brand" aria-hidden="true" />
        Recomendaciones con intención, no búsquedas
      </span>

      <h1 className="text-center text-4xl font-semibold tracking-tight sm:text-6xl">
        ¿Qué quieres{" "}
        <span className="bg-gradient-to-r from-brand to-orange-400 bg-clip-text text-transparent">
          ver hoy
        </span>
        ?
      </h1>
      <p className="mt-4 max-w-xl text-center text-base text-muted-foreground sm:text-lg">
        Dile a {SITE_NAME} qué te apetece con tus palabras y te recomendamos los mejores videos
        de YouTube.
      </p>

      <div className="mt-10 w-full">
        <SearchForm placeholder='«quiero algo para comer», «un podcast interesante», «algo divertido»…' />
      </div>

      <div className="mt-10 w-full">
        <QuickCategories />
      </div>

      <div className="mt-10 w-full border-t pt-6">
        <p className="mb-3 text-center text-xs uppercase tracking-wider text-muted-foreground">
          Prueba con
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {EXAMPLE_QUERIES.map((query) => (
            <li key={query}>
              <Link
                href={buildSearchUrl({ q: query, language: "both" })}
                className="text-sm text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                «{query}»
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
