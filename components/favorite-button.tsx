"use client";

import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";
import { useUIStore } from "@/stores/ui-store";
import type { Video } from "@/types/video";

export function FavoriteButton({ video }: { video: Video }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const showToast = useUIStore((s) => s.showToast);

  function handleToggle() {
    const willSave = !isFavorite(video.id);
    toggleFavorite(video);
    showToast(willSave ? "Guardado en favoritos" : "Eliminado de favoritos");
  }

  return (
    <Button
      variant={isFavorite(video.id) ? "secondary" : "outline"}
      size="sm"
      onClick={handleToggle}
      aria-pressed={isFavorite(video.id)}
      aria-label={
        isFavorite(video.id)
          ? `Quitar «${video.title}» de favoritos`
          : `Guardar «${video.title}» en favoritos`
      }
      className="ml-auto"
    >
      <Bookmark className={`size-3.5 ${isFavorite(video.id) ? "fill-current" : ""}`} aria-hidden="true" />
      {isFavorite(video.id) ? "Guardado" : "Guardar"}
    </Button>
  );
}
