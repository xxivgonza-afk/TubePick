"use client";

import { useReducedMotion } from "framer-motion";
import { motion } from "framer-motion";
import { VideoCard } from "@/components/video-card";
import { useFavorites } from "@/hooks/use-favorites";
import { useUIStore } from "@/stores/ui-store";
import type { Video } from "@/types/video";

export function VideoGrid({ videos }: { videos: Video[] }) {
  const prefersReducedMotion = useReducedMotion();
  const { isFavorite, toggleFavorite } = useFavorites();
  const showToast = useUIStore((s) => s.showToast);

  function handleToggleFavorite(video: Video) {
    const willSave = !isFavorite(video.id);
    toggleFavorite(video);
    showToast(willSave ? "Guardado en favoritos" : "Eliminado de favoritos");
  }

  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video, index) => (
        <motion.li
          key={video.id}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: prefersReducedMotion ? 0 : Math.min(index * 0.03, 0.3) }}
        >
          <VideoCard
            video={video}
            isFavorite={isFavorite(video.id)}
            onToggleFavorite={handleToggleFavorite}
          />
        </motion.li>
      ))}
    </ul>
  );
}
