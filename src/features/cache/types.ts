export type CacheKey =
  | string
  | ReadonlyArray<string | number | boolean | null | undefined>;

export const CACHE_NAMESPACES = {
  POSTS_LIST: "posts:list",
  POSTS_DETAIL: "posts:detail",
  FRIEND_LINKS_LIST: "friend-links:list",
  SERIES_LIST: "series:list",
} as const;

export type CacheNamespace =
  (typeof CACHE_NAMESPACES)[keyof typeof CACHE_NAMESPACES];
