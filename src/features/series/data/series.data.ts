import { and, asc, desc, eq } from "drizzle-orm";
import type { PostListItem } from "@/features/posts/schema/posts.schema";
import {
  PostSeriesTable,
  SeriesTable,
} from "@/lib/db/schema";

// ── Series CRUD ──────────────────────────────────────────────

export async function getAllSeries(db: DB) {
  const series = await db.query.SeriesTable.findMany({
    orderBy: [asc(SeriesTable.order), desc(SeriesTable.createdAt)],
    with: {
      postSeries: {
        columns: { postId: true },
      },
    },
  });

  return series.map((s) => ({
    ...s,
    postCount: s.postSeries.length,
    postSeries: undefined,
  }));
}

export async function findSeriesById(db: DB, id: number) {
  return await db.query.SeriesTable.findFirst({
    where: eq(SeriesTable.id, id),
  });
}

export async function findSeriesByName(db: DB, name: string) {
  return await db.query.SeriesTable.findFirst({
    where: eq(SeriesTable.name, name),
  });
}

export async function createSeries(
  db: DB,
  data: typeof SeriesTable.$inferInsert,
) {
  const [series] = await db.insert(SeriesTable).values(data).returning();
  return series;
}

export async function updateSeries(
  db: DB,
  id: number,
  data: Partial<typeof SeriesTable.$inferInsert>,
) {
  await db.update(SeriesTable).set(data).where(eq(SeriesTable.id, id));
  return await findSeriesById(db, id);
}

export async function deleteSeries(db: DB, id: number) {
  await db.delete(SeriesTable).where(eq(SeriesTable.id, id));
}

// ── Post-Series Assignment ───────────────────────────────────

export async function getSeriesWithPosts(db: DB, seriesId: number) {
  const series = await db.query.SeriesTable.findFirst({
    where: eq(SeriesTable.id, seriesId),
    with: {
      postSeries: {
        orderBy: [asc(PostSeriesTable.order), desc(PostSeriesTable.postId)],
        with: {
          post: {
            with: {
              postTags: {
                with: { tag: true },
              },
            },
          },
        },
      },
    },
  });

  if (!series) return null;

  const posts = series.postSeries.map((ps) => {
    const { postTags, ...post } = ps.post;
    return {
      ...post,
      tags: postTags.map((pt) => pt.tag),
    };
  }) as unknown as PostListItem[];

  return {
    ...series,
    posts,
  };
}

export async function getSeriesByPostId(db: DB, postId: number) {
  const result = await db
    .select({
      series: {
        id: SeriesTable.id,
        name: SeriesTable.name,
        description: SeriesTable.description,
        coverUrl: SeriesTable.coverUrl,
        order: SeriesTable.order,
        createdAt: SeriesTable.createdAt,
        updatedAt: SeriesTable.updatedAt,
      },
      postOrder: PostSeriesTable.order,
    })
    .from(PostSeriesTable)
    .innerJoin(SeriesTable, eq(PostSeriesTable.seriesId, SeriesTable.id))
    .where(eq(PostSeriesTable.postId, postId))
    .orderBy(asc(PostSeriesTable.order));

  return result.map((r) => ({
    ...r.series,
    seriesOrder: r.postOrder,
  }));
}

export async function assignPostToSeries(
  db: DB,
  postId: number,
  seriesId: number,
  order?: number,
) {
  const maxOrder = await db
    .select({ max: PostSeriesTable.order })
    .from(PostSeriesTable)
    .where(eq(PostSeriesTable.seriesId, seriesId))
    .orderBy(desc(PostSeriesTable.order))
    .limit(1);

  const nextOrder = order ?? (maxOrder[0]?.max ?? 0) + 1;

  await db
    .insert(PostSeriesTable)
    .values({ postId, seriesId, order: nextOrder })
    .onConflictDoNothing();

  return { postId, seriesId, order: nextOrder };
}

export async function removePostFromSeries(
  db: DB,
  postId: number,
  seriesId: number,
) {
  await db
    .delete(PostSeriesTable)
    .where(
      and(
        eq(PostSeriesTable.postId, postId),
        eq(PostSeriesTable.seriesId, seriesId),
      ),
    );
}

export async function updatePostSeriesOrder(
  db: DB,
  postId: number,
  seriesId: number,
  order: number,
) {
  await db
    .update(PostSeriesTable)
    .set({ order })
    .where(
      and(
        eq(PostSeriesTable.postId, postId),
        eq(PostSeriesTable.seriesId, seriesId),
      ),
    );
}

// ── Public Queries ───────────────────────────────────────────

export async function getPublicSeriesList(db: DB) {
  const series = await db.query.SeriesTable.findMany({
    orderBy: [asc(SeriesTable.order), desc(SeriesTable.createdAt)],
    with: {
      postSeries: {
        columns: { postId: true },
      },
    },
  });

  return series.map((s) => ({
    ...s,
    postCount: s.postSeries.length,
    postSeries: undefined,
  }));
}

export async function getAllSeriesNames(db: DB) {
  const results = await db
    .select({ id: SeriesTable.id, name: SeriesTable.name })
    .from(SeriesTable)
    .orderBy(asc(SeriesTable.order));

  return results;
}
