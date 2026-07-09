import type {
  AdjacentPosts,
  PostWithToc,
} from "@/features/posts/schema/posts.schema";

export interface PostPageProps {
  post: Exclude<PostWithToc, null>;
  adjacentPosts?: AdjacentPosts | null;
}
