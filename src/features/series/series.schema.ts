import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { PostItemSchema } from "@/features/posts/schema/posts.schema";
import { PostSeriesTable, SeriesTable } from "@/lib/db/schema";

// ── Series Schemas ───────────────────────────────────────────

export const SeriesSelectSchema = createSelectSchema(SeriesTable);
export const SeriesInsertSchema = createInsertSchema(SeriesTable);
export const SeriesUpdateSchema = SeriesInsertSchema.partial();

export const SeriesWithPostsSchema = SeriesSelectSchema.extend({
  posts: z.array(PostItemSchema).optional(),
});

export const PostSeriesSelectSchema = createSelectSchema(PostSeriesTable);

// ── Input Schemas ───────────────────────────────────────────

export const CreateSeriesInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  coverUrl: z.string().optional(),
  order: z.number().int().optional(),
});

export const UpdateSeriesInputSchema = z.object({
  id: z.number(),
  data: SeriesUpdateSchema,
});

export const DeleteSeriesInputSchema = z.object({
  id: z.number(),
});

export const FindSeriesBySlugInputSchema = z.object({
  slug: z.string(),
});

// ── Types ────────────────────────────────────────────────────

export type SeriesSelect = z.infer<typeof SeriesSelectSchema>;
export type SeriesInsert = z.infer<typeof SeriesInsertSchema>;
export type SeriesWithPosts = z.infer<typeof SeriesWithPostsSchema>;
export type CreateSeriesInput = z.infer<typeof CreateSeriesInputSchema>;
export type UpdateSeriesInput = z.infer<typeof UpdateSeriesInputSchema>;
export type DeleteSeriesInput = z.infer<typeof DeleteSeriesInputSchema>;
