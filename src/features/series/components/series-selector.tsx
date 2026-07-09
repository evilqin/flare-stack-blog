import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { getAllSeriesFn } from "@/features/series/api/series.api";
import { cn } from "@/lib/utils";

interface SeriesSelectorProps {
  value: Array<number>;
  onChange: (seriesIds: Array<number>) => void;
}

export function SeriesSelector({ value, onChange }: SeriesSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: seriesList = [], isLoading } = useQuery({
    queryKey: ["series", "admin-list"],
    queryFn: () => getAllSeriesFn(),
  });

  const toggleSeries = (seriesId: number) => {
    if (value.includes(seriesId)) {
      onChange(value.filter((id) => id !== seriesId));
    } else {
      onChange([...value, seriesId]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 size={10} className="animate-spin" />
        Loading series...
      </div>
    );
  }

  if (seriesList.length === 0) {
    return (
      <div className="text-[10px] font-mono text-muted-foreground/40">
        No series available. Create one in the Series admin page.
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-2 py-1.5 text-xs border border-border/30 bg-transparent hover:border-foreground/50 transition-colors"
      >
        <span
          className={cn(
            "truncate",
            value.length === 0 && "text-muted-foreground/40",
          )}
        >
          {value.length === 0
            ? "Select series..."
            : `${value.length} series selected`}
        </span>
        <ChevronsUpDown
          size={12}
          className="shrink-0 text-muted-foreground/40"
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 z-20 mt-1 border border-border/30 bg-background shadow-lg max-h-48 overflow-y-auto">
            {seriesList.map((series) => (
              <button
                key={series.id}
                type="button"
                onClick={() => toggleSeries(series.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors text-left"
              >
                <div
                  className={cn(
                    "w-3 h-3 border shrink-0 flex items-center justify-center",
                    value.includes(series.id)
                      ? "bg-foreground border-foreground"
                      : "border-border/60",
                  )}
                >
                  {value.includes(series.id) && (
                    <Check size={8} className="text-background" />
                  )}
                </div>
                <span className="truncate">{series.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
