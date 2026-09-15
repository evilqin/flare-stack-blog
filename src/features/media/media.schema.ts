import { z } from "zod";

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (images + audio)
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
export const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-m4a",
];
export const ACCEPTED_MEDIA_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_AUDIO_TYPES,
];

export const MediaKeyInputSchema = z.object({
  key: z.string(),
});

export const UpdateMediaNameInputSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
});

export const MediaKindSchema = z.enum(["all", "image", "audio"]);
export type MediaKind = z.infer<typeof MediaKindSchema>;

export const GetMediaListInputSchema = z.object({
  cursor: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  unusedOnly: z.boolean().optional(),
  mimeType: MediaKindSchema.optional().catch("all"),
});

export const ImportMediaUrlInputSchema = z.object({
  url: z.string().min(1),
});

export type UpdateMediaNameInput = z.infer<typeof UpdateMediaNameInputSchema>;
export type GetMediaListInput = z.infer<typeof GetMediaListInputSchema>;
