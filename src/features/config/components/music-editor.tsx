import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { SystemConfig } from "@/features/config/config.schema";
import { m } from "@/paraglide/messages";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function MusicTracksEditor() {
  const { register, control } = useFormContext<SystemConfig>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "site.music",
  });

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="flex flex-col gap-3 p-4 border border-border/30 rounded-lg bg-background/30"
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="block text-xs text-muted-foreground mb-1">
                  {m.settings_music_title()}
                </label>
                <Input
                  {...register(`site.music.${index}.title`)}
                  placeholder={m.settings_music_title_ph()}
                  className="text-sm"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs text-muted-foreground mb-1">
                  {m.settings_music_artist()}
                </label>
                <Input
                  {...register(`site.music.${index}.artist`)}
                  placeholder={m.settings_music_artist_ph()}
                  className="text-sm"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs text-muted-foreground mb-1">
                  {m.settings_music_cover()}
                </label>
                <Input
                  {...register(`site.music.${index}.cover`)}
                  placeholder={m.settings_music_cover_ph()}
                  className="text-sm"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs text-muted-foreground mb-1">
                  {m.settings_music_src()}
                </label>
                <Input
                  {...register(`site.music.${index}.src`)}
                  placeholder={m.settings_music_src_ph()}
                  className="text-sm font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => remove(index)}
              className="h-9 w-9 flex items-center justify-center shrink-0 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-muted/50 mt-6"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          append({
            id: generateId(),
            title: "",
            artist: "",
            cover: "",
            src: "",
          })
        }
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus size={16} />
        {m.settings_music_add()}
      </button>
    </div>
  );
}
