import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { QuickCategories } from "@/components/quick-categories";
import { EXAMPLE_QUERIES } from "@/constants/quick-categories";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/constants/site";
import { buildSearchUrl } from "@/features/search/params";

export const metadata: Metadata = {
  title: "Qué ver en YouTube",
  description: `${SITE_NAME}: escribe lo que te apetece ver con tus palabras y descubre los mejores videos de YouTube con inteligencia artificial. Sin buscar, sin perder tiempo.`,
  keywords: [
    "recomendaciones youtube",
    "qué ver en youtube",
    "videos recomendados",
    "descubrir videos youtube",
    "inteligencia artificial youtube",
    "buscar videos con IA",
    "encontrar videos interesantes",
    "sugerencias de videos",
    "tube pick",
    "tubepick",
  ],
  openGraph: {
    title: `${SITE_NAME} — Qué ver en YouTube | Descubre videos con IA`,
    description: SITE_TAGLINE,
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — Qué ver en YouTube`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Qué ver en YouTube`,
    description: SITE_TAGLINE,
    images: [`${SITE_URL}/opengraph-image`],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_TAGLINE,
  inLanguage: "es",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/icon`,
    },
  },
};

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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

      <div className="mt-16 w-full border-t pt-8">
        <h2 className="mb-4 text-center text-lg font-semibold tracking-tight">
          ¿Cómo funciona {SITE_NAME}?
        </h2>
        <div className="grid gap-6 text-center text-sm text-muted-foreground sm:grid-cols-3">
          <div>
            <p className="mb-1 text-2xl">💬</p>
            <p className="font-medium text-foreground">Describe lo que quieres ver</p>
            <p>Escribe con tus palabras lo que te apetece: un tema, un estado de ánimo, algo concreto.</p>
          </div>
          <div>
            <p className="mb-1 text-2xl">🤖</p>
            <p className="font-medium text-foreground">La IA entiende tu intención</p>
            <p>Nuestra inteligencia artificial interpreta lo que buscas y lo traduce en una búsqueda precisa.</p>
          </div>
          <div>
            <p className="mb-1 text-2xl">🎬</p>
            <p className="font-medium text-foreground">Descubre videos perfectos</p>
            <p>Recibe recomendaciones de YouTube que encajan contigo, sin perder tiempo buscando.</p>
          </div>
        </div>
      </div>

      <div className="mt-16 w-full border-t pt-8">
        <h2 className="mb-4 text-center text-lg font-semibold tracking-tight">
          Categorías populares
        </h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Explora contenido por temática: tecnología, ciencia, humor, documentales, podcasts y más.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { emoji: "💻", label: "Tecnología", q: "videos de tecnología" },
            { emoji: "🔬", label: "Ciencia", q: "videos de ciencia" },
            { emoji: "😂", label: "Humor", q: "videos divertidos" },
            { emoji: "🎬", label: "Documentales", q: "documentales interesantes" },
            { emoji: "🎙️", label: "Podcasts", q: "podcasts interesantes" },
            { emoji: "🎮", label: "Gaming", q: "videos de gaming" },
            { emoji: "🎵", label: "Música", q: "música para escuchar" },
            { emoji: "📚", label: "Historia", q: "videos de historia" },
          ].map((cat) => (
            <Link
              key={cat.label}
              href={buildSearchUrl({ q: cat.q, language: "both" })}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-brand/50 hover:text-foreground"
            >
              <span aria-hidden="true">{cat.emoji}</span> {cat.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
