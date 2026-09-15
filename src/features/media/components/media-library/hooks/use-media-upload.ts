import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ACCEPTED_MEDIA_TYPES,
  MAX_FILE_SIZE,
} from "@/features/media/media.schema";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export function useMediaUpload() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => orpcClient.media.upload({ image: file }),
  });

  const uploadFiles = async (files: Array<File>) => {
    // Browsers leave `type` empty for some audio extensions (m4a, flac), so
    // fall back to the extension before rejecting a file outright.
    const media = files.filter(
      (file) =>
        ACCEPTED_MEDIA_TYPES.includes(file.type) ||
        !file.type ||
        /\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(file.name),
    );
    if (media.length === 0) {
      toast.error(m.media_validation_file_invalid_type());
      return;
    }

    setProgress({ current: 0, total: media.length });
    try {
      for (let i = 0; i < media.length; i++) {
        const file = media[i];
        setProgress({ current: i + 1, total: media.length });
        if (file.size > MAX_FILE_SIZE) {
          toast.error(m.media_validation_file_too_large());
          continue;
        }
        try {
          await uploadMutation.mutateAsync(file);
          toast.success(m.media_upload_success());
        } catch {
          toast.error(m.media_upload_fail({ name: file.name }));
        }
      }
      await queryClient.invalidateQueries({ queryKey: orpc.media.key() });
    } finally {
      setProgress(null);
    }
  };

  return {
    uploadFiles,
    progress,
    isUploading: progress != null,
  };
}
