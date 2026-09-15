import type { MediaKind } from "@/features/media/media.schema";
import { orpc } from "@/lib/orpc";

export function mediaInfiniteQueryOptions(
  search: string = "",
  unusedOnly: boolean = false,
  mimeType: MediaKind = "all",
) {
  return orpc.media.list.infiniteOptions({
    input: (pageParam: number | undefined) => ({
      cursor: pageParam,
      search: search || undefined,
      unusedOnly: unusedOnly || undefined,
      mimeType: mimeType === "all" ? undefined : mimeType,
    }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function linkedPostsQuery(key: string) {
  return orpc.media.linkedPosts.queryOptions({
    input: { key },
    enabled: !!key,
  });
}

export const mediaStatsQuery = orpc.media.stats.queryOptions();
