import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { AdjacentPosts } from "@/features/posts/schema/posts.schema";
import { m } from "@/paraglide/messages";

interface AdjacentPostsProps {
  adjacent: AdjacentPosts | null | undefined;
}

export function AdjacentPostsNav({ adjacent }: AdjacentPostsProps) {
  if (!adjacent || (!adjacent.prev && !adjacent.next)) {
    return null;
  }

  return (
    <nav className="flex flex-col sm:flex-row justify-between gap-4 w-full">
      {/* Previous Post */}
      <div className="flex-1 min-w-0">
        {adjacent.prev ? (
          <Link
            to="/post/$slug"
            params={{ slug: adjacent.prev.slug }}
            className="group flex items-center gap-3 px-4 py-3 rounded-sm border border-border/20 hover:border-border/60 transition-all duration-300 h-full"
          >
            <ArrowLeft
              size={14}
              className="shrink-0 text-muted-foreground/40 group-hover:text-foreground transition-colors"
            />
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">
                {m.post_prev()}
              </div>
              <div className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
                {adjacent.prev.title}
              </div>
            </div>
          </Link>
        ) : (
          <div className="h-full" />
        )}
      </div>

      {/* Next Post */}
      <div className="flex-1 min-w-0">
        {adjacent.next ? (
          <Link
            to="/post/$slug"
            params={{ slug: adjacent.next.slug }}
            className="group flex items-center gap-3 px-4 py-3 rounded-sm border border-border/20 hover:border-border/60 transition-all duration-300 h-full sm:text-right"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">
                {m.post_next()}
              </div>
              <div className="text-sm font-medium truncate group-hover:text-foreground transition-colors">
                {adjacent.next.title}
              </div>
            </div>
            <ArrowRight
              size={14}
              className="shrink-0 text-muted-foreground/40 group-hover:text-foreground transition-colors"
            />
          </Link>
        ) : (
          <div className="h-full" />
        )}
      </div>
    </nav>
  );
}
