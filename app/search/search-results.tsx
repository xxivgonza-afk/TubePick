import { AlertTriangle, Info, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { VideoGrid } from "@/components/video-grid";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getCategory } from "@/constants/categories";
import { searchVideos } from "@/features/search/search-videos";
import { buildSearchUrl } from "@/features/search/params";
import { buildSurpriseParams } from "@/features/search/surprise";
import type { SearchFilters } from "@/types/search";

interface SearchResultsProps {
  filters: SearchFilters;
}

export async function SearchResults({ filters }: SearchResultsProps) {
  const outcome = await searchVideos(filters);

  if (outcome.error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center"
      >
        <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
        <p className="max-w-md text-sm text-muted-foreground">{outcome.error.message}</p>
        {outcome.error.kind === "config" ? (
          <p className="max-w-md text-xs text-muted-foreground">
            Crea una clave en Google Cloud Console (YouTube Data API v3) y añádela a{" "}
            <code className="rounded bg-muted px-1 py-0.5">.env.local</code> como{" "}
            <code className="rounded bg-muted px-1 py-0.5">YOUTUBE_API_KEY</code>.
          </p>
        ) : null}
        <a
          href={buildSearchUrl(filters)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          Reintentar
        </a>
      </div>
    );
  }

  const category = getCategory(filters.category);
  const hasQuery = filters.q.trim().length > 0;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {hasQuery ? (
            <>
              Resultados para <span className="text-foreground">«{outcome.displayQuery}»</span>
            </>
          ) : category ? (
            <>Descubre: {outcome.displayQuery}</>
          ) : (
            <>Descubre lo mejor de YouTube</>
          )}
        </h2>
        {category ? (
          <Badge variant="secondary" className="ml-1">
            <span aria-hidden="true">{category.emoji}</span> {category.label}
          </Badge>
        ) : null}
        <span className="ml-auto text-sm text-muted-foreground">
          {outcome.videos.length > 0
            ? `${outcome.videos.length} ${outcome.videos.length === 1 ? "recomendación" : "recomendaciones"}`
            : null}
        </span>
      </header>

      {outcome.fromFallback ? (
        <div className="mb-6 flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" aria-hidden="true" />
          Mostrando recomendaciones guardadas — vuelve mañana para búsquedas nuevas.
        </div>
      ) : null}

      {outcome.videos.length > 0 ? (
        <VideoGrid videos={outcome.videos} />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center">
          <p className="font-medium">No encontramos nada para «{outcome.displayQuery}»</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Prueba con otras palabras, cambia los filtros o déjate sorprender.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href={buildSearchUrl(buildSurpriseParams(filters))}
              className={buttonVariants()}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Sorpréndeme
            </Link>
            <Link
              href={buildSearchUrl({ q: filters.q, language: "both" })}
              className={buttonVariants({ variant: "outline" })}
            >
              Quitar filtros
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
