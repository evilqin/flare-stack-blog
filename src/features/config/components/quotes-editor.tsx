import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SystemConfig } from "@/features/config/config.schema";
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
          className="flex flex-col gap-3 p-4 border border-border/30 rounded-lg bg-background/30"
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="flex-1 min-w-0 grid grid-cols-1 gap-3">
              <div className="min-w-0">
                <label className="block text-xs text-muted-foreground mb-1">
                  {m.settings_quote_content()}
                </label>
                <Textarea
                  {...register(`site.quotes.${index}.content`)}
                  placeholder={m.settings_quote_content_ph()}
                  className="text-sm min-h-20"
                  rows={3}
                />
              </div>
              <div className="min-w-0">
                <label className="block text-xs text-muted-foreground mb-1">
                  {m.settings_quote_author()}
                </label>
                <Input
                  {...register(`site.quotes.${index}.author`)}
                  placeholder={m.settings_quote_author_ph()}
                  className="text-sm"
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
          append({ id: generateId(), content: "", author: "" })
        }
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus size={16} />
        {m.settings_quote_add()}
      </button>
    </div>
  );
}
