"use client";

import { Bookmark, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VideoCard } from "@/components/video-card";
import { useFavorites } from "@/hooks/use-favorites";
import { useUIStore } from "@/stores/ui-store";

export function FavoritesList() {
  const { favorites, clearFavorites } = useFavorites();
  const showToast = useUIStore((s) => s.showToast);
  const videos = Object.values(favorites);
  const hasFavorites = videos.length > 0;

  function handleClear() {
    clearFavorites();
    showToast("Favoritos eliminados");
  }

  if (!hasFavorites) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <Bookmark className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Aún no tienes favoritos</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Cuando veas un video que quieras guardar, pulsa «Guardar» y lo encontrarás aquí.
        </p>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Explorar videos
        </Link>
      </div>
    );
  }

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Tus favoritos</h1>
          <p className="text-sm text-muted-foreground">
            {videos.length} {videos.length === 1 ? "video guardado" : "videos guardados"} en este
            dispositivo
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleClear}>
          <Trash2 className="size-3.5" aria-hidden="true" />
          Vaciar
        </Button>
      </header>

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((video) => (
          <li key={video.id}>
            <VideoCard video={video} />
          </li>
        ))}
      </ul>
    </>
  );
}
