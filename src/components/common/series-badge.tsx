import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { getSeriesByPostIdFn } from "@/features/series/api/series.api";

interface SeriesBadgeProps {
  postId: number;
}

export function SeriesBadge({ postId }: SeriesBadgeProps) {
  const { data: seriesList } = useQuery({
    queryKey: ["post-series", postId],
    queryFn: () => getSeriesByPostIdFn({ data: { postId } }),
  });

  if (!seriesList || seriesList.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {seriesList.map((series) => (
        <Link
          key={series.id}
          to="/series/$seriesId"
          params={{ seriesId: String(series.id) }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider bg-primary/10 text-primary/80 hover:bg-primary/20 hover:text-primary transition-colors"
        >
          <BookOpen size={10} strokeWidth={2} />
          <span>{series.name}</span>
        </Link>
      ))}
    </div>
  );
}
