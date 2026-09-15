import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { mediaInfiniteQueryOptions } from "@/features/media/queries";

export function useMediaPicker(enabled = true) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useInfiniteQuery({
      // The picker feeds image slots (post covers, editor images), so it must
      // never offer audio even though the library as a whole holds both.
      ...mediaInfiniteQueryOptions("", false, "image"),
      enabled,
    });

  const mediaItems = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) ?? [];
  }, [data]);

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  return {
    mediaItems,
    loadMore,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    isPending,
  };
}
