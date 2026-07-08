import { z } from "zod";
import type { Messages } from "@/lib/i18n";

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
  "audio/flac",
  "audio/x-m4a",
];

export const UploadMediaInputSchema = z.instanceof(FormData);

export function parseUploadMediaInput(formData: FormData, messages: Messages) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error(messages.media_validation_file_required());
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(messages.media_validation_file_too_large());
  }
  const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
  const isAudio = ACCEPTED_AUDIO_TYPES.includes(file.type);
  if (!isImage && !isAudio) {
    throw new Error(messages.media_validation_file_invalid_type());
  }

  return { file };
}

export const MediaKeyInputSchema = z.object({
  key: z.string(),
});

export function assertMediaKey(key: string, messages: Messages) {
  const trimmedKey = key.trim();
  if (trimmedKey.length === 0) {
    throw new Error(messages.media_validation_key_required());
  }

  return trimmedKey;
}

export const UpdateMediaNameInputSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
});

export const GetMediaListInputSchema = z.object({
  cursor: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  unusedOnly: z.boolean().optional(),
  mimeType: z.enum(["all", "image", "audio"]).optional().catch("all"),
});

export type UpdateMediaNameInput = z.infer<typeof UpdateMediaNameInputSchema>;
export type GetMediaListInput = z.infer<typeof GetMediaListInputSchema>;
