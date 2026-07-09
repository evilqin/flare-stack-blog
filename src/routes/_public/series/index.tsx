import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Loader2 } from "lucide-react";
import type { SeriesSelect } from "@/features/series/series.schema";
import { getPublicSeriesListFn } from "@/features/series/api/series.api";

interface SeriesWithCount extends SeriesSelect {
  postCount: number;
}

export const Route = createFileRoute("/_public/series/")({
  component: SeriesListPage,
});

function SeriesListPage() {
  const { data: seriesList = [], isLoading } = useQuery<Array<SeriesWithCount>>({
    queryKey: ["series", "public-list"],
    queryFn: () => getPublicSeriesListFn(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-6 md:px-0 py-16">
      <header className="mb-12">
        <h1 className="text-3xl md:text-4xl font-serif font-medium tracking-tight mb-3">
          Series
        </h1>
        <p className="text-muted-foreground/70 text-sm font-light">
          Explore curated collections of posts organized by topic.
        </p>
      </header>

      {seriesList.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground/40">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-mono">No series yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {seriesList.map((series) => (
            <Link
              key={series.id}
              to="/series/$seriesId"
              params={{ seriesId: String(series.id) }}
              className="group border border-border/20 hover:border-border/60 transition-all duration-300 p-6 rounded-sm"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/5 rounded-sm">
                  <BookOpen size={18} className="text-primary/60" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-medium group-hover:text-primary transition-colors">
                    {series.name}
                  </h2>
                  {series.description && (
                    <p className="text-sm text-muted-foreground/60 mt-1 line-clamp-2">
                      {series.description}
                    </p>
                  )}
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/40 mt-2">
                    {series.postCount ?? 0} posts
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
