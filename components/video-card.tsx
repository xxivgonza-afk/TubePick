"use client";

import Image from "next/image";
import { Bookmark, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration, formatRelativeDate, formatViews } from "@/utils/format";
import { toYouTubeUrl, type Video } from "@/types/video";

interface VideoCardProps {
  video: Video;
  isFavorite: boolean;
  onToggleFavorite: (video: Video) => void;
}

export function VideoCard({ video, isFavorite, onToggleFavorite }: VideoCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-colors hover:border-foreground/20">
      <a
        href={toYouTubeUrl(video)}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-video overflow-hidden bg-muted"
        aria-label={`Ver «${video.title}» en YouTube`}
        title={video.title}
      >
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Play className="size-8" aria-hidden="true" />
          </div>
        )}
        {video.durationSeconds > 0 && (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white">
            {formatDuration(video.durationSeconds)}
          </span>
        )}
      </a>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          <a
            href={toYouTubeUrl(video)}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {video.title}
          </a>
        </h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">{video.channelTitle}</p>
        <p className="text-xs text-muted-foreground">
          {formatViews(video.viewCount)}
          {video.publishedAt ? ` · ${formatRelativeDate(video.publishedAt)}` : ""}
        </p>

        <div className="mt-auto flex items-center gap-2 pt-2">
          <a
            href={toYouTubeUrl(video)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            Ver en YouTube
          </a>
          <Button
            variant={isFavorite ? "secondary" : "outline"}
            size="sm"
            onClick={() => onToggleFavorite(video)}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Quitar «${video.title}» de favoritos` : `Guardar «${video.title}» en favoritos`}
            className="ml-auto"
          >
            <Bookmark className={`size-3.5 ${isFavorite ? "fill-current" : ""}`} aria-hidden="true" />
            {isFavorite ? "Guardado" : "Guardar"}
          </Button>
        </div>
      </div>
    </article>
  );
}
