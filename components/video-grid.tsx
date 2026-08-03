import { VideoCard } from "@/components/video-card";
import type { Video } from "@/types/video";

export function VideoGrid({ videos }: { videos: Video[] }) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <li key={video.id}>
          <VideoCard video={video} />
        </li>
      ))}
    </ul>
  );
}