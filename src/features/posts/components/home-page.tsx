import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { PostItem } from "@/features/posts/schema/posts.schema";
import { m } from "@/paraglide/messages";
import { HomePagination } from "./home-pagination";
import { PostCard } from "./post-card";

export const POPULAR_POSTS_LIMIT = 3;

/** Shared with `/verify`; turning the prank off there hides this lure too. */
const PRANK_FLAG_KEY = "flare_prank_enabled";

interface HomePageProps {
  posts: Array<PostItem>;
  popularPosts?: Array<PostItem>;
  page: number;
  totalPages: number;
}

export function HomePage({
  posts,
  popularPosts,
  page,
  totalPages,
}: HomePageProps) {
  const popularSlugs = new Set((popularPosts ?? []).map((post) => post.slug));
  const [prankEnabled, setPrankEnabled] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(PRANK_FLAG_KEY) === "off") setPrankEnabled(false);
    } catch {
      // localStorage unavailable; keep the default
    }
  }, []);
  return (
    <div className="flex flex-col gap-4">
      {/* Easter-egg entry: dressed as a security notice, leads to the /verify prank. */}
      {prankEnabled && (
        <Link
          to="/verify"
          className="group mx-4 md:mx-6 mt-4 md:mt-6 flex items-center justify-between gap-3 rounded-(--fuwari-radius-large) bg-(--fuwari-card-bg) border border-(--fuwari-primary)/30 px-4 py-3 hover:border-(--fuwari-primary)/60 transition-colors"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <ShieldAlert
              size={16}
              strokeWidth={2}
              className="shrink-0 text-(--fuwari-primary)"
            />
            <span className="fuwari-text-90 text-sm font-medium truncate">
              {m.home_prank_lure()}
            </span>
          </span>
          <span className="shrink-0 text-xs font-bold uppercase tracking-widest text-(--fuwari-primary) group-hover:underline">
            {m.home_prank_cta()}
          </span>
        </Link>
      )}
      <div className="flex flex-col rounded-(--fuwari-radius-large) bg-(--fuwari-card-bg) py-1 md:py-0 md:bg-transparent md:gap-4">
        {posts.map((post, i) => (
          <div
            key={post.slug}
            className="fuwari-onload-animation"
            style={{
              animationDelay: `calc(var(--fuwari-content-delay) + ${i * 50}ms)`,
            }}
          >
            <PostCard
              post={post}
              pinned={Boolean(post.pinnedAt)}
              popular={!post.pinnedAt && popularSlugs.has(post.slug)}
            />
            {i < posts.length - 1 && (
              <div className="border-t border-dashed mx-6 border-black/10 dark:border-white/15 md:hidden" />
            )}
          </div>
        ))}
      </div>
      <HomePagination page={page} totalPages={totalPages} />
    </div>
  );
}
