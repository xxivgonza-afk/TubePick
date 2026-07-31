export interface Video {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  description: string;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  publishedAt: string;
  durationSeconds: number;
  viewCount: number;
}

export function toYouTubeUrl(video: Video): string {
  return `https://www.youtube.com/watch?v=${video.id}`;
}
