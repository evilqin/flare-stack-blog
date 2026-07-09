import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Clock, Loader2 } from "lucide-react";
import { getSeriesWithPostsFn } from "@/features/series/api/series.api";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/series/$seriesId")({
  component: SeriesDetailPage,
  loader: async ({ params }) => {
    const seriesId = Number(params.seriesId);
    if (Number.isNaN(seriesId)) throw notFound();
    return { seriesId };
  },
});

function SeriesDetailPage() {
  const { seriesId } = Route.useLoaderData();

  const { data: series, isLoading } = useQuery({
    queryKey: ["series", "detail", seriesId],
    queryFn: () => getSeriesWithPostsFn({ data: { seriesId } }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!series) throw notFound();

  return (
    <div className="w-full max-w-3xl mx-auto px-6 md:px-0 py-16">
      {/* Back Link */}
      <Link
        to="/series"
        className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity mb-8"
      >
        <ArrowLeft size={12} />
        <span>Back to Series</span>
      </Link>

      {/* Series Header */}
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/5 rounded-sm">
            <BookOpen size={20} className="text-primary/60" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-medium tracking-tight">
              {series.name}
            </h1>
            {series.description && (
              <p className="text-sm text-muted-foreground/60 mt-2">
                {series.description}
              </p>
            )}
          </div>
        </div>
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/40">
          {series.posts?.length ?? 0} posts in this series
        </p>
      </header>

      {/* Posts List */}
      {series.posts && series.posts.length > 0 ? (
        <div className="space-y-3">
          {series.posts.map((post, index) => (
            <Link
              key={post.id}
              to="/post/$slug"
              params={{ slug: post.slug }}
              className="group flex items-center gap-4 px-4 py-3 border border-border/20 hover:border-border/60 transition-all duration-300"
            >
              <span className="text-[10px] font-mono text-muted-foreground/30 w-6 shrink-0">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium group-hover:text-primary transition-colors">
                  {post.title}
                </span>
                <div className="flex items-center gap-3 mt-1">
                  {post.publishedAt && (
                    <span className="text-[10px] font-mono text-muted-foreground/40">
                      {formatDate(post.publishedAt)}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-muted-foreground/40 flex items-center gap-1">
                    <Clock size={10} />
                    {m.read_time({ count: post.readTimeInMinutes })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-muted-foreground/40">
          <p className="text-sm font-mono">No posts in this series yet.</p>
        </div>
      )}
    </div>
  );
}
