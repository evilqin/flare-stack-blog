import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { SETTINGS_FIELD_CLASS } from "@/features/config/components/admin/settings-pages";
import type { SystemConfig } from "@/features/config/config.schema";
import { m } from "@/paraglide/messages";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const FIELDS = [
  {
    name: "title",
    label: () => m.settings_music_title(),
    placeholder: () => m.settings_music_title_ph(),
    mono: false,
  },
  {
    name: "artist",
    label: () => m.settings_music_artist(),
    placeholder: () => m.settings_music_artist_ph(),
    mono: false,
  },
  {
    name: "cover",
    label: () => m.settings_music_cover(),
    placeholder: () => m.settings_music_cover_ph(),
    mono: true,
  },
  {
    name: "src",
    label: () => m.settings_music_src(),
    placeholder: () => m.settings_music_src_ph(),
    mono: true,
  },
] as const;

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
          className="flex items-start gap-2 rounded-xl border border-border/30 p-3"
        >
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            {FIELDS.map((item) => (
              <div key={item.name} className="min-w-0">
                <label className="block text-xs fuwari-text-50 mb-1">
                  {item.label()}
                </label>
                <input
                  {...register(`site.music.${index}.${item.name}`)}
                  placeholder={item.placeholder()}
                  className={
                    item.mono
                      ? `${SETTINGS_FIELD_CLASS} font-mono text-xs`
                      : SETTINGS_FIELD_CLASS
                  }
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => remove(index)}
            className="h-10 w-10 rounded-xl fuwari-text-50 hover:text-(--fuwari-danger-fg) grid place-items-center shrink-0 mt-5"
            aria-label={m.settings_social_remove()}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          append({ id: generateId(), title: "", artist: "", cover: "", src: "" })
        }
        className="flex items-center gap-2 text-sm fuwari-text-50 hover:text-(--fuwari-fg-90) transition-colors"
      >
        <Plus size={16} />
        {m.settings_music_add()}
      </button>
    </div>
  );
}
