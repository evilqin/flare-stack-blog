import { relations } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { createdAt, id, updatedAt } from "./helper";
import { PostsTable } from "./posts.table";

// ── Series Table ─────────────────────────────────────────────

export const SeriesTable = sqliteTable("series", {
  id: id,
  name: text("name").notNull().unique(),
  description: text("description"),
  coverUrl: text("cover_url"),
  order: integer("sort_order").notNull().default(0),
  createdAt: createdAt,
  updatedAt: updatedAt,
});

// ── Post-Series Junction Table ───────────────────────────────

export const PostSeriesTable = sqliteTable(
  "post_series",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => PostsTable.id, { onDelete: "cascade" }),
    seriesId: integer("series_id")
      .notNull()
      .references(() => SeriesTable.id, { onDelete: "cascade" }),
    order: integer("series_order").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.postId, table.seriesId] }),
    seriesIdx: index("post_series_series_idx").on(table.seriesId),
    postIdx: index("post_series_post_idx").on(table.postId),
  }),
);

// ── Relations ────────────────────────────────────────────────

export const seriesRelations = relations(SeriesTable, ({ many }) => ({
  postSeries: many(PostSeriesTable),
}));

export const postSeriesRelations = relations(PostSeriesTable, ({ one }) => ({
  post: one(PostsTable, {
    fields: [PostSeriesTable.postId],
    references: [PostsTable.id],
  }),
  series: one(SeriesTable, {
    fields: [PostSeriesTable.seriesId],
    references: [SeriesTable.id],
  }),
}));

// ── Types ────────────────────────────────────────────────────

export type Series = typeof SeriesTable.$inferSelect;
export type NewSeries = typeof SeriesTable.$inferInsert;
export type PostSeries = typeof PostSeriesTable.$inferSelect;
