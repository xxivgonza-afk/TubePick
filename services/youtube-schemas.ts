import { z } from "zod";

const thumbnailSchema = z.object({
  url: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

const thumbnailsSchema = z.object({
  default: thumbnailSchema.optional(),
  medium: thumbnailSchema.optional(),
  high: thumbnailSchema.optional(),
});

const snippetSchema = z.object({
  publishedAt: z.string(),
  channelId: z.string(),
  channelTitle: z.string(),
  title: z.string(),
  description: z.string().default(""),
  thumbnails: thumbnailsSchema.optional(),
});

const searchItemSchema = z.object({
  id: z.object({ videoId: z.string() }),
  snippet: snippetSchema.optional(),
});

const videoItemSchema = z.object({
  id: z.string(),
  snippet: snippetSchema.optional(),
  contentDetails: z.object({ duration: z.string() }).optional(),
  statistics: z.object({ viewCount: z.string() }).optional(),
});

export const searchResponseSchema = z.object({
  items: z.array(searchItemSchema),
  error: z
    .object({ code: z.number(), message: z.string(), errors: z.array(z.object({ reason: z.string() })) })
    .optional(),
});

export const videoListResponseSchema = z.object({
  items: z.array(videoItemSchema),
  error: z
    .object({ code: z.number(), message: z.string(), errors: z.array(z.object({ reason: z.string() })) })
    .optional(),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type VideoListItem = z.infer<typeof videoItemSchema>;
