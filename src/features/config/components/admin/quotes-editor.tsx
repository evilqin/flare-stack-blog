import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { SETTINGS_FIELD_CLASS } from "@/features/config/components/admin/settings-pages";
import type { SystemConfig } from "@/features/config/config.schema";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function QuotesEditor() {
  const { register, control } = useFormContext<SystemConfig>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "site.quotes",
  });

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="flex items-start gap-2 rounded-xl border border-border/30 p-3"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="min-w-0">
              <label className="block text-xs fuwari-text-50 mb-1">
                {m.settings_quote_content()}
              </label>
              <textarea
                {...register(`site.quotes.${index}.content`)}
                placeholder={m.settings_quote_content_ph()}
                rows={3}
                className={cn(
                  SETTINGS_FIELD_CLASS,
                  "h-auto min-h-20 resize-y py-2",
                )}
              />
            </div>
            <div className="min-w-0">
              <label className="block text-xs fuwari-text-50 mb-1">
                {m.settings_quote_author()}
              </label>
              <input
                {...register(`site.quotes.${index}.author`)}
                placeholder={m.settings_quote_author_ph()}
                className={SETTINGS_FIELD_CLASS}
              />
            </div>
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
        onClick={() => append({ id: generateId(), content: "", author: "" })}
        className="flex items-center gap-2 text-sm fuwari-text-50 hover:text-(--fuwari-fg-90) transition-colors"
      >
        <Plus size={16} />
        {m.settings_quote_add()}
      </button>
    </div>
  );
}
